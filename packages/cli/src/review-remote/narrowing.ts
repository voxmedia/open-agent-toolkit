/**
 * Re-review narrowing filter + stale-SHA guard (see design.md → Component
 * Design + Error Handling → Stale prior-review SHA).
 *
 * Given the PR's prior provide-remote reviews and a `(rail, project, scope)`
 * tuple, pick the most recent matching review and decide whether the current
 * pass can narrow to `<prior_sha>..<HEAD>`. The guard runs existence + ancestry
 * checks (via an injected {@link GitInvoker}) before declaring a narrowing
 * range, so a rebased/force-pushed/shallow prior SHA never produces a
 * misleading partial range.
 */

import type { ReviewInvocation } from './marker-parser';

export type ReviewRail = 'ad-hoc' | 'project';

export type ReviewLineage =
  | { kind: 'lifecycle' }
  | { kind: 'gate'; target: string };

/** A prior provide-remote review, distilled from its parsed marker block. */
export interface PriorReview {
  /** Full 40-char SHA recorded by the prior review. */
  headSha: string;
  /** Scope token or the `ad-hoc` sentinel. */
  scope: string;
  /** Project path — present only for project-rail reviews. */
  project?: string;
  invocation: ReviewInvocation;
  /** Review lineage; absent on legacy records, which are not eligible. */
  lineage?: ReviewLineage;
  /** ISO-8601 review submission timestamp, used for descending sort. */
  submittedAt: string;
}

/**
 * Narrow git surface needed by the guard. Callers pass a worktree-bound
 * implementation (rich-context mode) or a fetch-capable one (diff-only mode);
 * tests pass stubs.
 */
export interface GitInvoker {
  /** `git cat-file -e <sha>` — does the object exist locally? */
  objectExists(sha: string): Promise<boolean>;
  /** `git merge-base --is-ancestor <sha> <head>` — reachable from HEAD? */
  isAncestor(sha: string, head: string): Promise<boolean>;
  /** `git fetch origin <sha>:<ref>` — fetch a single ref (diff-only mode). */
  fetchRef(sha: string): Promise<boolean>;
}

export interface NarrowingInput {
  reviews: PriorReview[];
  rail: ReviewRail;
  /** Resolved project path on the project rail; `null` on the ad-hoc rail. */
  project: string | null;
  /** Current scope token, or `ad-hoc`. */
  scope: string;
  /** Current review lineage, including the target for gate invocations. */
  lineage: ReviewLineage;
  /** Current PR HEAD SHA. */
  headSha: string;
  git: GitInvoker;
  /** `--narrow` was passed explicitly: guard failure becomes a hard error. */
  forceNarrow?: boolean;
  /** Resolved preference: unset and true narrow; false forces full scope. */
  narrowingPreference?: boolean;
  /** Diff-only mode (no ephemeral worktree): fetch the single ref first. */
  diffOnly?: boolean;
}

export type FullScopeReason =
  | 'narrowing-disabled'
  | 'no-prior-review'
  | 'stale-sha';

export interface NarrowRangeResult {
  kind: 'narrow-range';
  priorSha: string;
  headSha: string;
}

export interface FullScopeFallbackResult {
  kind: 'full-scope-fallback';
  reason: FullScopeReason;
  /** The stale SHA that triggered the fallback, when applicable. */
  priorSha?: string;
}

export interface HardErrorResult {
  kind: 'hard-error';
  reason: 'stale-sha';
  priorSha: string;
}

export type NarrowingResult =
  | NarrowRangeResult
  | FullScopeFallbackResult
  | HardErrorResult;

/** Does a prior review match the current rail, project, scope, and lineage? */
function matchesTuple(review: PriorReview, input: NarrowingInput): boolean {
  const sameLineage =
    review.lineage !== undefined &&
    review.lineage.kind === input.lineage.kind &&
    (input.lineage.kind === 'lifecycle' ||
      (review.lineage.kind === 'gate' &&
        review.lineage.target === input.lineage.target));

  if (input.rail === 'ad-hoc') {
    // Ad-hoc: scope sentinel must match AND there must be no project key.
    return (
      review.scope === 'ad-hoc' && review.project === undefined && sameLineage
    );
  }
  // Project rail: same project AND same scope.
  return (
    review.project !== undefined &&
    review.project === input.project &&
    review.scope === input.scope &&
    sameLineage
  );
}

function mostRecentMatch(input: NarrowingInput): PriorReview | null {
  const matches = input.reviews.filter((r) => matchesTuple(r, input));
  if (matches.length === 0) {
    return null;
  }
  // Descending by submission time — newest matching review wins.
  matches.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return matches[0]!;
}

/**
 * Run the two-step stale-SHA guard. In diff-only mode, attempt a single-ref
 * fetch before re-checking existence. Returns true only when the prior SHA both
 * exists locally and is an ancestor of the current PR HEAD.
 */
async function guardPasses(
  priorSha: string,
  input: NarrowingInput,
): Promise<boolean> {
  let exists = await input.git.objectExists(priorSha);
  if (!exists && input.diffOnly) {
    const fetched = await input.git.fetchRef(priorSha);
    if (!fetched) {
      return false;
    }
    exists = await input.git.objectExists(priorSha);
  }
  if (!exists) {
    return false;
  }
  return input.git.isAncestor(priorSha, input.headSha);
}

/**
 * Pick the narrowing target for the current re-review pass.
 */
export async function pickNarrowingTarget(
  input: NarrowingInput,
): Promise<NarrowingResult> {
  if (input.narrowingPreference === false) {
    return {
      kind: 'full-scope-fallback',
      reason: 'narrowing-disabled',
    };
  }

  const prior = mostRecentMatch(input);
  if (!prior) {
    return {
      kind: 'full-scope-fallback',
      reason: 'no-prior-review',
    };
  }

  const passed = await guardPasses(prior.headSha, input);
  if (passed) {
    return {
      kind: 'narrow-range',
      priorSha: prior.headSha,
      headSha: input.headSha,
    };
  }

  // Guard failed. The user explicitly asked to narrow → hard error.
  if (input.forceNarrow) {
    return {
      kind: 'hard-error',
      reason: 'stale-sha',
      priorSha: prior.headSha,
    };
  }

  // Otherwise fail open to full scope and preserve the guard failure reason.
  return {
    kind: 'full-scope-fallback',
    reason: 'stale-sha',
    priorSha: prior.headSha,
  };
}
