package com.niranjankagri.products.product;

import java.time.Instant;

/**
 * A product as the API returns it. Consumers read only some fields (checkout-web uses id, name, price and
 * stock); the contract tests make sure exactly those keep working, while the others may change freely.
 *
 * @param id          product id
 * @param name        display name
 * @param description longer text, not used by checkout-web
 * @param category    category slug, for example "tools"
 * @param price       unit price
 * @param stock       units that can still be reserved
 * @param createdAt   when the product was added
 */
public record Product(long id, String name, String description, String category, Money price, int stock,
                      Instant createdAt) {

    /** The same product with a different stock level. */
    public Product withStock(int newStock) {
        return new Product(id, name, description, category, price, newStock, createdAt);
    }
}
