import { execFile as execFileCallback } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

function finalizationError(message) {
  const error = new Error(message);
  error.code = 'E_SYNCED_ARCHIVE_FINALIZATION';
  return error;
}

function requireFullSha(value, field) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    throw finalizationError(
      `Synced archive terminal report requires a full ${field} SHA.`,
    );
  }
}

export function validateSyncedArchiveTerminalReport(report, projectName) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw finalizationError(
      'Synced archive finalization requires a structured terminal report.',
    );
  }
  if (
    report.status !== 'ok' ||
    report.mode !== 'apply' ||
    typeof report.archivePath !== 'string' ||
    report.archivePath.length === 0
  ) {
    throw finalizationError(
      'Synced archive terminal report is not a successful durable apply result.',
    );
  }
  requireFullSha(report.lifecycleCommit, 'lifecycleCommit');
  requireFullSha(report.verifiedSourceSha, 'verifiedSourceSha');
  if (report.completedRef !== `refs/oat/completed/${projectName}`) {
    throw finalizationError(
      'Synced archive terminal report names an unexpected completed ref.',
    );
  }
  if (!['removed', 'retained'].includes(report.activeAliasDisposition)) {
    throw finalizationError(
      'Synced archive terminal report has no verified active-alias disposition.',
    );
  }
  if (report.recordRetired !== true) {
    throw finalizationError(
      'Synced archive terminal report does not verify discovery-record retirement.',
    );
  }
  return report;
}

export async function finalizeSyncedArchive({
  getArchiveReport,
  projectName,
  clearActiveProject,
}) {
  const report = validateSyncedArchiveTerminalReport(
    await getArchiveReport(),
    projectName,
  );
  await clearActiveProject();
  return {
    status: 'ok',
    pointerCleared: true,
    lifecycleCommit: report.lifecycleCommit,
    completedRef: report.completedRef,
    verifiedSourceSha: report.verifiedSourceSha,
    activeAliasDisposition: report.activeAliasDisposition,
    recordRetired: report.recordRetired,
  };
}

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== '--project-name' || !argv[1]) {
    throw finalizationError(
      'Usage: finalize-synced-archive.mjs --project-name <name>',
    );
  }
  return { projectName: argv[1] };
}

async function main(argv) {
  const { projectName } = parseArguments(argv);
  return finalizeSyncedArchive({
    projectName,
    getArchiveReport: async () => {
      try {
        return JSON.parse(await readFile(0, 'utf8'));
      } catch (error) {
        throw finalizationError(
          `Unable to parse synced archive terminal report: ${error.message}`,
        );
      }
    },
    clearActiveProject: async () => {
      try {
        await execFile('oat', ['config', 'set', 'activeProject', '']);
      } catch (error) {
        throw finalizationError(
          `Unable to clear the active project pointer: ${error.message}`,
        );
      }
    },
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
