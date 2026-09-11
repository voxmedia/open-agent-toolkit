import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

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
  manifestProvided = false,
  failure = null,
}) {
  if (reason !== undefined && !SKIP_REASONS.has(reason)) {
    throw recapOutcomeError(
      `Recap skip reason must be one of ${[...SKIP_REASONS].join(', ')}.`,
    );
  }
  if (intent === 'skip') {
    if (
      reason === 'failed_attempt' &&
      !(
        (manifestProvided && ['failed', 'incomplete'].includes(outcome)) ||
        isFlowFailure(failure)
      )
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
  let failure;
  if (manifestPath !== undefined) {
    let manifest;
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
    } catch (error) {
      throw recapOutcomeError(
        `Recap failure evidence could not be read: ${error.message}`,
      );
    }
  }
  return checkTerminalOutcome({
    intent,
    outcome,
    manifestProvided: manifestPath !== undefined,
    failure,
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

function isFlowFailure(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === 3 &&
    keys.every((key) => ['stage', 'cause', 'at'].includes(key)) &&
    typeof value.stage === 'string' &&
    value.stage.length > 0 &&
    typeof value.cause === 'string' &&
    value.cause.length > 0 &&
    typeof value.at === 'string' &&
    !Number.isNaN(Date.parse(value.at))
  );
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
