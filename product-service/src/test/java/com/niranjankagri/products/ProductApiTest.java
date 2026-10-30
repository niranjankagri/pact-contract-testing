package com.niranjankagri.products;

import static org.assertj.core.api.Assertions.assertThat;

import com.niranjankagri.products.product.ProductRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * The provider's own HTTP tests: the running app on a random port, called with Java's HttpClient. They check
 * behaviour in detail; the Pact verification (package pact) checks what consumers rely on.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProductApiTest {

    private static final String TOKEN = "Bearer dev-token-123";
    private final HttpClient http = HttpClient.newHttpClient();

    @LocalServerPort
    private int port;

    @Autowired
    private ProductRepository repository;

    /**
     * Spring reuses one application context for all test classes with the same setup, so the Pact provider
     * states may have changed the catalogue: every test starts from the demo data.
     */
    @BeforeEach
    void resetCatalogue() {
        repository.seed();
    }

    /** Sends one request to the running service, with the Authorization header only when a token is given. */
    private HttpResponse<String> send(String method, String path, String token, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header("Content-Type", "application/json")
            .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        if (token != null) {
            request.header("Authorization", token);
        }
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    /** A product comes back with its price as amount and currency, and the date in ISO format. */
    @Test
    @DisplayName("[TC-201] A product comes back with its price as amount and currency, and an ISO date")
    void tc201_returnsAProductWithPriceAndIsoDate() throws Exception {
        HttpResponse<String> response = send("GET", "/products/1", TOKEN, null);

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body())
            .contains("\"name\":\"Claw hammer\"")
            .contains("\"price\":{\"amount\":19.99,\"currency\":\"EUR\"}")
            .contains("\"createdAt\":\"2026-09-01T08:00:00Z\"");
    }

    /** An unknown product is 404 with exactly the agreed error body. */
    @Test
    @DisplayName("[TC-202] An unknown product is 404 with the agreed error body")
    void tc202_answers404ForAnUnknownProduct() throws Exception {
        HttpResponse<String> response = send("GET", "/products/999", TOKEN, null);

        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(response.body()).isEqualTo("{\"error\":\"Product 999 not found\"}");
    }

    /** The list filters by ids (unknown ids are left out, the order is by id) and by category. */
    @Test
    @DisplayName("[TC-203] The list filters by ids and by category")
    void tc203_listsProductsByIdsAndCategory() throws Exception {
        assertThat(send("GET", "/products?ids=3,1,77", TOKEN, null).body())
            .containsSubsequence("\"id\":1", "\"id\":3")
            .doesNotContain("\"id\":2");
        assertThat(send("GET", "/products?category=safety", TOKEN, null).body())
            .contains("Safety goggles")
            .doesNotContain("Claw hammer");
    }

    /** No token and a wrong token are both 401, with the WWW-Authenticate header. */
    @Test
    @DisplayName("[TC-204] No token and a wrong token are both 401")
    void tc204_refusesRequestsWithoutAValidToken() throws Exception {
        assertThat(send("GET", "/products/1", null, null).statusCode()).isEqualTo(401);
        HttpResponse<String> wrong = send("GET", "/products/1", "Bearer nope", null);
        assertThat(wrong.statusCode()).isEqualTo(401);
        assertThat(wrong.headers().firstValue("WWW-Authenticate")).hasValue("Bearer");
    }

    /** A quantity of 0 is a 400 naming the field; a body that is not JSON is a 400 too. */
    @Test
    @DisplayName("[TC-205] An invalid reservation body is 400")
    void tc205_validatesTheReservationBody() throws Exception {
        HttpResponse<String> zero = send("POST", "/products/1/reservations", TOKEN, "{\"quantity\":0}");
        assertThat(zero.statusCode()).isEqualTo(400);
        assertThat(zero.body()).contains("\"field\":\"quantity\"");

        assertThat(send("POST", "/products/1/reservations", TOKEN, "{oops").statusCode()).isEqualTo(400);
    }

    /** Reserving more than the stock is a 409 that says how many units are available. */
    @Test
    @DisplayName("[TC-206] Reserving more than the stock is 409 with the available units")
    void tc206_answers409WithTheAvailableStock() throws Exception {
        HttpResponse<String> response = send("POST", "/products/2/reservations", TOKEN, "{\"quantity\":50}");

        assertThat(response.statusCode()).isEqualTo(409);
        assertThat(response.body()).contains("\"available\":4").contains("\"error\":\"Not enough stock\"");
    }

    /** The health endpoint is reachable without a token. */
    @Test
    @DisplayName("[TC-207] The health endpoint needs no token")
    void tc207_healthNeedsNoToken() throws Exception {
        assertThat(send("GET", "/actuator/health", null, null).statusCode()).isEqualTo(200);
    }
}
