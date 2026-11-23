import { realpath } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { commitExactPaths } from '@commands/shared/exact-path-commit';

export interface LaneCommitResult {
  /**
   * `nothing-to-commit` when this checkout's branch does not track the files:
   * a synced project's records live in its nested worktree and a local
   * project's are ignored, as `oat project log append --commit` treats them.
   */
  outcome: 'committed' | 'nothing-to-commit' | 'failed';
  /** The files, relative to the repository root. */
  paths: string[];
  commit?: string;
  error?: string;
}

export interface CommitLaneRecordsInput {
  repoRoot: string;
  projectDir: string;
  /** Files relative to the project folder: `lanes.md` and a filed report. */
  files: readonly string[];
  lane: string;
  updateId: string;
  git?: GitRunner;
}

/**
 * Commit what one `lane set` wrote, by exact path, so other changes in the
 * checkout are never swept in. Nothing is pushed.
 */
export async function commitLaneRecords(
  input: CommitLaneRecordsInput,
): Promise<LaneCommitResult> {
  const git = input.git ?? defaultGitRunner;
  const root = await realpath(input.repoRoot);
  const projectDir = await realpath(input.projectDir);
  const paths = input.files.map((file) =>
    relative(root, join(projectDir, file)),
  );
  const status = await git.run(['status', '--porcelain', '--', ...paths], {
    cwd: root,
    allowFailure: true,
  });
  if (status.code !== 0) {
    return { outcome: 'failed', paths, error: status.stderr.trim() };
  }
  if (!status.stdout.trim()) {
    return { outcome: 'nothing-to-commit', paths };
  }
  const result = await commitExactPaths({
    repoRoot: root,
    paths,
    message: `chore(oat): record lane ${input.lane} ${input.updateId}`,
    identity: `lane-set:${paths[0]}:${input.updateId}`,
  });
  if (result.committed) {
    return { outcome: 'committed', paths, commit: result.commit };
  }
  return {
    outcome: 'failed',
    paths,
    error: result.error ?? `exact-path commit ${result.outcome}`,
  };
}
