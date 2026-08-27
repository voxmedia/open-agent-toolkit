import { mkdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import {
  isSyncedCheckout,
  resolveScopeRoot,
  SYNCED_REMOTE,
  syncedRefName,
} from '@commands/shared/project-scope';
import { CliError } from '@errors/cli-error';

import type { GitRunner } from './git';

export interface SyncTarget {
  repoRoot: string;
  slug: string;
  projectPath: string;
  ref: string;
  remote: string;
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

export function buildSyncTarget(
  repoRoot: string,
  projectsRoot: string,
  slug: string,
): SyncTarget {
  const syncedRoot = resolveScopeRoot(repoRoot, projectsRoot, 'synced');
  return {
    repoRoot: resolve(repoRoot),
    slug,
    projectPath: resolve(syncedRoot, slug),
    ref: syncedRefName(slug),
    remote: SYNCED_REMOTE,
  };
}

export async function createSyncedProject(
  target: SyncTarget,
  git: GitRunner,
): Promise<void> {
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
  await git.run(['update-ref', target.ref, commit.stdout], {
    cwd: target.repoRoot,
  });
  await mkdir(dirname(target.projectPath), { recursive: true });
  await git.run(
    ['worktree', 'add', '--detach', target.projectPath, target.ref],
    { cwd: target.repoRoot },
  );
  await assertNestedWorktree(target, git);
}

async function headSha(target: SyncTarget, git: GitRunner): Promise<string> {
  return (await git.run(['rev-parse', 'HEAD'], { cwd: target.projectPath }))
    .stdout;
}

async function listConflicts(
  target: SyncTarget,
  git: GitRunner,
): Promise<string[]> {
  const status = await git.run(['status', '--porcelain'], {
    cwd: target.projectPath,
  });
  const conflictStatuses = new Set(['UU', 'AA', 'DU', 'UD']);
  return status.stdout
    .split('\n')
    .filter((line) => conflictStatuses.has(line.slice(0, 2)))
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .sort();
}

function isMissingRemoteRef(stderr: string): boolean {
  return /couldn't find remote ref|no such ref was fetched/i.test(stderr);
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
  await assertNestedWorktree(target, git);
  await git.run(['add', '-A'], { cwd: target.projectPath });
  const staged = await git.run(['diff', '--cached', '--quiet'], {
    cwd: target.projectPath,
    allowFailure: true,
  });
  assertExpectedGitResult('git diff --cached --quiet', staged, [0, 1]);
  if (staged.code === 1) {
    await git.run(
      [
        'commit',
        '-m',
        options.message ?? `chore(oat): sync ${target.slug} artifacts`,
      ],
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
      const rebased = await git.run(['rebase', target.ref], {
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
    ['-C', target.projectPath, 'push', target.remote, `HEAD:${target.ref}`],
    { cwd: target.repoRoot, allowFailure: true },
  );
  if (pushed.code !== 0) {
    return { status: 'rejected', sha: pushedHead };
  }
  await git.run(['update-ref', target.ref, pushedHead], {
    cwd: target.repoRoot,
  });
  return { status: 'pushed', sha: pushedHead };
}

export async function assertNestedWorktree(
  target: SyncTarget,
  git: GitRunner,
): Promise<void> {
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
