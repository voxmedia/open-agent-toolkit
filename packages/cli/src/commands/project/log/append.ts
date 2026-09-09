import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import {
  appendFile,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { homedir, hostname, tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  resolveActiveProject,
  type ActiveProjectResolution,
} from '@config/oat-config';
import { resolveEffectiveConfig, type ResolvedConfig } from '@config/resolve';
import { resolveAssetsRoot } from '@fs/assets';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { findProjectLogSeal, type ProjectLogSeal } from './check';
import {
  composeJudgmentHeading,
  composeStructuralHeading,
  isProjectLogEntryMarker,
  isProjectLogSealEntry,
  isProjectLogSectionMarker,
  PROJECT_LOG_AREA_MAX_LENGTH,
  PROJECT_LOG_HEADING_DELIMITER,
  PROJECT_LOG_SCOPES,
  PROJECT_LOG_TYPES,
  STRUCTURAL_HEADING_RE,
  type ProjectLogScope,
  type ProjectLogType,
} from './grammar';

export const PROJECT_LOG_FILENAME = 'project-log.md';
const SYNTHESIS_HEADING_PREFIX = '\n## End-of-run synthesis';

/**
 * Directory, relative to a project, that holds gate partial-finalization
 * receipts. Ignored by the repository so a receipt never dirties the tree.
 */
export const GATE_RECEIPTS_DIRNAME = 'gate-receipts';

/**
 * Bounded attempt budget for committing the project log across a transient
 * `.git/index.lock`. Three attempts means exactly two waits, so the delays
 * below are the whole window the persistent-versus-transient mtime comparison
 * spans. Declared here rather than inline so the bound is reviewable and the
 * gate and the recovery entry point share one budget.
 */
export const PROJECT_LOG_COMMIT_ATTEMPTS = 3;
export const PROJECT_LOG_COMMIT_RETRY_DELAYS_MS: readonly number[] = [250, 500];

const COMMIT_MESSAGE = 'chore(oat): record project log entry';

/**
 * Directory, under the OS temp root, that holds the advisory locks serializing
 * project-log mutations.
 *
 * The lock is deliberately *not* stored beside the log. A tracked project
 * directory would gain an untracked file for the duration of every append, and
 * a crashed writer would leave one behind for review to trip over. A lock must
 * also not outlive the machine that took it, which is exactly what a temp root
 * gives: the receipt needed durability across processes and therefore rejected
 * `tmpdir()` (DR-260907), while a lock needs the opposite.
 *
 * This serializes writers on one machine, which is the condition the gate
 * actually meets: overlapping `oat` processes in one worktree. It is advisory,
 * so a writer that cannot take it still proceeds — the identity verification in
 * `commitProjectLog` is the assurance that a lost entry is never reported as
 * settled work.
 */
const PROJECT_LOG_LOCK_DIRNAME = 'oat-project-log-locks';

/**
 * Bounded wait for the advisory lock. Declared rather than inline so the bound
 * is reviewable: a writer waits at most `WAIT_MS`, polling every `POLL_MS`, and
 * treats a lock whose owner is gone — or that is older than `STALE_MS` — as
 * abandoned.
 */
export const PROJECT_LOG_LOCK_WAIT_MS = 5_000;
export const PROJECT_LOG_LOCK_POLL_MS = 25;
export const PROJECT_LOG_LOCK_STALE_MS = 30_000;

export interface ProjectLogLockDependencies {
  waitMs: number;
  pollMs: number;
  staleMs: number;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

const DEFAULT_LOCK_DEPENDENCIES: ProjectLogLockDependencies = {
  waitMs: PROJECT_LOG_LOCK_WAIT_MS,
  pollMs: PROJECT_LOG_LOCK_POLL_MS,
  staleMs: PROJECT_LOG_LOCK_STALE_MS,
  sleep: async (ms: number): Promise<void> => {
    await new Promise((settle) => setTimeout(settle, ms));
  },
  now: () => Date.now(),
};

interface ProjectLogLockHolder {
  token?: unknown;
  pid?: unknown;
  host?: unknown;
  acquiredAt?: unknown;
}

interface ProjectLogLockHandle {
  path: string;
  token: string;
  /** False when the bounded wait elapsed and the caller proceeded unlocked. */
  held: boolean;
}

/**
 * The lock file for one log, keyed by the log's resolved location so two
 * processes naming the same file through different relative paths — or through
 * a symlinked temp root — contend on the same lock.
 */
/**
 * The real, symlink-free location of `target`, falling back to the plain
 * resolution when the path cannot be canonicalized.
 *
 * This matters everywhere two spellings of one path must compare equal: a
 * macOS temp root is `/var/...` to the caller and `/private/var/...` to git, so
 * a raw `relative()` between the two reads as "outside the repository".
 */
function canonicalPath(target: string): string {
  try {
    return realpathSync(target);
  } catch {
    return resolve(target);
  }
}

export function projectLogLockPath(logPath: string): string {
  const resolvedDirectory = canonicalPath(dirname(resolve(logPath)));
  const digest = createHash('sha256')
    .update(join(resolvedDirectory, basename(logPath)))
    .digest('hex');
  return join(tmpdir(), PROJECT_LOG_LOCK_DIRNAME, `${digest}.lock`);
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process exists but belongs to another user, which is
    // still a live owner; only ESRCH proves it is gone.
    return (
      error != null &&
      typeof error === 'object' &&
      (error as { code?: string }).code === 'EPERM'
    );
  }
}

function readLockHolder(lockPath: string): ProjectLogLockHolder | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(lockPath, 'utf8'));
    return parsed != null && typeof parsed === 'object'
      ? (parsed as ProjectLogLockHolder)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Creates the lock file exclusively and confirms the file still names us.
 *
 * `wx` is the primitive: the create either wins or fails with `EEXIST`, in this
 * process exactly as in any other. The confirming read is what makes a stale
 * takeover safe. POSIX has no compare-and-unlink, so a contender that judged a
 * lock abandoned can still remove a *live* lock created in the gap between its
 * decision and its unlink. When that happens the loser's token is no longer in
 * the file, so it reports a failed acquire and retries instead of entering the
 * critical section alongside the winner. Exactly one writer sees its own token.
 */
function tryCreateProjectLogLock(lockPath: string, token: string): boolean {
  let descriptor: number;
  try {
    descriptor = openSync(lockPath, 'wx');
  } catch {
    return false;
  }
  try {
    writeSync(
      descriptor,
      `${JSON.stringify({
        token,
        pid: process.pid,
        host: hostname(),
        acquiredAt: new Date().toISOString(),
      })}\n`,
    );
  } catch {
    // A lock we cannot identify ourselves in is a lock we must not claim.
    try {
      closeSync(descriptor);
    } catch {
      // Nothing to recover.
    }
    return false;
  }
  try {
    closeSync(descriptor);
  } catch {
    // Nothing to recover: the exclusive create already succeeded.
  }
  return readLockHolder(lockPath)?.token === token;
}

/**
 * Takes the single-winner right to reclaim an abandoned lock.
 *
 * Reclamation is the one operation that removes a file this process did not
 * create, so it is itself serialized. With the slot held there is no second
 * reclaimer, and an ordinary acquirer cannot slip in either: its `wx` create
 * fails for as long as the abandoned lock is still on disk. The lock the
 * reclaimer unlinks is therefore provably the lock it inspected.
 *
 * A slot whose owner died mid-reclamation is itself reclaimed once it is older
 * than `staleMs`. That fallback is the only place two reclaimers can meet, and
 * it costs a 30-second stall rather than a lost entry.
 */
