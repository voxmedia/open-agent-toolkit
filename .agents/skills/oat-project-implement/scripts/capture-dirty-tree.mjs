#!/usr/bin/env node
/**
 * Fail-closed capture of a lost child's uncommitted work.
 *
 * The root lifecycle runs this before it restores a phase worktree to its clean
 * base, so that a fresh same-target continuation can apply, review, and commit
 * the recovered work as its first action. Every failure mode is a hard stop
 * with a named reason; nothing here performs a best-effort restore, and the
 * script never writes to the worktree it captures.
 */
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

const NUL = '\u0000';
const MAX_GIT_BUFFER = 256 * 1024 * 1024;
const DEFAULT_QUIESCE_INTERVAL_MS = 750;
const MIN_QUIESCE_INTERVAL_MS = 25;
const PROOF_FILE = 'round-trip.proof';
const MANIFEST_FILE = 'manifest.json';

/** Named stop reasons. Callers report these verbatim; none is recoverable. */
export const CAPTURE_REASONS = Object.freeze({
  activeWriter: 'active-writer',
  unsupportedDirt: 'unsupported-dirt',
  roundTripFailed: 'round-trip-failed',
  artifactVerificationFailed: 'artifact-verification-failed',
  invalidUsage: 'invalid-usage',
});

export const EXIT_CODES = Object.freeze({
  'active-writer': 2,
  'unsupported-dirt': 3,
  'round-trip-failed': 4,
  'artifact-verification-failed': 5,
  'invalid-usage': 64,
});

const IN_PROGRESS_MARKERS = Object.freeze([
  'MERGE_HEAD',
  'CHERRY_PICK_HEAD',
  'REVERT_HEAD',
  'rebase-merge',
  'rebase-apply',
]);

function captureError(reason, message, details = {}) {
  const error = new Error(message);
  error.code = 'E_CAPTURE_DIRTY_TREE';
  error.reason = reason;
  Object.assign(error, details);
  return error;
}

async function git(
  cwd,
  args,
  { binary = false, literalPathspecs = false } = {},
) {
  // `--literal-pathspecs` exports GIT_LITERAL_PATHSPECS=1 to anything Git
  // spawns, including repository hooks, so it is scoped to the one call that
  // feeds status-derived filenames back to Git as a pathspec.
  const { stdout } = await execFile(
    'git',
    [
      '--no-optional-locks',
      ...(literalPathspecs ? ['--literal-pathspecs'] : []),
      ...args,
    ],
    {
      cwd,
      encoding: binary ? 'buffer' : 'utf8',
      maxBuffer: MAX_GIT_BUFFER,
    },
  );
  return stdout;
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Parse `git status --porcelain=v2 -z`. A `2` (rename/copy) record is followed
 * by a second NUL-terminated field holding the original path, so the reader
 * consumes that extra token rather than treating it as its own record. A path
 * Git emits in bytes that are not valid UTF-8 cannot be recorded or restored
 * losslessly here, so it is refused instead of silently mangled.
 */
export function parsePorcelainStatus(buffer) {
  const decoded = buffer.toString('utf8');
  if (!Buffer.from(decoded, 'utf8').equals(buffer)) {
    throw captureError(
      CAPTURE_REASONS.unsupportedDirt,
      'Refusing to capture: the worktree holds a path that is not valid UTF-8, which cannot be recorded or restored losslessly.',
    );
  }

  const tokens = decoded.split(NUL);
  const entries = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const record = tokens[index];
    if (!record) continue;
    const fields = record.split(' ');

    if (record.startsWith('1 ')) {
      entries.push({
        kind: 'ordinary',
        xy: fields[1],
        sub: fields[2],
        path: fields.slice(8).join(' '),
      });
    } else if (record.startsWith('2 ')) {
      entries.push({
        kind: 'rename',
        xy: fields[1],
        sub: fields[2],
        path: fields.slice(9).join(' '),
        origPath: tokens[index + 1] ?? '',
      });
      index += 1;
    } else if (record.startsWith('u ')) {
      entries.push({
        kind: 'unmerged',
        xy: fields[1],
        sub: fields[2],
        path: fields.slice(10).join(' '),
      });
    } else if (record.startsWith('? ')) {
      entries.push({ kind: 'untracked', path: record.slice(2) });
    } else if (record.startsWith('! ')) {
      entries.push({ kind: 'ignored', path: record.slice(2) });
    }
  }

  return entries;
}

