package com.niranjankagri.products.product;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

/**
 * In-memory product store, filled with demo data at start. A real service would use a database; the Pact
 * provider tests prepare their data through {@link #save} and {@link #deleteAll} (provider states).
 */
@Repository
public class ProductRepository {

    private final Map<Long, Product> products = new ConcurrentHashMap<>();

    public ProductRepository() {
        seed();
    }

    /** Puts the demo catalogue back. */
    public final void seed() {
        products.clear();
        Instant added = Instant.parse("2026-09-01T08:00:00Z");
        List.of(
                new Product(1, "Claw hammer", "16 oz steel claw hammer", "tools", Money.eur("19.99"), 25, added),
                new Product(2, "Cordless drill", "18 V drill with two batteries", "tools", Money.eur("89.00"), 4, added),
                new Product(3, "Safety goggles", "Anti-fog, EN 166", "safety", Money.eur("7.50"), 120, added))
            .forEach(this::save);
    }

    public Optional<Product> findById(long id) {
        return Optional.ofNullable(products.get(id));
    }

    public Collection<Product> findAll() {
        return products.values();
    }

    public Product save(Product product) {
        products.put(product.id(), product);
        return product;
    }

    public void deleteAll() {
        products.clear();
    }
}
