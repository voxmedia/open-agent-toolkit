import { describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import {
  projectValidatedAssignments,
  validatePlanObligationAccounting,
  validatePlanPathAccounting,
  validatePrimaryContingency,
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
      requiredClaims: [
        { kind: 'promoted-finding', mode: 'direct' },
        { kind: 'consequential-absence', mode: 'direct' },
        { kind: 'worker-conflict', mode: 'direct' },
        { kind: 'cross-lane-gap', mode: 'direct' },
      ],
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

  function delegatedPlan(): {
    sealed: PreparedReviewContextV1;
    candidate: ReviewPlanV1;
  } {
    const sealed = context();
    sealed.budget.time = {
      totalMs: 120_000,
      source: 'gate',
      deadlineMs: 120_000,
    };
    const candidate = policyPlan();
    candidate.strategy = 'delegated';
    candidate.timeAllocation = allocateReviewTimeBudget({
      totalMs: 120_000,
      source: 'gate',
      startedAtMs: 0,
    }).allocation;
    candidate.lanes = [
      {
        ...structuredClone(candidate.lanes[0]!),
        id: 'semantic',
        paths: ['a.ts'],
        primaryObligationIds: ['FR1'],
        delegated: true,
        independenceRationale: 'Independent semantic inspection.',
        substantial: true,
        substantialityRationale: 'Owns a substantial implementation surface.',
        deadlineMs: candidate.timeAllocation.planningDeadlineMs + 1,
        replay: 'sample',
        primaryContingency: {
          allowed: true,
          paths: ['a.ts'],
          obligationIds: ['FR1'],
        },
      },
      {
        ...structuredClone(candidate.lanes[0]!),
        id: 'deterministic',
        paths: ['b.ts'],
        primaryObligationIds: ['FR2'],
        evidenceClass: 'deterministic',
        strategy: 'command',
        delegated: true,
        independenceRationale: 'Independent deterministic verification.',
        substantial: true,
        substantialityRationale: 'Owns the complete verification matrix.',
        deadlineMs: candidate.timeAllocation.planningDeadlineMs + 1,
        replay: 'accept-provenance',
        primaryContingency: {
          allowed: false,
          paths: [],
          obligationIds: [],
        },
      },
    ];
    candidate.delegationEconomics = {
      independentLaneIds: ['semantic', 'deterministic'],
      nonReplayedLaneIds: ['deterministic'],
      expectedSavings: ['Verification runs concurrently with inspection.'],
      coordinationCosts: ['Primary reconciles two bounded dossiers.'],
      decisionRationale: 'Savings exceed bounded reconciliation cost.',
      decision: 'delegate',
    };
    candidate.verificationBoundary.positiveCoverage.laneIds = [
      'semantic',
      'deterministic',
    ];
    return { sealed, candidate };
  }

  it('accepts delegation with two independent substantial lanes and provenance evidence', () => {
    const { sealed, candidate } = delegatedPlan();

    expect(validateReviewPlan(sealed, candidate)).toEqual([]);
  });

  it('rejects duplicate and cross-registry lane or classification IDs', () => {
    const duplicateLane = policyPlan();
    duplicateLane.lanes.push({
      ...structuredClone(duplicateLane.lanes[0]!),
      paths: [],
      primaryObligationIds: [],
    });
    expect(validateReviewPlan(context(), duplicateLane)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-lane-id' }),
      ]),
    );

    const duplicateClassification = policyPlan();
    duplicateClassification.classifications = [
      {
        id: 'generated',
        kind: 'generated',
        reason: 'generated',
        paths: [],
        disposition: 'inspect',
        strategy: 'inventory',
        checks: ['inspect'],
        exclusionAuthority: null,
      },
      {
        id: 'generated',
        kind: 'bookkeeping',
        reason: 'bookkeeping',
        paths: [],
        disposition: 'inspect',
        strategy: 'manifest-check',
        checks: ['inspect'],
        exclusionAuthority: null,
      },
    ];
    expect(validateReviewPlan(context(), duplicateClassification)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-classification-id' }),
      ]),
    );

    const crossRegistry = policyPlan();
    crossRegistry.classifications = [
      {
        id: 'lane-1',
        kind: 'generated',
        reason: 'generated',
        paths: [],
        disposition: 'inspect',
        strategy: 'inventory',
        checks: ['inspect'],
        exclusionAuthority: null,
      },
    ];
    expect(validateReviewPlan(context(), crossRegistry)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-plan-bucket-id' }),
      ]),
    );
  });

  it.each([
    {
      name: 'empty direct claims',
      mutate: (candidate: ReviewPlanV1) => {
        candidate.verificationBoundary.requiredClaims = [];
      },
      code: 'incomplete-direct-claim-kinds',
    },
    {
      name: 'duplicate direct claim kind',
      mutate: (candidate: ReviewPlanV1) => {
        candidate.verificationBoundary.requiredClaims.push({
          kind: 'promoted-finding',
          mode: 'direct',
        });
      },
      code: 'duplicate-direct-claim-kind',
    },
    {
      name: 'fabricated positive lane',
      mutate: (candidate: ReviewPlanV1) => {
        candidate.verificationBoundary.positiveCoverage.laneIds = [
          'fabricated',
        ];
      },
      code: 'invalid-positive-coverage-lane',
    },
    {
      name: 'empty positive lanes',
      mutate: (candidate: ReviewPlanV1) => {
        candidate.verificationBoundary.positiveCoverage.laneIds = [];
      },
      code: 'empty-positive-coverage',
    },
    {
      name: 'blank positive rationale',
      mutate: (candidate: ReviewPlanV1) => {
        candidate.verificationBoundary.positiveCoverage.rationale = ' ';
      },
      code: 'empty-positive-coverage',
    },
  ])('rejects $name in the verification boundary', ({ mutate, code }) => {
    const candidate = policyPlan();
    mutate(candidate);

    expect(validateReviewPlan(context(), candidate)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
  });

  it('rejects non-provenance strategies and unregistered accepted lanes', () => {
    const { sealed, candidate } = delegatedPlan();
    candidate.lanes[1]!.strategy = 'full-file';
    expect(validateReviewPlan(sealed, candidate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'non-provenance-evidence-strategy',
        }),
      ]),
    );

    const unregistered = delegatedPlan();
    unregistered.candidate.delegationEconomics.nonReplayedLaneIds = [];
    expect(
      validateReviewPlan(unregistered.sealed, unregistered.candidate),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unregistered-provenance-lane' }),
      ]),
    );

    const inlineAccepted = policyPlan();
    inlineAccepted.lanes[0]!.replay = 'accept-provenance';
    expect(validateReviewPlan(context(), inlineAccepted)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'inline-provenance-acceptance' }),
      ]),
    );
  });

  it('rejects inline and empty enabled primary contingencies', () => {
    const inline = policyPlan();
    inline.lanes[0]!.primaryContingency = {
      allowed: true,
      paths: ['a.ts'],
      obligationIds: [],
    };
    expect(validatePrimaryContingency(inline)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-primary-contingency' }),
      ]),
    );

    const { candidate } = delegatedPlan();
    candidate.lanes[0]!.primaryContingency = {
      allowed: true,
      paths: [],
      obligationIds: [],
    };
    expect(validatePrimaryContingency(candidate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-primary-contingency' }),
      ]),
    );
  });

  it.each([
    {
      name: 'fewer than two independent substantial lanes',
      mutate: (candidate: ReviewPlanV1) => {
        candidate.delegationEconomics.independentLaneIds = ['semantic'];
      },
      code: 'insufficient-independent-substantial-lanes',
    },
    {
      name: 'missing economics',
      mutate: (candidate: ReviewPlanV1) => {
        candidate.delegationEconomics.expectedSavings = [];
        candidate.delegationEconomics.coordinationCosts = [];
        candidate.delegationEconomics.decisionRationale = '';
      },
      code: 'missing-delegation-economics',
    },
    {
      name: 'semantic-only delegation',
      mutate: (candidate: ReviewPlanV1) => {
        const deterministic = candidate.lanes[1]!;
        deterministic.evidenceClass = 'semantic';
        deterministic.replay = 'sample';
      },
      code: 'delegation-requires-provenance-lane',
    },
  ])('rejects $name', ({ mutate, code }) => {
    const { sealed, candidate } = delegatedPlan();
    mutate(candidate);

    expect(validateReviewPlan(sealed, candidate)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
  });

  it('rejects primary contingency outside the lane assignment', () => {
    const { candidate } = delegatedPlan();
    candidate.lanes[0]!.primaryContingency.paths = ['b.ts'];
    candidate.lanes[0]!.primaryContingency.obligationIds = ['FR2'];

    expect(validatePrimaryContingency(candidate)).toEqual([
      expect.objectContaining({
        code: 'invalid-primary-contingency',
        pointer: '/lanes/0/primaryContingency',
      }),
    ]);
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
        expect.objectContaining({
          code: 'whole-diff-policy-drift',
          details: expect.objectContaining({
            expected: expect.any(Object),
            submitted: expect.any(Object),
          }),
        }),
        expect.objectContaining({
          code: 'time-allocation-policy-drift',
          details: expect.objectContaining({
            expected: null,
            submitted: expect.any(Object),
          }),
        }),
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