async function statusBytes(worktree) {
  return await git(
    worktree,
    ['status', '--porcelain=v2', '-z', '--untracked-files=all'],
    { binary: true },
  );
}

/**
 * Content digest plus the one permission bit Git tracks. Comparing the full
 * mode would produce false mismatches from umask differences between the
 * captured worktree and a fresh checkout; the executable bit is the part Git
 * actually carries, so it is the part the round trip must reproduce.
 */
async function fingerprintPath(worktree, relativePath) {
  const absolute = join(worktree, relativePath);
  try {
    const entry = await lstat(absolute);
    const executable = (entry.mode & 0o111) === 0 ? '-' : 'x';
    const digest = sha256(await readFile(absolute));
    return `${relativePath} | ${digest} | ${executable}`;
  } catch {
    return `${relativePath} | absent | -`;
  }
}

/**
 * A worktree snapshot is `HEAD`, the porcelain status, and a fingerprint for
 * every path the status names. Porcelain v2 carries HEAD and index object ids
 * but no worktree object id, so status alone cannot see a writer that keeps
 * appending to an already-modified file, and status plus digests alone cannot
 * see a writer that modifies a clean path and then commits it. Together they
 * can.
 */
async function snapshotWorktree(worktree) {
  const head = (await git(worktree, ['rev-parse', 'HEAD'])).trim();
  const status = await statusBytes(worktree);
  const entries = parsePorcelainStatus(status);
  const paths = new Set();
  for (const entry of entries) {
    if (entry.kind === 'ignored') continue;
    paths.add(entry.path);
    if (entry.origPath) paths.add(entry.origPath);
  }

  const fingerprints = [];
  for (const path of [...paths].sort()) {
    fingerprints.push(await fingerprintPath(worktree, path));
  }

  return {
    head,
    status,
    entries,
    fingerprints: fingerprints.join('\n'),
  };
}

function snapshotsMatch(first, second) {
  return (
    first.head === second.head &&
    first.status.equals(second.status) &&
    first.fingerprints === second.fingerprints
  );
}

async function assertWriterQuiescent({ worktree, writerIdentity, intervalMs }) {
  if (!writerIdentity) {
    throw captureError(
      CAPTURE_REASONS.activeWriter,
      'Refusing to capture: the former child writer identity was not supplied, so quiescence cannot be established.',
    );
  }

  const pidMatch = /^pid:(\d+)$/.exec(writerIdentity);
  if (pidMatch) {
    let alive = false;
    try {
      process.kill(Number(pidMatch[1]), 0);
      alive = true;
    } catch {
      alive = false;
    }
    if (alive) {
      throw captureError(
        CAPTURE_REASONS.activeWriter,
        `Refusing to capture: former child process ${pidMatch[1]} is still running.`,
      );
    }
  }

  if (!Number.isFinite(intervalMs) || intervalMs < MIN_QUIESCE_INTERVAL_MS) {
    throw captureError(
      CAPTURE_REASONS.invalidUsage,
      `The quiescence interval must be a finite value of at least ${MIN_QUIESCE_INTERVAL_MS}ms.`,
    );
  }

  const first = await snapshotWorktree(worktree);
  await delay(intervalMs);
  const second = await snapshotWorktree(worktree);
  if (!snapshotsMatch(first, second)) {
    throw captureError(
      CAPTURE_REASONS.activeWriter,
      'Refusing to capture: the worktree changed between two quiescence snapshots, so a writer is still active.',
    );
  }

  return second;
}

async function assertNoInProgressOperation(worktree) {
  const gitDir = resolve(
    worktree,
    (await git(worktree, ['rev-parse', '--git-dir'])).trim(),
  );
  for (const marker of IN_PROGRESS_MARKERS) {
    if (await pathExists(join(gitDir, marker))) {
      throw captureError(
        CAPTURE_REASONS.unsupportedDirt,
        `Refusing to capture: an in-progress ${marker} operation is not a supported dirt class.`,
        { marker },
      );
    }
  }
}

