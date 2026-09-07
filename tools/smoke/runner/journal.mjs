import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Schema version emitted for every newly provisioned manifest.
 *
 * Version 2 adds the explicit two-state ownership entry (`reserved` before the
 * child worktree exists, `registered` once its materialized state is fully
 * corroborated) plus the reserved `markerPath`. Version 1 manifests remain
 * readable and every one of their entries is interpreted as `registered`; a v1
 * manifest is never rewritten to a newer version in place, and a reservation is
 * never written into one, because a v1 reader would read reserved intent as
 * established ownership.
 */
export const OWNERSHIP_JOURNAL_SCHEMA_VERSION = 2;
export const SUPPORTED_OWNERSHIP_JOURNAL_SCHEMA_VERSIONS = Object.freeze([
  1, 2,
]);
export const OWNERSHIP_JOURNAL_ENTRY_STATES = Object.freeze([
  'registered',
  'reserved',
]);
const CHILD_MARKER_RELATIVE_PATH = '.oat/smoke-bootstrap.json';

const defaultFileSystem = {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
};

export class OwnershipJournalError extends Error {
  constructor(message) {
    super(`Smoke ownership journal refused: ${message}`);
    this.name = 'OwnershipJournalError';
  }
}

async function runGit(args, { cwd } = {}) {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  return stdout.trim();
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new OwnershipJournalError(`${label} must be a plain object.`);
  }
  return value;
}

export function requireAbsolutePath(value, label) {
  const hasUnsafeControlCharacter =
    typeof value === 'string' &&
    ['\0', '\r', '\n', '\t'].some((character) => value.includes(character));

  if (
    typeof value !== 'string' ||
    !isAbsolute(value) ||
    resolve(value) !== value ||
    hasUnsafeControlCharacter
  ) {
    throw new OwnershipJournalError(
      `${label} must be a normalized absolute path.`,
    );
  }
  return value;
}

export function requireCommitSha(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/u.test(value)) {
    throw new OwnershipJournalError(
      `${label} must be a full lowercase commit SHA.`,
    );
  }
  return value;
}

export function requireSafeBranchName(value, label) {
  const hasUnsafeControlCharacter =
    typeof value === 'string' &&
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 0x20 || codePoint === 0x7f;
    });

  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.startsWith('-') ||
    value.startsWith('/') ||
    value.startsWith('.') ||
    value.endsWith('/') ||
    value.endsWith('.') ||
    value.endsWith('.lock') ||
    value.includes('..') ||
    value.includes('//') ||
    value.includes('/.') ||
    value.includes('@{') ||
    hasUnsafeControlCharacter ||
    /[~^:?*[\]\\]/u.test(value)
  ) {
    throw new OwnershipJournalError(`${label} is not a safe branch name.`);
  }
  return value;
}

/**
 * Resolve the ownership state of a journal entry for the journal's schema
 * version. Schema version 1 predates the reserved state, so its entries are
 * always `registered`; a v1 entry that claims any other state is a
 * contradiction rather than a reservation, and reading it as owned would
 * manufacture ownership the writer never established.
 */
export function resolveJournalEntryState(entry, schemaVersion, label) {
  const state = entry?.state;
  if (schemaVersion === 1) {
    if (state !== undefined && state !== 'registered') {
      throw new OwnershipJournalError(
        `${label} is not supported by ownership journal schema version 1.`,
      );
    }
    return 'registered';
  }
  if (!OWNERSHIP_JOURNAL_ENTRY_STATES.includes(state)) {
    throw new OwnershipJournalError(
      `${label} must be one of ${OWNERSHIP_JOURNAL_ENTRY_STATES.join(', ')}.`,
    );
  }
  return state;
}

async function requireRegularFile(path, label, fileSystem) {
  let stats;
  try {
    stats = await fileSystem.lstat(path);
  } catch {
    throw new OwnershipJournalError(`${label} is missing.`);
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new OwnershipJournalError(`${label} must be a real regular file.`);
  }
}

