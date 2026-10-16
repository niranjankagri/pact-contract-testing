// A consumer feature in progress (branch feature/discounts): checkout-web wants product-service to send
// "discountPercent", which product-service does not do yet. Only runs with PACT_DISCOUNTS=1, which the
// breaking-change demo sets (scripts/breaking-change-demo.mjs). Shows that the contract stops the consumer from
// deploying before the provider supports it.
import { MatchersV3 } from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';
import { AUTH_HEADER, createPact, JSON_RESPONSE, TEST_TOKEN } from './pactSetup.js';

const { decimal, integer } = MatchersV3;

describe.runIf(process.env.PACT_DISCOUNTS === '1')(
  'checkout-web -> product-service: discounts (feature)',
  () => {
    const pact = createPact();

    it('gets the discount of a product', async () => {
      await pact
        .addInteraction()
        .given('a product exists', { id: 1, name: 'Claw hammer', price: 19.99, stock: 25 })
        .uponReceiving('a request for a product with its discount')
        .withRequest('GET', '/products/1', (request) => request.headers(AUTH_HEADER))
        .willRespondWith(200, (response) =>
          response.headers(JSON_RESPONSE).jsonBody({ id: integer(1), discountPercent: decimal(10.5) }),
        )
        .executeTest(async (mockServer) => {
          const res = await fetch(`${mockServer.url}/products/1`, {
            headers: { Authorization: `Bearer ${TEST_TOKEN}` },
          });
          const body = (await res.json()) as { discountPercent: number };

          expect(body.discountPercent).toBe(10.5);
        });
    });
  },
);
