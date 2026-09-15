import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { lstat, readFile, realpath } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateContract } from '../../explainer-kit/scripts/lib/contracts.mjs';
import { isFlowFailureStage } from '../../explainer-kit/scripts/lib/failure.mjs';
import { loadRecipe } from '../../explainer-kit/scripts/lib/recipes.mjs';
import { validateSatisfiedRunPackage } from '../../explainer-kit/scripts/lib/run-package.mjs';

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
  throw recapOutcomeError(
    'A terminal recap outcome requires a complete satisfied project-recap package.',
  );
}

async function main(argv) {
  const { intent, manifestPath, failurePath, projectRoot, reason } =
    parseArguments(argv);
  if (manifestPath !== undefined && failurePath !== undefined) {
    throw recapOutcomeError(
      'Use either --manifest or --failure as failed-attempt evidence, not both.',
    );
  }
  if (intent === 'generate') {
    if (
      reason !== undefined ||
      failurePath !== undefined ||
      manifestPath === undefined ||
      basename(manifestPath) !== 'manifest.json'
    ) {
      throw recapOutcomeError(
        'Generated project recaps require the canonical manifest.json for a complete satisfied package.',
      );
    }
    try {
      const manifest = await validateSatisfiedRunPackage(
        dirname(manifestPath),
        loadRecipe('project-recap', '2'),
      );
      return { ok: true, intent, outcome: manifest.outcome };
    } catch (error) {
      throw recapOutcomeError(
        `Generated project recap package assurance failed: ${error.message}`,
      );
    }
  }
  if (
    (manifestPath !== undefined || failurePath !== undefined) &&
    reason !== 'failed_attempt'
  ) {
    throw recapOutcomeError(
      'Failed-attempt evidence is accepted only for a skip/failed_attempt intent.',
    );
  }
  if (projectRoot !== undefined && reason !== 'failed_attempt') {
    throw recapOutcomeError(
      'A failed-attempt project root applies only to skip/failed_attempt evidence.',
    );
  }
  if (reason === 'failed_attempt') {
    if (intent !== 'skip') {
      throw recapOutcomeError(
        'Failed-attempt evidence is accepted only for a skip/failed_attempt intent.',
      );
    }
    if (projectRoot !== undefined) {
      const suppliedPath = manifestPath ?? failurePath;
      if (suppliedPath === undefined) {
        return validateFailedAttemptEvidence({});
      }
      const canonicalProjectRoot = await realpath(projectRoot);
      const locator = relative(canonicalProjectRoot, resolve(suppliedPath))
        .split(sep)
        .join('/');
      const evidence = await resolveProjectFailedAttemptEvidence({
        projectPath: canonicalProjectRoot,
        locator,
      });
      if ((evidence.kind === 'manifest') !== (manifestPath !== undefined)) {
        throw recapOutcomeError(
          'Failed-attempt evidence kind does not match its guard flag.',
        );
      }
      return validateFailedAttemptEvidence({
        ...(evidence.kind === 'manifest'
          ? { manifestPath: evidence.path }
          : { failurePath: evidence.path }),
      });
    }
    return validateFailedAttemptEvidence({ manifestPath, failurePath });
  }
  return checkTerminalOutcome({
    intent,
    ...(reason !== undefined && { reason }),
  });
}

export async function validateFailedAttemptEvidence({
  manifestPath,
  failurePath,
}) {
  if (manifestPath !== undefined && failurePath !== undefined) {
    throw recapOutcomeError(
      'Use either --manifest or --failure as failed-attempt evidence, not both.',
    );
  }
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
    intent: 'skip',
    manifest,
    failure,
    failureRootHash,
    reason: 'failed_attempt',
  });
}

export async function resolveProjectFailedAttemptEvidence({
  projectPath,
  locator,
}) {
  try {
    if (typeof locator !== 'string') {
      throw new Error('the persisted locator is not a string');
    }
    const parts = locator.split('/');
    const runSlug = parts[1];
    const fileName = parts[2];
    if (
      parts.length !== 3 ||
      parts[0] !== 'explainers' ||
      typeof runSlug !== 'string' ||
      !/^[a-z0-9][a-z0-9._-]*$/.test(runSlug) ||
      !['manifest.json', 'failure.json'].includes(fileName)
    ) {
      throw new Error(
        'the locator must name explainers/<run-slug>/manifest.json or failure.json',
      );
    }

    const projectRoot = await realpath(projectPath);
    const explainersRoot = await realpath(join(projectRoot, 'explainers'));
    if (!isContained(projectRoot, explainersRoot)) {
      throw new Error('the explainers root escapes the project root');
    }
    const runRoot = await realpath(join(explainersRoot, runSlug));
    if (!isContained(explainersRoot, runRoot)) {
      throw new Error('the evidence run escapes the explainers root');
    }
    const evidencePath = await realpath(join(projectRoot, locator));
    if (
      !isContained(runRoot, evidencePath) ||
      basename(evidencePath) !== fileName
    ) {
      throw new Error('the evidence path escapes its declared run root');
    }
    const evidenceInfo = await lstat(evidencePath);
    if (!evidenceInfo.isFile()) {
      throw new Error('the evidence path is not a regular file');
    }

    const kind = fileName === 'manifest.json' ? 'manifest' : 'failure';
    await validateFailedAttemptEvidence({
      ...(kind === 'manifest'
        ? { manifestPath: evidencePath }
        : { failurePath: evidencePath }),
    });
    return { kind, path: evidencePath };
  } catch (error) {
    if (error?.code === 'E_RECAP_OUTCOME') throw error;
    throw recapOutcomeError(
      `Failed-attempt evidence containment failed: ${error.message}`,
    );
  }
}

function isContained(root, candidate) {
  const relation = relative(root, candidate);
  return (
    relation !== '' &&
    relation !== '..' &&
    !relation.startsWith(`..${sep}`) &&
    !isAbsolute(relation)
  );
}

function parseArguments(argv) {
  let intent;
  let manifestPath;
  let failurePath;
  let projectRoot;
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
    } else if (flag === '--project-root') {
      projectRoot = value;
    } else if (flag === '--skip-reason') {
      reason = value;
    } else {
      throw recapOutcomeError(`Unsupported argument: ${flag}.`);
    }
  }
  return { intent, manifestPath, failurePath, projectRoot, reason };
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
