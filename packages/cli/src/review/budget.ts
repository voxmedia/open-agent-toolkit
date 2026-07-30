import type {
  ChangeMapV1,
  ContextBudgetTelemetry,
  ReviewBudgetV1,
  ReviewTimeAllocationV1,
} from './types';

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

export function buildContextBudget(
  telemetry: ContextBudgetTelemetry | null,
): ReviewBudgetV1['context'] {
  if (telemetry === null) return null;
  if (
    !Number.isSafeInteger(telemetry.contextWindowTokens) ||
    telemetry.contextWindowTokens <= 0 ||
    !Number.isSafeInteger(telemetry.consumedTokens) ||
    telemetry.consumedTokens < 0 ||
    telemetry.consumedTokens > telemetry.contextWindowTokens ||
    !Number.isSafeInteger(telemetry.remainingTokens) ||
    telemetry.remainingTokens !==
      telemetry.contextWindowTokens - telemetry.consumedTokens ||
    telemetry.adapterId.length === 0 ||
    telemetry.source.length === 0 ||
    !Number.isFinite(Date.parse(telemetry.observedAt))
  ) {
    return null;
  }
  const outputReserveTokens = Math.ceil(telemetry.remainingTokens * 0.1);
  const reconciliationReserveTokens = Math.ceil(
    telemetry.remainingTokens * 0.1,
  );
  return {
    totalTokens: telemetry.contextWindowTokens,
    consumedAtPlanTokens: telemetry.consumedTokens,
    outputReserveTokens,
    reconciliationReserveTokens,
    evidenceBudgetTokens:
      telemetry.remainingTokens -
      outputReserveTokens -
      reconciliationReserveTokens,
    source: telemetry.source,
  };
}

export function evaluateWholeDiffEligibility(input: {
  changeMap: ChangeMapV1;
  contextBudget: ReviewBudgetV1['context'];
  coherentLaneCount: number;
  hasConsequentialSeam: boolean;
}): {
  allowed: boolean;
  estimatedTokens: number | null;
  evidenceBudgetTokens: number | null;
  reason: string;
} {
  const estimatedTokens = input.changeMap.totals.estimatedPatchTokens;
  const evidenceBudgetTokens =
    input.contextBudget?.evidenceBudgetTokens ?? null;
  let reason = 'whole diff is eligible';
  if (input.contextBudget === null) {
    reason = 'missing post-artifact context telemetry';
  } else if (
    input.changeMap.totals.patchEstimateState !== 'exact' ||
    estimatedTokens === null
  ) {
    reason = 'patch size is not exact';
  } else if (estimatedTokens > input.contextBudget.evidenceBudgetTokens) {
    reason = 'patch exceeds the sealed evidence budget';
  } else if (input.coherentLaneCount !== 1) {
    reason = 'review does not have one coherent lane';
  } else if (input.hasConsequentialSeam) {
    reason = 'review has a consequential cross-lane seam';
  }
  return {
    allowed: reason === 'whole diff is eligible',
    estimatedTokens,
    evidenceBudgetTokens,
    reason,
  };
}
