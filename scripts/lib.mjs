// Helpers shared by the workflow scripts: run a command visibly, read git, call the Pact Broker CLI.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const BROKER_URL = process.env.PACT_BROKER_BASE_URL ?? 'http://localhost:9292';
const IS_WINDOWS = process.platform === 'win32';

/** Prints a step header, so the output reads like a checklist. */
export function step(title) {
  console.log(`\n=== ${title} ===`);
}

/**
 * Runs a command with its output shown live. Returns the exit code; throws on a non-zero code unless
 * `allowFailure` is set (used where a failure is the expected result).
 */
export function run(command, args, { cwd = ROOT, env = {}, allowFailure = false } = {}) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: IS_WINDOWS, // npm, npx and mvnw are .cmd files on Windows
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`"${command} ${args.join(' ')}" failed with exit code ${result.status}`);
  }
  return result.status;
}

/** Output of a git command, trimmed. */
function git(...args) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
}

/**
 * The version every Pact record is tied to: the commit, marked when there are uncommitted changes. In this
 * repository consumer and provider share the commit; in real life each has its own repository and version.
 */
export function gitVersion() {
  const sha = process.env.GIT_SHA ?? git('rev-parse', '--short', 'HEAD');
  const dirty = !process.env.GIT_SHA && git('status', '--porcelain') !== '';
  return dirty ? `${sha}+local` : sha;
}

export function gitBranch() {
  return process.env.GIT_BRANCH ?? git('rev-parse', '--abbrev-ref', 'HEAD');
}

/**
 * Creates the deployment environment in the broker unless it exists. can-i-deploy --to-environment and
 * record-deployment need it; a new broker has none.
 */
export async function ensureEnvironment(name) {
  const response = await fetch(`${BROKER_URL}/environments?name=${encodeURIComponent(name)}`, {
    headers: { Accept: 'application/hal+json' },
  });
  const body = await response.json();
  if ((body._embedded?.environments ?? []).length > 0) return;
  pactBroker(['create-environment', '--name', name, '--production']);
}

/**
 * The broker's verification result for one consumer version against the provider: true, false, or undefined
 * when it was never verified. Used to check WHY can-i-deploy said no.
 */
export async function verificationResult(consumerVersion) {
  const url = `${BROKER_URL}/matrix?q[][pacticipant]=checkout-web&q[][version]=${encodeURIComponent(consumerVersion)}&q[][pacticipant]=product-service&latestby=cvpv`;
  const { matrix } = await (await fetch(url, { headers: { Accept: 'application/hal+json' } })).json();
  return matrix[0]?.verificationResult?.success;
}

/** pact-broker CLI (from @pact-foundation/pact-cli) against the broker. */
export function pactBroker(args, options = {}) {
  return run('npx', ['pact-broker', ...args, '--broker-base-url', BROKER_URL], options);
}

/**
 * The provider's Maven wrapper, called by its full path: cmd.exe does not search the current folder when
 * NoDefaultCurrentDirectoryInExePath is set (some locked-down machines and tools set it).
 */
export function mavenProvider(args, env) {
  const dir = path.join(ROOT, 'product-service');
  const mvnw = path.join(dir, IS_WINDOWS ? 'mvnw.cmd' : 'mvnw');
  // Quotes only for cmd.exe (the path may contain spaces); without a shell they would become part of the name.
  return run(IS_WINDOWS ? `"${mvnw}"` : mvnw, ['-B', '-q', ...args], { cwd: dir, env });
}
