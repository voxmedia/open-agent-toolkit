import {
  mkdir,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { applyOatCoreGitignore } from '@commands/init/gitignore';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import {
  isSyncedCheckout,
  resolveScopeRoot,
  SYNCED_REMOTE,
  syncedRefName,
  syncedRecordPath,
} from '@commands/shared/project-scope';
import { readOatLocalConfig, writeOatLocalConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { copyDirectory } from '@fs/io';
import YAML from 'yaml';

import type { GitRunner } from './git';
import {
  buildSyncedRecord,
  readSyncedRecord,
  writeSyncedRecord,
} from './record';

export interface SyncTarget {
  repoRoot: string;
  syncedRoot: string;
  slug: string;
  projectPath: string;
  ref: string;
  remote: string;
}

export interface SyncTargetIdentityOptions {
  pathExists?: (path: string) => Promise<boolean>;
  realpath?: (path: string) => Promise<string>;
  exitCode?: 1 | 2;
}

export interface AllowlistedPathspecOptions {
  summaryExportPath?: string | null;
  additionalAllowlistedPaths?: string[];
}

export type PushResult = {
  status: 'pushed' | 'up-to-date' | 'rejected' | 'conflict';
  sha: string;
  conflicts?: string[];
};

export type PullResult = {
  status: 'created' | 'updated' | 'up-to-date' | 'conflict' | 'dirty';
  sha: string;
  conflicts?: string[];
  adopted?: boolean;
  pendingRecordPaths?: string[];
};

export interface PullChildResult {
  slug: string;
  status: PullResult['status'] | 'missing' | 'error';
  sha?: string;
  conflicts?: string[];
  adopted?: boolean;
  pendingRecordPaths?: string[];
  message?: string;
  exitCode?: 1 | 2;
}

export type CheckoutPreflight = {
  status: 'clean' | 'dirty' | 'unpushed' | 'absent';
  sha?: string;
};

export type RemoveResult = {
  status: 'removed' | 'absent' | 'dirty' | 'unpushed';
};

export type PruneResult = {
  status: 'pruned';
  lifecycleCommit: string | null;
};

export type MigrateResult = {
  status: 'migrated';
  lifecycleCommit: string | null;
  sha: string;
};

export interface MigrateSharedToSyncedOptions {
  sourcePath: string;
  commit: boolean;
  now?: Date;
  copyDirectory?: typeof copyDirectory;
  applyOatCoreGitignore?: typeof applyOatCoreGitignore;
  readOatLocalConfig?: typeof readOatLocalConfig;
  writeOatLocalConfig?: typeof writeOatLocalConfig;
  afterBranchCommit?: () => Promise<void>;
}

const ZERO_OBJECT_ID = '0000000000000000000000000000000000000000';
const DISABLE_HOOKS_CONFIG = ['-c', 'core.hooksPath=/dev/null'] as const;

function withHooksDisabled(args: string[]): string[] {
  return [...DISABLE_HOOKS_CONFIG, ...args];
}

export function buildSyncTarget(
  repoRoot: string,
  projectsRoot: string,
  slug: string,
): SyncTarget {
  const syncedRoot = resolveScopeRoot(repoRoot, projectsRoot, 'synced');
  return {
    repoRoot: resolve(repoRoot),
    syncedRoot,
    slug,
    projectPath: resolve(syncedRoot, slug),
    ref: syncedRefName(slug),
    remote: SYNCED_REMOTE,
  };
}

export async function assertCanonicalSyncTargetIdentity(
  target: SyncTarget,
  options: SyncTargetIdentityOptions = {},
): Promise<boolean> {
  const exitCode = options.exitCode ?? 2;
  const expectedRef = syncedRefName(target.slug);
  const expectedPath = resolve(target.syncedRoot, target.slug);
  if (
    resolve(target.projectPath) !== expectedPath ||
    target.ref !== expectedRef
  ) {
    throw new CliError(
      `Refusing synced mutation: ${target.projectPath} must identify the canonical direct child and ref for ${target.slug}.`,
      exitCode,
    );
  }

  const exists = await (options.pathExists ?? pathExists)(target.projectPath);
  if (!exists) return false;

  const canonicalize = options.realpath ?? realpath;
  const [canonicalCheckout, canonicalSyncedRoot] = await Promise.all([
    canonicalize(target.projectPath),
    canonicalize(target.syncedRoot),
  ]);
  const canonicalDirectChild = resolve(canonicalSyncedRoot, target.slug);
  if (canonicalCheckout !== canonicalDirectChild) {
    throw new CliError(
      `Refusing synced mutation: ${target.projectPath} must resolve to its canonical direct child of the synced project root.`,
      exitCode,
    );
  }
  return true;
}

async function registeredWorktreePaths(
  target: SyncTarget,
  git: GitRunner,
): Promise<string[]> {
  const result = await git.run(['worktree', 'list', '--porcelain'], {
    cwd: target.repoRoot,
  });
  return result.stdout
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => resolve(line.slice('worktree '.length)));
}

async function canonicalTargetPath(target: SyncTarget): Promise<string> {
  const canonicalRepoRoot = await realpath(target.repoRoot);
  return resolve(
    canonicalRepoRoot,
    relative(resolve(target.repoRoot), resolve(target.projectPath)),
  );
}

async function isTargetRegistered(
  target: SyncTarget,
  git: GitRunner,
): Promise<boolean> {
  const expected = await canonicalTargetPath(target);
  return (await registeredWorktreePaths(target, git)).includes(expected);
}

async function assertCreateTargetAvailable(
  target: SyncTarget,
  git: GitRunner,
): Promise<void> {
  if (await pathExists(target.projectPath)) {
    throw new CliError(
      `Synced project ${target.slug} already exists at ${target.projectPath}.`,
      2,
    );
  }
  if (await isTargetRegistered(target, git)) {
    throw new CliError(
      `Synced project ${target.slug} already has a registered worktree at ${target.projectPath}.`,
      2,
    );
  }

  const localRef = await git.run(
    ['show-ref', '--verify', '--quiet', target.ref],
    {
      cwd: target.repoRoot,
      allowFailure: true,
    },
  );
  assertExpectedGitResult('git show-ref --verify', localRef, [0, 1]);
  if (localRef.code === 0) {
    throw new CliError(
      `Synced project ${target.slug} local ref ${target.ref} already exists.`,
      2,
    );
  }

  const remoteRef = await git.run(
    ['ls-remote', '--exit-code', target.remote, target.ref],
    { cwd: target.repoRoot, allowFailure: true },
  );
  assertExpectedGitResult('git ls-remote synced ref', remoteRef, [0, 2]);
  if (remoteRef.code === 0) {
    throw new CliError(
      `Synced project ${target.slug} remote ref ${target.ref} already exists on ${target.remote}.`,
      2,
    );
  }
}

export async function createSyncedProject(
  target: SyncTarget,
  git: GitRunner,
): Promise<void> {
  await assertCanonicalSyncTargetIdentity(target);
  await assertCreateTargetAvailable(target, git);
  const tree = await git.run(['hash-object', '-t', 'tree', '/dev/null'], {
    cwd: target.repoRoot,
  });
  const commit = await git.run(
    [
      'commit-tree',
      tree.stdout,
      '-m',
      `chore(oat): init synced project ${target.slug}`,
    ],
    { cwd: target.repoRoot },
  );
  await git.run(['update-ref', target.ref, commit.stdout, ZERO_OBJECT_ID], {
    cwd: target.repoRoot,
  });

  let worktreeAdded = false;
  try {
    await mkdir(dirname(target.projectPath), { recursive: true });
    await git.run(
      withHooksDisabled([
        'worktree',
        'add',
        '--detach',
        target.projectPath,
        target.ref,
      ]),
      { cwd: target.repoRoot },
    );
    worktreeAdded = true;
    await assertNestedWorktree(target, git);
  } catch (error) {
    if (worktreeAdded && (await isTargetRegistered(target, git))) {
      await git.run(['worktree', 'remove', '--force', target.projectPath], {
        cwd: target.repoRoot,
      });
      await git.run(['worktree', 'prune'], { cwd: target.repoRoot });
    }
    await git.run(['update-ref', '-d', target.ref, commit.stdout], {
      cwd: target.repoRoot,
    });
    throw error;
  }
}

async function headSha(target: SyncTarget, git: GitRunner): Promise<string> {
  return (await git.run(['rev-parse', 'HEAD'], { cwd: target.projectPath }))
    .stdout;
}

async function listConflicts(
  target: SyncTarget,
  git: GitRunner,
): Promise<string[]> {
  const unmerged = await git.run(['diff', '--name-only', '--diff-filter=U'], {
    cwd: target.projectPath,
  });
  return unmerged.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

export async function pendingRebaseConflicts(
  target: SyncTarget,
  git: GitRunner,
): Promise<string[] | null> {
  await assertNestedWorktree(target, git);
  for (const rebaseDirectory of ['rebase-merge', 'rebase-apply']) {
    const gitPath = await git.run(
      ['rev-parse', '--path-format=absolute', '--git-path', rebaseDirectory],
      { cwd: target.projectPath },
    );
    if (await pathExists(gitPath.stdout)) {
      return listConflicts(target, git);
    }
  }
  return null;
}

function isMissingRemoteRef(stderr: string): boolean {
  return /couldn't find remote ref|no such ref was fetched/i.test(stderr);
}

function isNonFastForwardPushRejection(stderr: string): boolean {
  return /(?:! \[rejected\]|\brejected\b)[\s\S]*\((?:non-fast-forward|fetch first)\)/i.test(
    stderr,
  );
}

function assertExpectedGitResult(
  command: string,
  result: { code: number; stdout: string; stderr: string },
  expectedCodes: number[],
): void {
  if (!expectedCodes.includes(result.code)) {
    throw new CliError(
      `${command} failed (exit ${result.code}): ${result.stderr || result.stdout || 'unknown git error'}`,
      2,
    );
  }
}

export async function pushSynced(
  target: SyncTarget,
  git: GitRunner,
  options: { message?: string },
): Promise<PushResult> {
  const pendingConflicts = await pendingRebaseConflicts(target, git);
  if (pendingConflicts !== null) {
    return {
      status: 'conflict',
      sha: await headSha(target, git),
      conflicts: pendingConflicts,
    };
  }
  await git.run(['add', '-A'], { cwd: target.projectPath });
  const staged = await git.run(['diff', '--cached', '--quiet'], {
    cwd: target.projectPath,
    allowFailure: true,
  });
  assertExpectedGitResult('git diff --cached --quiet', staged, [0, 1]);
  if (staged.code === 1) {
    await git.run(
      withHooksDisabled([
        'commit',
        '-m',
        options.message ?? `chore(oat): sync ${target.slug} artifacts`,
      ]),
      { cwd: target.projectPath },
    );
  }

  const localCommit = await headSha(target, git);
  const fetched = await git.run(
    ['fetch', target.remote, `+${target.ref}:${target.ref}`],
    { cwd: target.repoRoot, allowFailure: true },
  );
  const remoteExists = fetched.code === 0;
  if (!remoteExists && !isMissingRemoteRef(fetched.stderr)) {
    assertExpectedGitResult('git fetch synced ref', fetched, [0]);
  }

  if (remoteExists) {
    const ancestor = await git.run(
      ['merge-base', '--is-ancestor', target.ref, 'HEAD'],
      { cwd: target.projectPath, allowFailure: true },
    );
    assertExpectedGitResult('git merge-base --is-ancestor', ancestor, [0, 1]);
    if (ancestor.code === 1) {
      const rebased = await git.run(withHooksDisabled(['rebase', target.ref]), {
        cwd: target.projectPath,
        allowFailure: true,
      });
      if (rebased.code !== 0) {
        const conflicts = await listConflicts(target, git);
        if (conflicts.length === 0) {
          assertExpectedGitResult('git rebase synced ref', rebased, [0]);
        }
        return { status: 'conflict', sha: localCommit, conflicts };
      }
    }

    const currentHead = await headSha(target, git);
    const fetchedHead = (
      await git.run(['rev-parse', target.ref], { cwd: target.repoRoot })
    ).stdout;
    if (currentHead === fetchedHead) {
      return { status: 'up-to-date', sha: currentHead };
    }
  }

  const pushedHead = await headSha(target, git);
  const pushed = await git.run(
    withHooksDisabled([
      '-C',
      target.projectPath,
      'push',
      target.remote,
      `HEAD:${target.ref}`,
    ]),
    { cwd: target.repoRoot, allowFailure: true },
  );
  if (pushed.code !== 0) {
    if (isNonFastForwardPushRejection(pushed.stderr)) {
      return { status: 'rejected', sha: pushedHead };
    }
    assertExpectedGitResult('git push synced ref', pushed, [0]);
  }
  await git.run(['update-ref', target.ref, pushedHead], {
    cwd: target.repoRoot,
  });
  return { status: 'pushed', sha: pushedHead };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function reconcilePulledRef(
  target: SyncTarget,
  git: GitRunner,
): Promise<PullResult> {
  await assertNestedWorktree(target, git);
  const status = await git.run(['status', '--porcelain'], {
    cwd: target.projectPath,
  });
  if (status.stdout !== '') {
    const conflicts = await listConflicts(target, git);
    if (conflicts.length > 0) {
      return {
        status: 'conflict',
        sha: await headSha(target, git),
        conflicts,
      };
    }
    return { status: 'dirty', sha: await headSha(target, git) };
  }

  const beforeRebase = await headSha(target, git);
  const remoteHead = (
    await git.run(['rev-parse', target.ref], { cwd: target.repoRoot })
  ).stdout;
  if (beforeRebase === remoteHead) {
    return { status: 'up-to-date', sha: beforeRebase };
  }

  const rebased = await git.run(withHooksDisabled(['rebase', target.ref]), {
    cwd: target.projectPath,
    allowFailure: true,
  });
  if (rebased.code !== 0) {
    const conflicts = await listConflicts(target, git);
    if (conflicts.length === 0) {
      assertExpectedGitResult('git rebase synced ref', rebased, [0]);
    }
    return { status: 'conflict', sha: beforeRebase, conflicts };
  }

  const afterRebase = await headSha(target, git);
  return {
    status: afterRebase === beforeRebase ? 'up-to-date' : 'updated',
    sha: afterRebase,
  };
}

export async function pullSynced(
  target: SyncTarget,
  git: GitRunner,
  options: { adopt?: boolean; now?: Date } = {},
): Promise<PullResult> {
  const checkoutExists = await assertCanonicalSyncTargetIdentity(target);
  await git.run(['fetch', target.remote, `+${target.ref}:${target.ref}`], {
    cwd: target.repoRoot,
  });
  await git.run(['worktree', 'prune'], { cwd: target.repoRoot });

  if (!checkoutExists) {
    await mkdir(dirname(target.projectPath), { recursive: true });
    await git.run(
      withHooksDisabled([
        'worktree',
        'add',
        '--detach',
        target.projectPath,
        target.ref,
      ]),
      { cwd: target.repoRoot },
    );
    await assertNestedWorktree(target, git);
    const result: PullResult = {
      status: 'created',
      sha: await headSha(target, git),
    };
    return options.adopt
      ? await writeAdoptionRecord(target, result, options.now ?? new Date())
      : result;
  }

  const result = await reconcilePulledRef(target, git);
  return options.adopt &&
    (result.status === 'updated' || result.status === 'up-to-date')
    ? await writeAdoptionRecord(target, result, options.now ?? new Date())
    : result;
}

async function writeAdoptionRecord(
  target: SyncTarget,
  result: PullResult,
  now: Date,
): Promise<PullResult> {
  const recordPath = syncedRecordPath(dirname(target.projectPath), target.slug);
  await writeSyncedRecord(recordPath, buildSyncedRecord(target.slug, now));
  return {
    ...result,
    adopted: true,
    pendingRecordPaths: [recordPath],
  };
}

export async function pullChildren(
  parentTarget: SyncTarget,
  git: GitRunner,
): Promise<PullChildResult[]> {
  await assertCanonicalSyncTargetIdentity(parentTarget);
  const statePath = resolve(parentTarget.projectPath, 'state.md');
  const block = getFrontmatterBlock(await readFile(statePath, 'utf8'));
  if (!block) return [];
  const parsed: unknown = YAML.parse(block);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  const frontmatter = parsed as Record<string, unknown>;
  if (frontmatter['oat_kind'] !== 'coordination') return [];
  const children = frontmatter['oat_children'];
  if (!Array.isArray(children)) {
    throw new CliError(
      `Malformed coordination state for ${parentTarget.slug}: oat_children must be an array.`,
      1,
    );
  }
  const slugs = children.map((value) => {
    if (
      typeof value !== 'string' ||
      value.startsWith('-') ||
      !/^[a-zA-Z0-9_-]+$/.test(value)
    ) {
      throw new CliError(
        'Coordination parent contains an invalid child slug.',
        2,
      );
    }
    return value;
  });

  const syncedRoot = dirname(parentTarget.projectPath);
  const results: PullChildResult[] = [];
  for (const slug of slugs) {
    const childTarget: SyncTarget = {
      ...parentTarget,
      slug,
      projectPath: resolve(syncedRoot, slug),
      ref: syncedRefName(slug),
    };
    try {
      await assertCanonicalSyncTargetIdentity(childTarget);
      const recordPath = syncedRecordPath(syncedRoot, slug);
      const adopt = (await readSyncedRecord(recordPath)) === null;
      const remote = await git.run(
        ['ls-remote', '--exit-code', childTarget.remote, childTarget.ref],
        { cwd: parentTarget.repoRoot, allowFailure: true },
      );
      if (
        remote.code === 2 &&
        remote.stdout.trim() === '' &&
        remote.stderr.trim() === ''
      ) {
        results.push({
          slug,
          status: 'missing',
          message: `Remote ref ${childTarget.ref} is absent.`,
          exitCode: 1,
        });
        continue;
      }
      if (remote.code !== 0) {
        results.push({
          slug,
          status: 'error',
          message: `git ls-remote ${childTarget.remote} ${childTarget.ref} failed (exit ${remote.code}): ${remote.stderr || remote.stdout || 'unknown Git error'}`,
          exitCode: 2,
        });
        continue;
      }
      const result = await pullSynced(childTarget, git, { adopt });
      results.push({
        slug,
        ...result,
        ...(result.status === 'conflict' || result.status === 'dirty'
          ? { exitCode: 1 as const }
          : {}),
      });
    } catch (error) {
      results.push({
        slug,
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        exitCode: error instanceof CliError && error.exitCode === 1 ? 1 : 2,
      });
    }
  }
  return results;
}

export async function continueSynced(
  target: SyncTarget,
  git: GitRunner,
): Promise<PullResult> {
  await assertNestedWorktree(target, git);
  const continued = await git.run(withHooksDisabled(['rebase', '--continue']), {
    cwd: target.projectPath,
    env: { GIT_EDITOR: 'true' },
    allowFailure: true,
  });
  if (continued.code !== 0) {
    const conflicts = await listConflicts(target, git);
    if (conflicts.length === 0) {
      assertExpectedGitResult('git rebase --continue', continued, [0]);
    }
    return {
      status: 'conflict',
      sha: await headSha(target, git),
      conflicts,
    };
  }
  return { status: 'updated', sha: await headSha(target, git) };
}

export async function abortSynced(
  target: SyncTarget,
  git: GitRunner,
): Promise<void> {
  await assertNestedWorktree(target, git);
  await git.run(withHooksDisabled(['rebase', '--abort']), {
    cwd: target.projectPath,
  });
}

function normalizedPathspecs(repoRoot: string, pathspecs: string[]): string[] {
  return pathspecs.map((pathspec) => repoRelativePath(repoRoot, pathspec));
}

export async function commitRecordChange(
  repoRoot: string,
  pathspecs: string[],
  message: string,
  git: GitRunner,
  options: AllowlistedPathspecOptions = {},
): Promise<{ sha: string } | null> {
  assertAllowlistedPathspecs(repoRoot, pathspecs, options);
  const normalized = normalizedPathspecs(repoRoot, pathspecs);
  await git.run(['add', '--', ...normalized], { cwd: repoRoot });
  const changed = await git.run(
    ['diff', '--cached', '--quiet', '--', ...normalized],
    { cwd: repoRoot, allowFailure: true },
  );
  assertExpectedGitResult('git diff --cached --quiet', changed, [0, 1]);
  if (changed.code === 0) {
    return null;
  }

  await git.run(['commit', '-m', message, '--', ...normalized], {
    cwd: repoRoot,
  });
  const sha = (await git.run(['rev-parse', 'HEAD'], { cwd: repoRoot })).stdout;
  return { sha };
}

export async function preflightSyncedCheckout(
  target: SyncTarget,
  git: GitRunner,
): Promise<CheckoutPreflight> {
  const checkoutExists = await assertCanonicalSyncTargetIdentity(target);
  const fetched = await git.run(
    ['fetch', target.remote, `+${target.ref}:${target.ref}`],
    { cwd: target.repoRoot, allowFailure: true },
  );
  const remoteExists = fetched.code === 0;
  if (!remoteExists && !isMissingRemoteRef(fetched.stderr)) {
    assertExpectedGitResult('git fetch synced ref', fetched, [0]);
  }

  if (!checkoutExists) {
    return { status: 'absent' };
  }

  await assertNestedWorktree(target, git);
  const sha = await headSha(target, git);
  const status = await git.run(['status', '--porcelain'], {
    cwd: target.projectPath,
  });
  if (status.stdout !== '') {
    return { status: 'dirty', sha };
  }
  if (!remoteExists) {
    return { status: 'unpushed', sha };
  }

  const remoteSha = (
    await git.run(['rev-parse', target.ref], { cwd: target.repoRoot })
  ).stdout;
  return { status: sha === remoteSha ? 'clean' : 'unpushed', sha };
}

export async function removeSyncedCheckout(
  target: SyncTarget,
  git: GitRunner,
  options: { force?: boolean } = {},
): Promise<RemoveResult> {
  const preflight = await preflightSyncedCheckout(target, git);
  if (preflight.status === 'absent') {
    await git.run(['worktree', 'prune'], { cwd: target.repoRoot });
    if (await isTargetRegistered(target, git)) {
      throw new CliError(
        `Unable to remove stale worktree registration for ${target.projectPath}.`,
        2,
      );
    }
    return { status: 'absent' };
  }
  if (
    !options.force &&
    (preflight.status === 'dirty' || preflight.status === 'unpushed')
  ) {
    return { status: preflight.status };
  }

  await git.run(
    [
      'worktree',
      'remove',
      ...(options.force ? ['--force'] : []),
      target.projectPath,
    ],
    { cwd: target.repoRoot },
  );
  await git.run(['worktree', 'prune'], { cwd: target.repoRoot });
  return { status: 'removed' };
}

export async function pruneSynced(
  target: SyncTarget,
  git: GitRunner,
  options: { force: boolean; commit: boolean },
): Promise<PruneResult> {
  await assertCanonicalSyncTargetIdentity(target);
  const checkoutSuffix = ['synced', target.slug].join('/');
  const checkoutPaths = (await registeredWorktreePaths(target, git)).filter(
    (worktreePath) =>
      worktreePath.split(sep).join('/').endsWith(`/${checkoutSuffix}`),
  );

  const checkouts = checkoutPaths.map((projectPath) => ({
    ...target,
    syncedRoot: dirname(projectPath),
    projectPath,
  }));
  for (const checkout of checkouts) {
    const preflight = await preflightSyncedCheckout(checkout, git);
    if (
      !options.force &&
      (preflight.status === 'dirty' || preflight.status === 'unpushed')
    ) {
      throw new CliError(
        `Refusing to prune ${target.slug}: checkout ${checkout.projectPath} is ${preflight.status}. Push it first or pass --force. Pinned PR links will stop resolving after prune.`,
        1,
      );
    }
  }

  for (const checkout of checkouts) {
    const removed = await removeSyncedCheckout(checkout, git, {
      force: options.force,
    });
    if (removed.status !== 'removed' && removed.status !== 'absent') {
      throw new CliError(
        `Refusing to prune ${target.slug}: checkout ${checkout.projectPath} is ${removed.status}.`,
        1,
      );
    }
  }

  await git.run(['push', target.remote, `:${target.ref}`], {
    cwd: target.repoRoot,
  });
  await git.run(['update-ref', '-d', target.ref], { cwd: target.repoRoot });
  const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
  await rm(recordPath, { force: true });
  const committed = options.commit
    ? await commitRecordChange(
        target.repoRoot,
        [recordPath],
        `chore(oat): prune synced project ${target.slug}`,
        git,
      )
    : null;
  return { status: 'pruned', lifecycleCommit: committed?.sha ?? null };
}

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function migrateSharedToSynced(
  target: SyncTarget,
  git: GitRunner,
  options: MigrateSharedToSyncedOptions,
): Promise<MigrateResult> {
  const sourcePath = resolve(options.sourcePath);
  const sourceRelative = repoRelativePath(target.repoRoot, sourcePath);
  const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
  const destinationRelative = repoRelativePath(
    target.repoRoot,
    target.projectPath,
  );
  const gitignorePath = join(target.repoRoot, '.gitignore');
  const preMigrationHead = (
    await git.run(['rev-parse', 'HEAD'], { cwd: target.repoRoot })
  ).stdout;
  const originalGitignore = await readOptionalFile(gitignorePath);
  const readLocal = options.readOatLocalConfig ?? readOatLocalConfig;
  const writeLocal = options.writeOatLocalConfig ?? writeOatLocalConfig;
  const originalLocalConfig = await readLocal(target.repoRoot);
  const sourceStatus = await git.run(
    ['status', '--porcelain', '--untracked-files=all', '--', sourceRelative],
    { cwd: target.repoRoot },
  );
  if (sourceStatus.stdout !== '') {
    throw new CliError(
      `Shared project ${sourceRelative} is dirty or has untracked files; commit or clean it before migration.`,
      1,
    );
  }
  const tracked = await git.run(['ls-files', '--', sourceRelative], {
    cwd: target.repoRoot,
  });
  if (!tracked.stdout) {
    throw new CliError(
      `Shared project ${sourceRelative} is not tracked on the current branch.`,
      1,
    );
  }
  await git.run(['remote', 'get-url', target.remote], {
    cwd: target.repoRoot,
  });
  if ((await readSyncedRecord(recordPath)) !== null) {
    throw new CliError(
      `Synced project record already exists for ${target.slug}.`,
      1,
    );
  }

  let created = false;
  let activeProjectUpdated = false;
  try {
    const ignored = await git.run(['check-ignore', '-q', destinationRelative], {
      cwd: target.repoRoot,
      allowFailure: true,
    });
    assertExpectedGitResult('git check-ignore synced project', ignored, [0, 1]);
    if (ignored.code === 1) {
      await (options.applyOatCoreGitignore ?? applyOatCoreGitignore)(
        target.repoRoot,
      );
    }

    await createSyncedProject(target, git);
    created = true;
    await (options.copyDirectory ?? copyDirectory)(
      sourcePath,
      target.projectPath,
    );
    const pushed = await pushSynced(target, git, {
      message: `chore(oat): migrate ${target.slug} artifacts`,
    });
    if (pushed.status !== 'pushed' && pushed.status !== 'up-to-date') {
      throw new CliError(
        `Unable to publish migrated project ${target.slug}: ${pushed.status}.`,
        1,
      );
    }

    await writeSyncedRecord(
      recordPath,
      buildSyncedRecord(target.slug, options.now ?? new Date()),
    );
    await rm(sourcePath, { recursive: true });
    const gitignoreChanged =
      (await readOptionalFile(gitignorePath)) !== originalGitignore;
    let lifecycleCommit: string | null = null;
    if (options.commit) {
      const committed = await commitRecordChange(
        target.repoRoot,
        [sourcePath, recordPath, ...(gitignoreChanged ? [gitignorePath] : [])],
        `chore(oat): migrate ${target.slug} to synced scope`,
        git,
      );
      lifecycleCommit = committed?.sha ?? null;
      await options.afterBranchCommit?.();
    } else {
      await git.run(
        [
          'reset',
          '-q',
          '--',
          sourceRelative,
          repoRelativePath(target.repoRoot, recordPath),
          ...(gitignoreChanged ? ['.gitignore'] : []),
        ],
        { cwd: target.repoRoot },
      );
    }

    if (originalLocalConfig.activeProject === sourceRelative) {
      activeProjectUpdated = true;
      await writeLocal(target.repoRoot, {
        ...originalLocalConfig,
        activeProject: destinationRelative,
      });
    }
    return { status: 'migrated', lifecycleCommit, sha: pushed.sha };
  } catch (error) {
    const currentHead = (
      await git.run(['rev-parse', 'HEAD'], { cwd: target.repoRoot })
    ).stdout;
    if (currentHead !== preMigrationHead) {
      await git.run(['reset', '--soft', preMigrationHead], {
        cwd: target.repoRoot,
      });
    }
    await git.run(
      [
        'reset',
        '-q',
        '--',
        sourceRelative,
        repoRelativePath(target.repoRoot, recordPath),
        '.gitignore',
      ],
      { cwd: target.repoRoot },
    );
    await git.run(['checkout', '--', sourceRelative], {
      cwd: target.repoRoot,
    });
    await rm(recordPath, { force: true });
    if (originalGitignore === null) {
      await rm(gitignorePath, { force: true });
    } else {
      await writeFile(gitignorePath, originalGitignore, 'utf8');
    }
    if (created) {
      const remoteRef = await git.run(
        ['ls-remote', '--exit-code', target.remote, target.ref],
        { cwd: target.repoRoot, allowFailure: true },
      );
      if (remoteRef.code === 0) {
        await git.run(['push', target.remote, `:${target.ref}`], {
          cwd: target.repoRoot,
        });
      }
    }
    if (created) {
      await rollbackCreatedSyncedProject(target, git);
    }
    if (activeProjectUpdated) {
      await writeLocal(target.repoRoot, originalLocalConfig);
    }
    throw error;
  }
}

/**
 * Compensate only a synced checkout/ref created by the current invocation.
 * Callers must establish that ownership before invoking this helper.
 */
export async function rollbackCreatedSyncedProject(
  target: SyncTarget,
  git: GitRunner,
): Promise<void> {
  await assertCanonicalSyncTargetIdentity(target);
  if (await isTargetRegistered(target, git)) {
    await git.run(['worktree', 'remove', '--force', target.projectPath], {
      cwd: target.repoRoot,
    });
  }
  await git.run(['worktree', 'prune'], { cwd: target.repoRoot });
  await git.run(['update-ref', '-d', target.ref], { cwd: target.repoRoot });
}

export async function assertNestedWorktree(
  target: SyncTarget,
  git: GitRunner,
): Promise<void> {
  await assertCanonicalSyncTargetIdentity(target);
  if (
    resolve(target.projectPath) === resolve(target.repoRoot) ||
    !(await isSyncedCheckout(target.projectPath))
  ) {
    throw new CliError(
      `Refusing synced mutation: ${target.projectPath} is not a nested git worktree.`,
      2,
    );
  }

  const topLevel = await git.run(['rev-parse', '--show-toplevel'], {
    cwd: target.projectPath,
  });
  const [actualTopLevel, expectedTopLevel] = await Promise.all([
    realpath(topLevel.stdout),
    realpath(target.projectPath),
  ]);
  if (actualTopLevel !== expectedTopLevel) {
    throw new CliError(
      `Refusing synced mutation: expected nested toplevel ${expectedTopLevel}, got ${actualTopLevel}.`,
      2,
    );
  }
}

function isWithin(root: string, candidate: string): boolean {
  const child = relative(root, candidate);
  return (
    child === '' ||
    (child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child))
  );
}

function repoRelativePath(repoRoot: string, pathspec: string): string {
  const absolute = isAbsolute(pathspec)
    ? resolve(pathspec)
    : resolve(repoRoot, pathspec);
  if (!isWithin(resolve(repoRoot), absolute)) {
    throw new CliError(
      `Refusing parent-branch mutation outside the repository: ${pathspec}`,
      2,
    );
  }
  return relative(resolve(repoRoot), absolute).split(sep).join('/');
}

export function assertAllowlistedPathspecs(
  repoRoot: string,
  pathspecs: string[],
  options: AllowlistedPathspecOptions = {},
): void {
  const explicitPaths = new Set(
    (options.additionalAllowlistedPaths ?? []).map((path) =>
      repoRelativePath(repoRoot, path),
    ),
  );
  const summaryRoot = options.summaryExportPath
    ? isAbsolute(options.summaryExportPath)
      ? resolve(options.summaryExportPath)
      : resolve(repoRoot, options.summaryExportPath)
    : null;

  for (const pathspec of pathspecs) {
    const repoRelative = repoRelativePath(repoRoot, pathspec);
    const absolute = resolve(repoRoot, repoRelative);
    const allowed =
      repoRelative === '.gitignore' ||
      repoRelative === '.gitattributes' ||
      /^\.oat\/projects\/synced\/[a-zA-Z0-9_-]+\.json$/.test(repoRelative) ||
      /^\.oat\/projects\/shared\/[a-zA-Z0-9_-]+(?:\/.*)?$/.test(repoRelative) ||
      explicitPaths.has(repoRelative) ||
      (summaryRoot !== null && isWithin(summaryRoot, absolute));

    if (!allowed) {
      throw new CliError(
        `Refusing non-allowlisted parent-branch pathspec: ${pathspec}`,
        2,
      );
    }
  }
}
