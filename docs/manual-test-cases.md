# Manual test cases

The test cases this project automates, written as a tester would run them by hand. Every case has an
ID; the test that covers it starts with the same ID (`[TC-304] reserves stock for a product`,
`tc206_answers409WithTheAvailableStock` with `@DisplayName("[TC-206] ...")`), so a failure in a report
leads straight to the case below.

| ID range | Area | Automated in |
|---|---|---|
| TC-201 to TC-207 | product-service REST API (provider) | `product-service/.../ProductApiTest.java` |
| TC-301 to TC-307 | Contract checkout-web → product-service (consumer expectations) | `checkout-web/test/pact/*.pact.test.ts`, verified against the provider by `ProductPactFolderTest` / `ProductPactBrokerTest` |

The Pact interaction descriptions (`uponReceiving(...)`) are **not** renamed: they identify each
interaction in the pact file and in the broker, so a new description would look like a new contract.
Not listed: unit tests (`checkout-web/test/unit`, `ReservationServiceTest`).

## Setup

- product-service: `cd product-service`, `./mvnw spring-boot:run` (port 8080). Token: header
  `Authorization: Bearer dev-token-123`.
- Demo catalogue (reset at start): product 1 Claw hammer `19.99 EUR`, stock 25, created
  `2026-09-01T08:00:00Z`; product 2 Cordless drill; a product in category `safety` (Safety goggles).
- A manual contract case sends the consumer's request to the running provider and compares the answer
  with what checkout-web expects (the shape, not the exact example values).

## Summary

| ID | Title | Type | Priority |
|---|---|---|---|
| TC-201 | A product comes back with its price (amount + currency) and an ISO date | API | High |
| TC-202 | An unknown product is 404 with the agreed error body | API / Negative | High |
| TC-203 | The list filters by ids and by category | API | Medium |
| TC-204 | No token and a wrong token are both 401 | API / Security | High |
| TC-205 | An invalid reservation body is 400 | API / Negative | Medium |
| TC-206 | Reserving more than the stock is 409 with the available units | API / Negative | High |
| TC-207 | The health endpoint needs no token | API | Low |
| TC-301 | Contract: get one product | Contract | High |
| TC-302 | Contract: 404 for a product that does not exist | Contract | High |
| TC-303 | Contract: several products by id in one request | Contract | Medium |
| TC-304 | Contract: reserve stock for a product | Contract | High |
| TC-305 | Contract: 409 with the available stock when there is not enough | Contract | High |
| TC-306 | Contract: 401 without a token | Contract / Security | High |
| TC-307 | Contract (feature in progress): product discount | Contract | Low |

---

## Provider API (`ProductApiTest`)

### TC-201 A product comes back with its price (amount + currency) and an ISO date

| # | Step | Expected result |
|---|---|---|
| 1 | `GET /products/1` with the token | `200`; `"name":"Claw hammer"`, `"price":{"amount":19.99,"currency":"EUR"}`, `"createdAt":"2026-09-01T08:00:00Z"` |

### TC-202 An unknown product is 404 with the agreed error body

| # | Step | Expected result |
|---|---|---|
| 1 | `GET /products/999` with the token | `404`; body exactly `{"error":"Product 999 not found"}` |

### TC-203 The list filters by ids and by category

| # | Step | Expected result |
|---|---|---|
| 1 | `GET /products?ids=3,1,77` | Products 1 and 3 in id order; unknown id 77 left out; no product 2 |
| 2 | `GET /products?category=safety` | Safety goggles; no Claw hammer |

### TC-204 No token and a wrong token are both 401

| # | Step | Expected result |
|---|---|---|
| 1 | `GET /products/1` without `Authorization` | `401` |
| 2 | Same with `Authorization: Bearer nope` | `401`; header `WWW-Authenticate: Bearer` |

### TC-205 An invalid reservation body is 400

| # | Step | Expected result |
|---|---|---|
| 1 | `POST /products/1/reservations` `{"quantity":0}` | `400`; the body names `"field":"quantity"` |
| 2 | Same with body `{oops` (not JSON) | `400` |

### TC-206 Reserving more than the stock is 409 with the available units

| # | Step | Expected result |
|---|---|---|
| 1 | `POST /products/2/reservations` `{"quantity":50}` | `409`; `"error":"Not enough stock"`, `"available":4` |

### TC-207 The health endpoint needs no token

| # | Step | Expected result |
|---|---|---|
| 1 | `GET /actuator/health` without a token | `200` |

## Contract (`checkout-web/test/pact`)

Each case names the provider state the request needs (set up by the verification test's `@State`
methods), the request checkout-web sends, and the answer it relies on. "Any" means the type matters,
not the example value.

### TC-301 Contract: get one product

| Field | Value |
|---|---|
| Provider state | a product exists (id 1, Claw hammer, 19.99, stock 25) |
| Request | `GET /products/1`, `Authorization: Bearer <any>` |
| Expected | `200`, JSON: `id`, `name`, `price` {`amount`, `currency`}, `stock` of the right types; checkout-web reads it as Claw hammer, 19.99 EUR, stock 25 |

### TC-302 Contract: 404 for a product that does not exist

| Field | Value |
|---|---|
| Provider state | no product exists (id 999) |
| Request | `GET /products/999` with a token |
| Expected | `404`, JSON `{"error": <any text>}`; checkout-web raises "product not found" |

### TC-303 Contract: several products by id in one request

| Field | Value |
|---|---|
| Provider state | products exist (ids 1, 2) |
| Request | `GET /products?ids=1,2` with a token |
| Expected | `200`, `{"products": [ ... ]}`, at least one product of the TC-301 shape, prices in EUR |

### TC-304 Contract: reserve stock for a product

| Field | Value |
|---|---|
| Provider state | a product exists (id 1, stock 25) |
| Request | `POST /products/1/reservations`, JSON `{"quantity":2}` with a token |
| Expected | `201`; `reservationId` (UUID), `productId` (integer), `quantity` `2`, `expiresAt` (ISO instant with milliseconds) |

### TC-305 Contract: 409 with the available stock when there is not enough

| Field | Value |
|---|---|
| Provider state | a product exists (id 2, Cordless drill, stock 1) |
| Request | `POST /products/2/reservations`, `{"quantity":5}` with a token |
| Expected | `409`; `{"error": <any text>, "available": <integer>}`; checkout-web raises "out of stock" with the available count |

### TC-306 Contract: 401 without a token

| Field | Value |
|---|---|
| Provider state | a product exists (id 1) |
| Request | `GET /products/1` **without** `Authorization` |
| Expected | `401`; `{"error": <any text>}` ("Missing or invalid token"); checkout-web raises "unauthorized" |

### TC-307 Contract (feature in progress): product discount

Runs only in the breaking-change demo (`PACT_DISCOUNTS=1`, `scripts/breaking-change-demo.mjs`).

| Field | Value |
|---|---|
| Provider state | a product exists (id 1) |
| Request | `GET /products/1` with a token |
| Expected by checkout-web | `200`; `id` (integer) and `discountPercent` (decimal, e.g. 10.5) |
| Today | product-service sends no `discountPercent`, so verification fails and `can-i-deploy` stops checkout-web from deploying: this is the expected outcome until the provider supports discounts |
