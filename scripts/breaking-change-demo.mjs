// What happens when a consumer expects something the provider does not offer yet (npm run demo:breaking).
// Run `npm run contract` first, so main and production are already in the broker.
//
// Story: on branch feature/discounts, checkout-web starts reading "discountPercent" from product-service,
// which product-service does not send yet.
//
//   1. the consumer's tests pass (they run against Pact's mock server, which returns what the contract says)
//   2. the new contract is published from the feature branch
//   3. the provider's normal build verifies it as a WIP/PENDING pact: the verification FAILS, but the provider's
//      build stays green, so a consumer's unfinished feature never blocks the provider team
//   4. can-i-deploy for the consumer's feature version says NO: the failed verification is recorded
//
// The script itself succeeds only if step 4 really says no.
import path from 'node:path';
import { BROKER_URL, ROOT, gitBranch, gitVersion, mavenProvider, pactBroker, run, step } from './lib.mjs';

const providerVersion = gitVersion();
const consumerVersion = `${providerVersion}-discounts`;
const FEATURE_BRANCH = 'feature/discounts';

step(`1. Consumer on ${FEATURE_BRANCH}: tests including the new discount expectation`);
run('npm', ['test'], { cwd: path.join(ROOT, 'checkout-web'), env: { PACT_DISCOUNTS: '1' } });

step('2. Publish the feature-branch contract');
pactBroker(['publish', 'pacts', '--consumer-app-version', consumerVersion, '--branch', FEATURE_BRANCH]);

step('3. Provider build on main verifies it as a pending (WIP) pact: fails, but does not break the build');
mavenProvider(['test'], {
  PACT_BROKER_BASE_URL: BROKER_URL,
  PACT_PUBLISH_RESULTS: 'true',
  PROVIDER_VERSION: providerVersion,
  PROVIDER_BRANCH: gitBranch(),
});

step(`4. Can checkout-web ${consumerVersion} go to production? (expected: no)`);
const exitCode = pactBroker(
  ['can-i-deploy', '--pacticipant', 'checkout-web', '--version', consumerVersion, '--to-environment', 'production'],
  { allowFailure: true },
);

// Clean up: the next normal run must not see the discount interaction in pacts/.
step('5. Rewrite the pact file without the feature');
run('npm', ['test'], { cwd: path.join(ROOT, 'checkout-web') });

if (exitCode === 0) {
  console.error('\nUnexpected: can-i-deploy allowed a contract the provider does not fulfil.');
  process.exit(1);
}
console.log('\nAs expected: the provider stayed green, and can-i-deploy blocked the consumer feature version.');
