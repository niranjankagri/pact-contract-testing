// Prints the broker's compatibility matrix as a Markdown table (CI appends it to the run's summary page):
// which consumer version was verified against which provider version, and with what result.
import { BROKER_URL } from './lib.mjs';

const url =
  `${BROKER_URL}/matrix?q[][pacticipant]=checkout-web&q[][pacticipant]=product-service&latestby=cvpv`;
const response = await fetch(url, { headers: { Accept: 'application/hal+json' } });
if (!response.ok) {
  console.error(`Broker answered ${response.status} for ${url}`);
  process.exit(1);
}
const { matrix } = await response.json();

const branchOf = (version) => version?.branchVersions?.[0]?.name ?? '';
const lines = [
  '## Pact Broker: verification matrix',
  '',
  '| Consumer version | Consumer branch | Provider version | Verified |',
  '|---|---|---|---|',
  ...matrix.map((row) => {
    const result = row.verificationResult;
    const verified = result ? (result.success ? '✅ yes' : '❌ failed') : '⏳ not verified';
    return `| checkout-web ${row.consumer.version.number} | ${branchOf(row.consumer.version)} | product-service ${row.provider.version?.number ?? '-'} | ${verified} |`;
  }),
  '',
  'The ❌ row is the breaking-change demo: a consumer feature branch that expects a field the provider does not send yet. Its can-i-deploy says no; the provider build stays green because the pact is pending.',
];
console.log(lines.join('\n'));
