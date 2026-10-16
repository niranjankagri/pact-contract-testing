// HTTP client for product-service. The Pact tests run exactly this code against Pact's mock server, so the
// contract records the requests this client really sends and the answers it really understands.
import { ApiError, OutOfStockError, ProductNotFoundError, UnauthorizedError } from './errors.js';
import type { Product, Reservation } from './types.js';

/** Raw JSON as the provider sends it: only the parts this client reads are typed. */
interface ProductJson {
  id: number;
  name: string;
  price: { amount: number; currency: string };
  stock: number;
}

export class ProductClient {
  private readonly baseUrl: string;
  private readonly token: string | undefined;

  /** @param token the API token; without one, requests are sent without an Authorization header */
  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  /** One product. Throws ProductNotFoundError for 404. */
  async getProduct(id: number): Promise<Product> {
    const res = await this.request('GET', `/products/${id}`);
    if (res.status === 404) throw new ProductNotFoundError(id);
    await this.expect(res, 200);
    return toProduct((await res.json()) as ProductJson);
  }

  /** Several products in one call. Unknown ids are simply missing from the result. */
  async getProducts(ids: number[]): Promise<Product[]> {
    const res = await this.request('GET', `/products?ids=${ids.join(',')}`);
    await this.expect(res, 200);
    const body = (await res.json()) as { products: ProductJson[] };
    return body.products.map(toProduct);
  }

  /** Holds `quantity` units for this checkout. Throws OutOfStockError for 409, ProductNotFoundError for 404. */
  async reserve(productId: number, quantity: number): Promise<Reservation> {
    const res = await this.request('POST', `/products/${productId}/reservations`, { quantity });
    if (res.status === 404) throw new ProductNotFoundError(productId);
    if (res.status === 409) {
      const body = (await res.json()) as { available: number };
      throw new OutOfStockError(productId, body.available);
    }
    await this.expect(res, 201);
    const body = (await res.json()) as {
      reservationId: string;
      productId: number;
      quantity: number;
      expiresAt: string;
    };
    return { ...body, expiresAt: new Date(body.expiresAt) };
  }

  private request(method: string, path: string, body?: unknown): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Any other status than the expected one becomes an error (401 gets its own type). */
  private async expect(res: Response, status: number): Promise<void> {
    if (res.status === status) return;
    if (res.status === 401) throw new UnauthorizedError();
    throw new ApiError(res.status, `product-service answered ${res.status}: ${await res.text()}`);
  }
}

/** Tolerant reader: copy only the fields checkout-web uses and ignore everything else. */
function toProduct(json: ProductJson): Product {
  return {
    id: json.id,
    name: json.name,
    price: { amount: json.price.amount, currency: json.price.currency },
    stock: json.stock,
  };
}
