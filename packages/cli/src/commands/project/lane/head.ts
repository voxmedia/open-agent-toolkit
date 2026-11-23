import type { OrchestratorCheckout } from '@commands/project/orchestrator/branch';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';

import { readLaneLedger, type LaneBlock } from './ledger';

export type LaneHeadStatus = 'current' | 'ahead' | 'moved' | 'unknown';

/** A lane's branch head compared with the head its last report delivered. */
export interface LaneHeadCheck {
  lane: string;
  branch: string;
  /** The ledger's `head`: what the lane's last report delivered. */
  reportedHead: string;
  status: LaneHeadStatus;
  branchHead?: string;
  /** Commits on the branch that the reported head does not contain. */
  commits?: number;
  /** Why the check could not compare, for `unknown`. */
  reason?: string;
}

/**
 * The check applies to a lane in its own worktree that records a branch and
 * a reported head. A lane in the orchestrator's checkout commits onto the
 * orchestrator's branch, so its attribution comes from its report's commit
 * list instead.
 */
export function headCheckApplies(block: LaneBlock): boolean {
  return (
    block.fields.placement !== 'shared-worktree' &&
    Boolean(block.fields.branch) &&
    Boolean(block.fields.head)
  );
}

async function resolveCommit(
  git: GitRunner,
  cwd: string,
  ref: string,
): Promise<string | null> {
  const result = await git.run(
    ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`],
    { cwd, allowFailure: true },
  );
  return result.code === 0 && result.stdout ? result.stdout.trim() : null;
}

/**
 * Compare the lane's branch, as this clone has it, with its reported head. A
 * branch head that differs is flagged: `ahead` when it descends from the
 * reported head, `moved` when it no longer contains it (a rebase or a reset).
 */
export async function checkLaneHead(
  block: LaneBlock,
  cwd: string,
  git: GitRunner = defaultGitRunner,
): Promise<LaneHeadCheck | null> {
  if (!headCheckApplies(block)) {
    return null;
  }
  const branch = block.fields.branch as string;
  const reportedHead = block.fields.head as string;
  const base = { lane: block.id, branch, reportedHead };
  const branchHead = await resolveCommit(git, cwd, `refs/heads/${branch}`);
  if (!branchHead) {
    return {
      ...base,
      status: 'unknown',
      reason: `branch ${branch} is not in this clone`,
    };
  }
  const reported = await resolveCommit(git, cwd, reportedHead);
  if (!reported) {
    return {
      ...base,
      status: 'unknown',
      branchHead,
      reason: `the reported head ${reportedHead} is not in this clone`,
    };
  }
  if (reported === branchHead) {
    return { ...base, status: 'current', branchHead, commits: 0 };
  }
  const ancestor = await git.run(
    ['merge-base', '--is-ancestor', reported, branchHead],
    { cwd, allowFailure: true },
  );
  const count = await git.run(
    ['rev-list', '--count', `${reported}..${branchHead}`],
    { cwd, allowFailure: true },
  );
  return {
    ...base,
    status: ancestor.code === 0 ? 'ahead' : 'moved',
    branchHead,
    commits: Number(count.stdout.trim()) || 0,
  };
}

export function isHeadFlagged(check: LaneHeadCheck | null): boolean {
  return check?.status === 'ahead' || check?.status === 'moved';
}

/** One line for a flagged lane, shared by `lane set` and `status`. */
export function formatHeadAhead(check: LaneHeadCheck): string {
  const where = `${check.lane} (branch ${check.branch})`;
  const relation =
    check.status === 'ahead'
      ? `is ${check.commits} commit${check.commits === 1 ? '' : 's'} past the last report's head ${check.reportedHead}`
      : `has moved off the last report's head ${check.reportedHead} (${check.commits} commit${check.commits === 1 ? '' : 's'} not in it)`;
  return `Lane head ahead of its report: ${where} ${relation}; do not merge unreported commits unreviewed.`;
}

/** What `status` reports about a freestyle project's lanes. */
export interface LaneStatus {
  /** Active lanes on this checkout's branch, when it is not the orchestrator. */
  current: string[];
  /** Lanes whose branch head is past their last report's head. */
  headAhead: LaneHeadCheck[];
  /** Why `lanes.md` could not be read; reported instead of being hidden. */
  error?: string;
}

export async function readLaneStatus(
  projectDir: string,
  cwd: string,
  checkout: OrchestratorCheckout,
  git: GitRunner = defaultGitRunner,
): Promise<LaneStatus> {
  try {
    const { ledger } = await readLaneLedger(projectDir, '');
    const current =
      checkout.isOrchestrator || checkout.currentBranch === null
        ? []
        : ledger.active
            .filter((block) => block.fields.branch === checkout.currentBranch)
            .map((block) => block.id);
    const checks = await Promise.all(
      ledger.active.map((block) => checkLaneHead(block, cwd, git)),
    );
    return {
      current,
      headAhead: checks.filter(
        (check): check is LaneHeadCheck =>
          check !== null && isHeadFlagged(check),
      ),
    };
  } catch (error) {
    return {
      current: [],
      headAhead: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
