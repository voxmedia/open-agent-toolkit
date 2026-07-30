import { describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  buildContextBudget,
  evaluateWholeDiffEligibility,
  MIN_ENFORCED_REVIEW_BUDGET_MS,
  MIN_EVIDENCE_MS,
  MIN_OUTPUT_RESERVE_MS,
  MIN_PLANNING_MS,
  MIN_RECONCILIATION_MS,
} from './budget';
import type { ChangeMapV1, ContextBudgetTelemetry } from './types';

describe('outer review time allocation', () => {
  it('represents a missing budget explicitly', () => {
    expect(
      allocateReviewTimeBudget({
        totalMs: null,
        source: null,
        startedAtMs: 1_000,
      }),
    ).toEqual({ time: null, allocation: null });
  });

  it('rejects 119,999 ms without changing the general gate minimum', () => {
    expect(MIN_ENFORCED_REVIEW_BUDGET_MS).toBe(120_000);
    expect(() =>
      allocateReviewTimeBudget({
        totalMs: 119_999,
        source: 'gate',
        startedAtMs: 0,
      }),
    ).toThrow('review-budget-below-minimum');
  });

  it('preserves every named floor at 120 seconds', () => {
    expect(MIN_PLANNING_MS).toBe(5_000);
    expect(MIN_EVIDENCE_MS).toBe(15_000);
    expect(MIN_RECONCILIATION_MS).toBe(10_000);
    expect(MIN_OUTPUT_RESERVE_MS).toBe(90_000);
    const result = allocateReviewTimeBudget({
      totalMs: 120_000,
      source: 'gate',
      startedAtMs: 1_000,
    });
    expect(result.time).toEqual({
      totalMs: 120_000,
      source: 'gate',
      deadlineMs: 121_000,
    });
    expect(result.allocation).toEqual({
      planningDeadlineMs: 6_000,
      evidenceDeadlineMs: 21_000,
      reconciliationDeadlineMs: 31_000,
      outputDeadlineMs: 121_000,
      outputReserveMs: 90_000,
      reconciliationReserveMs: 10_000,
    });
  });

  it('caps planning at five minutes and reserves at least 25 percent', () => {
    const result = allocateReviewTimeBudget({
      totalMs: 2_000_000,
      source: 'manual',
      startedAtMs: 0,
    });
    expect(result.allocation?.planningDeadlineMs).toBe(300_000);
    expect(
      (result.allocation?.outputReserveMs ?? 0) +
        (result.allocation?.reconciliationReserveMs ?? 0),
    ).toBeGreaterThanOrEqual(500_000);
  });
});

describe('sealed evidence budgets', () => {
  const telemetry: ContextBudgetTelemetry = {
    observedAt: '2026-01-01T00:00:00.000Z',
    contextWindowTokens: 100_000,
    consumedTokens: 50_000,
    remainingTokens: 50_000,
    adapterId: 'host',
    source: 'host-observed',
  };
  const changeMap = (
    state: 'exact' | 'coarse-denied' | 'lower-bound',
    tokens: number | null,
  ): ChangeMapV1 => ({
    files: [],
    totals: {
      files: 0,
      additions: 0,
      deletions: 0,
      binaryFiles: 0,
      numstatChangedLines: 0,
      numstatTokenDenialEstimate: 0,
      patchBytes: state === 'exact' ? 30 : null,
      patchByteLowerBound: state === 'lower-bound' ? 30 : null,
      patchEstimateState: state,
      patchCountingSkippedReason:
        state === 'coarse-denied' ? 'missing-context-telemetry' : null,
      estimatedPatchTokens: tokens,
    },
  });

  it('returns null for missing or invalid telemetry', () => {
    expect(buildContextBudget(null)).toBeNull();
    expect(
      buildContextBudget({ ...telemetry, remainingTokens: 49_999 }),
    ).toBeNull();
  });

  it('derives evidence after reconciliation and output reserves', () => {
    expect(buildContextBudget(telemetry)).toEqual({
      totalTokens: 100_000,
      consumedAtPlanTokens: 50_000,
      outputReserveTokens: 5_000,
      reconciliationReserveTokens: 5_000,
      evidenceBudgetTokens: 40_000,
      source: 'host-observed',
    });
  });

  it('requires exact size, budget, one lane, and no consequential seam', () => {
    const contextBudget = buildContextBudget(telemetry);
    expect(
      evaluateWholeDiffEligibility({
        changeMap: changeMap('exact', 10),
        contextBudget,
        coherentLaneCount: 1,
        hasConsequentialSeam: false,
      }).allowed,
    ).toBe(true);
    expect(
      evaluateWholeDiffEligibility({
        changeMap: changeMap('lower-bound', null),
        contextBudget,
        coherentLaneCount: 1,
        hasConsequentialSeam: false,
      }).allowed,
    ).toBe(false);
    expect(
      evaluateWholeDiffEligibility({
        changeMap: changeMap('exact', 10),
        contextBudget: null,
        coherentLaneCount: 1,
        hasConsequentialSeam: false,
      }).allowed,
    ).toBe(false);
    expect(
      evaluateWholeDiffEligibility({
        changeMap: changeMap('exact', 50_000),
        contextBudget,
        coherentLaneCount: 1,
        hasConsequentialSeam: false,
      }).allowed,
    ).toBe(false);
    expect(
      evaluateWholeDiffEligibility({
        changeMap: changeMap('exact', 10),
        contextBudget,
        coherentLaneCount: 2,
        hasConsequentialSeam: true,
      }).allowed,
    ).toBe(false);
  });
});
