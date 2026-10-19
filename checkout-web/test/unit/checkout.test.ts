// Unit tests of the checkout logic with a fake client: no HTTP, no Pact. The contract tests cover the
// communication; these cover what checkout-web does with the answers.
import { describe, expect, it } from 'vitest';
import { priceBasket, reserveBasket } from '../../src/checkout.js';
import { OutOfStockError } from '../../src/errors.js';
import type { Product, Reservation } from '../../src/types.js';

const hammer: Product = { id: 1, name: 'Claw hammer', price: { amount: 19.99, currency: 'EUR' }, stock: 25 };
const drill: Product = { id: 2, name: 'Cordless drill', price: { amount: 89.0, currency: 'EUR' }, stock: 1 };
const cheap: Product = { id: 3, name: 'Washer', price: { amount: 0.1, currency: 'EUR' }, stock: 100 };

/** A stand-in for ProductClient that knows only the given products; the unit tests need no HTTP at all. */
const fakeCatalogue = (...products: Product[]) => ({
  getProducts: (ids: number[]) => Promise.resolve(products.filter((product) => ids.includes(product.id))),
});

describe('priceBasket', () => {
  it('adds up the lines', async () => {
    const summary = await priceBasket(fakeCatalogue(hammer, drill), [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ]);

    expect(summary.lines.map((line) => line.lineTotal)).toEqual([39.98, 89]);
    expect(summary.total).toBe(128.98);
    expect(summary.currency).toBe('EUR');
    expect(summary.problems).toEqual([]);
  });

  it('adds money in cents (3 x 0.10 is 0.30, not 0.30000000000000004)', async () => {
    const summary = await priceBasket(fakeCatalogue(cheap), [{ productId: 3, quantity: 3 }]);

    expect(summary.total).toBe(0.3);
  });

  it('reports missing products and too little stock as problems', async () => {
    const summary = await priceBasket(fakeCatalogue(drill), [
      { productId: 2, quantity: 3 },
      { productId: 77, quantity: 1 },
    ]);

    expect(summary.problems).toEqual([
      'Only 1 x Cordless drill in stock',
      'Product 77 is no longer available',
    ]);
    expect(summary.lines).toHaveLength(1);
  });

  it('does not call the API for an empty basket', async () => {
    const client = { getProducts: () => Promise.reject(new Error('must not be called')) };

    await expect(priceBasket(client, [])).resolves.toMatchObject({ total: 0, lines: [] });
  });
});

describe('reserveBasket', () => {
  /** A reservation as the client would return it, with a fixed expiry. */
  const reservation = (productId: number, quantity: number): Reservation => ({
    reservationId: `r-${productId}`,
    productId,
    quantity,
    expiresAt: new Date('2026-10-16T10:15:00Z'),
  });

  it('reserves every line in order', async () => {
    const calls: number[] = [];
    const client = {
      reserve: (productId: number, quantity: number) => {
        calls.push(productId);
        return Promise.resolve(reservation(productId, quantity));
      },
    };

    const result = await reserveBasket(client, [
      { productId: 1, quantity: 2 },
      { productId: 3, quantity: 1 },
    ]);

    expect(calls).toEqual([1, 3]);
    expect(result.map((r) => r.reservationId)).toEqual(['r-1', 'r-3']);
  });

  it('stops at the first product that is out of stock', async () => {
    const calls: number[] = [];
    const client = {
      reserve: (productId: number, quantity: number) => {
        calls.push(productId);
        return productId === 2
          ? Promise.reject(new OutOfStockError(2, 1))
          : Promise.resolve(reservation(productId, quantity));
      },
    };

    await expect(
      reserveBasket(client, [
        { productId: 2, quantity: 5 },
        { productId: 1, quantity: 1 },
      ]),
    ).rejects.toBeInstanceOf(OutOfStockError);
    expect(calls).toEqual([2]);
  });
});
