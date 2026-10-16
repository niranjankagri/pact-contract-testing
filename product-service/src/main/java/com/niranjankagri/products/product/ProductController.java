package com.niranjankagri.products.product;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read endpoints: one product, or several by id and/or category. */
@RestController
@RequestMapping("/products")
public class ProductController {

    private final ProductRepository repository;

    public ProductController(ProductRepository repository) {
        this.repository = repository;
    }

    /** GET /products/{id}: 200 with the product, or 404 (see ApiExceptionHandler). */
    @GetMapping("/{id}")
    public Product get(@PathVariable long id) {
        return repository.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
    }

    /**
     * GET /products?ids=1,2&category=tools: matching products sorted by id, wrapped in {"products": [...]}.
     * Unknown ids are left out, not an error: a basket can hold a product that was removed meanwhile.
     */
    @GetMapping
    public Map<String, List<Product>> list(@RequestParam(required = false) List<Long> ids,
                                           @RequestParam(required = false) String category) {
        List<Product> products = repository.findAll().stream()
            .filter(product -> ids == null || ids.contains(product.id()))
            .filter(product -> category == null || category.equals(product.category()))
            .sorted(Comparator.comparingLong(Product::id))
            .toList();
        return Map.of("products", products);
    }
}
