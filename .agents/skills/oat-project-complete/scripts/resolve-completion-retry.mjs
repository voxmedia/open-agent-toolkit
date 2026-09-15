import { realpathSync } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  detectCompletionReceiptCandidate,
  recoverCompletionPinSource,
  recoverCompletionReceipts,
} from './recover-completion-receipts.mjs';

const SKIPPED_MUTATIONS = [
  'project-log',
  'review-move',
  'complete-state',
  'active-pointer',
  'pr-artifact',
];

function completionRetryError(message) {
  const error = new Error(message);
  error.code = 'E_COMPLETION_RETRY';
  return error;
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) {
      throw completionRetryError(`Missing value for ${flag ?? 'argument'}.`);
    }
    if (flag === '--project-path') result.projectPath = value;
    else if (flag === '--retained-ref') result.retainedRef = value;
    else if (flag === '--pr-artifact') result.prArtifactPath = value;
    else if (flag === '--remote') result.remote = value;
    else throw completionRetryError(`Unsupported argument: ${flag}.`);
  }
  return result;
}

async function resolvePrArtifact(projectPath) {
  let names;
  try {
    names = await readdir(join(projectPath, 'pr'));
  } catch (error) {
    throw completionRetryError(
      `Recognized completion receipt requires exactly one PR artifact: ${error.message}`,
    );
  }

  const candidates = [];
  for (const name of names.sort()) {
    if (!/^project-pr-.*\.md$/.test(name)) continue;
    const candidate = join(projectPath, 'pr', name);
    const stat = await lstat(candidate);
    if (stat.isFile() && !stat.isSymbolicLink()) {
      candidates.push(`pr/${name}`);
    }
  }
  if (candidates.length !== 1) {
    throw completionRetryError(
      'Recognized completion receipt requires exactly one regular, non-symlinked PR artifact.',
    );
  }
  return candidates[0];
}

export async function resolveCompletionRetry(options) {
  const candidateResult = await detectCompletionReceiptCandidate(options);
  if (!candidateResult.candidate) {
    return {
      status: 'continue',
      route: 'normal',
      candidate: false,
      nextStep: '3.7',
      skipMutations: false,
      skippedMutations: [],
    };
  }

  const prArtifactPath =
    options.prArtifactPath ?? (await resolvePrArtifact(options.projectPath));
  if (candidateResult.candidateType === 'pin-source') {
    const pinSource = await recoverCompletionPinSource({
      ...options,
      prArtifactPath,
    });
    return {
      ...pinSource,
      route: 'pin-source',
      candidate: true,
      nextStep: '8.6',
      skipMutations: true,
      skippedMutations: SKIPPED_MUTATIONS,
      prArtifactPath,
    };
  }
  const receipts = await recoverCompletionReceipts({
    ...options,
    prArtifactPath,
  });

  return {
    ...receipts,
    route: 'recovery',
    candidate: true,
    nextStep: '7.5',
    skipMutations: true,
    skippedMutations: SKIPPED_MUTATIONS,
    prArtifactPath,
  };
}

async function main(argv) {
  return resolveCompletionRetry(parseArguments(argv));
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
