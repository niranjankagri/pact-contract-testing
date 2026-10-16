# Framework design

Why the project is built the way it is. The README says what it does and how to run it.

## 1. Goals

1. Show the complete consumer-driven contract workflow, not only a pact file: publish, verify, record results,
   `can-i-deploy`, record deployments, and what happens with a breaking change.
2. Show it across languages, because that is where contract tests pay off most: the consumer team (TypeScript)
   and the provider team (Java) never share code, only the contract.
3. Run the whole thing with one command, locally and in CI, with nothing paid or external (self-hosted broker).

## 2. The parts

| Part            | Role                                                                    | Tools                                            |
| --------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| checkout-web    | consumer: a checkout client that prices baskets and reserves stock      | TypeScript, fetch, Pact JS 17 (V4 spec), Vitest  |
| product-service | provider: product details and stock reservations                        | Java 17, Spring Boot 4.1, Pact JVM 4.7 (JUnit 5) |
| Pact Broker     | stores pacts, verification results, branches, environments, deployments | pactfoundation/pact-broker 2.121 + PostgreSQL 17 |
| pact-broker CLI | publish, can-i-deploy, record-deployment, create-environment            | @pact-foundation/pact-cli 18 (native binary)     |
| scripts         | run the workflow in order, check results                                | Node 24                                          |

## 3. Consumer side

- **The real client runs in the contract tests.** `ProductClient` is the production code; the test points it at
  Pact's mock server. If the client sent a different request than the contract says, the mock server would
  answer with an error and the test would fail. The contract is therefore a record of what the client really
  does, not a hand-written document.
- **Only what is used.** The response bodies in the contract contain the four product fields the client reads.
  `toProduct()` copies exactly those (a tolerant reader). The provider may add or change any other field.
- **Matchers** (`integer`, `decimal`, `regex`, `uuid`, `eachLike`) describe types and formats. The example values
  are what the mock server returns to the consumer test; the provider only has to match the shape.
- **Provider states with parameters**: `given('a product exists', { id: 1, price: 19.99, stock: 25 })`. A few
  generic states with data instead of many specific ones ("hammer with 25 in stock", "drill with 1 in stock").
- **Errors are part of the contract**: 401, 404 and 409 (with `available`) are interactions, because the client
  has code paths for them.
- **A fresh pact file per run** (Vitest global setup): Pact merges into an existing file, so a deleted test
  would otherwise leave its interaction behind.
- **Unit tests stay separate**: `priceBasket` and `reserveBasket` are tested with a fake client. The contract
  tests check the communication, not the business logic.

## 4. Provider side

- **The real application**: `@SpringBootTest(webEnvironment = RANDOM_PORT)`, so filters, validation, error
  handling and JSON serialisation are all part of the verification. No mocks of the provider's own code.
- **States** put exactly the described data into the repository before each interaction (`deleteAll`, then
  `save`). In a service with a database they would insert rows, or call the service layer.
- **The token**: the consumer cannot know a valid token, so its contract accepts any `Bearer ...`. The
  verification's request filter replaces it with a valid one, but only when the header is present: the
  "without a token" interaction must still arrive without one and get 401.
- **Two sources, one switch**: `ProductPactFolderTest` reads `../pacts` (fast local loop, no broker);
  `ProductPactBrokerTest` reads from the broker. A JUnit condition on `pactbroker.url` decides which runs; Maven
  maps the environment variable to that property.
- **Consumer version selectors** decide WHICH contracts to verify: the latest from each consumer's main branch,
  every version deployed or released somewhere, and the same-named branch (for coordinated feature work).
- **Pending pacts**: a contract this provider has never passed does not fail its build. The provider team is
  never blocked by a consumer's new, not yet supported expectation; the consumer is blocked instead, by
  `can-i-deploy`.
- **WIP pacts** (`includeWipPactsSince`): contracts from consumer feature branches are verified too, as pending,
  so consumers get feedback before they merge.
- **The provider's own tests stay**: `ProductApiTest` checks behaviour in detail (validation messages, headers,
  data). The contract does not replace them.

## 5. Broker and deployment safety

- **Versions** are the git commit; **branches** come from git (or from the CI context, where git is on a
  detached HEAD).
- **Environments**: `production` is created when missing; a new broker has none.
- **can-i-deploy** checks the matrix: for the version to deploy, against the versions of its integration
  partners recorded in that environment, is there a successful verification? Order matters on the first
  deployment: provider first (no consumers in production yet), then consumer.
- **record-deployment** after each deployment, so the next `can-i-deploy` checks against what really runs.
- **The breaking-change demo checks the reason**: a "no" because the environment does not exist would also make
  the command fail; the script asks the broker that the feature version's verification failed, and only then
  counts the demo as passed. (This check exists because the first version of the demo did count such a "no".)

## 6. Local and CI

- `npm run contract` and `npm run demo:breaking` run the same steps as CI, so a CI failure can be reproduced
  with one command.
- The scripts start the Maven wrapper by full path: `cmd.exe` does not search the current folder when
  `NoDefaultCurrentDirectoryInExePath` is set. On Linux the path is passed without quotes (no shell).
- CI uses Docker Compose for the broker (same file as locally), so `depends_on` with health checks orders
  PostgreSQL and the broker.
- The broker health check uses `127.0.0.1`: in the Alpine image `localhost` resolves to IPv6, where the broker
  does not listen.

## 7. What a real setup adds

- Separate repositories and pipelines per service, one long-lived broker with authentication.
- A webhook on `contract_requiring_verification_published` that runs the provider verification for exactly the
  changed contract.
- `can-i-deploy` with `--retry-while-unknown` in deployment pipelines, while a verification is still running.
- Message pacts for asynchronous events (Kafka, queues).
- Bi-directional contracts (PactFlow) when the provider already has an OpenAPI spec and its own tests.
