// Shared Pact settings: who talks to whom and where the contract (pact file) is written.
import path from 'node:path';
import { PactV4, MatchersV3 } from '@pact-foundation/pact';

/** The pact file goes to <repo>/pacts/checkout-web-product-service.json; the publish step sends it to the broker. */
export const PACT_DIR = path.resolve(import.meta.dirname, '../../../pacts');

export function createPact(): PactV4 {
  return new PactV4({
    consumer: 'checkout-web',
    provider: 'product-service',
    dir: PACT_DIR,
    logLevel: 'warn',
  });
}

const { regex } = MatchersV3;

/** Any bearer token: the provider's verification replaces it with a token that is valid there. */
export const AUTH_HEADER = { Authorization: regex(/^Bearer .+$/, 'Bearer test-token') };

/** The provider may add a charset ("application/json;charset=UTF-8"). */
export const JSON_RESPONSE = { 'Content-Type': regex(/^application\/json.*/, 'application/json') };

/** The token the client under test uses against the mock server. */
export const TEST_TOKEN = 'test-token';