function withinBounds(path, boundedFiles) {
  if (boundedFiles.length === 0) return true;
  return boundedFiles.some(
    (bound) => path === bound || path.startsWith(`${bound}/`),
  );
}

function classifyDirt(entries, boundedFiles) {
  const tracked = [];
  const untracked = [];

  for (const entry of entries) {
    if (entry.kind === 'ignored') continue;

    if (entry.kind === 'unmerged') {
      throw captureError(
        CAPTURE_REASONS.unsupportedDirt,
        `Refusing to capture: unmerged path ${entry.path} is not a supported dirt class.`,
      );
    }

    // A staged rename has no per-path restore: unstaging leaves the destination
    // untracked and the source missing from the index, so the caller-owned
    // restore below could not return the tree to its clean base.
    if (entry.kind === 'rename') {
      throw captureError(
        CAPTURE_REASONS.unsupportedDirt,
        `Refusing to capture: staged rename or copy ${entry.origPath} -> ${entry.path} is not a supported dirt class.`,
      );
    }

    if (entry.kind === 'untracked') {
      untracked.push(entry.path);
      continue;
    }

    if (typeof entry.sub === 'string' && !entry.sub.startsWith('N')) {
      throw captureError(
        CAPTURE_REASONS.unsupportedDirt,
        `Refusing to capture: submodule change at ${entry.path} is not a supported dirt class.`,
      );
    }

    tracked.push(entry.path);
  }

  const overlap = tracked.filter((path) => untracked.includes(path));
  if (overlap.length > 0) {
    // One path cannot be both restored from HEAD and deleted as untracked; a
    // staged deletion whose worktree file was recreated has no single action.
    throw captureError(
      CAPTURE_REASONS.unsupportedDirt,
      `Refusing to capture: ${overlap.join(', ')} is both a tracked change and an untracked file, which has no single restore action.`,
    );
  }

  const affectedPaths = [...new Set([...tracked, ...untracked])].sort();
  const outOfBounds = affectedPaths.filter(
    (path) => !withinBounds(path, boundedFiles),
  );
  if (outOfBounds.length > 0) {
    throw captureError(
      CAPTURE_REASONS.unsupportedDirt,
      `Refusing to capture: ${outOfBounds.length} path(s) fall outside the phase bounded_files: ${outOfBounds.join(', ')}.`,
      { outOfBounds },
    );
  }

  return {
    trackedPaths: [...new Set(tracked)].sort(),
    untrackedPaths: [...new Set(untracked)].sort(),
    affectedPaths,
  };
}

/**
 * The caller-owned restore, derived rather than guessed. A tracked path that
 * exists in `HEAD` is reset from `HEAD`; a path staged as a new file has no
 * `HEAD` content to restore, so it is unstaged and removed instead.
 */
async function buildRestorePlan(worktree, trackedPaths, untrackedPaths) {
  const inHead = new Set();
  if (trackedPaths.length > 0) {
    const listed = await git(
      worktree,
      ['ls-tree', '-r', '-z', '--name-only', 'HEAD', '--', ...trackedPaths],
      { literalPathspecs: true },
    );
    for (const path of listed.split(NUL)) {
      if (path) inHead.add(path);
    }
  }

  return [
    ...trackedPaths.map((path) => ({
      path,
      action: inHead.has(path) ? 'restore-from-head' : 'unstage-and-remove',
    })),
    ...untrackedPaths.map((path) => ({ path, action: 'remove-untracked' })),
  ];
}

async function writeArtifactFile(
  artifactDir,
  relativePath,
  bytes,
  files,
  { executable = false } = {},
) {
  const target = join(artifactDir, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: 'wx' });
  if (executable) await chmod(target, 0o755);
  files.push({
    path: relativePath,
    sha256: sha256(bytes),
    bytes: bytes.length,
    executable,
  });
}

