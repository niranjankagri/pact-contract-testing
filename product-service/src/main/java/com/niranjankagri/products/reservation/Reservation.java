package com.niranjankagri.products.reservation;

import java.time.Instant;
import java.util.UUID;

/**
 * Units of a product held for one checkout until {@code expiresAt}.
 *
 * @param reservationId random id
 * @param productId     the reserved product
 * @param quantity      reserved units
 * @param expiresAt     when the hold ends (15 minutes after it was made)
 */
public record Reservation(UUID reservationId, long productId, int quantity, Instant expiresAt) {
}
