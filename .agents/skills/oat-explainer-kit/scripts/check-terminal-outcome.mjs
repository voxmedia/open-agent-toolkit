import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateContract } from '../../explainer-kit/scripts/lib/contracts.mjs';
import { isFlowFailureStage } from '../../explainer-kit/scripts/lib/failure.mjs';

const TERMINAL_OUTCOMES = new Set([
  'built',
  'built-needs-review',
  'failed',
  'incomplete',
]);
const SATISFIED_OUTCOMES = new Set(['built', 'built-needs-review']);

/**
 * A skip reason is the recorded `source` of the skip decision, so the guard
 * accepts exactly the sources that may produce a `skip` recap record.
 */
const SKIP_REASONS = new Set([
  'interactive',
  'failed_attempt',
  'capability_probe',
]);

export function checkTerminalOutcome({
  intent,
  outcome,
  reason,
  manifest = null,
  failure = null,
  failureRootHash = null,
}) {
  if (reason !== undefined && !SKIP_REASONS.has(reason)) {
    throw recapOutcomeError(
      `Recap skip reason must be one of ${[...SKIP_REASONS].join(', ')}.`,
    );
  }
  if (intent === 'skip') {
    if (
      reason === 'failed_attempt' &&
      !(isFailedManifest(manifest) || isFlowFailure(failure, failureRootHash))
    ) {
      throw recapOutcomeError(
        'failed_attempt requires a failed or incomplete manifest or failure.json.',
      );
    }
    return { ok: true, intent, outcome: null, reason: reason ?? null };
  }
  if (reason !== undefined) {
    throw recapOutcomeError(
      'A recap skip reason applies only to a skip intent.',
    );
  }
  if (intent !== 'generate') {
    throw recapOutcomeError('Recap intent must be generate or skip.');
  }
  if (!TERMINAL_OUTCOMES.has(outcome) || !SATISFIED_OUTCOMES.has(outcome)) {
    throw recapOutcomeError(
      'Generated project recaps require a terminal recap outcome before approval.',
    );
  }
  return { ok: true, intent, outcome };
}

async function main(argv) {
  const { intent, manifestPath, failurePath, reason } = parseArguments(argv);
  if (manifestPath !== undefined && failurePath !== undefined) {
    throw recapOutcomeError(
      'Use either --manifest or --failure as failed-attempt evidence, not both.',
    );
  }
  let outcome;
  let manifest;
  let failure;
  let failureRootHash;
  if (manifestPath !== undefined) {
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
      throw recapOutcomeError(
        `Recap manifest could not be read: ${error.message}`,
      );
    }
    outcome = manifest?.outcome;
  }
  if (failurePath !== undefined) {
    if (basename(failurePath) !== 'failure.json') {
      throw recapOutcomeError(
        'Failed-attempt evidence must name a failure.json file.',
      );
    }
    try {
      failure = JSON.parse(await readFile(failurePath, 'utf8'));
      failureRootHash = hashText(await realpath(dirname(failurePath)));
    } catch (error) {
      throw recapOutcomeError(
        `Recap failure evidence could not be read: ${error.message}`,
      );
    }
  }
  return checkTerminalOutcome({
    intent,
    outcome,
    manifest,
    failure,
    failureRootHash,
    ...(reason !== undefined && { reason }),
  });
}

function parseArguments(argv) {
  let intent;
  let manifestPath;
  let failurePath;
  let reason;
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) {
      throw recapOutcomeError(`Missing value for ${flag ?? 'argument'}.`);
    }
    if (flag === '--intent') {
      intent = value;
    } else if (flag === '--manifest') {
      manifestPath = value;
    } else if (flag === '--failure') {
      failurePath = value;
    } else if (flag === '--skip-reason') {
      reason = value;
    } else {
      throw recapOutcomeError(`Unsupported argument: ${flag}.`);
    }
  }
  return { intent, manifestPath, failurePath, reason };
}

function isFailedManifest(value) {
  if (!value || !validateContract('manifest', value).valid) return false;
  return (
    ['failed', 'incomplete'].includes(value.outcome) &&
    value.artifacts.length > 0 &&
    value.artifacts.every(({ status }) => status === 'failed')
  );
}

function isFlowFailure(value, expectedRootHash) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === 5 &&
    keys.every((key) =>
      ['schemaVersion', 'runRootHash', 'stage', 'cause', 'at'].includes(key),
    ) &&
    value.schemaVersion === 'explainer-kit.failure/v1' &&
    value.runRootHash === expectedRootHash &&
    isFlowFailureStage(value.stage) &&
    typeof value.cause === 'string' &&
    value.cause.length > 0 &&
    typeof value.at === 'string' &&
    !Number.isNaN(Date.parse(value.at))
  );
}

function hashText(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function recapOutcomeError(message) {
  const error = new Error(message);
  error.code = 'E_RECAP_OUTCOME';
  return error;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((error) => {
      process.stderr.write(
        `${JSON.stringify({ ok: false, code: error.code, message: error.message })}\n`,
      );
      process.exitCode = 1;
    });
}
