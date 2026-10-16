package com.niranjankagri.products.reservation;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Body of POST /products/{id}/reservations. Checked by Bean Validation; a broken rule answers 400.
 *
 * @param quantity units to reserve, 1 to 100
 */
public record ReservationRequest(@NotNull @Min(1) @Max(100) Integer quantity) {
}
