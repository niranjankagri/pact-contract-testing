package com.niranjankagri.products.reservation;

import com.niranjankagri.products.product.Product;
import com.niranjankagri.products.product.ProductNotFoundException;
import com.niranjankagri.products.product.ProductRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Takes units out of stock for a checkout. */
@Service
public class ReservationService {

    static final Duration HOLD_TIME = Duration.ofMinutes(15);

    private final ProductRepository repository;
    private final Clock clock;

    public ReservationService(ProductRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /**
     * Reserves {@code quantity} units of the product. {@code synchronized}: two checkouts must never both get the
     * last unit (check and update are one step).
     *
     * @throws ProductNotFoundException    unknown product (404)
     * @throws InsufficientStockException  not enough units (409)
     */
    public synchronized Reservation reserve(long productId, int quantity) {
        Product product = repository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        if (product.stock() < quantity) {
            throw new InsufficientStockException(productId, quantity, product.stock());
        }
        repository.save(product.withStock(product.stock() - quantity));
        return new Reservation(UUID.randomUUID(), productId, quantity, clock.instant().plus(HOLD_TIME));
    }
}