async function applyArtifact(artifactDir, manifest, targetWorktree) {
  const indexPatch = manifest.files.find((file) => file.path === 'index.patch');
  const worktreePatch = manifest.files.find(
    (file) => file.path === 'worktree.patch',
  );

  if (indexPatch && indexPatch.bytes > 0) {
    await git(targetWorktree, [
      'apply',
      '--index',
      '--whitespace=nowarn',
      join(artifactDir, 'index.patch'),
    ]);
  }
  if (worktreePatch && worktreePatch.bytes > 0) {
    await git(targetWorktree, [
      'apply',
      '--whitespace=nowarn',
      join(artifactDir, 'worktree.patch'),
    ]);
  }
  for (const path of manifest.untrackedPaths) {
    const mirrored = join('untracked', path);
    const target = join(targetWorktree, path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(artifactDir, mirrored), target);
    // Restore the executable bit from the manifest, not from whatever mode the
    // mirrored copy happens to carry on disk; only the manifest is digest
    // anchored.
    const recorded = manifest.files.find((file) => file.path === mirrored);
    if (recorded) await chmod(target, recorded.executable ? 0o755 : 0o644);
  }
}

/**
 * Prove the artifact as written to disk replays into a pristine replica of the
 * captured `HEAD` and reproduces the captured worktree exactly. Any mismatch is
 * `round-trip-failed`; the captured worktree is never written to.
 *
 * The seal is written here and nowhere else, and the digest and size a capture
 * hands to the continuation are the ones this function returns. A capture that
 * skipped this proof would therefore have no reference to publish and no seal
 * for `--verify` to accept.
 */
export async function proveArtifactRoundTrip({ worktree, artifactDir }) {
  const worktreeRoot = resolve(worktree);
  const artifactRoot = resolve(artifactDir);
  let manifestBytes;
  let manifest;
  try {
    manifestBytes = await readFile(join(artifactRoot, MANIFEST_FILE));
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    throw captureError(
      CAPTURE_REASONS.roundTripFailed,
      `Refusing to hand over the artifact: its manifest could not be read (${error.message}).`,
    );
  }

  const snapshot = await snapshotWorktree(worktreeRoot);
  await replayInto({
    worktree: worktreeRoot,
    artifactDir: artifactRoot,
    manifest,
    snapshot,
  });

  const manifestDigest = sha256(manifestBytes);
  const size = (manifest.files ?? []).reduce(
    (sum, file) => sum + file.bytes,
    manifestBytes.length,
  );
  // Not exclusive: re-proving an artifact is legitimate and must be able to
  // refresh the seal. The artifact directory itself is created exclusively, so
  // there is never a foreign seal to clobber.
  const proof = { manifestDigest, size, provenAt: new Date().toISOString() };
  await writeFile(
    join(artifactRoot, PROOF_FILE),
    `${JSON.stringify(proof, null, 2)}\n`,
  );

  return {
    ok: true,
    head: manifest.head,
    affectedPaths: manifest.affectedPaths ?? [],
    manifestDigest,
    size,
  };
}

async function replayInto({ worktree, artifactDir, manifest, snapshot }) {
  const scratch = await mkdtemp(join(tmpdir(), 'oat-capture-roundtrip-'));
  const replica = join(scratch, 'replica');
  let added = false;
  let primary = null;
  let cleanupError = null;

  try {
    await git(worktree, [
      'worktree',
      'add',
      '--detach',
      replica,
      manifest.head,
    ]);
    added = true;
    await applyArtifact(artifactDir, manifest, replica);

    const replicaSnapshot = await snapshotWorktree(replica);
    if (!snapshotsMatch(snapshot, replicaSnapshot)) {
      throw captureError(
        CAPTURE_REASONS.roundTripFailed,
        'Refusing to hand over the artifact: the replayed worktree does not match the captured worktree.',
      );
    }
  } catch (error) {
    primary = error.reason
      ? error
      : captureError(
          CAPTURE_REASONS.roundTripFailed,
          `Refusing to hand over the artifact: the round trip failed (${error.message}).`,
        );
  } finally {
    if (added) {
      try {
        await git(worktree, ['worktree', 'remove', '--force', replica]);
      } catch (error) {
        cleanupError = error;
      }
    }
    try {
      await rm(scratch, { recursive: true, force: true });
    } catch (error) {
      cleanupError ??= error;
    }
  }

  if (primary) throw primary;
  if (cleanupError) {
    // A stale replay registration would leave the captured repository holding a
    // worktree the lifecycle never authorized. Fail closed instead.
    throw captureError(
      CAPTURE_REASONS.roundTripFailed,
      `Refusing to hand over the artifact: the replay worktree could not be removed (${cleanupError.message}).`,
    );
  }
}

