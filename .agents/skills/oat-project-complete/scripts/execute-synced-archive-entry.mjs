import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import {
  isAbsolute,
  posix,
  relative,
  sep,
  resolve,
  join,
  dirname,
  basename,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { validateSyncedArchiveTerminalReport } from './finalize-synced-archive.mjs';
import { resolveSyncedArchiveEntry } from './resolve-synced-archive-entry.mjs';

const execFile = promisify(execFileCallback);

function executionError(message) {
  const error = new Error(message);
  error.code = 'E_SYNCED_ARCHIVE_EXECUTION';
  return error;
}

async function buildPostArchiveContinuation(
  archiveReport,
  projectPath,
  repoRoot,
) {
  let selectedProjectRecapRun = '';
  let exportedManifestPath = '';
  let exportedPagePath = '';
  const canonicalPath = (value) => {
    try {
      return realpathSync(value);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = dirname(value);
      if (parent === value) throw error;
      return join(canonicalPath(parent), basename(value));
    }
  };
  const recap = archiveReport.projectRecapExport;
  if (recap != null) {
    const inside = (root, target) => {
      if (typeof target !== 'string' || !isAbsolute(target)) return null;
      const child = relative(canonicalPath(root), canonicalPath(target))
        .split(sep)
        .join('/');
      return child && !/^\.\.(?:[/\\]|$)/.test(child) && !isAbsolute(child)
        ? child
        : null;
    };
    selectedProjectRecapRun =
      inside(projectPath, recap.sourceRunRoot) ??
      inside(archiveReport.archivePath, recap.sourceRunRoot);
    const exportRelative = inside(
      join(repoRoot, '.oat/repo/reference/project-recaps'),
      recap.exportRoot,
    );
    if (
      !selectedProjectRecapRun?.startsWith('explainers/') ||
      !exportRelative
    ) {
      throw executionError(
        'Archive resume recap source or export is outside its allowed root.',
      );
    }
    const repoRelativeExport = relative(
      canonicalPath(repoRoot),
      canonicalPath(recap.exportRoot),
    )
      .split(sep)
      .join('/');
    if (
      recap.manifest?.relativePath === 'manifest.json' &&
      recap.page == null
    ) {
      // Persisted pre-flat-export receipts remain readable.
      exportedManifestPath = posix.join(repoRelativeExport, 'manifest.json');
    } else {
      const page = recap.page;
      const sourcePage = page?.sourceRelativePath;
      if (
        exportRelative !== `${archiveReport.snapshotId}.html` ||
        typeof recap.runId !== 'string' ||
        !recap.runId ||
        !Number.isInteger(recap.verifiedArtifactCount) ||
        recap.verifiedArtifactCount < 1 ||
        typeof sourcePage !== 'string' ||
        !sourcePage.startsWith('site/') ||
        !sourcePage.endsWith('.html') ||
        sourcePage.split('/').some((part) => part === '..') ||
        !/^sha256:[0-9a-f]{64}$/.test(page?.originalSha256) ||
        !/^sha256:[0-9a-f]{64}$/.test(page?.exportedSha256)
      )
        throw executionError(
          'Archive resume report has an invalid flat recap receipt.',
        );
      const archivedRun = join(
        archiveReport.archivePath,
        selectedProjectRecapRun,
      );
      const hash = (bytes) =>
        `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
      try {
        if (
          !inside(archiveReport.archivePath, archivedRun) ||
          !inside(archivedRun, join(archivedRun, sourcePage)) ||
          !inside(archivedRun, join(archivedRun, 'manifest.json'))
        )
          throw new Error('archived source escapes its root');
        const manifest = JSON.parse(
          await readFile(join(archivedRun, 'manifest.json'), 'utf8'),
        );
        const original = await readFile(join(archivedRun, sourcePage));
        const exported = await readFile(recap.exportRoot);
        if (
          manifest.runId !== recap.runId ||
          Object.keys(manifest.immutableHashes).length !==
            recap.verifiedArtifactCount ||
          !manifest.artifacts.some(
            (artifact) =>
              (artifact.renderedPath ?? artifact.contentPath) === sourcePage,
          ) ||
          manifest.immutableHashes[sourcePage] !== page.originalSha256 ||
          hash(original) !== page.originalSha256 ||
          hash(exported) !== page.exportedSha256
        )
          throw new Error('run, page, or hash mismatch');
      } catch (error) {
        throw executionError(
          `Archive resume flat recap identity failed: ${error.message}`,
        );
      }
      exportedPagePath = repoRelativeExport;
    }
  }
  return {
    required: true,
    rejoinStep: '8.5',
    archivePath: archiveReport.archivePath,
    summaryExportFile: archiveReport.summaryExportFile ?? '',
    lifecycleCommit: archiveReport.lifecycleCommit,
    s3Path: archiveReport.s3Path ?? '',
    selectedProjectRecapRun,
    projectRecapExport: archiveReport.projectRecapExport ?? null,
    exportedManifestPath,
    exportedPagePath,
  };
}

export async function continueSyncedArchiveCompletion({
  executionResult,
  finalizeLinks,
  refreshDashboard,
  pushBookkeeping,
  closeoutPr,
  clearPointer,
  confirmCompletion,
}) {
  if (
    executionResult?.route !== 'archive-resumed' ||
    executionResult?.terminal !== true ||
    executionResult?.terminalReceiptValidated !== true ||
    executionResult?.continuation?.required !== true
  ) {
    throw executionError(
      'Post-archive continuation requires a finalized archive-resume result.',
    );
  }
  await finalizeLinks(executionResult.continuation);
  await refreshDashboard(executionResult.continuation);
  await pushBookkeeping(executionResult.continuation);
  await closeoutPr(executionResult.continuation);
  await clearPointer(executionResult.archiveReport);
  await confirmCompletion(executionResult.continuation);
  return {
    status: 'ok',
    route: 'completion-confirmed',
    lifecycleCommit: executionResult.continuation.lifecycleCommit,
  };
}

export async function executeSyncedArchiveEntry({
  record,
  projectName,
  projectPath,
  repoRoot,
  probeRefs,
  pullProject,
  runActiveWorkflowSteps,
  archiveProject,
  validateArchive,
}) {
  const entry = record
    ? await resolveSyncedArchiveEntry({
        record,
        projectName,
        repoRoot,
        ...(probeRefs ? { probeRefs } : {}),
      })
    : {
        status: 'ok',
        route: 'archive-resume',
        terminal: true,
        archiveSnapshot: null,
        verifiedSourceSha: null,
      };

  if (entry.route === 'pull') {
    await pullProject(projectPath);
    await runActiveWorkflowSteps();
    return {
      status: 'ok',
      route: 'continue-active',
      terminal: false,
      skippedActiveSteps: false,
    };
  }

  const archiveReport = await archiveProject(projectPath, {
    ...(entry.archiveSnapshot
      ? {
          archiveSnapshot: entry.archiveSnapshot,
          verifiedSourceSha: entry.verifiedSourceSha,
        }
      : { recordless: true }),
  });
  if (entry.archiveSnapshot) {
    if (
      archiveReport?.snapshotId !== entry.archiveSnapshot ||
      archiveReport?.verifiedSourceSha !== entry.verifiedSourceSha
    ) {
      throw executionError(
        'Archive resume report does not match the persisted snapshot identity.',
      );
    }
  } else if (
    typeof archiveReport?.snapshotId !== 'string' ||
    archiveReport.snapshotId.length === 0
  ) {
    throw executionError(
      'Recordless archive resume report has no persisted snapshot identity.',
    );
  }
  await validateArchive({
    archiveReport,
    projectName,
  });
  return {
    status: 'ok',
    route: 'archive-resumed',
    terminal: true,
    skippedActiveSteps: true,
    archiveSnapshot: archiveReport.snapshotId,
    archiveReport,
    terminalReceiptValidated: true,
    continuation: await buildPostArchiveContinuation(
      archiveReport,
      projectPath,
      repoRoot,
    ),
  };
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) {
      throw executionError(`Missing value for ${flag ?? 'argument'}.`);
    }
    if (flag === '--repo-root') result.repoRoot = value;
    else if (flag === '--record-path') result.recordPath = value;
    else if (flag === '--project-name') result.projectName = value;
    else if (flag === '--project-path') result.projectPath = value;
    else throw executionError(`Unsupported argument: ${flag}.`);
  }
  for (const field of [
    'repoRoot',
    'recordPath',
    'projectName',
    'projectPath',
  ]) {
    if (!result[field]) throw executionError(`Missing required ${field}.`);
  }
  return result;
}

async function readRecord(recordPath) {
  try {
    return JSON.parse(await readFile(recordPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw executionError(
      `Unable to read synced discovery record: ${error.message}`,
    );
  }
}

async function runOat(args, cwd) {
  try {
    return await execFile('oat', args, { cwd });
  } catch (error) {
    throw executionError(`oat ${args.join(' ')} failed: ${error.message}`);
  }
}

async function main(argv) {
  const options = parseArguments(argv);
  const record = await readRecord(options.recordPath);
  return executeSyncedArchiveEntry({
    ...options,
    record,
    pullProject: async (projectPath) => {
      await runOat(['project', 'pull', projectPath], options.repoRoot);
    },
    runActiveWorkflowSteps: async () => undefined,
    archiveProject: async (projectPath) => {
      const { stdout } = await runOat(
        ['project', 'archive', projectPath, '--json'],
        options.repoRoot,
      );
      try {
        return JSON.parse(stdout);
      } catch (error) {
        throw executionError(
          `Unable to parse synced archive report: ${error.message}`,
        );
      }
    },
    validateArchive: async ({ archiveReport, projectName }) =>
      validateSyncedArchiveTerminalReport(archiveReport, projectName),
  });
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
