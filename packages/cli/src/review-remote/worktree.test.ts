import { execFile as execFileCallback } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { acquireWorktree, releaseWorktree, runInWorktree } from './worktree';

const execFile = promisify(execFileCallback);

/** Create a throwaway git repo with one commit; return its root path. */
async function makeTempRepo(): Promise<string> {
  const repoRoot = mkdtempSync(join(tmpdir(), 'oat-wt-repo-'));
  await execFile('git', ['-C', repoRoot, 'init', '-q']);
  await execFile('git', ['-C', repoRoot, 'config', 'user.email', 't@e.test']);
  await execFile('git', ['-C', repoRoot, 'config', 'user.name', 'Test']);
  await execFile('git', ['-C', repoRoot, 'config', 'commit.gpgsign', 'false']);
  writeFileSync(join(repoRoot, 'README.md'), '# temp\n');
  await execFile('git', ['-C', repoRoot, 'add', '.']);
  await execFile('git', ['-C', repoRoot, 'commit', '-q', '-m', 'init']);
  return repoRoot;
}

async function listWorktrees(repoRoot: string): Promise<string> {
  const { stdout } = await execFile('git', [
    '-C',
    repoRoot,
    'worktree',
    'list',
    '--porcelain',
  ]);
  return stdout;
}

/** Count `oat-review-wt-*` ephemeral worktree dirs currently in the temp dir. */
function countEphemeralWorktreeDirs(): number {
  return readdirSync(tmpdir()).filter((name) =>
    name.startsWith('oat-review-wt-'),
  ).length;
}

describe('worktree lifecycle', () => {
  let repoRoot: string;
  const cwdBefore = process.cwd();

  beforeEach(async () => {
    repoRoot = await makeTempRepo();
  });

  afterEach(() => {
    if (repoRoot && existsSync(repoRoot)) {
      rmSync(repoRoot, { recursive: true, force: true });
    }
    // Guard: tests must never leave the process in a removed directory.
    expect(process.cwd()).toBe(cwdBefore);
  });

  it('acquires an ephemeral worktree outside the repo root', async () => {
    const handle = await acquireWorktree({ repoRoot });
    try {
      expect(handle.repoRoot).toBe(repoRoot);
      expect(existsSync(handle.worktreePath)).toBe(true);
      // Ephemeral path must live OUTSIDE the repo root.
      expect(handle.worktreePath.startsWith(repoRoot)).toBe(false);
      // git knows about the new worktree.
      const list = await listWorktrees(repoRoot);
      expect(list).toContain(handle.worktreePath);
    } finally {
      await releaseWorktree(handle);
    }
  });

  it('runs a callback inside the worktree and returns its value', async () => {
    const handle = await acquireWorktree({ repoRoot });
    try {
      const result = await runInWorktree(handle, async (worktreePath) => {
        // The callback receives the worktree path; the README was checked out.
        expect(existsSync(join(worktreePath, 'README.md'))).toBe(true);
        return 'callback-value';
      });
      expect(result).toBe('callback-value');
    } finally {
      await releaseWorktree(handle);
    }
  });

  it('releaseWorktree removes the git worktree AND the temp directory', async () => {
    const handle = await acquireWorktree({ repoRoot });
    const { worktreePath } = handle;
    await releaseWorktree(handle);
    expect(existsSync(worktreePath)).toBe(false);
    const list = await listWorktrees(repoRoot);
    expect(list).not.toContain(worktreePath);
  });

  it('leaves the caller cwd unchanged across acquire/run/release', async () => {
    const before = process.cwd();
    const handle = await acquireWorktree({ repoRoot });
    await runInWorktree(handle, async () => {
      // Helper does not chdir the host process — callers cd in a subshell.
      expect(process.cwd()).toBe(before);
    });
    await releaseWorktree(handle);
    expect(process.cwd()).toBe(before);
  });

  it('releases in a finally even when the inner callback throws', async () => {
    const handle = await acquireWorktree({ repoRoot });
    const { worktreePath } = handle;
    await expect(
      (async () => {
        try {
          await runInWorktree(handle, async () => {
            throw new Error('review blew up');
          });
        } finally {
          await releaseWorktree(handle);
        }
      })(),
    ).rejects.toThrow('review blew up');
    // Release still happened despite the throw.
    expect(existsSync(worktreePath)).toBe(false);
    const list = await listWorktrees(repoRoot);
    expect(list).not.toContain(worktreePath);
  });

  it('releaseWorktree is idempotent (safe even if the worktree never populated)', async () => {
    const handle = await acquireWorktree({ repoRoot });
    await releaseWorktree(handle);
    // A second release must not throw.
    await expect(releaseWorktree(handle)).resolves.toBeUndefined();
  });

  it('cleans up the temp dir when `git worktree add` fails (no handle to release)', async () => {
    // Point acquire at a non-repo directory so `git worktree add` rejects.
    // The caller gets no handle back, so the failure-path cleanup inside
    // acquireWorktree is the only thing that can prevent a leak.
    const nonRepo = mkdtempSync(join(tmpdir(), 'oat-wt-nonrepo-'));
    const before = countEphemeralWorktreeDirs();
    try {
      await expect(acquireWorktree({ repoRoot: nonRepo })).rejects.toThrow();
      // No `oat-review-wt-*` dir should survive the failed acquire.
      expect(countEphemeralWorktreeDirs()).toBe(before);
    } finally {
      rmSync(nonRepo, { recursive: true, force: true });
    }
  });
});
