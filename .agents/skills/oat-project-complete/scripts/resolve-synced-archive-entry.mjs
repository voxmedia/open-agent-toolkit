import { execFile as execFileCallback } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

function entryError(message) {
  const error = new Error(message);
  error.code = 'E_SYNCED_ARCHIVE_ENTRY';
  return error;
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) {
      throw entryError(`Missing value for ${flag ?? 'argument'}.`);
    }
    if (flag === '--repo-root') result.repoRoot = value;
    else if (flag === '--record-path') result.recordPath = value;
    else if (flag === '--project-name') result.projectName = value;
    else throw entryError(`Unsupported argument: ${flag}.`);
  }
  for (const field of ['repoRoot', 'recordPath', 'projectName']) {
    if (!result[field]) throw entryError(`Missing required ${field}.`);
  }
  return result;
}

function parseAdvertisedRefs(stdout, requestedRefs) {
  const refs = new Map();
  for (const row of stdout.split('\n').filter(Boolean)) {
    const fields = row.trim().split(/\s+/);
    if (
      fields.length !== 2 ||
      !/^[0-9a-f]{40}$/i.test(fields[0]) ||
      !requestedRefs.has(fields[1]) ||
      refs.has(fields[1])
    ) {
      throw entryError(
        'Unable to validate synced terminal refs: malformed Git advertisement.',
      );
    }
    refs.set(fields[1], fields[0]);
  }
  return refs;
}

async function probeRemoteRefs({ repoRoot, remote, activeRef, completedRef }) {
  let stdout;
  try {
    ({ stdout } = await execFile(
      'git',
      ['ls-remote', remote, activeRef, completedRef],
      { cwd: repoRoot },
    ));
  } catch (error) {
    throw entryError(
      `Unable to validate synced terminal refs from ${remote}: ${error.message}`,
    );
  }
  const refs = parseAdvertisedRefs(stdout, new Set([activeRef, completedRef]));
  return {
    activeSha: refs.get(activeRef) ?? null,
    completedSha: refs.get(completedRef) ?? null,
  };
}

export async function resolveSyncedArchiveEntry({
  record,
  projectName,
  probeRefs = probeRemoteRefs,
  repoRoot,
}) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw entryError('Synced archive entry requires a valid discovery record.');
  }
  const activeRef = `refs/oat/projects/${projectName}`;
  const completedRef = `refs/oat/completed/${projectName}`;
  if (
    record.slug !== projectName ||
    record.scope !== 'synced' ||
    record.ref !== activeRef ||
    typeof record.remote !== 'string' ||
    record.remote.length === 0
  ) {
    throw entryError('Synced archive entry record identity is not canonical.');
  }
  const hasSnapshot = typeof record.archiveSnapshot === 'string';
  const hasSourceSha = typeof record.archiveSourceRefSha === 'string';
  if (hasSnapshot !== hasSourceSha) {
    throw entryError('Synced archive retry identity is incomplete.');
  }
  if (!hasSnapshot) {
    return { status: 'ok', route: 'pull', terminal: false };
  }
  if (
    record.archiveSnapshot.length === 0 ||
    !/^[0-9a-f]{40}$/.test(record.archiveSourceRefSha)
  ) {
    throw entryError('Synced archive retry identity is malformed.');
  }
  const { activeSha, completedSha } = await probeRefs({
    repoRoot,
    remote: record.remote,
    activeRef,
    completedRef,
  });
  if (completedSha === null) {
    if (activeSha === record.archiveSourceRefSha) {
      return { status: 'ok', route: 'pull', terminal: false };
    }
    throw entryError(
      'Persisted archive retry identity has no matching active or completed ref.',
    );
  }
  if (
    completedSha !== record.archiveSourceRefSha ||
    (activeSha !== null && activeSha !== record.archiveSourceRefSha)
  ) {
    throw entryError(
      'Persisted archive retry identity does not match the authoritative terminal refs.',
    );
  }
  return {
    status: 'ok',
    route: 'archive-resume',
    terminal: true,
    archiveSnapshot: record.archiveSnapshot,
    verifiedSourceSha: record.archiveSourceRefSha,
    completedRef,
    activeAliasDisposition: activeSha === null ? 'removed' : 'retained',
  };
}

async function main(argv) {
  const options = parseArguments(argv);
  let record;
  try {
    record = JSON.parse(await readFile(options.recordPath, 'utf8'));
  } catch (error) {
    throw entryError(
      `Unable to read synced discovery record: ${error.message}`,
    );
  }
  return resolveSyncedArchiveEntry({ ...options, record });
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