/**
 * Lexical containment is not enough: a symlinked ancestor can point the
 * artifact directory straight back into the worktree this script must not write
 * to, and an existing directory could be silently overwritten. Require a fresh
 * directory whose resolved location is outside the worktree.
 */
async function assertResolvesOutsideWorktree(worktreeRoot, artifactRoot) {
  let ancestor = artifactRoot;
  while (!(await pathExists(ancestor))) {
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  const realAncestor = await realpath(ancestor);
  const realWorktree = await realpath(worktreeRoot);
  const realArtifact =
    ancestor === artifactRoot
      ? realAncestor
      : join(realAncestor, artifactRoot.slice(ancestor.length + 1));
  if (
    realArtifact === realWorktree ||
    realArtifact.startsWith(realWorktree + sep)
  ) {
    throw captureError(
      CAPTURE_REASONS.invalidUsage,
      'The artifact directory must resolve outside the worktree it captures.',
    );
  }
}

async function resolveArtifactRoot(worktreeRoot, artifactDir) {
  const artifactRoot = resolve(artifactDir);
  if (await pathExists(artifactRoot)) {
    throw captureError(
      CAPTURE_REASONS.invalidUsage,
      'The artifact directory must not already exist; capture creates it so that nothing can be overwritten.',
    );
  }

  await assertResolvesOutsideWorktree(worktreeRoot, artifactRoot);
  return artifactRoot;
}

/**
 * Capture every index, worktree, and untracked component of a quiescent dirty
 * worktree into an immutable artifact directory, prove the artifact replays
 * byte-for-byte, seal it, and return the reference the caller records. The
 * caller — not this script — performs the restore afterwards.
 */
export async function captureDirtyTree({
  worktree,
  artifactDir,
  writerIdentity,
  boundedFiles = [],
  quiesceIntervalMs = DEFAULT_QUIESCE_INTERVAL_MS,
}) {
  if (!worktree || !artifactDir) {
    throw captureError(
      CAPTURE_REASONS.invalidUsage,
      'Both --worktree and --artifact-dir are required.',
    );
  }

  const worktreeRoot = resolve(worktree);
  const artifactRoot = await resolveArtifactRoot(worktreeRoot, artifactDir);

  await assertNoInProgressOperation(worktreeRoot);
  const snapshot = await assertWriterQuiescent({
    worktree: worktreeRoot,
    writerIdentity,
    intervalMs: quiesceIntervalMs,
  });
  const { trackedPaths, untrackedPaths, affectedPaths } = classifyDirt(
    snapshot.entries,
    boundedFiles,
  );

  // Untracked entries are captured as byte copies, which silently converts a
  // symlink or a device node into a regular file. Refuse rather than restore
  // something that is not what the lost child left behind.
  const untrackedModes = new Map();
  for (const path of untrackedPaths) {
    const entry = await lstat(join(worktreeRoot, path));
    if (!entry.isFile()) {
      throw captureError(
        CAPTURE_REASONS.unsupportedDirt,
        `Refusing to capture: untracked path ${path} is not a regular file and cannot be copied faithfully.`,
      );
    }
    untrackedModes.set(path, (entry.mode & 0o111) !== 0);
  }

  const indexPatch = await git(
    worktreeRoot,
    ['diff', '--cached', '--binary', '--no-color', '--no-ext-diff'],
    { binary: true },
  );
  const worktreePatch = await git(
    worktreeRoot,
    ['diff', '--binary', '--no-color', '--no-ext-diff'],
    { binary: true },
  );
  const indexStat = await git(worktreeRoot, [
    'diff',
    '--cached',
    '--stat',
    '--no-color',
  ]);
  const untrackedBytes = new Map();
  for (const path of untrackedPaths) {
    untrackedBytes.set(path, await readFile(join(worktreeRoot, path)));
  }
  const restorePlan = await buildRestorePlan(
    worktreeRoot,
    trackedPaths,
    untrackedPaths,
  );

  // Nothing is written anywhere until the worktree is proven unchanged across
  // the whole read, so an interrupted capture leaves no half-written artifact.
  if (!snapshotsMatch(snapshot, await snapshotWorktree(worktreeRoot))) {
    throw captureError(
      CAPTURE_REASONS.activeWriter,
      'Refusing to capture: the worktree changed while it was being read, so a writer is still active.',
    );
  }

  // Exclusive, non-recursive: a directory raced into existence after the
  // precheck fails here rather than being adopted, and the caller must have
  // already created the parent it chose.
  try {
    await mkdir(artifactRoot);
  } catch (error) {
    throw captureError(
      CAPTURE_REASONS.invalidUsage,
      `The artifact directory could not be created exclusively beneath an existing parent: ${error.message}`,
    );
  }
  // Re-check after creation: the containment decision above was made against a
  // path that did not exist yet, so a directory or symlink substituted in the
  // meantime would otherwise go unnoticed.
  await assertResolvesOutsideWorktree(worktreeRoot, artifactRoot);
  const files = [];
  await writeArtifactFile(artifactRoot, 'index.patch', indexPatch, files);
  await writeArtifactFile(artifactRoot, 'worktree.patch', worktreePatch, files);
  for (const path of untrackedPaths) {
    await writeArtifactFile(
      artifactRoot,
      join('untracked', path),
      untrackedBytes.get(path),
      files,
      { executable: untrackedModes.get(path) },
    );
  }

  const components = [];
  if (indexPatch.length > 0) components.push('index');
  if (worktreePatch.length > 0) components.push('worktree');
  if (untrackedPaths.length > 0) components.push('untracked');

  const manifest = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    worktree: worktreeRoot,
    head: snapshot.head,
    writerIdentity,
    components,
    affectedPaths,
    trackedPaths,
    untrackedPaths,
    restorePlan,
    stat: indexStat,
    files,
  };
  const manifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  await writeFile(join(artifactRoot, MANIFEST_FILE), manifestBytes, {
    flag: 'wx',
  });
  // The proof is what seals the artifact and what produces the digest and size
  // this capture publishes, so an unproven artifact has neither a reference to
  // hand over nor a seal `--verify` will accept.
  const { manifestDigest, size } = await proveArtifactRoundTrip({
    worktree: worktreeRoot,
    artifactDir: artifactRoot,
  });

  return {
    ok: true,
    artifact: artifactRoot,
    manifestDigest,
    size,
    components,
    affectedPaths,
    restorePlan,
    stat: indexStat,
  };
}

