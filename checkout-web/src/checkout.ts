// The checkout logic of checkout-web: price a basket and reserve its stock, using ProductClient.
import type { ProductClient } from './productClient.js';
import type { BasketItem, Reservation } from './types.js';

export interface PricedLine {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BasketSummary {
  lines: PricedLine[];
  total: number;
  currency: string;
  /** Human-readable reasons why the basket cannot be ordered as it is (empty when it can). */
  problems: string[];
}

/**
 * Prices a basket with one call to product-service. Amounts are added in cents, so 0.1 + 0.2 stays 0.30.
 * Products that no longer exist or have too little stock are reported as problems, not thrown.
 */
export async function priceBasket(
  client: Pick<ProductClient, 'getProducts'>,
  items: BasketItem[],
): Promise<BasketSummary> {
  if (items.length === 0) return { lines: [], total: 0, currency: 'EUR', problems: [] };

  const products = await client.getProducts(items.map((item) => item.productId));
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines: PricedLine[] = [];
  const problems: string[] = [];
  let totalCents = 0;

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      problems.push(`Product ${item.productId} is no longer available`);
      continue;
    }
    if (product.stock < item.quantity) {
      problems.push(`Only ${product.stock} x ${product.name} in stock`);
    }
    const unitCents = Math.round(product.price.amount * 100);
    totalCents += unitCents * item.quantity;
    lines.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice: unitCents / 100,
      lineTotal: (unitCents * item.quantity) / 100,
    });
  }

  // One currency per basket: the shop sells in one currency, so the first product's is the basket's.
  const currency = products[0]?.price.currency ?? 'EUR';
  return { lines, total: totalCents / 100, currency, problems };
}

/** Reserves every line; stops at the first failure (OutOfStockError, ProductNotFoundError) and rethrows it. */
export async function reserveBasket(
  client: Pick<ProductClient, 'reserve'>,
  items: BasketItem[],
): Promise<Reservation[]> {
  const reservations: Reservation[] = [];
  for (const item of items) {
    reservations.push(await client.reserve(item.productId, item.quantity));
  }
  return reservations;
}
