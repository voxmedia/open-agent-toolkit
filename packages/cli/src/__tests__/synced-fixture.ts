import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { applyOatCoreGitignore } from '@commands/init/gitignore';

export interface SyncedFixture {
  rootDir: string;
  originDir: string;
  cloneA: string;
  cloneB?: string;
  cleanup: () => Promise<void>;
}

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function configureClone(cloneDir: string): void {
  git(cloneDir, ['config', 'user.email', 'synced-fixture@example.com']);
  git(cloneDir, ['config', 'user.name', 'Synced Fixture']);
  git(cloneDir, ['config', 'commit.gpgsign', 'false']);
}

export async function createSyncedFixture(
  options: { secondClone?: boolean } = {},
): Promise<SyncedFixture> {
  const rootDir = await mkdtemp(join(tmpdir(), 'oat-synced-'));
  const originDir = join(rootDir, 'origin.git');
  const cloneA = join(rootDir, 'clone-a');
  const cloneB = options.secondClone ? join(rootDir, 'clone-b') : undefined;

  try {
    git(rootDir, ['init', '-q', '--bare', '--initial-branch=main', originDir]);
    git(rootDir, ['clone', '-q', originDir, cloneA]);
    configureClone(cloneA);
    await writeFile(join(cloneA, 'README.md'), '# Synced fixture\n', 'utf8');
    await applyOatCoreGitignore(cloneA);
    git(cloneA, ['add', 'README.md', '.gitignore']);
    git(cloneA, ['commit', '-q', '-m', 'chore: initialize synced fixture']);
    git(cloneA, ['push', '-q', '-u', 'origin', 'main']);

    if (cloneB) {
      git(rootDir, ['clone', '-q', originDir, cloneB]);
      configureClone(cloneB);
    }
  } catch (error) {
    await rm(rootDir, { recursive: true, force: true });
    throw error;
  }

  return {
    rootDir,
    originDir,
    cloneA,
    cloneB,
    cleanup: () => rm(rootDir, { recursive: true, force: true }),
  };
}

export async function addLinkedWorktree(
  repoRoot: string,
  branch: string,
): Promise<string> {
  const worktreesRoot = join(dirname(repoRoot), 'worktrees');
  await mkdir(worktreesRoot, { recursive: true });
  const worktreePath = join(
    worktreesRoot,
    `${basename(repoRoot)}-${branch.replaceAll('/', '-')}`,
  );
  git(repoRoot, ['worktree', 'add', '-q', '-b', branch, worktreePath]);
  configureClone(worktreePath);
  return realpath(worktreePath);
}

export async function readRef(directory: string, ref: string): Promise<string> {
  return git(directory, ['rev-parse', ref]);
}

export async function originRefs(originDir: string): Promise<string[]> {
  const output = git(originDir, ['for-each-ref', '--format=%(refname)']);
  return output === '' ? [] : output.split('\n').sort();
}
