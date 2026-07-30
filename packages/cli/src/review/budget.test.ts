import { describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  MIN_ENFORCED_REVIEW_BUDGET_MS,
  MIN_EVIDENCE_MS,
  MIN_OUTPUT_RESERVE_MS,
  MIN_PLANNING_MS,
  MIN_RECONCILIATION_MS,
} from './budget';

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
