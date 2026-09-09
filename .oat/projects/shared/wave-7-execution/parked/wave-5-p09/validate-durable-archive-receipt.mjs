#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ARCHIVED_STATE_MARKER = 'Lifecycle complete; archived locally';

function receiptError(message) {
  const error = new Error(message);
  error.code = 'E_DURABLE_ARCHIVE_RECEIPT';
  return error;
}

/**
 * Validate a non-synced (`shared`) `oat project archive --json` report.
 *
 * Synced archives keep their own richer terminal contract in
 * `finalize-synced-archive.mjs`; that finalizer must never be widened to
 * accept non-synced input, so this validator stays separate and requires only
 * the fields a shared archive receipt actually carries.
 */
export function validateDurableArchiveReceipt(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw receiptError(
      'Durable archive validation requires a structured archive report.',
    );
  }
  if (report.status !== 'ok' || report.mode !== 'apply') {
    throw receiptError(
      'Durable archive report is not a successful apply result.',
    );
  }
  if (
    typeof report.archivePath !== 'string' ||
    report.archivePath.length === 0
  ) {
    throw receiptError('Durable archive report has no archive path.');
  }
  return report.archivePath;
}

function isArchivedCandidateName(entryName, projectName) {
  const escapedProjectName = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    entryName === projectName ||
    new RegExp(`^\\d{8}-${escapedProjectName}$`).test(entryName)
  );
}

/**
 * A discovered archive counts as terminal evidence only when its `state.md`
 * carries both the completed lifecycle field and the archived phase marker
 * that `oat project complete-state --archived` writes.
 */
export function isTerminalArchivedState(stateContent) {
  if (typeof stateContent !== 'string') return false;
  return (
    /^oat_lifecycle:[ \t]*complete[ \t]*$/m.test(stateContent) &&
    stateContent.includes(ARCHIVED_STATE_MARKER)
  );
}

/**
 * Re-derive the Step 2 archive checks from an archive that already exists on
 * disk, for the single shared-scope resume checkpoint: the archive succeeded
 * and the run died before the Step 12 pointer clear. Exactly one candidate
 * must validate; zero or several are ambiguous and route to manual recovery.
 */
export async function discoverValidatedDurableArchive({
  archivedRoot,
  projectName,
  listDirectory,
  readStateFile,
}) {
  if (typeof archivedRoot !== 'string' || archivedRoot.length === 0) {
    throw receiptError('Durable archive discovery requires an archived root.');
  }
  if (typeof projectName !== 'string' || projectName.length === 0) {
    throw receiptError('Durable archive discovery requires a project name.');
  }
  let entries;
  try {
    entries = await listDirectory(archivedRoot);
  } catch {
    entries = [];
  }
  const candidates = [];
  for (const entryName of entries) {
    if (!isArchivedCandidateName(entryName, projectName)) continue;
    const archivePath = join(archivedRoot, entryName);
    let stateContent;
    try {
      stateContent = await readStateFile(join(archivePath, 'state.md'));
    } catch {
      continue;
    }
    if (isTerminalArchivedState(stateContent)) candidates.push(archivePath);
  }
  if (candidates.length !== 1) {
    throw receiptError(
      candidates.length === 0
        ? `No archived project under ${archivedRoot} matches ${projectName} with a completed archived state.md.`
        : `Multiple archived projects under ${archivedRoot} match ${projectName}; refusing an ambiguous resume.`,
    );
  }
  return candidates[0];
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) {
      throw receiptError(`Missing value for ${flag ?? 'argument'}.`);
    }
    if (flag === '--mode') result.mode = value;
    else if (flag === '--archived-root') result.archivedRoot = value;
    else if (flag === '--project-name') result.projectName = value;
    else throw receiptError(`Unsupported argument: ${flag}.`);
  }
  if (result.mode !== 'receipt' && result.mode !== 'directory') {
    throw receiptError(
      'Usage: validate-durable-archive-receipt.mjs --mode receipt | --mode directory --archived-root <dir> --project-name <name>',
    );
  }
  return result;
}

async function main(argv) {
  const options = parseArguments(argv);
  if (options.mode === 'receipt') {
    let report;
    try {
      report = JSON.parse(readFileSync(0, 'utf8'));
    } catch (error) {
      throw receiptError(
        `Unable to parse durable archive report: ${error.message}`,
      );
    }
    return validateDurableArchiveReceipt(report);
  }
  return discoverValidatedDurableArchive({
    archivedRoot: options.archivedRoot,
    projectName: options.projectName,
    listDirectory: (directory) => readdir(directory),
    readStateFile: (statePath) => readFile(statePath, 'utf8'),
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2))
    .then((archivePath) => process.stdout.write(`${archivePath}\n`))
    .catch((error) => {
      process.stderr.write(
        `Invalid durable archive receipt: ${error.message}\n`,
      );
      process.exitCode = 1;
    });
}