export function validateSmokeMarkerBinding(markerValue, manifestValue) {
  const marker = requirePlainObject(markerValue, 'marker');
  const manifest = requirePlainObject(manifestValue, 'manifest');
  const expectedFields = [
    'branch',
    'configSha256',
    'configSource',
    'manifestPath',
    'policy',
    'runIdentity',
    'schemaVersion',
  ];
  if (!isDeepStrictEqual(Object.keys(marker).sort(), expectedFields)) {
    throw new OwnershipJournalError(
      'marker fields do not match schema version 2.',
    );
  }
  if (marker.schemaVersion !== 2) {
    throw new OwnershipJournalError('marker schemaVersion must equal 2.');
  }
  if (
    typeof marker.configSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(marker.configSha256)
  ) {
    throw new OwnershipJournalError(
      'marker configSha256 must be a lowercase SHA-256 digest.',
    );
  }

  const manifestPath = requireAbsolutePath(
    manifest.manifestPath,
    'manifest.manifestPath',
  );
  const configSource = requireAbsolutePath(
    marker.configSource,
    'marker.configSource',
  );
  if (
    typeof manifest.branch !== 'string' ||
    manifest.branch.length === 0 ||
    typeof manifest.runIdentity !== 'string' ||
    manifest.runIdentity.length === 0 ||
    manifest.runIdentity !== manifest.branch ||
    marker.branch !== manifest.branch ||
    marker.runIdentity !== manifest.runIdentity ||
    marker.manifestPath !== manifestPath
  ) {
    throw new OwnershipJournalError(
      'marker run identity does not match the manifest.',
    );
  }

  const bootstrap = requirePlainObject(
    manifest.intendedSmokeBootstrap,
    'manifest.intendedSmokeBootstrap',
  );
  const outerWorktreePath = requireAbsolutePath(
    manifest.worktreePath,
    'manifest.worktreePath',
  );
  const expectedConfigSource = join(
    outerWorktreePath,
    '.oat/config.local.json',
  );
  const expectedMarkerPath = join(
    outerWorktreePath,
    '.oat/smoke-bootstrap.json',
  );
  if (
    bootstrap.branch !== marker.branch ||
    bootstrap.configSha256 !== marker.configSha256 ||
    bootstrap.configSource !== configSource ||
    bootstrap.configSource !== expectedConfigSource ||
    bootstrap.manifestPath !== manifestPath ||
    bootstrap.markerPath !== expectedMarkerPath ||
    bootstrap.runIdentity !== marker.runIdentity ||
    dirname(manifestPath) !== dirname(outerWorktreePath) ||
    !isDeepStrictEqual(bootstrap.policy, marker.policy)
  ) {
    throw new OwnershipJournalError(
      'marker bootstrap binding does not match the manifest.',
    );
  }
  if (!isDeepStrictEqual(manifest.effectiveSmokeBootstrap, bootstrap)) {
    throw new OwnershipJournalError(
      'effective smoke bootstrap does not match the immutable marker binding.',
    );
  }

  return marker;
}

export async function readSmokeMarkerAtCommit(
  commitSha,
  { cwd, git = runGit } = {},
) {
  requireCommitSha(commitSha, 'commitSha');
  let contents;
  try {
    contents = await git(['show', `${commitSha}:.oat/smoke-bootstrap.json`], {
      cwd,
    });
  } catch {
    throw new OwnershipJournalError(
      `commit ${commitSha} does not contain the smoke marker.`,
    );
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new OwnershipJournalError(
      `commit ${commitSha} contains an invalid smoke marker (${error.message}).`,
    );
  }
}

export async function isCommitAncestor(
  ancestor,
  descendant,
  { cwd, git = runGit } = {},
) {
  requireCommitSha(ancestor, 'ancestor');
  requireCommitSha(descendant, 'descendant');
  try {
    await git(['merge-base', '--is-ancestor', ancestor, descendant], { cwd });
    return true;
  } catch {
    return false;
  }
}

export function parseWorktrees(output) {
  if (!output) {
    return [];
  }
  return output
    .split(/\n\n+/u)
    .map((block) => {
      const entry = {};
      for (const line of block.split('\n')) {
        const separator = line.indexOf(' ');
        const key = separator === -1 ? line : line.slice(0, separator);
        const value = separator === -1 ? true : line.slice(separator + 1);
        entry[key] = value;
      }
      return entry;
    })
    .filter((entry) => typeof entry.worktree === 'string');
}

