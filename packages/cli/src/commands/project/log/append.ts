import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import {
  appendFile,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';

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

import {
  composeJudgmentHeading,
  composeStructuralHeading,
  isProjectLogEntryMarker,
  isProjectLogSectionMarker,
  PROJECT_LOG_AREA_MAX_LENGTH,
  PROJECT_LOG_HEADING_DELIMITER,
  PROJECT_LOG_SCOPES,
  PROJECT_LOG_TYPES,
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
}

const DEFAULT_COMMIT_DEPENDENCIES: CommitProjectLogDependencies = {
  attempts: PROJECT_LOG_COMMIT_ATTEMPTS,
  retryDelaysMs: PROJECT_LOG_COMMIT_RETRY_DELAYS_MS,
  sleep: async (ms: number): Promise<void> => {
    await new Promise((settle) => setTimeout(settle, ms));
  },
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
 * True when another writer already committed the entry we were trying to
 * commit.
 *
 * All three conditions are required. A clean log means the working tree matches
 * HEAD, a moved HEAD means someone committed, and — when the caller named the
 * entry's identity — that identity still being in the clean file means the
 * committed content is the content we appended, not a rewrite that dropped it.
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
    return logCarriesIdentity(input);
  } catch {
    return false;
  }
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
  const run = (args: string[]): string => runGit(input.repoRoot, args);
  const message = input.message ?? COMMIT_MESSAGE;

  try {
    run(['rev-parse', '--is-inside-work-tree']);
  } catch {
    return { outcome: 'not-a-repo', committed: false, attempts: 0 };
  }

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
    if (!logCarriesIdentity(input)) {
      // A clean log that no longer carries this entry is a lost entry, not
      // finished work: reporting it as settled would consume the receipt while
      // the finalization never happened.
      return {
        outcome: 'failed',
        committed: false,
        attempts: 0,
        error: `the project log is committed but no longer carries this entry (${input.identity?.key ?? 'unknown'})`,
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
 * True when the log at `logPath` already carries an entry for `key`. A missing
 * or unreadable log is reported as absent rather than throwing.
 */
export async function projectLogContainsIdempotencyKey(
  logPath: string,
  key: string,
  body?: string,
): Promise<boolean> {
  try {
    return (
      findProjectLogEntryByIdempotencyKey(
        await readFile(logPath, 'utf8'),
        key,
        body,
      ) !== undefined
    );
  } catch {
    return false;
  }
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
}

const DEFAULT_APPEND_DEPENDENCIES: AppendProjectLogDependencies = {
  resolveActiveProject,
  resolveEffectiveConfig,
  resolveAssetsRoot,
  now: () => new Date(),
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

async function appendEntry(
  logPath: string,
  heading: string,
  body: string,
  versionNote: string | undefined,
): Promise<void> {
  const bodyWithVersion = versionNote?.trim()
    ? `${body} (observed on ${versionNote.trim()})`
    : body;
  const entry = `\n${heading}\n\n${bodyWithVersion}\n`;
  const content = await readFile(logPath, 'utf8');
  const synthesisIndex = content.indexOf(SYNTHESIS_HEADING_PREFIX);

  if (synthesisIndex >= 0) {
    await writeFile(
      logPath,
      `${content.slice(0, synthesisIndex)}${entry}${content.slice(
        synthesisIndex,
      )}`,
      'utf8',
    );
    return;
  }

  await appendFile(
    logPath,
    `${content.endsWith('\n') ? '' : '\n'}${entry}`,
    'utf8',
  );
}

export async function appendProjectLog(
  input: AppendProjectLogInput,
  overrides: Partial<AppendProjectLogDependencies> = {},
): Promise<ProjectLogAppendResult> {
  const dependencies = { ...DEFAULT_APPEND_DEPENDENCIES, ...overrides };
  const projectPath = await resolveTargetProject(input, dependencies);
  const logPath = join(projectPath, PROJECT_LOG_FILENAME);
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

  if (logExists && idempotencyKey !== undefined) {
    const existing = findProjectLogEntryByIdempotencyKey(
      await readFile(logPath, 'utf8'),
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

  if (!logExists) {
    const assetsRoot = await dependencies.resolveAssetsRoot();
    const template = await readFile(
      join(assetsRoot, 'templates', PROJECT_LOG_FILENAME),
      'utf8',
    );
    await writeFile(
      logPath,
      instantiateProjectLogTemplate(template, basename(projectPath), date),
      'utf8',
    );
    created = true;
  }

  await appendEntry(logPath, heading, body, versionNote);
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

    const result = await appendProjectLog(
      {
        repoRoot,
        home: context.home,
        ...options,
        body,
      },
      dependencies,
    );

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
  Pass --idempotency-key with --commit to finalize a gate partial-finalization receipt; a replay reports already-appended instead of duplicating the entry.
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
