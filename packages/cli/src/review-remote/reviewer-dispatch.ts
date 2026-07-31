/**
 * Tier-1 dispatch wrapper for the `oat-reviewer` subagent's structured-output
 * mode (see design.md → Component Design → `oat-project-review-provide-remote`
 * and `.agents/agents/oat-reviewer.md` → Structured-Output Mode).
 *
 * The project-rail provide-remote skill's Tier 1 dispatch hands the reviewer a
 * payload carrying the project context, the posted-review-body schema
 * reference, the resolved re-review narrowing range, and the
 * `oat_output_mode: structured` flag. In that mode the reviewer returns a
 * `StructuredFindings` object in-memory rather than writing a review artifact;
 * this wrapper validates that object and hands it back to the skill, which is
 * then responsible for building the posted body and posting to GitHub.
 *
 * Responsibilities are deliberately narrow:
 *
 * - Build the dispatch payload with the structured-output flag p03 wired.
 * - Forward it to an injected {@link Dispatcher} (real provider dispatch in the
 *   skill; stubs in tests).
 * - Surface dispatcher errors to the caller WITHOUT retry — the Tier 2/3
 *   fallback decision belongs to the skill, not this wrapper.
 * - Validate the returned `StructuredFindings` shape with a hand-rolled
 *   validator (matching the zero-dependency style of the other review-remote
 *   helpers) and raise a typed {@link StructuredFindingsError} on malformed
 *   output.
 */

import {
  type StructuredFindings,
  validateStructuredFindings,
} from '@review/structured-findings';

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
 * Raw response envelope from a provider dispatch. The reviewer's structured
 * return lands on `findings`; the wrapper validates it before returning.
 */
export interface RawAgentResponse {
  findings: unknown;
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
  return validateStructuredFindings(response.findings);
}
