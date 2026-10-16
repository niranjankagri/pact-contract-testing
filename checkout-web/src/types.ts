// What checkout-web needs from product-service: only these fields. The provider sends more (description,
// category, createdAt); this consumer ignores them, so the provider may change them without breaking it.

export interface Money {
  amount: number;
  currency: string;
}

export interface Product {
  id: number;
  name: string;
  price: Money;
  stock: number;
}

export interface Reservation {
  reservationId: string;
  productId: number;
  quantity: number;
  expiresAt: Date;
}

/** One line of a basket: which product and how many. */
export interface BasketItem {
  productId: number;
  quantity: number;
}
