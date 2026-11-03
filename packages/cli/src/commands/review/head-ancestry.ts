import { dirname, resolve } from 'node:path';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  getProjectState,
  listProjects,
  reviewHeadPairKey,
  type ProjectState,
  type ProjectSummary,
  type ReviewHeadAncestry,
  type ReviewHeadAncestryResolver,
  type ReviewHeadPair,
} from '@open-agent-toolkit/control-plane';

/** Ancestry answers for a ledger's head pairs, with the pairs git could not answer. */
export interface GitReviewHeadAncestry {
  ancestry: ReviewHeadAncestry;
  /** Pairs git could not evaluate (unknown commit, not a repository). */
  unresolved: ReviewHeadPair[];
}

/**
 * Answer each head pair with `git merge-base --is-ancestor`: exit 0 means the
 * ancestor relation holds, exit 1 means it does not, and anything else leaves
 * the pair unresolved. An unresolved pair is treated as not descending, so the
 * older `## Reviews` row stays live, which is the conservative reading.
 */
export async function resolveGitReviewHeadAncestry(
  git: GitRunner,
  cwd: string,
  pairs: readonly ReviewHeadPair[],
): Promise<GitReviewHeadAncestry> {
  const ancestry = new Set<string>();
  const unresolved: ReviewHeadPair[] = [];
  for (const pair of pairs) {
    const result = await git.run(
      ['merge-base', '--is-ancestor', pair.ancestor, pair.descendant],
      { cwd, allowFailure: true },
    );
    if (result.code === 0) {
      ancestry.add(reviewHeadPairKey(pair.ancestor, pair.descendant));
    } else if (result.code !== 1) {
      unresolved.push(pair);
    }
  }
  return { ancestry, unresolved };
}

/**
 * The control-plane readers never run git; the CLI precomputes head ancestry
 * for them through this resolver, so the router's actionability, `oat review
 * latest` and `oat review check` apply one supersession rule.
 */
export function createGitReviewHeadAncestryResolver(
  cwd: string,
  git: GitRunner = defaultGitRunner,
): ReviewHeadAncestryResolver {
  return async (pairs) =>
    (await resolveGitReviewHeadAncestry(git, cwd, pairs)).ancestry;
}

/**
 * `getProjectState` with descendant-head supersession resolved through git.
 *
 * Git runs from the project's parent directory, not the project itself: a
 * synced project can be its own nested checkout whose history lacks the source
 * commits its Reviewed Heads name. From the parent, git finds the repository
 * that contains the project, as `listProjectsWithReviewAncestry` does from the
 * scope root and `oat review latest` and `oat review check` do from the
 * repository root, so every reader answers the same pairs.
 */
export function getProjectStateWithReviewAncestry(
  projectPath: string,
): Promise<ProjectState> {
  return getProjectState(projectPath, {
    resolveReviewHeadAncestry: createGitReviewHeadAncestryResolver(
      dirname(resolve(projectPath)),
    ),
  });
}

/** `listProjects` with descendant-head supersession resolved through git. */
export function listProjectsWithReviewAncestry(
  projectsRoot: string,
): Promise<ProjectSummary[]> {
  return listProjects(projectsRoot, {
    resolveReviewHeadAncestry:
      createGitReviewHeadAncestryResolver(projectsRoot),
  });
}
