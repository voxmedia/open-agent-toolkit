import { realpathSync } from 'node:fs';
import { readdir, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readPersistedIntent } from '../../oat-explainer-kit/scripts/persist-intent.mjs';

function consumptionError(message) {
  const error = new Error(message);
  error.code = 'E_RECAP_CONSUMPTION';
  return error;
}

async function discoverManifestCandidates(explainersPath) {
  let entries;
  try {
    entries = await readdir(explainersPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const candidates = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (!entry.isDirectory()) continue;
    const runEntries = await readdir(join(explainersPath, entry.name), {
      withFileTypes: true,
    });
    if (
      runEntries.some(
        (runEntry) => runEntry.isFile() && runEntry.name === 'manifest.json',
      )
    ) {
      candidates.push(`explainers/${entry.name}/manifest.json`);
    }
  }
  return candidates;
}

async function resolveFailedAttemptEvidence(projectRoot, locator) {
  try {
    const { resolveProjectFailedAttemptEvidence } =
      await import('../../oat-explainer-kit/scripts/check-terminal-outcome.mjs');
    return await resolveProjectFailedAttemptEvidence({
      projectPath: projectRoot,
      locator,
    });
  } catch (error) {
    throw consumptionError(
      `Persisted failed-attempt evidence is invalid: ${error.message}`,
    );
  }
}

export async function consumePersistedRecapIntent({ projectPath }) {
  const projectRoot = await realpath(projectPath);
  const record = await readPersistedIntent({
    statePath: join(projectRoot, 'state.md'),
    product: 'projectRecap',
  });
  if (record === null) {
    throw consumptionError(
      'Completion recap intent must be persisted before consumption.',
    );
  }
  if (record.decision === 'skip') {
    const failedAttemptEvidence =
      record.source === 'failed_attempt'
        ? await resolveFailedAttemptEvidence(
            projectRoot,
            record.failed_attempt_evidence,
          )
        : null;
    return {
      decision: 'skip',
      source: record.source,
      route: 'skip',
      manifestDiscoveryPerformed: false,
      manifestCandidates: [],
      authoringPermitted: false,
      failedAttemptEvidence,
    };
  }
  if (record.decision !== 'generate') {
    throw consumptionError(
      `Unsupported persisted recap decision: ${String(record.decision)}`,
    );
  }
  const manifestCandidates = await discoverManifestCandidates(
    join(projectRoot, 'explainers'),
  );
  return {
    decision: 'generate',
    source: record.source,
    route: 'generate',
    manifestDiscoveryPerformed: true,
    manifestCandidates,
    authoringPermitted: true,
    failedAttemptEvidence: null,
  };
}

async function main(argv) {
  if (argv.length !== 1) {
    throw consumptionError(
      'Usage: consume-persisted-recap-intent.mjs <project-path>',
    );
  }
  return consumePersistedRecapIntent({ projectPath: argv[0] });
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
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      process.stderr.write(
        `${JSON.stringify({ ok: false, code: error.code, message: error.message })}\n`,
      );
      process.exitCode = 1;
    });
}
