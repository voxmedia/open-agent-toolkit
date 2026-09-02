import { describe, expect, it } from 'vitest';

import { buildReviewAccountingSeed } from './accounting-seed';
import type {
  PlanValidationReceiptV1,
  ReviewPlanV1,
  ValidatedAssignmentProjectionV1,
} from './types';

const receipt = {
  token: 'receipt-token',
  validationRunId: 'validation-run',
  gateRunId: null,
  launchAttemptId: 'launch-attempt',
  acceptedHandleDigest: 'handle-digest',
  contractVersion: 1,
  contextDigest: 'context-digest',
  planDigest: 'plan-digest',
  assignmentDigest: 'assignment-digest',
  validatedAt: '2026-08-02T16:00:00.000Z',
  expiresAt: '2026-08-02T17:00:00.000Z',
} satisfies PlanValidationReceiptV1;

const verificationBoundary = {
  requiredClaims: [
    { kind: 'promoted-finding', mode: 'direct' },
    { kind: 'consequential-absence', mode: 'direct' },
    { kind: 'worker-conflict', mode: 'direct' },
    { kind: 'cross-lane-gap', mode: 'direct' },
  ],
  positiveCoverage: {
    mode: 'sample',
    laneIds: ['lane-a'],
    rationale: 'Sample the semantic lane.',
  },
  deterministicAcceptance: {
    mode: 'provenance',
    requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
  },
} satisfies ReviewPlanV1['verificationBoundary'];

const plan = {
  strategy: 'selective-inline',
  verificationBoundary,
} satisfies Pick<ReviewPlanV1, 'strategy' | 'verificationBoundary'>;

const assignment = {
  lanes: [
    {
      id: 'lane-a',
      paths: ['src/a.ts'],
      primaryObligationIds: ['FR1'],
      seamObligationIds: ['FR2'],
      primaryContingency: {
        allowed: false,
        paths: [],
        obligationIds: [],
      },
    },
  ],
  classifications: [
    {
      id: 'generated-a',
      kind: 'generated',
      reason: 'Generated output.',
      paths: ['dist/a.js'],
      disposition: 'inspect',
      strategy: 'manifest-check',
      checks: ['check manifest'],
      exclusionAuthority: null,
    },
  ],
} satisfies ValidatedAssignmentProjectionV1;

describe('review accounting seed', () => {
  it('projects exact launcher-owned identity, assignments, and verification requirements', () => {
    expect(buildReviewAccountingSeed(receipt, plan, assignment)).toEqual({
      schemaVersion: 1,
      receipt: 'receipt-token',
      contextDigest: 'context-digest',
      planDigest: 'plan-digest',
      assignmentDigest: 'assignment-digest',
      strategy: 'selective-inline',
      lanes: [
        {
          id: 'lane-a',
          paths: ['src/a.ts'],
          primaryObligationIds: ['FR1'],
          seamObligationIds: ['FR2'],
        },
      ],
      classifications: [
        {
          id: 'generated-a',
          kind: 'generated',
          reason: 'Generated output.',
          paths: ['dist/a.js'],
          planDisposition: 'inspect',
          strategy: 'manifest-check',
          plannedChecks: ['check manifest'],
          exclusionAuthority: null,
        },
      ],
      verificationBoundary,
    });
  });

  it('does not share mutable arrays with validated plan state', () => {
    const seed = buildReviewAccountingSeed(receipt, plan, assignment);
    seed.lanes[0]!.paths.push('src/mutated.ts');
    seed.classifications[0]!.plannedChecks.push('mutated');
    seed.verificationBoundary.requiredClaims.pop();

    expect(assignment.lanes[0]!.paths).toEqual(['src/a.ts']);
    expect(assignment.classifications[0]!.checks).toEqual(['check manifest']);
    expect(verificationBoundary.requiredClaims).toHaveLength(4);
  });
});
