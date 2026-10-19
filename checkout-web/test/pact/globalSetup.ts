// Runs once before the test files: deletes the old pact file. Pact merges new interactions into an existing
// file, so without this an interaction that was removed from the tests (or written by the discounts demo) would
// stay in the contract.
import { rmSync } from 'node:fs';
import path from 'node:path';
import { PACT_DIR } from './pactSetup.js';

/** Vitest calls this once before all test files. */
export default function setup(): void {
  rmSync(path.join(PACT_DIR, 'checkout-web-product-service.json'), { force: true });
}
