import { execFile as execFileCallback } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { finalizeSyncedArchive } from './finalize-synced-archive.mjs';
import { resolveSyncedArchiveEntry } from './resolve-synced-archive-entry.mjs';

const execFile = promisify(execFileCallback);

function executionError(message) {
  const error = new Error(message);
  error.code = 'E_SYNCED_ARCHIVE_EXECUTION';
  return error;
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
  finalizeArchive,
}) {
  const entry = await resolveSyncedArchiveEntry({
    record,
    projectName,
    repoRoot,
    ...(probeRefs ? { probeRefs } : {}),
  });

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
    archiveSnapshot: entry.archiveSnapshot,
    verifiedSourceSha: entry.verifiedSourceSha,
  });
  if (
    archiveReport?.snapshotId !== entry.archiveSnapshot ||
    archiveReport?.verifiedSourceSha !== entry.verifiedSourceSha
  ) {
    throw executionError(
      'Archive resume report does not match the persisted snapshot identity.',
    );
  }
  const finalization = await finalizeArchive({
    archiveReport,
    projectName,
  });
  return {
    status: 'ok',
    route: 'archive-resumed',
    terminal: true,
    skippedActiveSteps: true,
    archiveSnapshot: entry.archiveSnapshot,
    archiveReport,
    finalization,
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
    finalizeArchive: async ({ archiveReport, projectName }) =>
      finalizeSyncedArchive({
        projectName,
        getArchiveReport: async () => archiveReport,
        clearActiveProject: async () => {
          await runOat(
            ['config', 'set', 'activeProject', ''],
            options.repoRoot,
          );
        },
      }),
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
