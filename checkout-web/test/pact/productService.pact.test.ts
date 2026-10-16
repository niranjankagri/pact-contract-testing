// Consumer contract tests: checkout-web's expectations of product-service.
//
// Each test describes one interaction (provider state + request + expected response), runs the REAL
// ProductClient against Pact's mock server, and checks that the client handles the answer. When all tests pass,
// Pact writes the interactions into the pact file. The provider later replays them against the real service.
//
// Matchers describe the SHAPE, not exact values: integer(25) means "any integer, for example 25". So the
// provider only has to return the right types, not the same demo data.
import { MatchersV3 } from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';
import { OutOfStockError, ProductNotFoundError, UnauthorizedError } from '../../src/errors.js';
import { ProductClient } from '../../src/productClient.js';
import { AUTH_HEADER, createPact, JSON_RESPONSE, TEST_TOKEN } from './pactSetup.js';

const { decimal, eachLike, integer, regex, string, uuid } = MatchersV3;

/** ISO-8601 instant as Java writes it: optional fraction of a second, always UTC ("Z"). */
const isoInstant = (example: string) => regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, example);

/** The product fields checkout-web reads, as matchers. Nothing else is asserted. */
const productShape = (id: number, name: string, amount: number, stock: number) => ({
  id: integer(id),
  name: string(name),
  price: { amount: decimal(amount), currency: regex(/^[A-Z]{3}$/, 'EUR') },
  stock: integer(stock),
});

describe('checkout-web -> product-service contract', () => {
  const pact = createPact();

  it('gets one product', async () => {
    await pact
      .addInteraction()
      .given('a product exists', { id: 1, name: 'Claw hammer', price: 19.99, stock: 25 })
      .uponReceiving('a request for one product')
      .withRequest('GET', '/products/1', (request) => request.headers(AUTH_HEADER))
      .willRespondWith(200, (response) =>
        response.headers(JSON_RESPONSE).jsonBody(productShape(1, 'Claw hammer', 19.99, 25)),
      )
      .executeTest(async (mockServer) => {
        const product = await new ProductClient(mockServer.url, TEST_TOKEN).getProduct(1);

        expect(product).toEqual({
          id: 1,
          name: 'Claw hammer',
          price: { amount: 19.99, currency: 'EUR' },
          stock: 25,
        });
      });
  });

  it('gets 404 for a product that does not exist', async () => {
    await pact
      .addInteraction()
      .given('no product exists', { id: 999 })
      .uponReceiving('a request for a missing product')
      .withRequest('GET', '/products/999', (request) => request.headers(AUTH_HEADER))
      .willRespondWith(404, (response) =>
        response.headers(JSON_RESPONSE).jsonBody({ error: string('Product 999 not found') }),
      )
      .executeTest(async (mockServer) => {
        await expect(new ProductClient(mockServer.url, TEST_TOKEN).getProduct(999)).rejects.toBeInstanceOf(
          ProductNotFoundError,
        );
      });
  });

  it('gets several products by id in one request', async () => {
    await pact
      .addInteraction()
      .given('products exist', { ids: [1, 2] })
      .uponReceiving('a request for products by ids')
      .withRequest('GET', '/products', (request) => request.headers(AUTH_HEADER).query({ ids: '1,2' }))
      .willRespondWith(200, (response) =>
        // eachLike: an array of at least one element of this shape (the example has one).
        response
          .headers(JSON_RESPONSE)
          .jsonBody({ products: eachLike(productShape(1, 'Claw hammer', 19.99, 25)) }),
      )
      .executeTest(async (mockServer) => {
        const products = await new ProductClient(mockServer.url, TEST_TOKEN).getProducts([1, 2]);

        expect(products).toHaveLength(1);
        expect(products[0]).toMatchObject({ id: 1, price: { currency: 'EUR' } });
      });
  });

  it('reserves stock for a product', async () => {
    await pact
      .addInteraction()
      .given('a product exists', { id: 1, name: 'Claw hammer', price: 19.99, stock: 25 })
      .uponReceiving('a reservation of 2 units')
      .withRequest('POST', '/products/1/reservations', (request) =>
        request.headers({ ...AUTH_HEADER, 'Content-Type': 'application/json' }).jsonBody({ quantity: 2 }),
      )
      .willRespondWith(201, (response) =>
        response.headers(JSON_RESPONSE).jsonBody({
          reservationId: uuid('0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b'),
          productId: integer(1),
          quantity: integer(2),
          expiresAt: isoInstant('2026-10-16T10:15:00.123Z'),
        }),
      )
      .executeTest(async (mockServer) => {
        const reservation = await new ProductClient(mockServer.url, TEST_TOKEN).reserve(1, 2);

        expect(reservation.quantity).toBe(2);
        expect(reservation.expiresAt).toBeInstanceOf(Date);
        expect(reservation.expiresAt.toISOString()).toBe('2026-10-16T10:15:00.123Z');
      });
  });

  it('gets 409 with the available stock when there is not enough', async () => {
    await pact
      .addInteraction()
      .given('a product exists', { id: 2, name: 'Cordless drill', price: 89.0, stock: 1 })
      .uponReceiving('a reservation of more units than are in stock')
      .withRequest('POST', '/products/2/reservations', (request) =>
        request.headers({ ...AUTH_HEADER, 'Content-Type': 'application/json' }).jsonBody({ quantity: 5 }),
      )
      .willRespondWith(409, (response) =>
        response
          .headers(JSON_RESPONSE)
          .jsonBody({ error: string('Not enough stock'), available: integer(1) }),
      )
      .executeTest(async (mockServer) => {
        const error = await new ProductClient(mockServer.url, TEST_TOKEN)
          .reserve(2, 5)
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(OutOfStockError);
        expect((error as OutOfStockError).available).toBe(1);
      });
  });

  it('gets 401 without a token', async () => {
    // No Authorization header in this request: the provider's request filter must leave it that way.
    await pact
      .addInteraction()
      .given('a product exists', { id: 1, name: 'Claw hammer', price: 19.99, stock: 25 })
      .uponReceiving('a request without a token')
      .withRequest('GET', '/products/1')
      .willRespondWith(401, (response) =>
        response.headers(JSON_RESPONSE).jsonBody({ error: string('Missing or invalid token') }),
      )
      .executeTest(async (mockServer) => {
        await expect(new ProductClient(mockServer.url).getProduct(1)).rejects.toBeInstanceOf(
          UnauthorizedError,
        );
      });
  });
});
