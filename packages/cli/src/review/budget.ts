import type { ReviewBudgetV1, ReviewTimeAllocationV1 } from './types';

export const MIN_ENFORCED_REVIEW_BUDGET_MS = 120_000;
export const MIN_PLANNING_MS = 5_000;
export const MIN_EVIDENCE_MS = 15_000;
export const MIN_RECONCILIATION_MS = 10_000;
export const MIN_OUTPUT_RESERVE_MS = 90_000;

export interface AllocatedReviewTimeBudget {
  time: ReviewBudgetV1['time'];
  allocation: ReviewTimeAllocationV1 | null;
}

export function allocateReviewTimeBudget(input: {
  totalMs: number | null;
  source: string | null;
  startedAtMs: number;
}): AllocatedReviewTimeBudget {
  if (input.totalMs === null) {
    if (input.source !== null) {
      throw new Error('budget source requires a total budget');
    }
    return { time: null, allocation: null };
  }
  if (
    !Number.isSafeInteger(input.totalMs) ||
    input.totalMs < MIN_ENFORCED_REVIEW_BUDGET_MS
  ) {
    throw new Error('review-budget-below-minimum');
  }
  if (!input.source) throw new Error('time budget requires a source');
  if (!Number.isSafeInteger(input.startedAtMs) || input.startedAtMs < 0) {
    throw new Error('review start must be a non-negative safe integer');
  }

  const outputReserveMs = MIN_OUTPUT_RESERVE_MS;
  const reconciliationReserveMs = Math.max(
    MIN_RECONCILIATION_MS,
    Math.ceil(input.totalMs * 0.25) - outputReserveMs,
  );
  const planningMs = Math.min(
    300_000,
    Math.max(MIN_PLANNING_MS, Math.floor(input.totalMs * 0.2)),
    input.totalMs - outputReserveMs - reconciliationReserveMs - MIN_EVIDENCE_MS,
  );
  const evidenceMs =
    input.totalMs - planningMs - reconciliationReserveMs - outputReserveMs;
  const planningDeadlineMs = input.startedAtMs + planningMs;
  const evidenceDeadlineMs = planningDeadlineMs + evidenceMs;
  const reconciliationDeadlineMs = evidenceDeadlineMs + reconciliationReserveMs;
  const outputDeadlineMs = input.startedAtMs + input.totalMs;
  return {
    time: {
      totalMs: input.totalMs,
      source: input.source,
      deadlineMs: outputDeadlineMs,
    },
    allocation: {
      planningDeadlineMs,
      evidenceDeadlineMs,
      reconciliationDeadlineMs,
      outputDeadlineMs,
      outputReserveMs,
      reconciliationReserveMs,
    },
  };
}
