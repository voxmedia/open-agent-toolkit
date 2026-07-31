import { canonicalizeJson, hashCanonicalJson } from './canonical-json';
import { normalizeMarkdownSource } from './markdown-grammar';
import {
  validateReviewOutput,
  type AccountingValidationError,
  type ReviewOutputValidationContext,
} from './output-validator';
import type { ReviewerTerminalV1 } from './types';

export interface ReviewerContinuation {
  repairAccounting(input: {
    attempt: number;
    errors: AccountingValidationError[];
    immutableSubstanceDigest: string;
  }): Promise<ReviewerTerminalV1>;
}

export interface ReviewCoordinatorSession {
  context: ReviewOutputValidationContext;
  continuation: ReviewerContinuation;
  outputDeadlineMs: number | null;
  clock?: () => number;
}

export type ReviewCoordinatorResult =
  | {
      accepted: true;
      terminal: ReviewerTerminalV1;
      outputDigest: string;
      repairAttempts: number;
    }
  | {
      accepted: false;
      code: 'review_complete_accounting_invalid';
      errors: AccountingValidationError[];
      repairAttempts: number;
    };

function normalizedSubstance(terminal: ReviewerTerminalV1): ReviewerTerminalV1 {
  const value = structuredClone(terminal);
  const accounting = value.reviewAccounting;
  accounting.receipt = '';
  accounting.contextDigest = '';
  accounting.planDigest = '';
  accounting.assignmentDigest = '';
  accounting.lanes.forEach((lane) => {
    lane.paths = [];
    lane.primaryObligationIds = [];
    lane.seamObligationIds = [];
    lane.uninspectedPathIndexes = [];
    lane.uncoveredObligationIds = [];
    lane.primaryCompletion.completedPathIndexes = [];
    lane.primaryCompletion.completedObligationIds = [];
  });
  accounting.classifications.forEach((classification) => {
    classification.paths = [];
    classification.uninspectedPathIndexes = [];
  });
  return value;
}

function normalizedArtifactSubstance(
  bytesBase64: string,
  accounting: ReviewerTerminalV1['reviewAccounting'],
): string {
  const source = normalizeMarkdownSource(Buffer.from(bytesBase64, 'base64'));
  const lines = source.split('\n');
  const heading = lines.indexOf('## Review Accounting');
  if (
    heading === -1 ||
    lines.indexOf('## Review Accounting', heading + 1) !== -1
  ) {
    throw new Error('artifact substance has invalid accounting headings');
  }
  let opening = heading + 1;
  if (lines[opening] === '') opening++;
  if (lines[opening] !== '```json') {
    throw new Error('artifact substance has invalid accounting fence');
  }
  const closing = lines.indexOf('```', opening + 1);
  if (closing === -1) {
    throw new Error('artifact substance has unclosed accounting fence');
  }
  return [
    ...lines.slice(0, opening + 1),
    canonicalizeJson(accounting),
    ...lines.slice(closing),
  ].join('\n');
}

export function immutableReviewSubstanceDigest(
  terminal: ReviewerTerminalV1,
  artifactBytesBase64?: string,
): string {
  const normalized = normalizedSubstance(terminal);
  return hashCanonicalJson(
    artifactBytesBase64 === undefined
      ? normalized
      : {
          terminal: normalized,
          artifact: normalizedArtifactSubstance(
            artifactBytesBase64,
            normalized.reviewAccounting,
          ),
        },
  );
}

export function isAccountingRepairablePointer(pointer: string): boolean {
  return (
    /^\/reviewAccounting\/(?:receipt|contextDigest|planDigest|assignmentDigest)$/.test(
      pointer,
    ) ||
    /^\/reviewAccounting\/lanes\/\d+\/(?:paths|primaryObligationIds|seamObligationIds|uninspectedPathIndexes|uncoveredObligationIds)$/.test(
      pointer,
    ) ||
    /^\/reviewAccounting\/lanes\/\d+\/primaryCompletion\/(?:completedPathIndexes|completedObligationIds)$/.test(
      pointer,
    ) ||
    /^\/reviewAccounting\/classifications\/\d+\/(?:paths|uninspectedPathIndexes)$/.test(
      pointer,
    )
  );
}

function beforeDeadline(session: ReviewCoordinatorSession): boolean {
  return (
    session.outputDeadlineMs === null ||
    (session.clock ?? Date.now)() < session.outputDeadlineMs
  );
}

export async function validateAndRepair(
  session: ReviewCoordinatorSession,
  output: ReviewerTerminalV1,
): Promise<ReviewCoordinatorResult> {
  const immutableDigest = immutableReviewSubstanceDigest(output);
  let candidate = structuredClone(output);
  let repairAttempts = 0;

  for (;;) {
    const validation = validateReviewOutput(session.context, candidate);
    if (validation.valid) {
      return {
        accepted: true,
        terminal: candidate,
        outputDigest: validation.outputDigest,
        repairAttempts,
      };
    }
    if (
      repairAttempts >= 2 ||
      !beforeDeadline(session) ||
      validation.errors.length === 0 ||
      validation.errors.some(
        (error) => !isAccountingRepairablePointer(error.pointer),
      )
    ) {
      return {
        accepted: false,
        code: 'review_complete_accounting_invalid',
        errors: validation.errors,
        repairAttempts,
      };
    }

    repairAttempts++;
    candidate = await session.continuation.repairAccounting({
      attempt: repairAttempts,
      errors: structuredClone(validation.errors),
      immutableSubstanceDigest: immutableDigest,
    });
    if (immutableReviewSubstanceDigest(candidate) !== immutableDigest) {
      return {
        accepted: false,
        code: 'review_complete_accounting_invalid',
        errors: [
          {
            code: 'immutable-substance-mismatch',
            pointer: '/',
            message: 'accounting repair changed immutable review substance',
          },
        ],
        repairAttempts,
      };
    }
  }
}
