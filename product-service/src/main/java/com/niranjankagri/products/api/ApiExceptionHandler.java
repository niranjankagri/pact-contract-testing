package com.niranjankagri.products.api;

import com.niranjankagri.products.product.ProductNotFoundException;
import com.niranjankagri.products.reservation.InsufficientStockException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Turns exceptions into the API's error bodies: always {"error": "..."}, plus the details a client can act on
 * ("field" for 400, "available" for 409). Consumers depend on these shapes, so the contract covers them.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    /** 404 with the message, for example "Product 999 not found". */
    @ExceptionHandler(ProductNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> notFound(ProductNotFoundException e) {
        return Map.of("error", e.getMessage());
    }

    /** 409 with the number of units still available, so the checkout can offer that many. */
    @ExceptionHandler(InsufficientStockException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, Object> outOfStock(InsufficientStockException e) {
        return Map.of("error", "Not enough stock", "available", e.getAvailable());
    }

    /** 400 for a broken validation rule: the first field error as text plus the field name. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> invalid(MethodArgumentNotValidException e) {
        var error = e.getBindingResult().getFieldErrors().get(0);
        return Map.of("error", error.getField() + " " + error.getDefaultMessage(), "field", error.getField());
    }

    /** 400 for a body that is not valid JSON or an id that is not a number; no internal details in the answer. */
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> unreadable(Exception e) {
        return Map.of("error", "Malformed request");
    }
}
