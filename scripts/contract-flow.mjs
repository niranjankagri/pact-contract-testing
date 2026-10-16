// The whole consumer-driven contract workflow on one machine (npm run contract):
//
//   1. start the Pact Broker (Docker)
//   2. CONSUMER  checkout-web: unit + Pact tests -> pacts/checkout-web-product-service.json
//   3.           publish the pact to the broker (version = git commit, branch = git branch)
//   4. PROVIDER  product-service: verify the pacts from the broker, publish the results
//   5. can-i-deploy product-service to production? -> record the deployment
//   6. can-i-deploy checkout-web to production?    -> record the deployment
//
// CI (.github/workflows/contract.yml) runs the same steps. The broker UI is at http://localhost:9292.
import path from 'node:path';
import { BROKER_URL, ROOT, gitBranch, gitVersion, mavenProvider, pactBroker, run, step } from './lib.mjs';

const version = gitVersion();
const branch = gitBranch();
const ENVIRONMENT = 'production';

console.log(`Version ${version}, branch ${branch}, broker ${BROKER_URL}`);

if (!process.env.PACT_BROKER_BASE_URL) {
  step('1. Start the Pact Broker');
  run('npm', ['run', 'broker:up']);
}

step('2. Consumer tests (checkout-web) write the contract');
run('npm', ['test'], { cwd: path.join(ROOT, 'checkout-web') });

step('3. Publish the contract to the broker');
pactBroker(['publish', 'pacts', '--consumer-app-version', version, '--branch', branch]);

step('4. Provider verification (product-service) against the broker, results published');
mavenProvider(['test'], {
  PACT_BROKER_BASE_URL: BROKER_URL,
  PACT_PUBLISH_RESULTS: 'true',
  PROVIDER_VERSION: version,
  PROVIDER_BRANCH: branch,
});

step(`5. Can product-service ${version} go to ${ENVIRONMENT}?`);
pactBroker(['can-i-deploy', '--pacticipant', 'product-service', '--version', version, '--to-environment', ENVIRONMENT]);
pactBroker(['record-deployment', '--pacticipant', 'product-service', '--version', version, '--environment', ENVIRONMENT]);

step(`6. Can checkout-web ${version} go to ${ENVIRONMENT}?`);
pactBroker(['can-i-deploy', '--pacticipant', 'checkout-web', '--version', version, '--to-environment', ENVIRONMENT]);
pactBroker(['record-deployment', '--pacticipant', 'checkout-web', '--version', version, '--environment', ENVIRONMENT]);

console.log(`\nDone: both versions are verified against each other and recorded as deployed to ${ENVIRONMENT}.`);
console.log(`Broker: ${BROKER_URL}  (stop it with: npm run broker:down)`);
