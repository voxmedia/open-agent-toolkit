import type { ReviewStatus } from '../types';

/**
 * Read-side supersession of `## Reviews` rows.
 *
 * A `received` row is superseded by a later row of the same Scope, Type and
 * Invocation class that records a review (any status but `pending`) at the
 * same or a descendant Reviewed Head. The classes are `gate` (any Gate
 * Target) and `lifecycle` (`manual` or `auto`); rows of different classes
 * never supersede each other. A row whose Invocation or Reviewed Head is
 * absent (`-`) is never superseded and never supersedes another.
 *
 * Supersession is computed, never written: no row is edited, promoted or
 * deleted. Readers that select a review event ignore a superseded row.
 *
 * This module is pure. Descendancy between two distinct heads needs git, so
 * the caller precomputes it: {@link reviewSupersessionHeadPairs} lists the
 * pairs a ledger needs answered, and the caller passes the pairs that hold as
 * a {@link ReviewHeadAncestry}. Without an answer a distinct head is treated
 * as not descending, so the older row stays live, which is today's behavior.
 */

/** Invocation class of a review row. */
export type ReviewInvocationClass = 'gate' | 'lifecycle';

/** An ordered pair of distinct full commit SHAs whose ancestry is asked. */
export interface ReviewHeadPair {
  ancestor: string;
  descendant: string;
}

/**
 * The ancestry pairs known to hold, keyed by {@link reviewHeadPairKey}: the
 * `ancestor` commit is an ancestor of the `descendant` commit.
 */
export type ReviewHeadAncestry = ReadonlySet<string>;

/** Resolves which of the given head pairs are ancestor relations. */
export type ReviewHeadAncestryResolver = (
  pairs: readonly ReviewHeadPair[],
) => Promise<ReviewHeadAncestry>;

/** One superseded row and the first later row that supersedes it. */
export interface ReviewSupersession {
  /** Zero-based index of the superseded `received` row in the ledger. */
  row: number;
  /** Zero-based index of the first later row that supersedes it. */
  supersededBy: number;
  /** Whether the superseding row sits at the same head or a descendant. */
  relation: 'same-head' | 'descendant-head';
}

const LIFECYCLE_INVOCATIONS = new Set(['manual', 'auto']);

export function reviewHeadPairKey(
  ancestor: string,
  descendant: string,
): string {
  return `${ancestor.toLowerCase()}..${descendant.toLowerCase()}`;
}

/** The invocation class of a row, or `null` when it has none. */
export function reviewInvocationClass(
  invocation: string | undefined,
): ReviewInvocationClass | null {
  const value = invocation?.trim().toLowerCase() ?? '';
  if (value === 'gate') {
    return 'gate';
  }
  return LIFECYCLE_INVOCATIONS.has(value) ? 'lifecycle' : null;
}

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function isReceived(row: ReviewStatus): boolean {
  return normalized(row.status) === 'received';
}

function recordsReview(row: ReviewStatus): boolean {
  const status = normalized(row.status);
  return status !== '' && status !== '-' && status !== 'pending';
}

/**
 * True when `later` could supersede `earlier` by every rule except head
 * ancestry: same Scope, Type and class, a recorded review, both heads known.
 */
function isCandidate(earlier: ReviewStatus, later: ReviewStatus): boolean {
  const earlierClass = reviewInvocationClass(earlier.invocation);
  return (
    earlierClass !== null &&
    earlier.reviewedHead !== undefined &&
    later.reviewedHead !== undefined &&
    reviewInvocationClass(later.invocation) === earlierClass &&
    normalized(later.scope) === normalized(earlier.scope) &&
    normalized(later.type) === normalized(earlier.type) &&
    recordsReview(later)
  );
}

/**
 * The distinct-head pairs whose ancestry decides supersession in this ledger:
 * one per `received` row and later candidate row at a different head.
 */
export function reviewSupersessionHeadPairs(
  rows: readonly ReviewStatus[],
): ReviewHeadPair[] {
  const pairs = new Map<string, ReviewHeadPair>();
  rows.forEach((earlier, index) => {
    if (!isReceived(earlier)) {
      return;
    }
    for (const later of rows.slice(index + 1)) {
      if (!isCandidate(earlier, later)) {
        continue;
      }
      const ancestor = earlier.reviewedHead as string;
      const descendant = later.reviewedHead as string;
      if (normalized(ancestor) === normalized(descendant)) {
        continue;
      }
      pairs.set(reviewHeadPairKey(ancestor, descendant), {
        ancestor,
        descendant,
      });
    }
  });
  return [...pairs.values()];
}

/** Every superseded `received` row, in ledger order. */
export function findSupersededReviews(
  rows: readonly ReviewStatus[],
  ancestry: ReviewHeadAncestry = new Set(),
): ReviewSupersession[] {
  const superseded: ReviewSupersession[] = [];
  rows.forEach((earlier, index) => {
    if (!isReceived(earlier)) {
      return;
    }
    for (let later = index + 1; later < rows.length; later += 1) {
      const candidate = rows[later] as ReviewStatus;
      if (!isCandidate(earlier, candidate)) {
        continue;
      }
      const from = earlier.reviewedHead as string;
      const to = candidate.reviewedHead as string;
      if (normalized(from) === normalized(to)) {
        superseded.push({
          row: index,
          supersededBy: later,
          relation: 'same-head',
        });
        return;
      }
      if (ancestry.has(reviewHeadPairKey(from, to))) {
        superseded.push({
          row: index,
          supersededBy: later,
          relation: 'descendant-head',
        });
        return;
      }
    }
  });
  return superseded;
}

/**
 * The rows with `superseded: true` set on each superseded `received` row.
 * Other rows are returned unchanged; the input is not mutated.
 */
export function markSupersededReviews(
  rows: readonly ReviewStatus[],
  ancestry?: ReviewHeadAncestry,
): ReviewStatus[] {
  const supersededRows = new Set(
    findSupersededReviews(rows, ancestry).map((entry) => entry.row),
  );
  return rows.map((row, index) =>
    supersededRows.has(index) ? { ...row, superseded: true } : row,
  );
}

/**
 * Resolve the ledger's head pairs through an optional resolver. No resolver
 * or no pairs yields an empty ancestry (same-head supersession only).
 */
export async function resolveReviewHeadAncestry(
  rows: readonly ReviewStatus[],
  resolver: ReviewHeadAncestryResolver | undefined,
): Promise<ReviewHeadAncestry> {
  const pairs = reviewSupersessionHeadPairs(rows);
  if (!resolver || pairs.length === 0) {
    return new Set();
  }
  return resolver(pairs);
}
