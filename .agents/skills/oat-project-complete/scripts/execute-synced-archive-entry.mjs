import { execFile as execFileCallback } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { validateSyncedArchiveTerminalReport } from './finalize-synced-archive.mjs';
import { resolveSyncedArchiveEntry } from './resolve-synced-archive-entry.mjs';

const execFile = promisify(execFileCallback);

function executionError(message) {
  const error = new Error(message);
  error.code = 'E_SYNCED_ARCHIVE_EXECUTION';
  return error;
}

function buildPostArchiveContinuation(archiveReport, projectPath) {
  let selectedProjectRecapRun = '';
  if (archiveReport.projectRecapExport !== undefined) {
    const sourceRunRoot = archiveReport.projectRecapExport?.sourceRunRoot;
    const exportRoot = archiveReport.projectRecapExport?.exportRoot;
    const manifestPath =
      archiveReport.projectRecapExport?.manifest?.relativePath;
    if (
      typeof sourceRunRoot !== 'string' ||
      typeof exportRoot !== 'string' ||
      manifestPath !== 'manifest.json'
    ) {
      throw executionError(
        'Archive resume report has an invalid project recap export receipt.',
      );
    }
    selectedProjectRecapRun = relative(projectPath, sourceRunRoot);
    if (
      selectedProjectRecapRun.length === 0 ||
      /^\.\.(?:[/\\]|$)/.test(selectedProjectRecapRun) ||
      isAbsolute(selectedProjectRecapRun)
    ) {
      throw executionError(
        'Archive resume recap source is outside the original project path.',
      );
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
    continuation: buildPostArchiveContinuation(archiveReport, projectPath),
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2))
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      process.stderr.write(
        `${JSON.stringify({ ok: false, code: error.code, message: error.message })}\n`,
      );
      process.exitCode = 1;
    });
}
