import { describe, expect, it } from 'vitest';

import {
  validatePlanObligationAccounting,
  validatePlanPathAccounting,
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
    },
    obligations: [{ id: 'FR1' }, { id: 'FR2' }],
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
