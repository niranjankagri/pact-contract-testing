package com.niranjankagri.products.reservation;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** POST /products/{id}/reservations: 201 with the reservation; 400, 404 or 409 otherwise. */
@RestController
public class ReservationController {

    private final ReservationService service;

    public ReservationController(ReservationService service) {
        this.service = service;
    }

    @PostMapping("/products/{id}/reservations")
    @ResponseStatus(HttpStatus.CREATED)
    public Reservation reserve(@PathVariable long id, @Valid @RequestBody ReservationRequest request) {
        return service.reserve(id, request.quantity());
    }
}
