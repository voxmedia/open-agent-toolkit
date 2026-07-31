import { describe, expect, it } from 'vitest';

import type { ReviewLaneV1, ReviewPlanV1, WorkerDossierV1 } from './types';
import { validateWorkerDossier } from './worker-dossier';

function lane(): ReviewLaneV1 {
  return {
    id: 'lane-1',
    paths: ['a.ts', 'b.ts'],
    primaryObligationIds: ['FR1', 'FR2'],
    seamObligationIds: ['FR3'],
    risk: 'high',
    evidenceClass: 'mixed',
    strategy: 'path-diff',
    checks: ['inspect', 'test'],
    delegated: true,
    independenceRationale: 'Independent bounded lane.',
    substantial: true,
    substantialityRationale: 'Owns two paths and their verification.',
    deadlineMs: 20_000,
    dossier: { contractVersion: 1, partialAllowed: true },
    replay: 'sample',
    primaryContingency: {
      allowed: true,
      paths: ['b.ts'],
      obligationIds: ['FR2'],
    },
  };
}

function plan(): ReviewPlanV1 {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    contextDigest: 'context',
    strategy: 'delegated',
    lanes: [lane()],
    classifications: [],
    crossLaneInvariants: [],
    delegationEconomics: {
      independentLaneIds: ['lane-1'],
      nonReplayedLaneIds: [],
      expectedSavings: ['bounded'],
      coordinationCosts: ['bounded'],
      decisionRationale: 'fixture',
      decision: 'delegate',
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

function completeDossier(): WorkerDossierV1 {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    planDigest: 'plan-digest',
    laneId: 'lane-1',
    outcome: 'complete',
    inspectedPaths: ['a.ts', 'b.ts'],
    inspectedObligationIds: ['FR1', 'FR2', 'FR3'],
    commands: [
      {
        id: 'command-1',
        command: 'pnpm test',
        cwd: '.',
        scopeRefs: [
          {
            bucket: 'lane',
            bucketId: 'lane-1',
            pathIndexes: [0, 1],
          },
        ],
        provenance: {
          runner: 'primary',
          invocationDigest: 'invocation',
          capturedAt: '2026-07-31T00:00:00.000Z',
        },
        result: {
          status: 'completed',
          exitCode: 0,
          outputDigest: 'output',
        },
      },
    ],
    evidence: [
      {
        id: 'evidence-1',
        kind: 'command',
        locator: 'command:command-1',
        scopeRefs: [
          {
            bucket: 'lane',
            bucketId: 'lane-1',
            pathIndexes: [0, 1],
          },
        ],
        provenance: 'captured',
        digest: 'evidence',
        commandId: 'command-1',
        commandResultDigest: 'result',
      },
    ],
    candidateFindings: [
      {
        id: 'candidate-1',
        summary: 'Candidate issue.',
        locations: ['a.ts:1'],
        evidenceRefIds: ['evidence-1'],
      },
    ],
    uncoveredObligationIds: [],
    uncertainty: [],
  };
}

describe('worker dossier validation', () => {
  it('accepts bounded complete and partial dossiers', () => {
    const candidatePlan = plan();
    const complete = completeDossier();
    const partial = completeDossier();
    partial.outcome = 'partial';
    partial.inspectedPaths = ['a.ts'];
    partial.inspectedObligationIds = ['FR1', 'FR3'];
    partial.uncoveredObligationIds = ['FR2'];
    partial.uncertainty = ['The second path exceeded the lane deadline.'];

    expect(
      validateWorkerDossier(candidatePlan, 'plan-digest', complete),
    ).toEqual([]);
    expect(
      validateWorkerDossier(candidatePlan, 'plan-digest', partial),
    ).toEqual([]);
  });

  it('rejects identity drift and out-of-scope coverage', () => {
    const dossier = completeDossier();
    dossier.runId = 'sibling-run';
    dossier.planDigest = 'sibling-plan';
    dossier.inspectedPaths.push('outside.ts');
    dossier.inspectedObligationIds.push('FR999');

    expect(validateWorkerDossier(plan(), 'plan-digest', dossier)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'dossier-run-mismatch' }),
        expect.objectContaining({ code: 'dossier-plan-mismatch' }),
        expect.objectContaining({ code: 'dossier-path-out-of-scope' }),
        expect.objectContaining({ code: 'dossier-obligation-out-of-scope' }),
      ]),
    );
  });

  it('rejects duplicate global IDs and unresolved references', () => {
    const dossier = completeDossier();
    dossier.commands.push(structuredClone(dossier.commands[0]!));
    dossier.evidence.push({
      ...structuredClone(dossier.evidence[0]!),
      commandId: 'missing-command',
    });
    dossier.candidateFindings.push({
      ...structuredClone(dossier.candidateFindings[0]!),
      evidenceRefIds: ['missing-evidence'],
    });

    expect(validateWorkerDossier(plan(), 'plan-digest', dossier)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-command-id' }),
        expect.objectContaining({ code: 'duplicate-evidence-id' }),
        expect.objectContaining({ code: 'duplicate-candidate-finding-id' }),
        expect.objectContaining({ code: 'unknown-command-reference' }),
        expect.objectContaining({ code: 'unknown-evidence-reference' }),
      ]),
    );
  });

  it('rejects incoherent complete and partial outcomes', () => {
    const incomplete = completeDossier();
    incomplete.inspectedPaths = ['a.ts'];
    incomplete.inspectedObligationIds = ['FR1'];
    incomplete.uncoveredObligationIds = ['FR2'];

    const falsePartial = completeDossier();
    falsePartial.outcome = 'partial';

    expect(validateWorkerDossier(plan(), 'plan-digest', incomplete)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'complete-dossier-incomplete' }),
      ]),
    );
    expect(validateWorkerDossier(plan(), 'plan-digest', falsePartial)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'partial-dossier-without-gap' }),
      ]),
    );
  });
});
