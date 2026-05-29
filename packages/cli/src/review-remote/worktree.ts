/**
 * Ephemeral worktree lifecycle helper (see design.md → Data Flow step 2).
 *
 * The provide-remote skills review a PR without mutating the caller's working
 * tree. They acquire an ephemeral, repo-scoped worktree, run `gh pr checkout`
 * INSIDE it (that step lives in the skill, not here), review, then tear the
 * worktree down. This helper owns only the create/run/release lifecycle:
 *
 *   - `acquireWorktree({ repoRoot })` — `mktemp -d` an ephemeral path OUTSIDE
 *     `repoRoot`, then `git -C "$repoRoot" worktree add --detach <path> HEAD`.
 *     The `-C "$repoRoot"` flag is load-bearing: it lets the command run even
 *     when the caller's CWD is not inside the repository (a thin remote-review
 *     machine invoking the skill from a home directory). `HEAD` is a
 *     placeholder ref the skill overwrites with `gh pr checkout <N>`.
 *   - `runInWorktree(handle, cb)` — invoke `cb(worktreePath)`. The helper does
 *     NOT chdir the host process; it passes the path so callers run repo-scoped
 *     git / `cd "$path" && gh pr checkout` in a subshell. This keeps the
 *     caller's CWD unchanged (verified by tests).
 *   - `releaseWorktree(handle)` — `git -C "$repoRoot" worktree remove --force`
 *     then remove the temp directory. Idempotent and safe even if the worktree
 *     never populated, so callers run it in a `finally`.
 *
 * Design Open Question resolution: `oat-worktree-bootstrap-auto` reuse was
 * considered but the helper is hand-rolled per the design fallback. The plan's
 * mechanics (repo-scoped git invocation, ephemeral path outside repo root,
 * force-removal teardown) are implemented directly here; the helper stays
 * agnostic to PR checkout so it has no dependency on the bootstrap contract.
 */

import { execFile as execFileCallback } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

export interface AcquireWorktreeOptions {
  /** Absolute path to the repository root (`git rev-parse --show-toplevel`). */
  repoRoot: string;
}

/** Opaque handle returned by {@link acquireWorktree}. */
export interface WorktreeHandle {
  /** The repository root the worktree was created against. */
  repoRoot: string;
  /** The ephemeral worktree path (outside `repoRoot`). */
  worktreePath: string;
  /** Internal: whether the worktree is still live (false after release). */
  released: boolean;
}

/**
 * Create an ephemeral, detached worktree outside the repo root and register it
 * with git. The path is created via `mktemp`-style `mkdtempSync` under the
 * system temp dir, so it is guaranteed to be outside `repoRoot`.
 */
export async function acquireWorktree(
  options: AcquireWorktreeOptions,
): Promise<WorktreeHandle> {
  const { repoRoot } = options;
  // Ephemeral path under the OS temp dir — outside repoRoot by construction.
  const worktreePath = mkdtempSync(join(tmpdir(), 'oat-review-wt-'));

  // `git worktree add` requires the target path to NOT already exist, so remove
  // the placeholder mkdtemp directory and let git create it fresh.
  rmSync(worktreePath, { recursive: true, force: true });

  await execFile('git', [
    '-C',
    repoRoot,
    'worktree',
    'add',
    '--detach',
    worktreePath,
    'HEAD',
  ]);

  return { repoRoot, worktreePath, released: false };
}

/**
 * Run a callback "inside" the worktree. The callback receives the worktree
 * path; the helper does not change the host process's working directory, so
 * callers must scope filesystem / git operations to that path themselves
 * (e.g., `git -C <path> …` or `cd <path> && gh pr checkout` in a subshell).
 */
export async function runInWorktree<T>(
  handle: WorktreeHandle,
  callback: (worktreePath: string) => Promise<T>,
): Promise<T> {
  return callback(handle.worktreePath);
}

/**
 * Remove the git worktree (force) and clean up the temp directory. Idempotent:
 * a second call is a no-op, and a failed `git worktree remove` (e.g., the
 * worktree never populated, or was already pruned) does not prevent the temp
 * directory cleanup. Safe to call in a `finally`.
 */
export async function releaseWorktree(handle: WorktreeHandle): Promise<void> {
  if (handle.released) {
    return;
  }
  handle.released = true;

  try {
    await execFile('git', [
      '-C',
      handle.repoRoot,
      'worktree',
      'remove',
      '--force',
      handle.worktreePath,
    ]);
  } catch {
    // `worktree remove` can fail if the worktree was never populated or was
    // already removed. That is non-fatal — proceed to temp cleanup so we never
    // leak the directory, then prune stale worktree metadata best-effort.
    try {
      await execFile('git', ['-C', handle.repoRoot, 'worktree', 'prune']);
    } catch {
      // Best-effort; ignore.
    }
  }

  rmSync(handle.worktreePath, { recursive: true, force: true });
}