function acquireReclaimSlot(
  reclaimPath: string,
  staleMs: number,
  nowMs: number,
): boolean {
  if (tryCreateReclaimSlot(reclaimPath)) {
    return true;
  }
  const mtime = lockMtimeMs(reclaimPath);
  if (mtime === undefined) {
    return tryCreateReclaimSlot(reclaimPath);
  }
  if (nowMs - mtime < staleMs) {
    return false;
  }
  try {
    unlinkSync(reclaimPath);
  } catch {
    return false;
  }
  return tryCreateReclaimSlot(reclaimPath);
}

function tryCreateReclaimSlot(reclaimPath: string): boolean {
  try {
    closeSync(openSync(reclaimPath, 'wx'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether a lock's owner can be shown to be gone.
 *
 * A same-host lock whose recorded pid no longer exists was abandoned by a
 * crashed writer. Anything else — an unreadable body, or a lock recorded by
 * another host — counts as abandoned only once it is older than `staleMs`, so
 * a live owner is never evicted on a guess.
 */
function lockIsAbandoned(
  holder: ProjectLogLockHolder | undefined,
  mtimeMs: number,
  staleMs: number,
  nowMs: number,
): boolean {
  if (holder?.host === hostname() && typeof holder.pid === 'number') {
    return !isProcessAlive(holder.pid);
  }
  return nowMs - mtimeMs >= staleMs;
}

/**
 * Removes a lock whose owner can be shown to be gone.
 *
 * This only ever removes *this module's own* advisory lock. It never touches
 * `.git/index.lock`, which belongs to git and to whichever process took it.
 *
 * A same-host lock whose recorded pid no longer exists is abandoned by a
 * crashed writer and is cleared immediately; anything else — an unreadable
 * body, or a lock recorded by another host — is cleared only once it is older
 * than `staleMs`, so a live owner is never evicted on a guess.
 */
function clearStaleProjectLogLock(
  lockPath: string,
  staleMs: number,
  nowMs: number,
): boolean {
  const mtime = lockMtimeMs(lockPath);
  if (mtime === undefined) {
    // Already gone: the next exclusive create is the retry.
    return true;
  }
  if (!lockIsAbandoned(readLockHolder(lockPath), mtime, staleMs, nowMs)) {
    return false;
  }

  const reclaimPath = `${lockPath}.reclaim`;
  if (!acquireReclaimSlot(reclaimPath, staleMs, nowMs)) {
    return false;
  }
  try {
    // Re-decided under the slot, against the file as it is now. Nothing can
    // have replaced it: a competing reclaimer would need this slot, and an
    // ordinary acquirer cannot create a lock that still exists.
    const currentMtime = lockMtimeMs(lockPath);
    if (currentMtime === undefined) {
      return true;
    }
    if (
      !lockIsAbandoned(readLockHolder(lockPath), currentMtime, staleMs, nowMs)
    ) {
      return false;
    }
    unlinkSync(lockPath);
    return true;
  } catch {
    return false;
  } finally {
    try {
      unlinkSync(reclaimPath);
    } catch {
      // A slot we cannot remove is reclaimed by the staleness fallback above.
    }
  }
}

/**
 * Takes the advisory lock for `logPath`, waiting a bounded time.
 *
 * Returns a handle whose `held` is false when the wait elapsed. What that means
 * is the caller's to decide: see `withProjectLogLock`, where a file-rewriting
 * mutation refuses and a commit proceeds.
 */
async function acquireProjectLogLock(
  logPath: string,
  overrides: Partial<ProjectLogLockDependencies> = {},
): Promise<ProjectLogLockHandle> {
  const dependencies = { ...DEFAULT_LOCK_DEPENDENCIES, ...overrides };
  const lockPath = projectLogLockPath(logPath);
  const token = randomUUID();
  try {
    mkdirSync(dirname(lockPath), { recursive: true });
  } catch {
    return { path: lockPath, token, held: false };
  }

  const deadline = dependencies.now() + dependencies.waitMs;
  for (;;) {
    if (tryCreateProjectLogLock(lockPath, token)) {
      return { path: lockPath, token, held: true };
    }
    if (
      clearStaleProjectLogLock(
        lockPath,
        dependencies.staleMs,
        dependencies.now(),
      ) &&
      tryCreateProjectLogLock(lockPath, token)
    ) {
      return { path: lockPath, token, held: true };
    }
    if (dependencies.now() >= deadline) {
      return { path: lockPath, token, held: false };
    }
    await dependencies.sleep(dependencies.pollMs);
  }
}

/**
 * Releases a lock this process still owns. A lock that was stolen as stale now
 * belongs to its new holder, so the token is checked before the unlink.
 */
function releaseProjectLogLock(handle: ProjectLogLockHandle): void {
  if (!handle.held) {
    return;
  }
  const holder = readLockHolder(handle.path);
  if (holder !== undefined && holder.token !== handle.token) {
    return;
  }
  try {
    unlinkSync(handle.path);
  } catch {
    // Already released or never created; there is nothing to report.
  }
}

/**
 * Runs `mutate` with the log's advisory lock held, releasing it on every path.
 *
 * `required` is for mutations that rewrite the file. Running one of those
 * without the lock is exactly the read/modify/write race this exists to close,
 * so an unavailable lock refuses rather than proceeding: a loud, retryable
 * failure that the caller reports is strictly better than a silent clobber of
 * another writer's entry, and the recovery command replays the append safely.
 *
 * `best-effort` is for work that cannot lose an entry — committing does not
 * rewrite the log — where holding the lock only keeps this process from racing
 * its own sibling into `.git/index.lock`.
 */
async function withProjectLogLock<T>(
  logPath: string,
  overrides: Partial<ProjectLogLockDependencies>,
  policy: 'required' | 'best-effort',
  mutate: () => Promise<T>,
): Promise<T> {
  const handle = await acquireProjectLogLock(logPath, overrides);
  if (!handle.held && policy === 'required') {
    throw new Error(
      `Timed out waiting for the project log lock at ${handle.path}. Another writer is holding it; retry once it finishes.`,
    );
  }
  try {
    return await mutate();
  } finally {
    releaseProjectLogLock(handle);
  }
}

export type GitLockFailureClass =
  | 'transient-index-lock'
  | 'persistent-index-lock'
  | 'other';

export type ProjectLogCommitOutcome =
  | 'committed'
  | 'already-committed'
  | 'nothing-to-commit'
  | 'not-a-repo'
  | 'blocked-by-index-lock'
  | 'entry-missing-after-commit'
  | 'commit-unverified'
  | 'failed';

export interface ProjectLogCommitResult {
  outcome: ProjectLogCommitOutcome;
  committed: boolean;
  attempts: number;
  error?: string;
  lockClass?: GitLockFailureClass;
}

export interface CommitProjectLogInput {
  repoRoot: string;
  logPath: string;
  message?: string;
  /**
   * Identity of the entry this commit is finalizing: the idempotency key plus
   * the body it was written in, which together name the exact token to look
   * for. Supplied so a settled outcome is proven rather than inferred — a clean
   * log whose content still carries this entry is a log whose HEAD content
   * carries it too.
   */
  identity?: { key: string; body: string };
}

export interface CommitProjectLogDependencies {
  attempts: number;
  retryDelaysMs: readonly number[];
  sleep: (ms: number) => Promise<void>;
  /**
   * Advisory-lock overrides. Kept separate from `sleep` above, which is the
   * index-lock retry delay: the two waits are different bounds and a caller
   * that observes one must not be told about the other.
   */
  lock: Partial<ProjectLogLockDependencies>;
  /**
   * Git runner for this path. Injectable so a control can make one command
   * fail — the committed-log read back is allowed to be unavailable, and what
   * happens then has to be provable rather than asserted.
   */
  runGit: (repoRoot: string, args: string[]) => string;
}

const DEFAULT_COMMIT_DEPENDENCIES: CommitProjectLogDependencies = {
  attempts: PROJECT_LOG_COMMIT_ATTEMPTS,
  retryDelaysMs: PROJECT_LOG_COMMIT_RETRY_DELAYS_MS,
  sleep: async (ms: number): Promise<void> => {
    await new Promise((settle) => setTimeout(settle, ms));
  },
  lock: {},
  runGit,
};

/**
 * Outcomes that mean the log entry is committed and a partial-finalization
 * receipt is no longer needed.
 */
const SETTLED_COMMIT_OUTCOMES: ReadonlySet<ProjectLogCommitOutcome> = new Set([
  'committed',
  'already-committed',
  'nothing-to-commit',
]);

/**
 * Git's own index-lock contention evidence. Deliberately narrow: any stderr
 * that merely mentions `index.lock` — a hook that prints advice, for instance —
 * is a real failure, and treating it as contention would retry and then bury it
 * behind a partial-finalization receipt.
 *
 * Git emits its "another git process" advice only alongside the fatal line that
 * names the lock it could not create, so the advice on its own is not evidence;
 * it counts only when the same output also names an index lock.
 */
const INDEX_LOCK_CREATE_RE =
  /unable to create '[^']*index\.lock': file exists/i;
const GIT_CONTENTION_ADVICE_RE =
  /another git process seems to be running in this repository/i;
const INDEX_LOCK_MENTION_RE = /index\.lock/i;

/**
 * Accepted residual: a hook that reproduces git's advice sentence *and* names
 * an index lock in the same output is read as contention and retried three
 * times. That costs one wasted retry window and a misleading `lockClass`, but
 * it is not a swallowed failure — the exit status stays non-zero, the raw
 * stderr is preserved in `error`, nothing is left staged, and the gate still
 * emits `gate-project-log-commit-failed`. Demanding the fatal line for the
 * advice branch too would reject nothing git actually emits, but it would also
 * make the branch redundant with the primary regex, so the branch is kept for
 * git output shapes that lead with the advice.
 */
function isIndexLockContention(stderr: string): boolean {
  return (
    INDEX_LOCK_CREATE_RE.test(stderr) ||
    (GIT_CONTENTION_ADVICE_RE.test(stderr) &&
      INDEX_LOCK_MENTION_RE.test(stderr))
  );
}

function runGit(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    // Capture stderr rather than inheriting it so skip and failure probes do
    // not leak raw `git fatal:` lines into command output.
    stdio: ['ignore', 'pipe', 'pipe'],
    // Reading the committed log back is one of these calls, and a long-lived
    // project log outgrows the 1 MiB default.
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function gitFailureMessage(error: unknown): string {
  const stderr =
    error && typeof error === 'object' && 'stderr' in error
      ? (error as { stderr?: Buffer | string }).stderr
      : undefined;
  return (
    (stderr != null ? stderr.toString().trim() : '') ||
    (error instanceof Error ? error.message : String(error))
  );
}

function lockMtimeMs(lockPath: string): number | undefined {
  try {
    return statSync(lockPath).mtimeMs;
  } catch {
    return undefined;
  }
}

function resolveIndexLockPath(repoRoot: string): string {
  try {
    return join(
      runGit(repoRoot, ['rev-parse', '--absolute-git-dir']),
      'index.lock',
    );
  } catch {
    return join(repoRoot, '.git', 'index.lock');
  }
}

/**
 * Classifies a failed git invocation as an index-lock contention or a real
 * failure.
 *
 * Only a stderr that actually names `index.lock` is lock contention; every
 * other failure (hook, signing, identity, pathspec) stays `other` so it is
 * reported rather than retried and swallowed. A lock is `persistent` only when
 * its mtime is unchanged across the whole retry window, which is why the
 * caller passes the mtime it observed on the first lock failure.
 */
export function classifyGitLockFailure(
  stderr: string,
  lockPath: string,
  firstObservedMtimeMs?: number,
): GitLockFailureClass {
  if (!isIndexLockContention(stderr)) {
    return 'other';
  }
  const current = lockMtimeMs(lockPath);
  if (current === undefined || firstObservedMtimeMs === undefined) {
    return 'transient-index-lock';
  }
  return current === firstObservedMtimeMs
    ? 'persistent-index-lock'
    : 'transient-index-lock';
}

interface ProjectLogCommitSnapshot {
  head: string | undefined;
  dirty: boolean;
}

function readHead(run: (args: string[]) => string): string | undefined {
  try {
    return run(['rev-parse', 'HEAD']);
  } catch {
    return undefined;
  }
}

/**
 * True when the log on disk still carries the entry this commit is finalizing.
 * An absent identity means the caller did not name an entry, so there is
 * nothing to contradict.
 */
function logCarriesIdentity(input: CommitProjectLogInput): boolean {
  if (input.identity === undefined) {
    return true;
  }
  try {
    return (
      findProjectLogEntryByIdempotencyKey(
        readFileSync(input.logPath, 'utf8'),
        input.identity.key,
        input.identity.body,
      ) !== undefined
    );
  } catch {
    // An unreadable log cannot be shown to carry the entry, and this function
    // never throws: the caller reports the disposition instead.
    return false;
  }
}

/**
 * Whether the log *as committed at HEAD* carries a given entry identity.
 *
 * `unknown` is a first-class answer, and it is never read as `absent`: a
 * repository with no HEAD, a log that has never been committed, or a git
 * invocation that fails for an environmental reason all say nothing about the
 * entry, and turning that silence into "the entry is gone" would manufacture
 * failures out of missing evidence.
 */
export type CommittedLogIdentityState = 'present' | 'absent' | 'unknown';

/**
 * The content of `logPath` as committed at HEAD, or undefined when HEAD does
 * not have it.
 *
 * The working tree is deliberately not consulted. A dirty entry is precisely
 * the state an exhausted commit retry leaves behind, so a reader that answers
 * from the working tree cannot tell finished finalization from unfinished
 * finalization — which is the whole question both callers here are asking.
 */
function readCommittedProjectLog(
  run: (args: string[]) => string,
  logPath: string,
): string | undefined {
  try {
    const top = canonicalPath(run(['rev-parse', '--show-toplevel']));
    const relativePath = relative(top, canonicalPath(logPath))
      .split(sep)
      .join('/');
    if (relativePath === '' || relativePath.startsWith('..')) {
      return undefined;
    }
    return run(['show', `HEAD:${relativePath}`]);
  } catch {
    return undefined;
  }
}

function committedIdentityState(
  run: (args: string[]) => string,
  logPath: string,
  key: string,
  body?: string,
): CommittedLogIdentityState {
  const committed = readCommittedProjectLog(run, logPath);
  if (committed === undefined) {
    return 'unknown';
  }
  return findProjectLogEntryByIdempotencyKey(committed, key, body) !== undefined
    ? 'present'
    : 'absent';
}

/**
 * Whether the committed log carries `key`.
 *
 * Exported for callers that must distinguish finished finalization from
 * unfinished finalization — the gate's receipt classifier among them — so that
 * question is answered by this module rather than by a caller opening
 * `project-log.md` itself (DR-260718).
 */
export async function committedProjectLogIdentityState(
  repoRoot: string,
  logPath: string,
  key: string,
  body?: string,
): Promise<CommittedLogIdentityState> {
  return committedIdentityState(
    (args: string[]): string => runGit(repoRoot, args),
    logPath,
    key,
    body,
  );
}

/**
 * The committed-log verdict for the entry this commit names, or `unknown` when
 * the caller named no entry.
 */
function committedInputIdentityState(
  run: (args: string[]) => string,
  input: CommitProjectLogInput,
): CommittedLogIdentityState {
  if (input.identity === undefined) {
    return 'unknown';
  }
  return committedIdentityState(
    run,
    input.logPath,
    input.identity.key,
    input.identity.body,
  );
}

/**
 * True when the entry this commit names survives: present at HEAD, or — when
 * HEAD cannot answer — still present in the file on disk.
 *
 * The working-tree reading is a fallback for `unknown`, never an override of
 * `absent`: HEAD is the authority whenever it can speak.
 */
function identitySurvives(
  run: (args: string[]) => string,
  input: CommitProjectLogInput,
): boolean {
  const state = committedInputIdentityState(run, input);
  if (state === 'present') {
    return true;
  }
  if (state === 'absent') {
    return false;
  }
  return logCarriesIdentity(input);
}

function entryMissingMessage(input: CommitProjectLogInput): string {
  return `the committed project log does not carry this entry (${input.identity?.key ?? 'unknown'}); another writer rewrote it`;
}

/**
 * True when another writer already committed the entry we were trying to
 * commit.
 *
 * All three conditions are required. A clean log means the working tree matches
 * HEAD, a moved HEAD means someone committed, and — when the caller named the
 * entry's identity — that identity still being in the *committed* log means the
 * content that landed is the content we appended, not a rewrite that dropped
 * it.
 */
function settledByAnotherWriter(
  run: (args: string[]) => string,
  snapshot: ProjectLogCommitSnapshot,
  input: CommitProjectLogInput,
): boolean {
  try {
    if (run(['status', '--porcelain', '--', input.logPath]).length !== 0) {
      return false;
    }
    if (readHead(run) === snapshot.head) {
      return false;
    }
    return identitySurvives(run, input);
  } catch {
    return false;
  }
}

/**
 * The locked half of `commitProjectLog`: snapshot, bounded retry, and the
 * committed-identity verification, all with the advisory lock held so this
 * process never races its own sibling into `.git/index.lock` and never reads a
 * snapshot another local writer is about to invalidate.
 */
async function commitLockedProjectLog(
  input: CommitProjectLogInput,
  dependencies: CommitProjectLogDependencies,
  run: (args: string[]) => string,
  message: string,
): Promise<ProjectLogCommitResult> {
  let snapshot: ProjectLogCommitSnapshot;
  try {
    snapshot = {
      head: readHead(run),
      dirty: run(['status', '--porcelain', '--', input.logPath]).length > 0,
    };
  } catch (error) {
    return {
      outcome: 'failed',
      committed: false,
      attempts: 0,
      error: gitFailureMessage(error),
    };
  }
  if (!snapshot.dirty) {
    if (!identitySurvives(run, input)) {
      // A committed log that no longer carries this entry is a lost entry, not
      // finished work: reporting it as settled would consume the receipt while
      // the finalization never happened. The recovery command re-appends it
      // idempotently and commits.
      return {
        outcome: 'entry-missing-after-commit',
        committed: false,
        attempts: 0,
        error: entryMissingMessage(input),
      };
    }
    return { outcome: 'nothing-to-commit', committed: false, attempts: 0 };
  }

  const lockPath = resolveIndexLockPath(input.repoRoot);
  let lockObserved = false;
  let firstLockMtimeMs: number | undefined;
  let lastError = '';
  let attempt = 0;

  while (attempt < dependencies.attempts) {
    attempt += 1;
    let staged = false;
    try {
      run(['add', '--', input.logPath]);
      staged = true;
      run(['commit', '-m', message, '--', input.logPath]);
      // A nominally successful commit is not a successful finalization. A
      // caller that named its entry gets `committed` only when HEAD is read and
      // positively carries that entry: `absent` means an overlapping writer
      // clobbered the append before it was staged, and `unknown` means the
      // verification could not be performed at all. Settling on unread evidence
      // is what would let both writers succeed with one run id missing, so
      // neither state settles — both route to the same idempotent recovery.
      const verified =
        input.identity === undefined
          ? 'present'
          : committedInputIdentityState(run, input);
      if (verified !== 'present') {
        return {
          outcome:
            verified === 'absent'
              ? 'entry-missing-after-commit'
              : 'commit-unverified',
          committed: false,
          attempts: attempt,
          error:
            verified === 'absent'
              ? entryMissingMessage(input)
              : `the commit succeeded but the committed project log could not be read back to confirm this entry (${input.identity?.key ?? 'unknown'})`,
        };
      }
      return { outcome: 'committed', committed: true, attempts: attempt };
    } catch (error) {
      if (staged) {
        try {
          // A failed commit (hook, signing, identity) would otherwise leave the
          // log staged, which is a worse state than the dirty tree we started
          // in.
          run(['reset', '--quiet', '--', input.logPath]);
        } catch {
          // Best effort: the reported commit failure already tells the caller
          // the log needs attention.
        }
      }
      lastError = gitFailureMessage(error);
      if (classifyGitLockFailure(lastError, lockPath) === 'other') {
        // A retry can race a competing writer: once it commits our appended
        // entry and releases the lock, our next `git commit` fails with
        // "nothing to commit", which is settlement rather than a failure.
        // Settlement demands a moved HEAD and a clean log that still carries
        // this entry, so a genuine failure — where the log stays dirty — can
        // never be reclassified by this branch.
        if (settledByAnotherWriter(run, snapshot, input)) {
          return {
            outcome: 'already-committed',
            committed: false,
            attempts: attempt,
          };
        }
        return {
          outcome: 'failed',
          committed: false,
          attempts: attempt,
          error: lastError,
          lockClass: 'other',
        };
      }
      if (!lockObserved) {
        // Record the first observation even when the lock is already gone: an
        // absent baseline means the lock changed during the window, which is
        // contention rather than a stuck lock.
        lockObserved = true;
        firstLockMtimeMs = lockMtimeMs(lockPath);
      }
      if (attempt < dependencies.attempts) {
        await dependencies.sleep(dependencies.retryDelaysMs[attempt - 1] ?? 0);
      }
    }
  }

  if (settledByAnotherWriter(run, snapshot, input)) {
    return {
      outcome: 'already-committed',
      committed: false,
      attempts: attempt,
    };
  }
  return {
    outcome: 'blocked-by-index-lock',
    committed: false,
    attempts: attempt,
    error: lastError,
    lockClass: classifyGitLockFailure(lastError, lockPath, firstLockMtimeMs),
  };
}

/**
 * Stages and commits `project-log.md`, retrying a bounded number of times when
 * the failure is a transient `.git/index.lock`.
 *
 * The log is tracked, so an uncommitted append leaves the worktree dirty for
 * whatever runs next — including a dispatched subagent whose preflight requires
 * a clean tree. The commit is pathspec-scoped to the log alone so unrelated
 * working-tree changes are never swept in.
 *
 * Scope note: this commits the whole log file, so a log that was already dirty
 * before the caller ran is committed along with this entry. That is deliberate
 * — leaving the earlier append uncommitted would reproduce the dirty tree this
 * exists to prevent — but it does mean the commit is not always exactly one
 * entry.
 *
 * Never throws, and never deletes, moves, or forces an index lock: a lock this
 * process did not take is another process's, and only its owner may clear it.
 * Git failures are reported to the caller, which degrades to a diagnostic
 * rather than altering any exit status. On failure the index is restored so a
 * partially staged log is not left behind.
 *
 * Exactly one outcome is derived from a single pre-action snapshot (entry HEAD
 * plus entry dirtiness) rather than from eligibility re-sampled after the
 * action, so a log another writer committed mid-retry reads as
 * `already-committed` instead of a spurious failure.
 */
export async function commitProjectLog(
  input: CommitProjectLogInput,
  overrides: Partial<CommitProjectLogDependencies> = {},
): Promise<ProjectLogCommitResult> {
  const dependencies = { ...DEFAULT_COMMIT_DEPENDENCIES, ...overrides };
  const run = (args: string[]): string =>
    dependencies.runGit(input.repoRoot, args);
  const message = input.message ?? COMMIT_MESSAGE;

  try {
    run(['rev-parse', '--is-inside-work-tree']);
  } catch {
    return { outcome: 'not-a-repo', committed: false, attempts: 0 };
  }

  return withProjectLogLock(
    input.logPath,
    dependencies.lock,
    'best-effort',
    async () => commitLockedProjectLog(input, dependencies, run, message),
  );
}

/**
 * The whole whitespace-delimited word of `body` that carries `key` — for a gate
 * finalization body that is `run=<runId>`, not the bare run id.
 *
 * Matching the whole word rather than the bare key is what keeps
 * `run=<key>.suffix` from reading as a prior append of `<key>`, and it makes
 * the recorded identity the same token a reader sees in the log.
 */
function idempotencyToken(key: string, body?: string): string | undefined {
  if (body === undefined) {
    return undefined;
  }
  return body.split(/\s+/).find((word) => word.includes(key));
}

/**
 * Returns the heading of the first existing entry whose body already carries
 * this idempotency identity, or undefined when the log has no such entry.
 *
 * With `body` supplied the match is the exact whole-word token derived from it;
 * without one — the advisory staleness check, which has only a run id — any
 * word containing `key` counts. Callers that must not duplicate an entry always
 * pass the body.
 *
 * The scan lives here, in the log module, because log reads and mutations are
 * CLI-owned (DR-260718); callers such as the gate never open `project-log.md`
 * themselves.
 */
export function findProjectLogEntryByIdempotencyKey(
  content: string,
  key: string,
  body?: string,
): string | undefined {
  const token = idempotencyToken(key, body);
  const carries = (line: string): boolean =>
    line
      .split(/\s+/)
      .some((word) =>
        token === undefined ? word.includes(key) : word === token,
      );

  let heading: string | undefined;
  for (const line of content.split(/\r?\n/)) {
    if (isProjectLogEntryMarker(line)) {
      heading = line.trim();
      continue;
    }
    if (isProjectLogSectionMarker(line)) {
      heading = undefined;
      continue;
    }
    if (heading !== undefined && carries(line)) {
      return heading;
    }
  }
  return undefined;
}

/**
 * Durable record of a gate project-log append that was written but could not be
 * committed. It carries everything the recovery command needs to finish the
 * finalization from a later process, and enough identity to refuse when the
 * tree it describes is no longer the tree it is replayed against.
 */
export interface GateProjectLogReceipt {
  runId: string;
  project: string;
  projectPath: string;
  worktreeRoot: string;
  logPath: string;
  artifactPath: string | null;
  artifactSignature: string | null;
  appendStatus: 'appended' | 'already-appended';
  commitStatus: ProjectLogCommitOutcome;
  lockClass: GitLockFailureClass | null;
  attempts: number;
  producer: string;
  ref: string;
  body: string;
  recovery: { command: string };
}

export interface AppendProjectLogInput {
  repoRoot: string;
  home?: string;
  project?: string;
  structural?: boolean;
  type?: string;
  scope?: string;
  area?: string;
  producer?: string;
  ref?: string;
  body?: string;
  versionNote?: string;
  idempotencyKey?: string;
}

/**
 * Raised when an append that is not the completion seal targets a sealed log.
 *
 * This is a throw rather than a fourth `ProjectLogAppendResult` variant because
 * every in-tree caller of `appendProjectLog` runs *before* the seal: the gate's
 * partial-finalization receipt narrows the result's `status` into its own
 * `'appended' | 'already-appended'` field, so widening the union would force a
 * change on a caller that can never legitimately reach this state. Throwing
 * refuses that caller too — the command layer maps this to
 * `status: 'sealed'` with a non-zero exit, and any other caller fails loudly
 * instead of silently appending past the seal.
 */
export class ProjectLogSealedError extends Error {
  readonly logPath: string;
  readonly seal: ProjectLogSeal;

  constructor(logPath: string, seal: ProjectLogSeal) {
    super(
      `No project-log append may follow the completion seal (${seal.heading}) in ${logPath}.`,
    );
    this.name = 'ProjectLogSealedError';
    this.logPath = logPath;
    this.seal = seal;
  }
}

export type ProjectLogAppendResult =
  | {
      status: 'appended';
      logPath: string;
      heading: string;
      created: boolean;
    }
  | {
      status: 'already-appended';
      logPath: string;
      heading: string;
      created: false;
    }
  | {
      status: 'skipped';
      reason: 'projectLog=false';
    };

export interface AppendProjectLogDependencies {
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env?: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
  resolveAssetsRoot: () => Promise<string>;
  now: () => Date;
  /**
   * The log's own read/modify/write primitives. Injectable so a test can hold
   * one writer inside the window while another enters it, which is the only way
   * to prove the serialization rather than assert it.
   */
  readLog: (path: string) => Promise<string>;
  writeLog: (path: string, content: string) => Promise<void>;
  appendLog: (path: string, content: string) => Promise<void>;
  /** Advisory-lock overrides for the append window. */
  lock: Partial<ProjectLogLockDependencies>;
}

const DEFAULT_APPEND_DEPENDENCIES: AppendProjectLogDependencies = {
  resolveActiveProject,
  resolveEffectiveConfig,
  resolveAssetsRoot,
  now: () => new Date(),
  readLog: async (path: string): Promise<string> => readFile(path, 'utf8'),
  writeLog: async (path: string, content: string): Promise<void> => {
    await writeFile(path, content, 'utf8');
  },
  appendLog: async (path: string, content: string): Promise<void> => {
    await appendFile(path, content, 'utf8');
  },
  lock: {},
};

interface AppendCommandOptions {
  structural?: boolean;
  type?: string;
  scope?: string;
  area?: string;
  producer?: string;
  ref?: string;
  body?: string;
  versionNote?: string;
  project?: string;
  idempotencyKey?: string;
  commit?: boolean;
}

export interface ProjectLogAppendCommandDependencies extends AppendProjectLogDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readStdin: () => Promise<string>;
}

const DEFAULT_COMMAND_DEPENDENCIES: ProjectLogAppendCommandDependencies = {
  ...DEFAULT_APPEND_DEPENDENCIES,
  buildCommandContext,
  resolveProjectRoot,
  readStdin: async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  },
};

function validateSingleLine(
  value: string | undefined,
  option: string,
  maxLength = PROJECT_LOG_AREA_MAX_LENGTH,
): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    throw new Error(
      `${option} is required and must be a non-empty single line.`,
    );
  }
  if (/[\r\n]/.test(value ?? '')) {
    throw new Error(
      `${option} must be a single line without newline characters.`,
    );
  }
  if (normalized.length > maxLength) {
    throw new Error(`${option} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

function validateHeadingField(
  value: string | undefined,
  option: string,
): string {
  const normalized = validateSingleLine(value, option);
  if (normalized.includes(PROJECT_LOG_HEADING_DELIMITER)) {
    throw new Error(
      `${option} must not contain the project-log heading delimiter '${PROJECT_LOG_HEADING_DELIMITER}'.`,
    );
  }
  return normalized;
}

function validateVersionNote(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return validateSingleLine(value, '--version-note', Number.MAX_SAFE_INTEGER);
}

function containsCommandOwnedMarker(body: string): boolean {
  return body
    .split(/\r?\n/)
    .some(
      (line) =>
        isProjectLogSectionMarker(line) || isProjectLogEntryMarker(line),
    );
}

function validateEntry(
  input: AppendProjectLogInput,
  date: string,
): {
  heading: string;
  body: string;
  versionNote: string | undefined;
} {
  const body = input.body?.trim();
  if (!body) {
    throw new Error('--body is required and must contain non-whitespace text.');
  }
  const versionNote = validateVersionNote(input.versionNote);

  if (input.structural) {
    if (
      input.type !== undefined ||
      input.scope !== undefined ||
      input.area !== undefined
    ) {
      throw new Error(
        '--structural cannot be combined with judgment flags --type, --scope, or --area.',
      );
    }
    if (/[\r\n]/.test(body)) {
      throw new Error(
        '--body for structural entries must be one line without newline characters.',
      );
    }
    if (containsCommandOwnedMarker(body)) {
      throw new Error(
        '--body for structural entries must not contain command-owned level-two or level-three Markdown headings.',
      );
    }
    const producer = validateHeadingField(input.producer, '--producer');
    const ref = validateHeadingField(input.ref, '--ref');
    return {
      heading: composeStructuralHeading({ date, producer, ref }),
      body,
      versionNote,
    };
  }

  if (input.producer !== undefined || input.ref !== undefined) {
    throw new Error(
      'Judgment entries cannot use structural flags --producer or --ref; add --structural or remove those flags.',
    );
  }
  if (!input.type) {
    throw new Error(
      `--type is required for judgment entries; accepted values: ${PROJECT_LOG_TYPES.join(
        ' | ',
      )}.`,
    );
  }
  if (!(PROJECT_LOG_TYPES as readonly string[]).includes(input.type)) {
    throw new Error(
      `Invalid --type '${input.type}'; accepted values: ${PROJECT_LOG_TYPES.join(
        ' | ',
      )}.`,
    );
  }
  if (!input.scope) {
    throw new Error(
      `--scope is required for judgment entries; accepted values: ${PROJECT_LOG_SCOPES.join(
        ' | ',
      )}.`,
    );
  }
  if (!(PROJECT_LOG_SCOPES as readonly string[]).includes(input.scope)) {
    throw new Error(
      `Invalid --scope '${input.scope}'; accepted values: ${PROJECT_LOG_SCOPES.join(
        ' | ',
      )}.`,
    );
  }
  if (containsCommandOwnedMarker(body)) {
    throw new Error(
      '--body for judgment entries must not contain command-owned level-two or level-three Markdown headings.',
    );
  }
  const area = validateHeadingField(input.area, '--area');
  return {
    heading: composeJudgmentHeading({
      date,
      type: input.type as ProjectLogType,
      scope: input.scope as ProjectLogScope,
      area,
    }),
    body,
    versionNote,
  };
}

/**
 * Validates the optional idempotency key and requires it to be present in the
 * body.
 *
 * The dedupe scan recognizes a prior append by finding the key inside an
 * existing entry body, so a key the body never carries would make every replay
 * append a fresh duplicate. Rejecting that combination is what keeps
 * `already-appended` a real guarantee rather than a hope.
 */
function validateIdempotencyKey(
  value: string | undefined,
  body: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const key = validateSingleLine(value, '--idempotency-key');
  if (/\s/.test(key)) {
    throw new Error('--idempotency-key must not contain whitespace.');
  }
  if (idempotencyToken(key, body) === undefined) {
    throw new Error(
      '--idempotency-key must appear in --body so a replayed append can recognize its own entry.',
    );
  }
  return key;
}

async function resolveTargetProject(
  input: AppendProjectLogInput,
  dependencies: AppendProjectLogDependencies,
): Promise<string> {
  if (input.project) {
    const projectPath = isAbsolute(input.project)
      ? resolve(input.project)
      : resolve(input.repoRoot, input.project);
    if (
      !(await dirExists(projectPath)) ||
      !(await fileExists(join(projectPath, 'state.md')))
    ) {
      throw new Error(
        `Project path is missing or invalid: ${input.project}. Pass --project <path> for a directory containing state.md.`,
      );
    }
    return projectPath;
  }

  const active = await dependencies.resolveActiveProject(input.repoRoot);
  if (active.status !== 'active' || !active.path) {
    throw new Error(
      'No active project resolves. Set activeProject or pass --project <path>.',
    );
  }
  return resolve(input.repoRoot, active.path);
}

export function instantiateProjectLogTemplate(
  template: string,
  projectName: string,
  date: string,
): string {
  const instantiated = template
    .replaceAll('{Project Name}', projectName)
    .replaceAll('YYYY-MM-DD', date)
    .replaceAll(/\n?oat_template:\s*true\s*\n/gi, '\n')
    .replaceAll(/\n?oat_template_name:\s*[^\n]*\n/gi, '\n');
  return instantiated.endsWith('\n') ? instantiated : `${instantiated}\n`;
}

/**
 * Inserts one entry, before the end-of-run synthesis section when the log has
 * one.
 *
 * The synthesis branch is a read/modify/write, so two overlapping writers would
 * lose an entry; every caller therefore runs this with the log's advisory lock
 * held. The plain branch still appends rather than rewriting, which keeps a
 * writer that could not take the lock strictly additive.
 */
async function appendEntry(
  logPath: string,
  heading: string,
  body: string,
  versionNote: string | undefined,
  dependencies: AppendProjectLogDependencies,
): Promise<void> {
  const bodyWithVersion = versionNote?.trim()
    ? `${body} (observed on ${versionNote.trim()})`
    : body;
  const entry = `\n${heading}\n\n${bodyWithVersion}\n`;
  const content = await dependencies.readLog(logPath);
  const synthesisIndex = content.indexOf(SYNTHESIS_HEADING_PREFIX);

  if (synthesisIndex >= 0) {
    await dependencies.writeLog(
      logPath,
      `${content.slice(0, synthesisIndex)}${entry}${content.slice(
        synthesisIndex,
      )}`,
    );
    return;
  }

  await dependencies.appendLog(
    logPath,
    `${content.endsWith('\n') ? '' : '\n'}${entry}`,
  );
}

/**
 * Appends one entry to the project log, at most once per idempotency key.
 *
 * The existence check, the idempotency scan, the template instantiation, and
 * the write are one critical section under the log's advisory lock. Separating
 * the scan from the mutation is what let two overlapping writers both pass the
 * scan and then lose one entry to the other's stale rewrite, so they are not
 * separable here.
 */
export async function appendProjectLog(
  input: AppendProjectLogInput,
  overrides: Partial<AppendProjectLogDependencies> = {},
): Promise<ProjectLogAppendResult> {
  const dependencies = { ...DEFAULT_APPEND_DEPENDENCIES, ...overrides };
  const projectPath = await resolveTargetProject(input, dependencies);
  const logPath = join(projectPath, PROJECT_LOG_FILENAME);

  return withProjectLogLock(logPath, dependencies.lock, 'required', async () =>
    appendLockedProjectLog(input, dependencies, logPath),
  );
}

async function appendLockedProjectLog(
  input: AppendProjectLogInput,
  dependencies: AppendProjectLogDependencies,
  logPath: string,
): Promise<ProjectLogAppendResult> {
  const logExists = await fileExists(logPath);

  if (!logExists) {
    const effective = await dependencies.resolveEffectiveConfig(
      input.repoRoot,
      join(input.home ?? homedir(), '.oat'),
    );
    if (effective.resolved['workflow.projectLog']?.value === false) {
      return { status: 'skipped', reason: 'projectLog=false' };
    }
  }

  const date = dependencies.now().toISOString().slice(0, 10);
  const { heading, body, versionNote } = validateEntry(input, date);
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey, body);
  let created = false;

  if (logExists) {
    const content = await dependencies.readLog(logPath);

    // Recognizing an entry this key already wrote comes first, and deliberately
    // so: it appends nothing, and the entry it finds necessarily predates any
    // later seal. Refusing it would turn the gate's idempotent recovery replay
    // into a hard failure on every project that has since been completed.
    if (idempotencyKey !== undefined) {
      const existing = findProjectLogEntryByIdempotencyKey(
        content,
        idempotencyKey,
        body,
      );
      if (existing !== undefined) {
        // Append-only order is preserved (DR-260714): a replay observes the
        // entry it already wrote instead of writing a second one.
        return {
          status: 'already-appended',
          logPath,
          heading: existing,
          created: false,
        };
      }
    }

    const seal = findProjectLogSeal(content);

    if (seal !== null) {
      // Re-derive the requested identity from the composed heading so the
      // comparison runs on the same normalized producer/ref the parser reads
      // back out of the log.
      const requested = STRUCTURAL_HEADING_RE.exec(heading);
      const requestsSeal =
        requested !== null &&
        isProjectLogSealEntry({
          producer: requested[2]!.trim(),
          ref: requested[3]!.trim(),
        });

      if (requestsSeal) {
        // The seal is idempotent by structure, not only by key: a log sealed
        // before the keyed convention carries no token to match, and a resumed
        // completion must still observe the existing seal rather than write a
        // second one.
        return {
          status: 'already-appended',
          logPath,
          heading: seal.heading,
          created: false,
        };
      }

      throw new ProjectLogSealedError(logPath, seal);
    }
  }

  if (!logExists) {
    const assetsRoot = await dependencies.resolveAssetsRoot();
    const template = await readFile(
      join(assetsRoot, 'templates', PROJECT_LOG_FILENAME),
      'utf8',
    );
    await dependencies.writeLog(
      logPath,
      instantiateProjectLogTemplate(template, basename(dirname(logPath)), date),
    );
    created = true;
  }

  await appendEntry(logPath, heading, body, versionNote, dependencies);
  return { status: 'appended', logPath, heading, created };
}

async function samePath(left: string, right: string): Promise<boolean> {
  if (resolve(left) === resolve(right)) {
    return true;
  }
  try {
    return (await realpath(left)) === (await realpath(right));
  } catch {
    return false;
  }
}

type ReceiptValidation =
  | { ok: true; receipt: GateProjectLogReceipt }
  | { ok: false; reason: string };

/**
 * Validates a gate partial-finalization receipt against the live tree before
 * anything is appended or committed.
 *
 * Recovery finalizes a log entry; it never re-reads or re-validates the review
 * verdict, so the check here is identity only: the receipt must describe this
 * project, in this worktree, for a review artifact whose bytes are unchanged.
 * Any mismatch refuses and touches nothing.
 */
async function validateGateProjectLogReceipt(options: {
  receiptPath: string;
  repoRoot: string;
  projectPath: string;
  idempotencyKey: string;
  producer: string | undefined;
  ref: string | undefined;
  body: string | undefined;
}): Promise<ReceiptValidation> {
  let receipt: GateProjectLogReceipt;
  try {
    receipt = JSON.parse(
      await readFile(options.receiptPath, 'utf8'),
    ) as GateProjectLogReceipt;
  } catch (error) {
    return {
      ok: false,
      reason: `receipt is unreadable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  if (receipt.runId !== options.idempotencyKey) {
    return {
      ok: false,
      reason: `receipt run id ${String(receipt.runId)} does not match --idempotency-key ${options.idempotencyKey}`,
    };
  }

  if (
    typeof receipt.projectPath !== 'string' ||
    !(await samePath(receipt.projectPath, options.projectPath))
  ) {
    return {
      ok: false,
      reason: `receipt project ${String(
        receipt.projectPath,
      )} does not resolve to ${options.projectPath}`,
    };
  }

  let worktreeRoot: string;
  try {
    worktreeRoot = runGit(options.repoRoot, ['rev-parse', '--show-toplevel']);
  } catch {
    return { ok: false, reason: 'no git worktree resolves for the project' };
  }
  if (
    typeof receipt.worktreeRoot !== 'string' ||
    !(await samePath(receipt.worktreeRoot, worktreeRoot))
  ) {
    return {
      ok: false,
      reason: `receipt worktree ${String(
        receipt.worktreeRoot,
      )} does not match ${worktreeRoot}`,
    };
  }

  if (receipt.artifactPath != null) {
    if (
      typeof receipt.artifactSignature !== 'string' ||
      receipt.artifactSignature.length === 0
    ) {
      // A receipt that names an artifact always records its signature, so an
      // unsigned one is malformed rather than merely artifact-free.
      return {
        ok: false,
        reason: `receipt names ${receipt.artifactPath} without an artifact signature`,
      };
    }
    const artifactPath = isAbsolute(receipt.artifactPath)
      ? receipt.artifactPath
      : join(worktreeRoot, receipt.artifactPath);
    let content: string;
    try {
      content = await readFile(artifactPath, 'utf8');
    } catch {
      return {
        ok: false,
        reason: `review artifact is missing: ${receipt.artifactPath}`,
      };
    }
    const signature = createHash('sha256').update(content).digest('hex');
    if (signature !== receipt.artifactSignature) {
      return {
        ok: false,
        reason: `review artifact signature changed for ${receipt.artifactPath}`,
      };
    }
  }

  // The receipt describes exactly one entry. Consuming it while writing some
  // other entry would finalize the wrong thing and discard the real pending
  // work, so the replayed entry has to be the entry the receipt names.
  for (const [label, expected, actual] of [
    ['--producer', receipt.producer, options.producer],
    ['--ref', receipt.ref, options.ref],
    ['--body', receipt.body, options.body],
  ] as const) {
    if (expected !== actual) {
      return {
        ok: false,
        reason: `${label} does not match the receipt entry (expected ${JSON.stringify(
          expected,
        )}, got ${JSON.stringify(actual)})`,
      };
    }
  }

  return { ok: true, receipt };
}

function reportReceiptMismatch(
  context: CommandContext,
  receiptPath: string,
  reason: string,
): void {
  if (context.json) {
    context.logger.json({
      status: 'error',
      type: 'gate-project-log-receipt-mismatch',
      receiptPath,
      reason,
    });
    return;
  }
  context.logger.error(
    `gate-project-log-receipt-mismatch: ${reason} (${receiptPath}). Nothing was appended or committed.`,
  );
}

async function runAppendCommand(
  options: AppendCommandOptions,
  context: CommandContext,
  dependencies: ProjectLogAppendCommandDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const body =
      options.body === '-' ? await dependencies.readStdin() : options.body;

    let receiptPath: string | undefined;
    if (options.commit && options.idempotencyKey) {
      const projectPath = await resolveTargetProject(
        { repoRoot, home: context.home, project: options.project },
        dependencies,
      );
      const candidate = join(
        projectPath,
        GATE_RECEIPTS_DIRNAME,
        `${options.idempotencyKey}.json`,
      );
      if (await fileExists(candidate)) {
        const validation = await validateGateProjectLogReceipt({
          receiptPath: candidate,
          repoRoot,
          projectPath,
          idempotencyKey: options.idempotencyKey,
          producer: options.producer,
          ref: options.ref,
          body,
        });
        if (!validation.ok) {
          reportReceiptMismatch(context, candidate, validation.reason);
          process.exitCode = 1;
          return;
        }
        receiptPath = candidate;
      }
    }

    let result: ProjectLogAppendResult;
    try {
      result = await appendProjectLog(
        {
          repoRoot,
          home: context.home,
          ...options,
          body,
        },
        dependencies,
      );
    } catch (error) {
      if (!(error instanceof ProjectLogSealedError)) {
        throw error;
      }
      // A terminal refusal, reported in the same shape as the error path below
      // so a caller reading JSON can tell a sealed log from a malformed append.
      if (context.json) {
        context.logger.json({
          status: 'sealed',
          logPath: error.logPath,
          heading: error.seal.heading,
          message: error.message,
        });
      } else {
        context.logger.error(error.message);
      }
      process.exitCode = 1;
      return;
    }

    let commit: ProjectLogCommitResult | undefined;
    let receiptRemoved = false;
    if (options.commit && result.status !== 'skipped') {
      commit = await commitProjectLog({
        repoRoot,
        logPath: result.logPath,
        ...(options.idempotencyKey !== undefined && body !== undefined
          ? { identity: { key: options.idempotencyKey, body } }
          : {}),
      });
      if (
        receiptPath !== undefined &&
        SETTLED_COMMIT_OUTCOMES.has(commit.outcome)
      ) {
        await rm(receiptPath, { force: true });
        receiptRemoved = true;
      }
    }

    const settled =
      commit === undefined || SETTLED_COMMIT_OUTCOMES.has(commit.outcome);
    if (context.json) {
      context.logger.json({
        ...result,
        ...(commit ? { commit } : {}),
        ...(receiptPath !== undefined
          ? { receipt: { path: receiptPath, removed: receiptRemoved } }
          : {}),
      });
    } else if (result.status === 'appended') {
      context.logger.success(`Appended project log entry: ${result.logPath}`);
    } else if (result.status === 'already-appended') {
      context.logger.success(
        `Project log entry already present for --idempotency-key: ${result.heading}`,
      );
    }

    if (!settled) {
      if (!context.json) {
        context.logger.error(
          `Unable to commit the project log (${commit!.outcome}${
            commit!.lockClass ? `, ${commit!.lockClass}` : ''
          }): ${commit!.error ?? 'no detail'}`,
        );
      }
      process.exitCode = 1;
      return;
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createProjectLogAppendCommand(
  overrides: Partial<ProjectLogAppendCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_COMMAND_DEPENDENCIES, ...overrides };

  return new Command('append')
    .description('Append a validated entry to the active project log')
    .option('--structural', 'Write a structural lifecycle entry')
    .option(
      '--type <type>',
      'Judgment type: bug, friction, worked-well, feedback',
    )
    .option('--scope <scope>', 'Judgment scope: project or general')
    .option(
      '--area <area>',
      'Short single-line judgment area (maximum 120 characters)',
    )
    .option('--producer <producer>', 'Structural producer skill or command')
    .option('--ref <ref>', 'Structural phase, scope, or artifact reference')
    .option('--body <text>', 'Entry body, or - to read the body from stdin')
    .option('--version-note <text>', 'Append an observed-on version clause')
    .option(
      '--project <path>',
      'Explicit project path; defaults to the active project',
    )
    .option(
      '--idempotency-key <key>',
      'Globally unique key (a run id, not a common word) that must appear in --body; an entry already carrying it is reported as already-appended instead of duplicated',
    )
    .option(
      '--commit',
      'Stage and commit the project log after appending, retrying across a transient index lock',
    )
    .addHelpText(
      'after',
      `
Entry contract:
  Log breaks, surprises, workarounds, or notable successes; record evidence, not narrative.
  worked-well entries are do-not-regress evidence. Judgment bodies should use 1–3 sentences.
  High-value judgments may use Observation:, Impact:, and Recommendation: fields.
  Structural bodies are one line and reference artifacts by path instead of inlining them.
  Add --version-note for tool-related observations.
  Pass --idempotency-key so a replay reports already-appended instead of duplicating the entry; the key must appear in --body as its own word. Adding --commit also finalizes a gate partial-finalization receipt.
  The completion seal (--structural --producer oat-project-complete --ref seal) dedupes on its own, and every append carrying new content onto a sealed log is refused.
  A replay recognized by its own --idempotency-key still reports already-appended on a sealed log and writes nothing.
  Never record secret values (tokens, keys, signed URLs, or credentials); reference secrets by name or source.
  Prior entries are never edited or struck through. Append a new judgment entry that references and explains a correction.

Heading grammars:
  ### YYYY-MM-DD · <project|general> · <bug|friction|worked-well|feedback> · <area>
  ### YYYY-MM-DD · structural · <producer> · <ref>
`,
    )
    .action(async (options: AppendCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runAppendCommand(options, context, dependencies);
    });
}
