import { pathToFileURL } from 'node:url';

function fieldsError(message) {
  const error = new Error(message);
  error.code = 'E_SYNCED_ARCHIVE_RESUME_FIELDS';
  return error;
}

function shellQuote(value) {
  return `'${String(value).split("'").join("'\\''")}'`;
}

export function parseSyncedArchiveResumeFields(result) {
  const continuation = result?.continuation;
  if (
    result?.status !== 'ok' ||
    result?.route !== 'archive-resumed' ||
    result?.terminal !== true ||
    result?.skippedActiveSteps !== true ||
    result?.terminalReceiptValidated !== true ||
    continuation?.required !== true ||
    continuation?.rejoinStep !== '8.5' ||
    typeof continuation.archivePath !== 'string' ||
    continuation.archivePath.length === 0 ||
    typeof continuation.lifecycleCommit !== 'string' ||
    !/^[0-9a-f]{40}$/.test(continuation.lifecycleCommit)
  ) {
    throw fieldsError(
      'Synced archive resume result has no verified post-archive continuation.',
    );
  }
  return {
    SYNCED_ARCHIVE_RESUME: 'true',
    SHOULD_ARCHIVE: 'true',
    IS_DURABLE_PROJECT: 'true',
    ARCHIVE_OUTPUT: JSON.stringify(result.archiveReport),
    ARCHIVE_PATH: continuation.archivePath,
    PROJECT_PATH: continuation.archivePath,
    SUMMARY_EXPORT_FILE: continuation.summaryExportFile ?? '',
    LIFECYCLE_COMMIT: continuation.lifecycleCommit,
    ARCHIVE_S3_PATH: continuation.s3Path ?? '',
    SELECTED_PROJECT_RECAP_RUN: continuation.selectedProjectRecapRun ?? '',
    PROJECT_RECAP_EXPORT_JSON: JSON.stringify(
      continuation.projectRecapExport ?? null,
    ),
    EVIDENCE_COMMIT: '',
    PROJECT_REF_COMMIT: '',
    SHOULD_OPEN_PR: 'false',
  };
}

export function formatShellAssignments(fields) {
  return Object.entries(fields)
    .map(([name, value]) => `${name}=${shellQuote(value)}`)
    .join('\n');
}

function main(argv) {
  if (argv.length !== 1) {
    throw fieldsError(
      'Usage: parse-synced-archive-resume-fields.mjs <executor-json>',
    );
  }
  let result;
  try {
    result = JSON.parse(argv[0]);
  } catch (error) {
    throw fieldsError(
      `Unable to parse archive resume result: ${error.message}`,
    );
  }
  return formatShellAssignments(parseSyncedArchiveResumeFields(result));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.stdout.write(`${main(process.argv.slice(2))}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, code: error.code, message: error.message })}\n`,
    );
    process.exitCode = 1;
  }
}