export async function gitCommonDirectory(
  cwd,
  { fileSystem = defaultFileSystem, git = runGit } = {},
) {
  const value = await git(
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    { cwd },
  );
  return fileSystem.realpath(isAbsolute(value) ? value : resolve(cwd, value));
}

export async function writeJsonAtomic(
  path,
  value,
  { fileSystem = defaultFileSystem } = {},
) {
  const temporaryPath = `${path}.${process.pid}-${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await fileSystem.open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fileSystem.rename(temporaryPath, path);
  } finally {
    await handle?.close().catch(() => {});
    await fileSystem.rm(temporaryPath, { force: true }).catch(() => {});
  }
}

async function acquireManifestLock(
  manifestPath,
  {
    attempts = 200,
    delayMilliseconds = 25,
    fileSystem = defaultFileSystem,
  } = {},
) {
  const lockPath = `${manifestPath}.lock`;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fileSystem.mkdir(lockPath, { mode: 0o700 });
      try {
        await fileSystem.writeFile(
          join(lockPath, 'owner.json'),
          `${JSON.stringify({ pid: process.pid })}\n`,
          { flag: 'wx', mode: 0o600 },
        );
      } catch (error) {
        await fileSystem.rm(lockPath, { force: true, recursive: true });
        throw error;
      }
      return async () => {
        await fileSystem.rm(lockPath, { force: true, recursive: true });
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
      if (attempt + 1 === attempts) {
        break;
      }
      await new Promise((resolvePromise) =>
        setTimeout(resolvePromise, delayMilliseconds),
      );
    }
  }
  throw new OwnershipJournalError(
    'timed out acquiring the bounded manifest lock.',
  );
}

async function readManifest(manifestPath, fileSystem) {
  await requireRegularFile(manifestPath, 'manifest', fileSystem);
  try {
    return JSON.parse(await fileSystem.readFile(manifestPath, 'utf8'));
  } catch (error) {
    throw new OwnershipJournalError(
      `manifest is not complete JSON (${error.message}).`,
    );
  }
}

export async function updateSmokeManifest(
  manifestPath,
  update,
  { fileSystem = defaultFileSystem, lockOptions } = {},
) {
  const normalizedManifestPath = requireAbsolutePath(
    manifestPath,
    'manifestPath',
  );
  if (typeof update !== 'function') {
    throw new TypeError('update must be a function.');
  }
  const releaseLock = await acquireManifestLock(normalizedManifestPath, {
    ...lockOptions,
    fileSystem,
  });
  try {
    const current = await readManifest(normalizedManifestPath, fileSystem);
    const next = requirePlainObject(await update(current), 'updated manifest');
    await writeJsonAtomic(normalizedManifestPath, next, { fileSystem });
    return next;
  } finally {
    await releaseLock();
  }
}

function validateJournal(manifest) {
  const journal = requirePlainObject(
    manifest.ownershipJournal,
    'manifest.ownershipJournal',
  );
  if (
    !SUPPORTED_OWNERSHIP_JOURNAL_SCHEMA_VERSIONS.includes(
      journal.schemaVersion,
    ) ||
    !Array.isArray(journal.resources)
  ) {
    throw new OwnershipJournalError(
      'manifest ownership journal schema is invalid.',
    );
  }
  return journal;
}

/**
 * Validate the ready-provisioning invariants every journal write depends on and
 * return the manifest's own corroborated ownership facts.
 */
function requireReadyManifest(manifest, normalizedManifestPath) {
  if (
    manifest.provisioningState !== 'ready' ||
    manifest.readiness?.status !== 'ready'
  ) {
    throw new OwnershipJournalError(
      'manifest is not a ready smoke provisioning record.',
    );
  }
  if (manifest.manifestPath !== normalizedManifestPath) {
    throw new OwnershipJournalError(
      'manifest path does not match its external location.',
    );
  }
  if (
    typeof manifest.runIdentity !== 'string' ||
    manifest.runIdentity.length === 0 ||
    manifest.runIdentity !== manifest.branch
  ) {
    throw new OwnershipJournalError(
      'manifest run identity does not match its branch.',
    );
  }
  return {
    baselineCommitSha: requireCommitSha(
      manifest.baselineCommitSha,
      'manifest.baselineCommitSha',
    ),
    journal: validateJournal(manifest),
    recordedCommonDirectory: requireAbsolutePath(
      manifest.commonGitDir,
      'manifest.commonGitDir',
    ),
  };
}

/**
 * Durably reserve the exact branch, worktree path, marker path, baseline,
 * shared Git directory, and run identity a smoke child is about to be created
 * with, before any Git mutation happens.
 *
 * The reservation is intent, never ownership: cleanup may only act on it after
 * corroborating the materialized Git and marker state against these recorded
 * fields, and a reservation that never materialized authorizes no deletion at
 * all.
 */
export async function reserveNestedSmokeResource(
  { baselineCommitSha, branch, manifestPath, markerPath, worktreePath },
  { fileSystem = defaultFileSystem, git = runGit, lockOptions } = {},
) {
  const normalizedManifestPath = requireAbsolutePath(
    manifestPath,
    'manifestPath',
  );
  const normalizedMarkerPath = requireAbsolutePath(markerPath, 'markerPath');
  const normalizedWorktreePath = requireAbsolutePath(
    worktreePath,
    'worktreePath',
  );
  const requestedBranch = requireSafeBranchName(branch, 'branch');
  const requestedBaseline = requireCommitSha(
    baselineCommitSha,
    'baselineCommitSha',
  );
  const releaseLock = await acquireManifestLock(normalizedManifestPath, {
    ...lockOptions,
    fileSystem,
  });

  try {
    const manifest = await readManifest(normalizedManifestPath, fileSystem);
    const {
      baselineCommitSha: runBaseline,
      journal,
      recordedCommonDirectory,
    } = requireReadyManifest(manifest, normalizedManifestPath);

    if (journal.schemaVersion !== OWNERSHIP_JOURNAL_SCHEMA_VERSION) {
      throw new OwnershipJournalError(
        `reservations require ownership journal schema version ${OWNERSHIP_JOURNAL_SCHEMA_VERSION}.`,
      );
    }
    if (requestedBaseline !== runBaseline) {
      throw new OwnershipJournalError(
        'reserved baseline is not the immutable run baseline.',
      );
    }
    if (requestedBranch === manifest.branch) {
      throw new OwnershipJournalError(
        'a child cannot reserve the outer smoke branch.',
      );
    }

    const outerWorktreePath = requireAbsolutePath(
      manifest.worktreePath,
      'manifest.worktreePath',
    );
    const runPath = dirname(normalizedManifestPath);
    if (
      normalizedWorktreePath === runPath ||
      dirname(normalizedWorktreePath) !== runPath ||
      normalizedWorktreePath === outerWorktreePath
    ) {
      throw new OwnershipJournalError(
        'reserved worktree path must be a direct child of the manifest run directory.',
      );
    }
    if (
      normalizedMarkerPath !==
      join(normalizedWorktreePath, CHILD_MARKER_RELATIVE_PATH)
    ) {
      throw new OwnershipJournalError(
        'reserved markerPath is not the tracked marker in the intended child worktree.',
      );
    }

    // Hoisted above the idempotent-replay return below so the invariant holds
    // for every reservation call, not only for the one that first created the
    // entry. A replayed reservation over a non-canonical run directory would
    // otherwise return without ever asserting it.
    const canonicalRunPath = await fileSystem.realpath(runPath);
    if (canonicalRunPath !== runPath) {
      throw new OwnershipJournalError(
        'manifest run directory must be its canonical real path.',
      );
    }

    const existingPathEntry = journal.resources.find(
      (entry) => entry.worktreePath === normalizedWorktreePath,
    );
    const existingBranchEntry = journal.resources.find(
      (entry) => entry.branch === requestedBranch,
    );
    if (existingPathEntry || existingBranchEntry) {
      if (
        existingPathEntry !== existingBranchEntry ||
        existingPathEntry.baselineCommitSha !== requestedBaseline ||
        existingPathEntry.commonGitDir !== recordedCommonDirectory ||
        existingPathEntry.markerPath !== normalizedMarkerPath ||
        existingPathEntry.runIdentity !== manifest.runIdentity
      ) {
        throw new OwnershipJournalError(
          'journal contains a conflicting child path or branch.',
        );
      }
      // A replay is idempotent only over a well-formed entry; a seeded entry
      // with a missing or unknown state would otherwise let creation proceed
      // toward a child that neither registration nor cleanup can reconcile.
      resolveJournalEntryState(
        existingPathEntry,
        journal.schemaVersion,
        'journal entry state',
      );
      return existingPathEntry;
    }

    let existingPathState;
    try {
      existingPathState = await fileSystem.lstat(normalizedWorktreePath);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
    if (existingPathState) {
      throw new OwnershipJournalError('reserved worktree path already exists.');
    }

    const actualCommonDirectory = await gitCommonDirectory(outerWorktreePath, {
      fileSystem,
      git,
    });
    if (actualCommonDirectory !== recordedCommonDirectory) {
      throw new OwnershipJournalError(
        'outer smoke worktree belongs to a different shared Git common directory.',
      );
    }

    // Reserving a branch or worktree registration that already exists would
    // record intent to own something this run did not create, and cleanup
    // corroborates against that intent. Refuse instead of adopting it.
    //
    // `for-each-ref` exits zero whether or not the ref exists, so a failed
    // probe propagates as an error instead of being misread as absence.
    //
    // ACCEPTED RESIDUAL: this probe is not atomic with the `git worktree add
    // -b` that follows it. If a foreign actor creates this exact branch name
    // at exactly the reserved baseline inside that window, `add -b` refuses to
    // let this run adopt it -- but that refusal protects only the adoption.
    // The reservation, made while the branch genuinely did not exist, is
    // already durable and remains the deletion authority, so cleanup's
    // branch-only reconciliation will delete that foreign branch: at exactly
    // the reserved baseline it is indistinguishable from the branch this run
    // intended to create. Git offers no *sound* discriminator: `worktree add
    // -b` and `git branch` produce identical reflog messages, object IDs, and
    // creation timestamps, and the signals that can differ -- committer
    // identity, reflog text, timestamps -- are all attacker-controlled, so
    // none is ownership evidence. The only way to close the window is to
    // create the ref
    // as part of the reservation, which is precisely the Git mutation before
    // durable intent that this transaction exists to prevent. The collision
    // requires reproducing a UUID-bearing run branch name and landing it on
    // the exact run baseline within the window. See `tools/smoke/CONTRACT.md`.
    const existingBranchRef = await git(
      ['for-each-ref', '--format=%(refname)', `refs/heads/${requestedBranch}`],
      { cwd: outerWorktreePath },
    );
    if (existingBranchRef !== '') {
      throw new OwnershipJournalError('reserved branch already exists.');
    }
    const registrations = parseWorktrees(
      await git(['worktree', 'list', '--porcelain'], {
        cwd: outerWorktreePath,
      }),
    );
    if (
      registrations.some(
        (entry) =>
          resolve(entry.worktree) === normalizedWorktreePath ||
          entry.branch === `refs/heads/${requestedBranch}`,
      )
    ) {
      throw new OwnershipJournalError(
        'reserved branch or worktree path is already registered with Git.',
      );
    }

    await requireRegularFile(
      join(outerWorktreePath, CHILD_MARKER_RELATIVE_PATH),
      'tracked marker',
      fileSystem,
    );
    let marker;
    try {
      marker = JSON.parse(
        await fileSystem.readFile(
          join(outerWorktreePath, CHILD_MARKER_RELATIVE_PATH),
          'utf8',
        ),
      );
    } catch (error) {
      throw new OwnershipJournalError(
        `tracked marker is not valid JSON (${error.message}).`,
      );
    }
    validateSmokeMarkerBinding(marker, manifest);
    const baselineMarker = await readSmokeMarkerAtCommit(runBaseline, {
      cwd: outerWorktreePath,
      git,
    });
    validateSmokeMarkerBinding(baselineMarker, manifest);
    if (!isDeepStrictEqual(marker, baselineMarker)) {
      throw new OwnershipJournalError(
        'outer marker differs from the immutable run marker.',
      );
    }

    const entry = {
      baselineCommitSha: requestedBaseline,
      branch: requestedBranch,
      commonGitDir: actualCommonDirectory,
      markerPath: normalizedMarkerPath,
      reservedAt: new Date().toISOString(),
      runIdentity: manifest.runIdentity,
      state: 'reserved',
      worktreePath: normalizedWorktreePath,
    };
    journal.resources.push(entry);
    await writeJsonAtomic(normalizedManifestPath, manifest, { fileSystem });
    return entry;
  } finally {
    await releaseLock();
  }
}