/**
 * Re-verify an artifact before it is applied: the round-trip seal, the
 * manifest, and every named file must be readable and must still match the
 * digest and size the continuation brief carries. A tampered, unreadable, or
 * unproven artifact stops here.
 */
export async function verifyArtifact({ artifactDir, manifestDigest, size }) {
  const artifactRoot = resolve(artifactDir);

  if (!manifestDigest || size === undefined || Number.isNaN(size)) {
    throw captureError(
      CAPTURE_REASONS.artifactVerificationFailed,
      'Both the expected --manifest-digest and --size from the continuation brief are required to verify an artifact.',
    );
  }

  let proof;
  try {
    proof = JSON.parse(await readFile(join(artifactRoot, PROOF_FILE), 'utf8'));
  } catch (error) {
    throw captureError(
      CAPTURE_REASONS.artifactVerificationFailed,
      `Artifact round-trip seal is missing or unreadable, so the artifact was never proven to replay: ${error.message}`,
    );
  }
  if (
    typeof proof !== 'object' ||
    proof === null ||
    typeof proof.manifestDigest !== 'string' ||
    typeof proof.size !== 'number'
  ) {
    throw captureError(
      CAPTURE_REASONS.artifactVerificationFailed,
      'Artifact round-trip seal is malformed, so the artifact cannot be treated as proven.',
    );
  }

  let manifestBytes;
  try {
    manifestBytes = await readFile(join(artifactRoot, MANIFEST_FILE));
  } catch (error) {
    throw captureError(
      CAPTURE_REASONS.artifactVerificationFailed,
      `Artifact manifest is unreadable: ${error.message}`,
    );
  }

  const actualManifestDigest = sha256(manifestBytes);
  for (const [label, expected, actual] of [
    ['brief manifest digest', manifestDigest, actualManifestDigest],
    ['sealed manifest digest', proof.manifestDigest, actualManifestDigest],
    ['sealed size', proof.size, size],
  ]) {
    if (expected !== actual) {
      throw captureError(
        CAPTURE_REASONS.artifactVerificationFailed,
        `Artifact ${label} mismatch: expected ${expected}, found ${actual}.`,
      );
    }
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    throw captureError(
      CAPTURE_REASONS.artifactVerificationFailed,
      `Artifact manifest is not valid JSON: ${error.message}`,
    );
  }

  let total = manifestBytes.length;
  for (const file of manifest.files ?? []) {
    let bytes;
    try {
      bytes = await readFile(join(artifactRoot, file.path));
    } catch (error) {
      throw captureError(
        CAPTURE_REASONS.artifactVerificationFailed,
        `Artifact file ${file.path} is unreadable: ${error.message}`,
      );
    }
    if (bytes.length !== file.bytes) {
      throw captureError(
        CAPTURE_REASONS.artifactVerificationFailed,
        `Artifact file ${file.path} size mismatch: expected ${file.bytes}, found ${bytes.length}.`,
      );
    }
    const digest = sha256(bytes);
    if (digest !== file.sha256) {
      throw captureError(
        CAPTURE_REASONS.artifactVerificationFailed,
        `Artifact file ${file.path} digest mismatch: expected ${file.sha256}, found ${digest}.`,
      );
    }
    const executable =
      ((await lstat(join(artifactRoot, file.path))).mode & 0o111) !== 0;
    if (executable !== Boolean(file.executable)) {
      throw captureError(
        CAPTURE_REASONS.artifactVerificationFailed,
        `Artifact file ${file.path} executable-bit mismatch: expected ${Boolean(file.executable)}, found ${executable}.`,
      );
    }
    total += bytes.length;
  }

  if (total !== size) {
    throw captureError(
      CAPTURE_REASONS.artifactVerificationFailed,
      `Artifact aggregate size mismatch: expected ${size}, found ${total}.`,
    );
  }

  return {
    ok: true,
    artifact: artifactRoot,
    manifestDigest: actualManifestDigest,
    size: total,
    components: manifest.components ?? [],
    affectedPaths: manifest.affectedPaths ?? [],
    restorePlan: manifest.restorePlan ?? [],
    head: manifest.head ?? null,
  };
}

