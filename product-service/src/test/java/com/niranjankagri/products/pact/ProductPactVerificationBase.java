package com.niranjankagri.products.pact;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.State;
import com.niranjankagri.products.product.Money;
import com.niranjankagri.products.product.Product;
import com.niranjankagri.products.product.ProductRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.apache.hc.core5.http.HttpRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * Provider verification: Pact replays every interaction of every consumer's contract against the REAL
 * product-service (started by Spring on a random port) and compares the answers with what the consumer expects.
 *
 * Two subclasses choose where the contracts come from: the local pacts/ folder or the Pact Broker.
 * This class holds what both need: the target, the request filter and the provider states.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
abstract class ProductPactVerificationBase {

    /** A token product-service accepts (application.properties: app.api-tokens). */
    private static final String VALID_TOKEN = "Bearer dev-token-123";

    @LocalServerPort
    private int port;

    @Autowired
    private ProductRepository repository;

    /** Points each Pact interaction at the application running on the random port. */
    @BeforeEach
    void setTarget(PactVerificationContext context) {
        // context is null when there are no pacts to verify (see @IgnoreNoPactsToVerify in the folder test).
        if (context != null) {
            context.setTarget(new HttpTestTarget("localhost", port));
        }
    }

    /**
     * One test per interaction. The request filter runs before the request is sent: the consumer's contract holds
     * an example token ("Bearer test-token") that is not valid here, so it is replaced with a valid one. Only if
     * the interaction HAS the header: the "without a token" interaction must stay without one and get 401.
     */
    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verifyInteraction(PactVerificationContext context, HttpRequest request) {
        if (context == null) {
            return;
        }
        if (request.containsHeader("Authorization")) {
            request.setHeader("Authorization", VALID_TOKEN);
        }
        context.verifyInteraction();
    }

    // --- Provider states: put the data the consumer described into the repository before the interaction. ---

    /** "a product exists" {id, name, price, stock}: exactly this product, nothing else. */
    @State("a product exists")
    void productExists(Map<String, Object> params) {
        repository.deleteAll();
        repository.save(product(params));
    }

    /** "no product exists" {id}: an empty catalogue, so the id is unknown. */
    @State("no product exists")
    void noProductExists(Map<String, Object> params) {
        repository.deleteAll();
    }

    /** "products exist" {ids}: one product per id, with demo values. */
    @State("products exist")
    void productsExist(Map<String, Object> params) {
        repository.deleteAll();
        @SuppressWarnings("unchecked")
        List<Number> ids = (List<Number>) params.get("ids");
        ids.forEach(id -> repository.save(product(Map.of("id", id, "name", "Product " + id, "price", 9.99,
            "stock", 10))));
    }

    /** Builds a product from provider-state parameters (JSON numbers arrive as Integer, Long or Double). */
    private static Product product(Map<String, Object> params) {
        long id = ((Number) params.get("id")).longValue();
        String name = (String) params.getOrDefault("name", "Product " + id);
        BigDecimal price = new BigDecimal(String.valueOf(params.getOrDefault("price", "9.99")));
        int stock = ((Number) params.getOrDefault("stock", 10)).intValue();
        return new Product(id, name, "Created by a Pact provider state", "tools", new Money(price, "EUR"), stock,
            Instant.parse("2026-09-01T08:00:00Z"));
    }
}
