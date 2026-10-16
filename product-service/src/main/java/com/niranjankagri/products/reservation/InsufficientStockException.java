package com.niranjankagri.products.reservation;

/** More units requested than are in stock: answered with 409 and the available number. */
public class InsufficientStockException extends RuntimeException {

    private final int available;

    public InsufficientStockException(long productId, int requested, int available) {
        super("Not enough stock for product " + productId + ": requested " + requested + ", available " + available);
        this.available = available;
    }

    public int getAvailable() {
        return available;
    }
}
