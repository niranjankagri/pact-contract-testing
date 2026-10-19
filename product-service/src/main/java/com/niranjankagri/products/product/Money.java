package com.niranjankagri.products.product;

import java.math.BigDecimal;

/**
 * An amount with its currency. BigDecimal, never double: 0.1 + 0.2 must be 0.3 for prices.
 *
 * @param amount   the amount, for example 19.99
 * @param currency ISO 4217 code, for example EUR
 */
public record Money(BigDecimal amount, String currency) {

    /** Euros from a string, so the amount is exact ("19.99", never 19.99 as a double). */
    public static Money eur(String amount) {
        return new Money(new BigDecimal(amount), "EUR");
    }
}