function parseArguments(argv) {
  const options = { boundedFiles: [], verify: false };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--verify') {
      options.verify = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined) {
      throw captureError(
        CAPTURE_REASONS.invalidUsage,
        `Missing value for ${flag}.`,
      );
    }
    index += 1;
    if (flag === '--worktree') options.worktree = value;
    else if (flag === '--artifact-dir') options.artifactDir = value;
    else if (flag === '--writer-identity') options.writerIdentity = value;
    else if (flag === '--manifest-digest') options.manifestDigest = value;
    else if (flag === '--size') options.size = Number(value);
    else if (flag === '--quiesce-interval-ms') {
      options.quiesceIntervalMs = Number(value);
    } else if (flag === '--bounded-file') options.boundedFiles.push(value);
    else if (flag === '--bounded-files') {
      options.boundedFiles.push(...value.split(',').filter(Boolean));
    } else {
      throw captureError(
        CAPTURE_REASONS.invalidUsage,
        `Unsupported argument: ${flag}.`,
      );
    }
  }

  return options;
}

async function main(argv) {
  try {
    const options = parseArguments(argv);
    const result = options.verify
      ? await verifyArtifact(options)
      : await captureDirtyTree(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    const reason = error.reason ?? CAPTURE_REASONS.invalidUsage;
    process.stderr.write(
      `${JSON.stringify({ ok: false, reason, message: error.message })}\n`,
    );
    return EXIT_CODES[reason] ?? 1;
  }
}

const invokedPath = process.argv[1];
if (
  invokedPath &&
  isAbsolute(invokedPath) &&
  import.meta.url === pathToFileURL(invokedPath).href
) {
  process.exitCode = await main(process.argv.slice(2));
}
