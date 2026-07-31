import { describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import {
  projectValidatedAssignments,
  validatePlanObligationAccounting,
  validatePlanPathAccounting,
  validateReviewPlan,
} from './plan-validator';
import type { PreparedReviewContextV1, ReviewPlanV1 } from './types';

function context(): PreparedReviewContextV1 {
  return {
    changeMap: {
      files: [
        {
          path: 'a.ts',
          status: 'modified',
          isBinary: false,
          additions: 1,
          deletions: 1,
          generatedHint: false,
          bookkeepingHint: false,
        },
        {
          path: 'b.ts',
          status: 'added',
          isBinary: false,
          additions: 1,
          deletions: 0,
          generatedHint: false,
          bookkeepingHint: false,
        },
      ],
      totals: {
        files: 2,
        additions: 2,
        deletions: 1,
        binaryFiles: 0,
        numstatChangedLines: 3,
        numstatTokenDenialEstimate: 1,
        patchBytes: 30,
        patchByteLowerBound: null,
        patchEstimateState: 'exact',
        patchCountingSkippedReason: null,
        estimatedPatchTokens: 10,
      },
    },
    obligations: [{ id: 'FR1' }, { id: 'FR2' }],
    runId: 'run',
    contextDigest: 'context',
    budget: { time: null, context: null },
  } as PreparedReviewContextV1;
}

function plan(): ReviewPlanV1 {
  return {
    schemaVersion: 1,
    runId: 'run',
    contextDigest: 'context',
    strategy: 'selective-inline',
    lanes: [
      {
        id: 'lane-1',
        paths: ['a.ts', 'b.ts'],
        primaryObligationIds: ['FR1', 'FR2'],
        seamObligationIds: [],
        risk: 'high',
        evidenceClass: 'semantic',
        strategy: 'path-diff',
        checks: ['inspect'],
        delegated: false,
        independenceRationale: null,
        substantial: false,
        substantialityRationale: null,
        deadlineMs: null,
        dossier: { contractVersion: 1, partialAllowed: true },
        replay: 'direct-verify',
        primaryContingency: {
          allowed: false,
          paths: [],
          obligationIds: [],
        },
      },
    ],
    classifications: [],
    crossLaneInvariants: [],
    delegationEconomics: {
      independentLaneIds: [],
      nonReplayedLaneIds: [],
      expectedSavings: [],
      coordinationCosts: [],
      decisionRationale: 'inline',
      decision: 'inline',
    },
    verificationBoundary: {
      requiredClaims: [],
      positiveCoverage: {
        mode: 'sample',
        laneIds: ['lane-1'],
        rationale: 'sample',
      },
      deterministicAcceptance: {
        mode: 'provenance',
        requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
      },
    },
    wholeDiff: {
      allowed: false,
      estimatedTokens: null,
      evidenceBudgetTokens: null,
      reason: 'selective',
    },
    timeAllocation: null,
  };
}

describe('exact review assignment accounting', () => {
  it('accepts exact path and obligation ownership', () => {
    expect(validatePlanPathAccounting(context(), plan())).toEqual([]);
    expect(validatePlanObligationAccounting(context(), plan())).toEqual([]);
  });

  it('returns precise missing, duplicate, and fabricated path pointers', () => {
    const candidate = plan();
    candidate.lanes[0]!.paths = ['a.ts', 'a.ts', 'fake.ts'];
    expect(validatePlanPathAccounting(context(), candidate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate-path-owner',
          pointer: '/lanes/0/paths/1',
        }),
        expect.objectContaining({
          code: 'fabricated-path',
          pointer: '/lanes/0/paths/2',
        }),
        expect.objectContaining({ code: 'missing-path-owner' }),
      ]),
    );
  });

  it('returns precise obligation and seam errors', () => {
    const candidate = plan();
    candidate.lanes[0]!.primaryObligationIds = ['FR1', 'FR1', 'FAKE'];
    candidate.lanes[0]!.seamObligationIds = ['FR1', 'UNKNOWN'];
    expect(validatePlanObligationAccounting(context(), candidate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate-obligation-owner',
          pointer: '/lanes/0/primaryObligationIds/1',
        }),
        expect.objectContaining({ code: 'missing-obligation-owner' }),
        expect.objectContaining({
          code: 'fabricated-obligation',
          pointer: '/lanes/0/primaryObligationIds/2',
        }),
        expect.objectContaining({
          code: 'contradictory-seam-owner',
          pointer: '/lanes/0/seamObligationIds/0',
        }),
        expect.objectContaining({
          code: 'invalid-seam-obligation',
          pointer: '/lanes/0/seamObligationIds/1',
        }),
      ]),
    );
  });
});

