import { pathToFileURL } from 'node:url';

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

  requireExactKeys(value, [
    'candidate',
    'evidenceCommit',
    'evidencePushRequired',
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
  if (value.evidenceCommit !== null && !FULL_SHA.test(value.evidenceCommit)) {
    throw completionRetryFieldsError(
      'Recovered completion retry evidence receipt must be null or a full commit SHA.',
    );
  }
  if (typeof value.evidencePushRequired !== 'boolean') {
    throw completionRetryFieldsError(
      'Recovered completion retry evidence push flag must be boolean.',
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
  if (value.evidenceCommit === null) {
    if (
      value.evidencePushRequired ||
      value.localCommit !== value.projectRefCommit ||
      value.remoteCommit !== value.projectRefCommit
    ) {
      throw completionRetryFieldsError(
        'Recovered completion retry receipts are contradictory without evidence.',
      );
    }
  } else if (value.evidencePushRequired) {
    if (
      value.localCommit !== value.evidenceCommit ||
      value.remoteCommit !== value.projectRefCommit
    ) {
      throw completionRetryFieldsError(
        'Recovered unpublished evidence receipts are contradictory.',
      );
    }
  } else if (
    value.localCommit !== value.evidenceCommit ||
    value.remoteCommit !== value.evidenceCommit
  ) {
    throw completionRetryFieldsError(
      'Recovered published evidence receipts are contradictory.',
    );
  }

  return [
    'recovery',
    value.projectLinksPinCommit,
    value.projectRefCommit,
    value.evidenceCommit ?? '-',
    String(value.evidencePushRequired),
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.stdout.write(`${main(process.argv.slice(2))}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, code: error.code, message: error.message })}\n`,
    );
    process.exitCode = 1;
  }
}
