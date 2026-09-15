import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FULL_SHA = /^[0-9a-f]{40}$/;
const PR_ARTIFACT = /^pr\/project-pr-[^/\s]+\.md$/;
const RETAINED_REF = /^refs\/oat\/projects\/[^/\s]+$/;
const SKIPPED_MUTATIONS = [
  'project-log',
  'review-move',
  'complete-state',
  'active-pointer',
  'pr-artifact',
];

function completionRetryFieldsError(message) {
  const error = new Error(message);
  error.code = 'E_COMPLETION_RETRY_FIELDS';
  return error;
}

function requireExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    throw completionRetryFieldsError(
      `Completion retry result fields ${JSON.stringify(actual)} do not match ${JSON.stringify(sortedExpected)}.`,
    );
  }
}

function requireSkippedMutations(value) {
  if (
    !Array.isArray(value) ||
    value.length !== SKIPPED_MUTATIONS.length ||
    value.some((mutation, index) => mutation !== SKIPPED_MUTATIONS[index])
  ) {
    throw completionRetryFieldsError(
      'Recovered completion retry result has invalid skipped mutations.',
    );
  }
}

export function parseCompletionRetryFields(input) {
  let value;
  try {
    value = JSON.parse(input);
  } catch (error) {
    throw completionRetryFieldsError(
      `Completion retry result is not valid JSON: ${error.message}`,
    );
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw completionRetryFieldsError(
      'Completion retry result must be a JSON object.',
    );
  }

  if (value.status === 'continue') {
    requireExactKeys(value, [
      'candidate',
      'nextStep',
      'route',
      'skipMutations',
      'skippedMutations',
      'status',
    ]);
    if (
      value.route !== 'normal' ||
      value.candidate !== false ||
      value.nextStep !== '3.7' ||
      value.skipMutations !== false ||
      !Array.isArray(value.skippedMutations) ||
      value.skippedMutations.length !== 0
    ) {
      throw completionRetryFieldsError(
        'Normal completion retry result is contradictory or malformed.',
      );
    }
    return 'normal';
  }

  if (value.route === 'pin-source') {
    requireExactKeys(value, [
      'candidate',
      'localCommit',
      'nextStep',
      'prArtifactPath',
      'projectLinksPinCommit',
      'remoteCommit',
      'retainedRef',
      'route',
      'skipMutations',
      'skippedMutations',
      'status',
    ]);
    if (
      value.status !== 'recovered' ||
      value.candidate !== true ||
      value.nextStep !== '8.6' ||
      value.skipMutations !== true
    ) {
      throw completionRetryFieldsError(
        'Recovered pin-source retry result is contradictory or malformed.',
      );
    }
    requireSkippedMutations(value.skippedMutations);
    if (
      !FULL_SHA.test(value.localCommit) ||
      value.remoteCommit !== value.localCommit ||
      value.projectLinksPinCommit !== value.localCommit
    ) {
      throw completionRetryFieldsError(
        'Recovered pin-source retry receipts must be equal full commit SHAs.',
      );
    }
    if (
      typeof value.retainedRef !== 'string' ||
      !RETAINED_REF.test(value.retainedRef)
    ) {
      throw completionRetryFieldsError(
        'Recovered pin-source retry retained ref is malformed.',
      );
    }
    if (
      typeof value.prArtifactPath !== 'string' ||
      !PR_ARTIFACT.test(value.prArtifactPath)
    ) {
      throw completionRetryFieldsError(
        'Recovered pin-source retry PR artifact path is malformed.',
      );
    }
    return [
      'pin-source',
      value.projectLinksPinCommit,
      value.prArtifactPath,
    ].join('\t');
  }

  requireExactKeys(value, [
    'candidate',
    'localCommit',
    'nextStep',
    'prArtifactPath',
    'projectLinksPinCommit',
    'projectRefCommit',
    'remoteCommit',
    'retainedRef',
    'route',
    'skipMutations',
    'skippedMutations',
    'status',
  ]);
  if (
    value.status !== 'recovered' ||
    value.route !== 'recovery' ||
    value.candidate !== true ||
    value.nextStep !== '7.5' ||
    value.skipMutations !== true
  ) {
    throw completionRetryFieldsError(
      'Recovered completion retry result is contradictory or malformed.',
    );
  }
  requireSkippedMutations(value.skippedMutations);
  if (
    !FULL_SHA.test(value.localCommit) ||
    !FULL_SHA.test(value.remoteCommit) ||
    !FULL_SHA.test(value.projectLinksPinCommit) ||
    !FULL_SHA.test(value.projectRefCommit)
  ) {
    throw completionRetryFieldsError(
      'Recovered completion retry receipts must use full commit SHAs.',
    );
  }
  if (
    typeof value.retainedRef !== 'string' ||
    !RETAINED_REF.test(value.retainedRef)
  ) {
    throw completionRetryFieldsError(
      'Recovered completion retry retained ref is malformed.',
    );
  }
  if (
    typeof value.prArtifactPath !== 'string' ||
    !PR_ARTIFACT.test(value.prArtifactPath)
  ) {
    throw completionRetryFieldsError(
      'Recovered completion retry PR artifact path is malformed.',
    );
  }
  if (
    value.localCommit !== value.projectRefCommit ||
    value.remoteCommit !== value.projectRefCommit
  ) {
    throw completionRetryFieldsError(
      'Recovered completion retry receipts are contradictory.',
    );
  }

  return [
    'recovery',
    value.projectLinksPinCommit,
    value.projectRefCommit,
    value.prArtifactPath,
  ].join('\t');
}

function main(argv) {
  if (argv.length !== 1) {
    throw completionRetryFieldsError(
      'Expected exactly one completion retry JSON argument.',
    );
  }
  return parseCompletionRetryFields(argv[0]);
}

/**
 * Direct invocation, compared as canonical paths on both sides. Comparing a raw
 * `process.argv[1]` against `import.meta.url` makes this script a silent no-op
 * that exits 0 whenever the skill is reached through a symlinked install root,
 * and canonicalizing only one side has the same effect under
 * `--preserve-symlinks-main`, which keeps the link in `import.meta.url`.
 * A path that cannot be canonicalized is not a module Node loaded as the entry
 * point, so a thrown `realpathSync` means "not invoked directly" and returns
 * `false`; it never masks a direct run.
 */
function isDirectInvocation(invokedPath) {
  if (!invokedPath) return false;
  try {
    return (
      realpathSync(fileURLToPath(import.meta.url)) ===
      realpathSync(resolve(invokedPath))
    );
  } catch {
    return false;
  }
}

if (isDirectInvocation(process.argv[1])) {
  try {
    process.stdout.write(`${main(process.argv.slice(2))}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, code: error.code, message: error.message })}\n`,
    );
    process.exitCode = 1;
  }
}
