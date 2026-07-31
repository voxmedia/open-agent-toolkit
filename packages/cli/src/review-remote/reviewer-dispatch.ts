/**
 * Tier-1 dispatch wrapper for the `oat-reviewer` subagent's structured-output
 * mode (see design.md → Component Design → `oat-project-review-provide-remote`
 * and `.agents/agents/oat-reviewer.md` → Structured-Output Mode).
 *
 * The project-rail provide-remote skill's Tier 1 dispatch hands the reviewer a
 * payload carrying the project context, the posted-review-body schema
 * reference, the resolved re-review narrowing range, and the
 * `oat_output_mode: structured` flag. In that mode the reviewer returns a
 * `ReviewerTerminalV1` envelope in-memory rather than writing a review
 * artifact; this wrapper validates the terminal accounting before projecting
 * `StructuredFindings` for the skill to post to GitHub.
 *
 * Responsibilities are deliberately narrow:
 *
 * - Build the dispatch payload with the structured-output flag p03 wired.
 * - Forward it to an injected {@link Dispatcher} (real provider dispatch in the
 *   skill; stubs in tests).
 * - Surface dispatcher errors to the caller WITHOUT retry — the Tier 2/3
 *   fallback decision belongs to the skill, not this wrapper.
 * - Retain accepted-handle repair and reject malformed, blocked, timed-out, or
 *   accounting-invalid terminals without exposing actionable findings.
 */

import {
  validateAndRepair,
  type ReviewerContinuation,
} from '@review/coordinator-contract';
import type {
  AccountingValidationError,
  ReviewOutputValidationContext,
} from '@review/output-validator';
import { parseReviewerTerminalV1 } from '@review/schemas';
import {
  type StructuredFindings,
  validateStructuredFindings,
} from '@review/structured-findings';
import type { ReviewerTerminalV1 } from '@review/types';

import type { NarrowingResult } from './narrowing';

export {
  type FindingSeverity,
  type StructuredFinding,
  type StructuredFindings,
  StructuredFindingsError,
} from '@review/structured-findings';

/**
 * The dispatch-payload key that selects structured-output mode on the
 * `oat-reviewer` agent. Mirrors the flag p03 added (verified against
 * `.agents/agents/oat-reviewer.md`); parallels the existing
 * `oat_review_invocation` dispatch-payload naming.
 */
export const STRUCTURED_OUTPUT_MODE_FLAG = 'oat_output_mode' as const;

/** The single accepted value of {@link STRUCTURED_OUTPUT_MODE_FLAG}. */
export const STRUCTURED_OUTPUT_MODE_VALUE = 'structured' as const;

/**
 * Raw response from provider-owned dispatch. A pre-start rejection may be
 * eligible for caller-owned fallback; accepted output is terminal.
 */
export type RawAgentResponse =
  | { accepted: false; reason: string }
  | {
      accepted: true;
      terminal: unknown | Promise<unknown>;
      repairAccounting?: (input: {
        attempt: number;
        errors: AccountingValidationError[];
        immutableSubstanceDigest: string;
      }) => Promise<unknown>;
    };

export class AcceptedReviewOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AcceptedReviewOutputError';
  }
}

export class AcceptedReviewBlockedError extends Error {
  constructor(readonly terminal: ReviewerTerminalV1 & { status: 'blocked' }) {
    super(terminal.reason);
    this.name = 'AcceptedReviewBlockedError';
  }
}

export class ReviewDispatchRejectedError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'ReviewDispatchRejectedError';
  }
}

/**
 * Narrow dispatcher interface. The skill provides the real provider dispatch
 * (Claude Code Task / Cursor invocation / Codex spawn); tests pass stubs.
 */
export interface Dispatcher {
  spawn(payload: Record<string, unknown>): Promise<RawAgentResponse>;
}

/** Context the wrapper needs to build the structured-output dispatch payload. */
export interface ReviewDispatchContext {
  /** Resolved OAT project directory path. */
  projectPath: string;
  /** Current scope token (`pNN`, `final`, …). */
  scope: string;
  /** Full 40-char PR HEAD SHA being reviewed. */
  headSha: string;
  /** The Review Scope metadata block the reviewer consumes as its prompt. */
  reviewScopeMetadata: string;
  /** Pointer to the posted-review-body schema the skill will build against. */
  postedBodySchemaRef: string;
  /** Resolved re-review narrowing decision from {@link pickNarrowingTarget}. */
  narrowing: NarrowingResult;
  /** Coordinator-owned receipt, plan, and assignment projection. */
  validation: ReviewOutputValidationContext;
  /** Absolute output deadline, or null when no outer budget exists. */
  outputDeadlineMs: number | null;
}

/**
 * Build the dispatch payload for a structured-output reviewer run. The
 * structured-mode flag is always set; the narrowing range is included only when
 * the guard actually produced one (`narrow-range`), otherwise it is `null`.
 */
export function buildDispatchPayload(
  context: ReviewDispatchContext,
): Record<string, unknown> {
  const narrowingRange =
    context.narrowing.kind === 'narrow-range'
      ? `${context.narrowing.priorSha}..${context.narrowing.headSha}`
      : null;

  return {
    [STRUCTURED_OUTPUT_MODE_FLAG]: STRUCTURED_OUTPUT_MODE_VALUE,
    oat_project: context.projectPath,
    oat_review_scope: context.scope,
    oat_review_head_sha: context.headSha,
    review_scope_metadata: context.reviewScopeMetadata,
    posted_body_schema_ref: context.postedBodySchemaRef,
    narrowing_range: narrowingRange,
  };
}

/**
 * Run a Tier-1 structured-output review: build the payload, dispatch once, and
 * validate the returned findings. Dispatcher errors propagate unchanged (no
 * retry) so the skill can decide on a Tier 2/3 fallback. Malformed reviewer
 * output raises {@link StructuredFindingsError}.
 */
export async function dispatchStructuredReview(
  context: ReviewDispatchContext,
  dispatcher: Dispatcher,
): Promise<StructuredFindings> {
  const payload = buildDispatchPayload(context);
  // No try/catch — a dispatcher error surfaces to the skill without retry.
  const response = await dispatcher.spawn(payload);
  if (!response.accepted) {
    throw new ReviewDispatchRejectedError(response.reason);
  }

  let terminal: ReviewerTerminalV1;
  try {
    terminal = parseReviewerTerminalV1(await response.terminal);
  } catch {
    throw new AcceptedReviewOutputError(
      'accepted reviewer returned malformed ReviewerTerminalV1',
    );
  }
  const repairAccounting: ReviewerContinuation['repairAccounting'] = async (
    input,
  ) => {
    if (response.repairAccounting === undefined) {
      throw new AcceptedReviewOutputError(
        'accepted reviewer does not support same-handle accounting repair',
      );
    }
    try {
      return parseReviewerTerminalV1(await response.repairAccounting(input));
    } catch {
      throw new AcceptedReviewOutputError(
        'accepted reviewer returned malformed accounting repair',
      );
    }
  };
  const validation = await validateAndRepair(
    {
      context: context.validation,
      continuation: { repairAccounting },
      outputDeadlineMs: context.outputDeadlineMs,
    },
    terminal,
  );
  if (!validation.accepted) {
    throw new AcceptedReviewOutputError(validation.code);
  }
  if (validation.terminal.status === 'blocked') {
    throw new AcceptedReviewBlockedError(validation.terminal);
  }
  if (validation.terminal.candidate.kind !== 'structured') {
    throw new AcceptedReviewOutputError(
      'remote reviewer returned an artifact candidate',
    );
  }
  return validateStructuredFindings(validation.terminal.candidate.review);
}
