package com.niranjankagri.products.reservation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.niranjankagri.products.product.ProductNotFoundException;
import com.niranjankagri.products.product.ProductRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Unit tests of the reservation rules, with a fixed clock and the demo catalogue (no Spring). */
class ReservationServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-16T10:00:00Z");

    private ProductRepository repository;
    private ReservationService service;

    @BeforeEach
    void setUp() {
        repository = new ProductRepository();
        service = new ReservationService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void reservesUnitsAndLowersTheStock() {
        Reservation reservation = service.reserve(2, 3);

        assertThat(reservation.productId()).isEqualTo(2);
        assertThat(reservation.quantity()).isEqualTo(3);
        assertThat(reservation.expiresAt()).isEqualTo(NOW.plus(ReservationService.HOLD_TIME));
        assertThat(repository.findById(2).orElseThrow().stock()).isEqualTo(1);
    }

    @Test
    void reservesTheLastUnitButNotMore() {
        service.reserve(2, 4);

        assertThatThrownBy(() -> service.reserve(2, 1))
            .isInstanceOf(InsufficientStockException.class)
            .extracting(e -> ((InsufficientStockException) e).getAvailable())
            .isEqualTo(0);
    }

    @Test
    void refusesAnUnknownProduct() {
        assertThatThrownBy(() -> service.reserve(404, 1)).isInstanceOf(ProductNotFoundException.class);
    }
}
