// Errors the client turns HTTP answers into, so the checkout code never looks at status codes.

/** Any answer the client does not expect. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** 404: the product does not exist (any more). */
export class ProductNotFoundError extends ApiError {
  readonly productId: number;

  constructor(productId: number) {
    super(404, `Product ${productId} not found`);
    this.name = 'ProductNotFoundError';
    this.productId = productId;
  }
}

/** 409: fewer units in stock than requested; `available` says how many there are. */
export class OutOfStockError extends ApiError {
  readonly productId: number;
  readonly available: number;

  constructor(productId: number, available: number) {
    super(409, `Only ${available} of product ${productId} in stock`);
    this.name = 'OutOfStockError';
    this.productId = productId;
    this.available = available;
  }
}

/** 401: the token is missing or not accepted. */
export class UnauthorizedError extends ApiError {
  constructor() {
    super(401, 'Not authorised by product-service');
    this.name = 'UnauthorizedError';
  }
}
