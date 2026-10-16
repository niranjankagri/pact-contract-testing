package com.niranjankagri.products.product;

/** No product with this id: answered with 404. */
public class ProductNotFoundException extends RuntimeException {

    public ProductNotFoundException(long id) {
        super("Product " + id + " not found");
    }
}
