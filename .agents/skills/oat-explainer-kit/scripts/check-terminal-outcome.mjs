import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const TERMINAL_OUTCOMES = new Set([
  'built-durable',
  'built-not-durable',
  'built-needs-review',
  'failed',
]);

/**
 * A skip reason is the recorded `source` of the skip decision, so the guard
 * accepts exactly the sources that may produce a `skip` recap record.
 */
const SKIP_REASONS = new Set(['interactive', 'capability_probe']);

export function checkTerminalOutcome({ intent, outcome, reason }) {
  if (reason !== undefined && !SKIP_REASONS.has(reason)) {
    throw recapOutcomeError(
      `Recap skip reason must be one of ${[...SKIP_REASONS].join(', ')}.`,
    );
  }
  if (intent === 'skip') {
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
  if (!TERMINAL_OUTCOMES.has(outcome)) {
    throw recapOutcomeError(
      'Generated project recaps require a terminal recap outcome before approval.',
    );
  }
  return { ok: true, intent, outcome };
}

async function main(argv) {
  const { intent, manifestPath, reason } = parseArguments(argv);
  let outcome;
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
  return checkTerminalOutcome({
    intent,
    outcome,
    ...(reason !== undefined && { reason }),
  });
}

function parseArguments(argv) {
  let intent;
  let manifestPath;
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
    } else if (flag === '--skip-reason') {
      reason = value;
    } else {
      throw recapOutcomeError(`Unsupported argument: ${flag}.`);
    }
  }
  return { intent, manifestPath, reason };
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