describe('review plan policy and projection', () => {
  function policyPlan(): ReviewPlanV1 {
    const candidate = plan();
    candidate.wholeDiff = {
      allowed: false,
      estimatedTokens: 10,
      evidenceBudgetTokens: null,
      reason: 'missing post-artifact context telemetry',
    };
    return candidate;
  }

  it('accepts matching sealed policy', () => {
    expect(validateReviewPlan(context(), policyPlan())).toEqual([]);
  });

  it('rejects generated skips, unauthorized exclusions, and policy drift', () => {
    const candidate = policyPlan();
    candidate.lanes[0]!.paths = [];
    candidate.classifications = [
      {
        id: 'generated',
        kind: 'generated',
        reason: 'generated',
        paths: ['a.ts'],
        disposition: 'justified-exclusion',
        strategy: 'none',
        checks: [],
        exclusionAuthority: null,
      },
      {
        id: 'excluded',
        kind: 'excluded',
        reason: 'excluded',
        paths: ['b.ts'],
        disposition: 'justified-exclusion',
        strategy: 'none',
        checks: [],
        exclusionAuthority: null,
      },
    ];
    candidate.wholeDiff.reason = 'reviewer says yes';
    candidate.timeAllocation = {
      planningDeadlineMs: 1,
      evidenceDeadlineMs: 2,
      reconciliationDeadlineMs: 3,
      outputDeadlineMs: 4,
      outputReserveMs: 1,
      reconciliationReserveMs: 1,
    };
    expect(validateReviewPlan(context(), candidate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'classification-cannot-skip-inspection',
        }),
        expect.objectContaining({ code: 'invalid-exclusion-authority' }),
        expect.objectContaining({ code: 'whole-diff-policy-drift' }),
        expect.objectContaining({ code: 'time-allocation-policy-drift' }),
      ]),
    );
  });

  it.each([
    {
      name: 'missing telemetry',
      mutate: () => undefined,
    },
    {
      name: 'inexact patch size',
      mutate: (sealed: PreparedReviewContextV1) => {
        sealed.budget.context = {
          totalTokens: 100,
          consumedAtPlanTokens: 0,
          outputReserveTokens: 10,
          reconciliationReserveTokens: 10,
          evidenceBudgetTokens: 80,
          source: 'test',
        };
        sealed.changeMap.totals.patchEstimateState = 'lower-bound';
        sealed.changeMap.totals.estimatedPatchTokens = null;
      },
    },
    {
      name: 'oversized patch',
      mutate: (sealed: PreparedReviewContextV1) => {
        sealed.budget.context = {
          totalTokens: 20,
          consumedAtPlanTokens: 0,
          outputReserveTokens: 5,
          reconciliationReserveTokens: 5,
          evidenceBudgetTokens: 5,
          source: 'test',
        };
      },
    },
    {
      name: 'multiple lanes',
      mutate: (_sealed: PreparedReviewContextV1, candidate: ReviewPlanV1) => {
        candidate.lanes.push({
          ...structuredClone(candidate.lanes[0]!),
          id: 'lane-2',
          paths: [],
          primaryObligationIds: [],
        });
      },
    },
  ])('denies whole-diff execution for $name', ({ mutate }) => {
    const sealed = context();
    const candidate = policyPlan();
    mutate(sealed, candidate);
    candidate.strategy = 'whole-diff-inline';
    candidate.wholeDiff = evaluateWholeDiffEligibility({
      changeMap: sealed.changeMap,
      contextBudget: sealed.budget.context,
      coherentLaneCount: candidate.lanes.length,
      hasConsequentialSeam:
        candidate.lanes.length > 1 &&
        candidate.lanes.some((lane) => lane.risk === 'consequential'),
    });

    expect(validateReviewPlan(sealed, candidate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'whole-diff-execution-denied' }),
      ]),
    );
  });

  it('requires whole-diff lanes to use inline path-diff evidence', () => {
    const sealed = context();
    sealed.budget.context = {
      totalTokens: 100,
      consumedAtPlanTokens: 0,
      outputReserveTokens: 10,
      reconciliationReserveTokens: 10,
      evidenceBudgetTokens: 80,
      source: 'test',
    };
    const candidate = policyPlan();
    candidate.strategy = 'whole-diff-inline';
    candidate.lanes[0]!.strategy = 'full-file';
    candidate.wholeDiff = evaluateWholeDiffEligibility({
      changeMap: sealed.changeMap,
      contextBudget: sealed.budget.context,
      coherentLaneCount: 1,
      hasConsequentialSeam: false,
    });

    expect(validateReviewPlan(sealed, candidate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'inconsistent-whole-diff-lane' }),
      ]),
    );
  });

  it.each([
    { label: 'before planning', deadlineMs: 4_999, valid: false },
    { label: 'at planning', deadlineMs: 5_000, valid: false },
    { label: 'inside evidence', deadlineMs: 5_001, valid: true },
    { label: 'at evidence cutoff', deadlineMs: 20_000, valid: true },
    { label: 'after evidence cutoff', deadlineMs: 20_001, valid: false },
    { label: 'at output cutoff', deadlineMs: 120_000, valid: false },
  ])('validates delegated lane deadlines $label', ({ deadlineMs, valid }) => {
    const sealed = context();
    sealed.budget.time = {
      totalMs: 120_000,
      source: 'gate',
      deadlineMs: 120_000,
    };
    const candidate = policyPlan();
    candidate.lanes[0]!.delegated = true;
    candidate.lanes[0]!.deadlineMs = deadlineMs;
    candidate.timeAllocation = allocateReviewTimeBudget({
      totalMs: 120_000,
      source: 'gate',
      startedAtMs: 0,
    }).allocation;

    const cutoffErrors = validateReviewPlan(sealed, candidate).filter(
      (error) => error.code === 'lane-evidence-deadline-out-of-bounds',
    );
    expect(cutoffErrors).toHaveLength(valid ? 0 : 1);
  });

  it('requires mode-appropriate null deadline shapes', () => {
    const inline = policyPlan();
    inline.lanes[0]!.deadlineMs = 10;
    expect(validateReviewPlan(context(), inline)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'inline-lane-deadline' }),
      ]),
    );

    const unbudgetedDelegated = policyPlan();
    unbudgetedDelegated.lanes[0]!.delegated = true;
    unbudgetedDelegated.lanes[0]!.deadlineMs = 10;
    expect(validateReviewPlan(context(), unbudgetedDelegated)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unbudgeted-lane-deadline' }),
      ]),
    );
  });

  it('sorts assignment projections deterministically', () => {
    const candidate = policyPlan();
    candidate.lanes[0]!.paths = ['b.ts', 'a.ts'];
    candidate.lanes[0]!.primaryObligationIds = ['FR2', 'FR1'];
    expect(projectValidatedAssignments(candidate).lanes[0]).toMatchObject({
      paths: ['a.ts', 'b.ts'],
      primaryObligationIds: ['FR1', 'FR2'],
    });
  });
});
