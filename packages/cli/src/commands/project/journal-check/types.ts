/**
 * Journal evaluator contract (`oat project journal check`).
 *
 * The evaluator is pure: it reads the bytes of `plan.md`, `implementation.md`
 * and `state.md` and returns `{ status, reasons }`. It never writes. Callers
 * pick the boundary: `implement-preflight` (implement, before Step 16, while
 * Step 16's terminal headers and pointers may still be unwritten), `review`
 * (with an explicit phase scope), or `completion` (complete, after the
 * owner-controlled refresh and before roll-up, seal or lifecycle mutation).
 */

export const JOURNAL_CHECK_BOUNDARIES = [
  'implement-preflight',
  'review',
  'completion',
] as const;

export type JournalCheckBoundary = (typeof JOURNAL_CHECK_BOUNDARIES)[number];

export type JournalArtifactPath = 'implementation.md' | 'plan.md' | 'state.md';

export type JournalReasonCode =
  // metadata
  | 'journal-frontmatter-malformed'
  | 'journal-frontmatter-missing'
  | 'journal-missing'
  | 'journal-line-rewritten'
  | 'state-frontmatter-malformed'
  | 'journal-status-not-terminal'
  | 'journal-pointer-not-cleared'
  | 'state-status-disagrees'
  | 'state-pointer-not-cleared'
  // task and execution records
  | 'task-block-missing'
  | 'task-duplicate-block'
  | 'task-unplanned'
  | 'task-status-missing'
  | 'task-status-ambiguous'
  | 'task-status-invalid'
  | 'task-not-completed'
  | 'task-commit-missing'
  | 'task-misplaced'
  | 'plan-task-duplicate'
  | 'plan-task-misplaced'
  | 'execution-record-open'
  // phases
  | 'phase-status-disagrees'
  | 'phase-status-ambiguous'
  | 'phase-duplicate-section'
  | 'phase-head-missing'
  | 'phase-not-accepted'
  | 'overview-total-mismatch'
  // placement and operational records
  | 'references-not-last'
  | 'receipt-misplaced'
  | 'deferral-misplaced'
  | 'dispatch-payload'
  | 'run-line-malformed'
  | 'run-line-misplaced'
  | 'run-line-duplicate'
  | 'run-line-unresolved'
  | 'template-residue'
  // overrides
  | 'override-malformed'
  | 'override-misplaced'
  | 'override-unused';

export interface JournalCheckReason {
  code: JournalReasonCode;
  path: JournalArtifactPath;
  /** 1-based source line, or `null` when the finding has no single line. */
  line: number | null;
  /** The skill that owns the correction. */
  owner: string;
  message: string;
}

/**
 * Journal-only override reason codes. An override is one line under
 * `## Deviations from Plan / Design`:
 *
 * `**Override:** <code> · **Authorized by:** <decision id> · **Scope:** <pNN-tNN|pNN> · <reason>`
 */
export const JOURNAL_OVERRIDE_CODES = [
  'scope-disposition-approved',
  'evidence-lost',
  'operator-accepted-gap',
] as const;

export type JournalOverrideCode = (typeof JOURNAL_OVERRIDE_CODES)[number];

export interface JournalOverride {
  code: JournalOverrideCode;
  authorizedBy: string;
  /** Normalized scope: a task id (`pNN-tNN`, `prevN-tNN`) or a phase id. */
  scope: string;
  reason: string;
  line: number;
  /** Whether the override suppressed at least one eligible finding. */
  applied: boolean;
}

export interface JournalCheckInput {
  boundary: JournalCheckBoundary;
  /**
   * Review boundary only: the validated phase scope (normalized phase ids).
   * Ignored at the other boundaries.
   */
  scope?: readonly string[] | null;
  planContent: string;
  journalContent: string;
  stateContent: string;
}

export interface JournalCheckResult {
  status: 'ok' | 'refused';
  boundary: JournalCheckBoundary;
  workflowMode: string;
  scope: string[] | null;
  reasons: JournalCheckReason[];
  /** Non-refusing findings (live runs at review, unused overrides). */
  warnings: JournalCheckReason[];
  overrides: JournalOverride[];
}
