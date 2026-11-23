import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  getFrontmatterBlock,
  parseFrontmatterScalarFields,
} from '@commands/shared/frontmatter';
import { CliError } from '@errors/cli-error';

/** The freestyle `state.md` field naming the orchestrator's branch. */
export const ORCHESTRATOR_BRANCH_FIELD = 'oat_orchestrator_branch';

/** The command that claims an unclaimed project or replaces its branch. */
export const ORCHESTRATOR_SET_COMMAND = 'oat project orchestrator set';

/**
 * The branch this checkout has checked out, or null on a detached HEAD or
 * outside a git work tree. An unborn branch (no commits yet) is still a branch.
 */
export async function readCurrentBranch(
  cwd: string,
  git: GitRunner = defaultGitRunner,
): Promise<string | null> {
  try {
    const result = await git.run(
      ['symbolic-ref', '--quiet', '--short', 'HEAD'],
      {
        cwd,
        allowFailure: true,
      },
    );
    return result.code === 0 && result.stdout ? result.stdout : null;
  } catch {
    return null;
  }
}

/**
 * The recorded orchestrator branch in a `state.md`'s content. An empty value,
 * a `null`, or no field at all (a project created before m02) is unclaimed and
 * reads as null.
 */
export function parseOrchestratorBranch(stateContent: string): string | null {
  const block = getFrontmatterBlock(stateContent.replaceAll('\r\n', '\n'));
  if (block === null) {
    return null;
  }
  return (
    parseFrontmatterScalarFields(block, [ORCHESTRATOR_BRANCH_FIELD]).values[
      ORCHESTRATOR_BRANCH_FIELD
    ] ?? null
  );
}

/** {@link parseOrchestratorBranch} for a project folder; null when unreadable. */
export async function readOrchestratorBranch(
  projectDir: string,
): Promise<string | null> {
  try {
    return parseOrchestratorBranch(
      await readFile(join(projectDir, 'state.md'), 'utf8'),
    );
  } catch {
    return null;
  }
}

export interface OrchestratorCheckout {
  /** The recorded orchestrator branch; null while unclaimed. */
  branch: string | null;
  claimed: boolean;
  /** This checkout's branch; null on a detached HEAD or outside git. */
  currentBranch: string | null;
  /** True only when the project is claimed and this checkout is on its branch. */
  isOrchestrator: boolean;
}

export function describeOrchestratorCheckout(
  branch: string | null,
  currentBranch: string | null,
): OrchestratorCheckout {
  return {
    branch,
    claimed: branch !== null,
    currentBranch,
    isOrchestrator: branch !== null && branch === currentBranch,
  };
}

/** The two `status` lines: the recorded branch, then this checkout's. */
export function formatOrchestratorLines(
  checkout: OrchestratorCheckout,
): string[] {
  const current = checkout.currentBranch ?? 'detached HEAD';
  if (!checkout.claimed) {
    return [
      `Orchestrator branch: unclaimed (the orchestrator claims it with \`${ORCHESTRATOR_SET_COMMAND}\`)`,
      `Current branch: ${current}`,
    ];
  }
  return [
    `Orchestrator branch: ${checkout.branch}`,
    checkout.isOrchestrator
      ? `Current branch: ${current} (this checkout is the orchestrator)`
      : `Current branch: ${current} (not the orchestrator branch: this checkout is a lane)`,
  ];
}

/**
 * Refuse a freestyle record-writing command unless this checkout is the
 * project's orchestrator: the project must be claimed and the current branch
 * must be the recorded one. A detached HEAD is never the orchestrator.
 */
export async function assertOrchestratorCheckout(options: {
  projectDir: string;
  projectName: string;
  repoRoot: string;
  action: string;
  git?: GitRunner;
}): Promise<OrchestratorCheckout> {
  const checkout = describeOrchestratorCheckout(
    await readOrchestratorBranch(options.projectDir),
    await readCurrentBranch(options.repoRoot, options.git),
  );
  if (!checkout.claimed) {
    throw new CliError(
      `Cannot ${options.action}: project ${options.projectName} is unclaimed (${ORCHESTRATOR_BRANCH_FIELD} is empty or absent). The session designated as its orchestrator runs \`${ORCHESTRATOR_SET_COMMAND}\` first.`,
      1,
    );
  }
  if (!checkout.isOrchestrator) {
    const current =
      checkout.currentBranch === null
        ? 'a detached HEAD'
        : `branch ${checkout.currentBranch}`;
    throw new CliError(
      `Cannot ${options.action}: this checkout is on ${current}, but project ${options.projectName}'s orchestrator branch is ${checkout.branch}. Only its orchestrator writes its records; a lane returns its results to the orchestrator instead.`,
      1,
    );
  }
  return checkout;
}