async function canonicalWorktrees(cwd, git, fileSystem) {
  const worktrees = parseWorktrees(
    await git(['worktree', 'list', '--porcelain'], { cwd }),
  );
  return Promise.all(
    worktrees.map(async (entry) => ({
      ...entry,
      canonicalPath: await fileSystem
        .realpath(entry.worktree)
        .catch(() => resolve(entry.worktree)),
    })),
  );
}

export async function registerNestedSmokeResource(
  { manifestPath, markerPath, worktreePath },
  { fileSystem = defaultFileSystem, git = runGit, lockOptions } = {},
) {
  const normalizedManifestPath = requireAbsolutePath(
    manifestPath,
    'manifestPath',
  );
  const normalizedMarkerPath = requireAbsolutePath(markerPath, 'markerPath');
  const normalizedWorktreePath = requireAbsolutePath(
    worktreePath,
    'worktreePath',
  );
  const releaseLock = await acquireManifestLock(normalizedManifestPath, {
    ...lockOptions,
    fileSystem,
  });

  try {
    const manifest = await readManifest(normalizedManifestPath, fileSystem);
    const { baselineCommitSha, journal, recordedCommonDirectory } =
      requireReadyManifest(manifest, normalizedManifestPath);

    await requireRegularFile(
      normalizedMarkerPath,
      'tracked marker',
      fileSystem,
    );
    let marker;
    try {
      marker = JSON.parse(
        await fileSystem.readFile(normalizedMarkerPath, 'utf8'),
      );
    } catch (error) {
      throw new OwnershipJournalError(
        `tracked marker is not valid JSON (${error.message}).`,
      );
    }
    validateSmokeMarkerBinding(marker, manifest);

    const canonicalWorktreePath = await fileSystem.realpath(
      normalizedWorktreePath,
    );
    if (canonicalWorktreePath !== normalizedWorktreePath) {
      throw new OwnershipJournalError(
        'worktreePath must be its canonical real path.',
      );
    }
    if (
      normalizedMarkerPath !==
      join(canonicalWorktreePath, CHILD_MARKER_RELATIVE_PATH)
    ) {
      throw new OwnershipJournalError(
        'markerPath is not the tracked marker in the child worktree.',
      );
    }
    const outerWorktreePath = requireAbsolutePath(
      manifest.worktreePath,
      'manifest.worktreePath',
    );
    if (canonicalWorktreePath === outerWorktreePath) {
      throw new OwnershipJournalError(
        'the outer smoke worktree cannot be journaled as a child.',
      );
    }

    const actualCommonDirectory = await gitCommonDirectory(
      canonicalWorktreePath,
      { fileSystem, git },
    );
    if (actualCommonDirectory !== recordedCommonDirectory) {
      throw new OwnershipJournalError(
        'child worktree belongs to a different shared Git common directory.',
      );
    }

    let branchRef;
    try {
      branchRef = await git(['symbolic-ref', '--quiet', 'HEAD'], {
        cwd: canonicalWorktreePath,
      });
    } catch {
      throw new OwnershipJournalError(
        'child worktree must be attached to a branch.',
      );
    }
    if (!branchRef.startsWith('refs/heads/')) {
      throw new OwnershipJournalError(
        'child worktree branch is outside refs/heads.',
      );
    }
    const branch = branchRef.slice('refs/heads/'.length);
    if (branch === manifest.branch) {
      throw new OwnershipJournalError(
        'child worktree cannot reuse the outer smoke branch.',
      );
    }
    const headCommitSha = requireCommitSha(
      await git(['rev-parse', 'HEAD'], { cwd: canonicalWorktreePath }),
      'child HEAD',
    );
    if (
      !(await isCommitAncestor(baselineCommitSha, headCommitSha, {
        cwd: canonicalWorktreePath,
        git,
      }))
    ) {
      throw new OwnershipJournalError(
        'outer smoke baseline is not an ancestor of the child HEAD.',
      );
    }

    const baselineMarker = await readSmokeMarkerAtCommit(baselineCommitSha, {
      cwd: canonicalWorktreePath,
      git,
    });
    validateSmokeMarkerBinding(baselineMarker, manifest);
    const headMarker = await readSmokeMarkerAtCommit(headCommitSha, {
      cwd: canonicalWorktreePath,
      git,
    });
    validateSmokeMarkerBinding(headMarker, manifest);
    if (
      !isDeepStrictEqual(marker, baselineMarker) ||
      !isDeepStrictEqual(marker, headMarker)
    ) {
      throw new OwnershipJournalError(
        'child marker differs from the immutable run marker.',
      );
    }

    const worktrees = await canonicalWorktrees(
      canonicalWorktreePath,
      git,
      fileSystem,
    );
    const registered = worktrees.find(
      (entry) => entry.canonicalPath === canonicalWorktreePath,
    );
    if (
      !registered ||
      registered.branch !== branchRef ||
      registered.HEAD !== headCommitSha
    ) {
      throw new OwnershipJournalError(
        'child path, branch, and HEAD do not match Git worktree registration.',
      );
    }

    const pathEntry = journal.resources.find(
      (entry) => entry.worktreePath === canonicalWorktreePath,
    );
    const branchEntry = journal.resources.find(
      (entry) => entry.branch === branch,
    );
    if (pathEntry || branchEntry) {
      if (
        pathEntry !== branchEntry ||
        pathEntry.branch !== branch ||
        pathEntry.commonGitDir !== actualCommonDirectory ||
        pathEntry.runIdentity !== manifest.runIdentity
      ) {
        throw new OwnershipJournalError(
          'journal contains a conflicting child path or branch.',
        );
      }
      const recordedBaseline = requireCommitSha(
        pathEntry.baselineCommitSha,
        'journal baselineCommitSha',
      );
      if (
        !(await isCommitAncestor(recordedBaseline, headCommitSha, {
          cwd: canonicalWorktreePath,
          git,
        }))
      ) {
        throw new OwnershipJournalError(
          'child HEAD diverged from its journaled ownership baseline.',
        );
      }
      const recordedState = resolveJournalEntryState(
        pathEntry,
        journal.schemaVersion,
        'journal entry state',
      );
      if (recordedState === 'registered') {
        return pathEntry;
      }
      if (pathEntry.markerPath !== normalizedMarkerPath) {
        throw new OwnershipJournalError(
          'reserved marker path does not match the materialized child marker.',
        );
      }
      // Finalize the reservation in place. Every field of the recorded intent
      // has now been corroborated against materialized Git and marker state, so
      // the transition only records that corroboration; it never rewrites the
      // reserved branch, path, marker, baseline, shared Git directory, or run
      // identity.
      pathEntry.registeredAt = new Date().toISOString();
      pathEntry.state = 'registered';
      await writeJsonAtomic(normalizedManifestPath, manifest, { fileSystem });
      return pathEntry;
    }

    const entry = {
      baselineCommitSha: headCommitSha,
      branch,
      commonGitDir: actualCommonDirectory,
      markerPath: normalizedMarkerPath,
      registeredAt: new Date().toISOString(),
      runIdentity: manifest.runIdentity,
      state: 'registered',
      worktreePath: canonicalWorktreePath,
    };
    journal.resources.push(entry);
    await writeJsonAtomic(normalizedManifestPath, manifest, { fileSystem });
    return entry;
  } finally {
    await releaseLock();
  }
}

function parseCliArguments(argv) {
  if (argv[0] !== 'register') {
    throw new OwnershipJournalError('expected the register command.');
  }
  const values = {};
  for (let index = 1; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!option?.startsWith('--') || value === undefined) {
      throw new OwnershipJournalError('invalid register arguments.');
    }
    values[option.slice(2)] = value;
  }
  if (
    Object.keys(values).length !== 3 ||
    !values.manifest ||
    !values.marker ||
    !values.worktree
  ) {
    throw new OwnershipJournalError(
      'register requires --manifest, --marker, and --worktree.',
    );
  }
  return {
    manifestPath: values.manifest,
    markerPath: values.marker,
    worktreePath: values.worktree,
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const entry = await registerNestedSmokeResource(
      parseCliArguments(process.argv.slice(2)),
    );
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
