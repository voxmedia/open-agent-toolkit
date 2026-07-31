import { describe, expect, it } from 'vitest';

import { hashCanonicalJson } from './canonical-json';
import type { ReviewLaneV1, ReviewPlanV1, WorkerDossierV1 } from './types';
import {
  parseWorkerDossierV1,
  validateWorkerDossier,
  WorkerDossierParseError,
} from './worker-dossier';

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

function completeDossier(): WorkerDossierV1 {
  const dossier: WorkerDossierV1 = {
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
        commandResultDigest: '',
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
  dossier.evidence[0]!.commandResultDigest = hashCanonicalJson(
    dossier.commands[0]!.result,
  );
  return dossier;
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

  it('strictly parses schema, exact keys, timestamps, and result branches', () => {
    expect(parseWorkerDossierV1(completeDossier())).toEqual(completeDossier());

    const wrongVersion = completeDossier() as unknown as Record<
      string,
      unknown
    >;
    wrongVersion['schemaVersion'] = 2;
    expect(() => parseWorkerDossierV1(wrongVersion)).toThrow(
      WorkerDossierParseError,
    );

    const unknownRoot = structuredClone(completeDossier()) as unknown as Record<
      string,
      unknown
    >;
    unknownRoot['extra'] = true;
    expect(() => parseWorkerDossierV1(unknownRoot)).toThrow(/unknown field/);

    const duplicateJson = JSON.stringify(completeDossier()).replace(
      '"schemaVersion":1',
      '"schemaVersion":1,"schemaVersion":1',
    );
    expect(() => parseWorkerDossierV1(duplicateJson)).toThrow(/duplicate/);

    const invalidTimestamp = structuredClone(completeDossier());
    invalidTimestamp.commands[0]!.provenance.capturedAt = 'not-a-timestamp';
    expect(() => parseWorkerDossierV1(invalidTimestamp)).toThrow(/capturedAt/);

    const invalidResult = structuredClone(
      completeDossier(),
    ) as unknown as Record<string, unknown>;
    const commands = invalidResult['commands'] as Array<
      Record<string, unknown>
    >;
    commands[0]!['result'] = {
      status: 'completed',
      signal: 'SIGTERM',
      outputDigest: 'output',
    };
    expect(() => parseWorkerDossierV1(invalidResult)).toThrow(/result/);
  });

  it('rejects empty scopes and command-result digest mismatch', () => {
    const dossier = completeDossier();
    dossier.commands[0]!.scopeRefs = [];
    dossier.evidence[0]!.scopeRefs = [];
    dossier.evidence[0]!.commandResultDigest = 'wrong';

    expect(validateWorkerDossier(plan(), 'plan-digest', dossier)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'empty-dossier-scope' }),
        expect.objectContaining({ code: 'command-result-digest-mismatch' }),
      ]),
    );

    const outOfLane = completeDossier();
    outOfLane.commands[0]!.scopeRefs[0]!.bucketId = 'sibling-lane';
    outOfLane.evidence[0]!.scopeRefs[0]!.pathIndexes = [99];
    expect(validateWorkerDossier(plan(), 'plan-digest', outOfLane)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'dossier-scope-out-of-lane' }),
        expect.objectContaining({
          code: 'dossier-scope-path-index-out-of-bounds',
        }),
      ]),
    );
  });

  it('requires explicit uncertainty and coherent uncovered coverage for partial dossiers', () => {
    const noUncertainty = completeDossier();
    noUncertainty.outcome = 'partial';
    noUncertainty.inspectedPaths = ['a.ts'];
    noUncertainty.inspectedObligationIds = ['FR1', 'FR3'];
    noUncertainty.uncoveredObligationIds = ['FR2'];

    expect(validateWorkerDossier(plan(), 'plan-digest', noUncertainty)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'partial-dossier-without-uncertainty',
        }),
      ]),
    );

    const overlappingCoverage = completeDossier();
    overlappingCoverage.outcome = 'partial';
    overlappingCoverage.inspectedPaths = ['a.ts'];
    overlappingCoverage.uncoveredObligationIds = ['FR2'];
    overlappingCoverage.uncertainty = ['Worker deadline expired.'];
    expect(
      validateWorkerDossier(plan(), 'plan-digest', overlappingCoverage),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-partial-obligation-partition',
        }),
      ]),
    );
  });
});
