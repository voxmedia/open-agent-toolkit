import { describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import { hashCanonicalJson } from './canonical-json';
import { commandResultDigest } from './command-result-digest';
import { validateReviewPlan } from './plan-validator';
import type {
  PreparedReviewContextV1,
  ReviewLaneV1,
  ReviewPlanV1,
  WorkerDossierV1,
} from './types';
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
  dossier.evidence[0]!.commandResultDigest = commandResultDigest(
    dossier.commands[0]!,
  );
  return dossier;
}

function acceptedPlan(strategy: 'command' | 'inventory'): {
  context: PreparedReviewContextV1;
  plan: ReviewPlanV1;
} {
  const context = {
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
          status: 'modified',
          isBinary: false,
          additions: 1,
          deletions: 1,
          generatedHint: false,
          bookkeepingHint: false,
        },
      ],
      totals: {
        files: 2,
        additions: 2,
        deletions: 2,
        binaryFiles: 0,
        numstatChangedLines: 4,
        numstatTokenDenialEstimate: 1,
        patchBytes: 40,
        patchByteLowerBound: null,
        patchEstimateState: 'exact',
        patchCountingSkippedReason: null,
        estimatedPatchTokens: 10,
      },
    },
    obligations: [{ id: 'FR1' }, { id: 'FR2' }],
    runId: 'run-1',
    contextDigest: 'context',
    budget: {
      time: {
        totalMs: 120_000,
        source: 'test',
        deadlineMs: 120_000,
      },
      context: null,
    },
  } as PreparedReviewContextV1;
  const timeAllocation = allocateReviewTimeBudget({
    totalMs: 120_000,
    source: 'test',
    startedAtMs: 0,
  }).allocation;
  const semanticLane: ReviewLaneV1 = {
    id: 'semantic',
    paths: ['a.ts'],
    primaryObligationIds: ['FR1'],
    seamObligationIds: [],
    risk: 'high',
    evidenceClass: 'semantic',
    strategy: 'path-diff',
    checks: ['inspect'],
    delegated: true,
    independenceRationale: 'Independent semantic inspection.',
    substantial: true,
    substantialityRationale: 'Owns one complete semantic boundary.',
    deadlineMs: timeAllocation.planningDeadlineMs + 1,
    dossier: { contractVersion: 1, partialAllowed: true },
    replay: 'sample',
    primaryContingency: {
      allowed: true,
      paths: ['a.ts'],
      obligationIds: ['FR1'],
    },
  };
  const acceptedLane: ReviewLaneV1 = {
    id: 'accepted',
    paths: ['b.ts'],
    primaryObligationIds: ['FR2'],
    seamObligationIds: [],
    risk: 'high',
    evidenceClass: 'deterministic',
    strategy,
    checks: ['verify'],
    delegated: true,
    independenceRationale: 'Independent deterministic verification.',
    substantial: true,
    substantialityRationale: 'Owns one complete deterministic boundary.',
    deadlineMs: timeAllocation.planningDeadlineMs + 1,
    dossier: { contractVersion: 1, partialAllowed: true },
    replay: 'accept-provenance',
    primaryContingency: {
      allowed: false,
      paths: [],
      obligationIds: [],
    },
  };
  const candidate: ReviewPlanV1 = {
    schemaVersion: 1,
    runId: 'run-1',
    contextDigest: 'context',
    strategy: 'delegated',
    lanes: [semanticLane, acceptedLane],
    classifications: [],
    crossLaneInvariants: [],
    delegationEconomics: {
      independentLaneIds: ['semantic', 'accepted'],
      nonReplayedLaneIds: ['accepted'],
      expectedSavings: ['Deterministic provenance avoids semantic replay.'],
      coordinationCosts: ['Two bounded dossiers require reconciliation.'],
      decisionRationale: 'Expected savings exceed coordination cost.',
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
        laneIds: ['semantic', 'accepted'],
        rationale: 'Sample both independent lanes.',
      },
      deterministicAcceptance: {
        mode: 'provenance',
        requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
      },
    },
    wholeDiff: evaluateWholeDiffEligibility({
      changeMap: context.changeMap,
      contextBudget: context.budget.context,
      coherentLaneCount: 2,
      hasConsequentialSeam: false,
    }),
    timeAllocation,
  };
  return { context, plan: candidate };
}

function acceptedDossier(
  strategy: 'command' | 'inventory',
  withEvidence: boolean,
): WorkerDossierV1 {
  const dossier: WorkerDossierV1 = {
    schemaVersion: 1,
    runId: 'run-1',
    planDigest: 'plan-digest',
    laneId: 'accepted',
    outcome: 'complete',
    inspectedPaths: ['b.ts'],
    inspectedObligationIds: ['FR2'],
    commands: [],
    evidence: [],
    candidateFindings: [],
    uncoveredObligationIds: [],
    uncertainty: [],
  };
  if (!withEvidence) return dossier;
  if (strategy === 'inventory') {
    dossier.evidence.push({
      id: 'inventory-1',
      kind: 'inventory',
      locator: 'inventory:b.ts',
      scopeRefs: [{ bucket: 'lane', bucketId: 'accepted', pathIndexes: [0] }],
      provenance: 'validated inventory executor',
      digest: 'inventory-digest',
      commandId: null,
      commandResultDigest: null,
    });
    return dossier;
  }
  const command = {
    id: 'command-1',
    command: 'pnpm test',
    cwd: '.',
    scopeRefs: [
      { bucket: 'lane' as const, bucketId: 'accepted', pathIndexes: [0] },
    ],
    provenance: {
      runner: 'worker',
      invocationDigest: 'invocation',
      capturedAt: '2026-07-31T00:00:00.000Z',
    },
    result: {
      status: 'completed' as const,
      exitCode: 0,
      outputDigest: 'output',
    },
  };
  dossier.commands.push(command);
  dossier.evidence.push({
    id: 'command-evidence-1',
    kind: 'command',
    locator: 'command:command-1',
    scopeRefs: [{ bucket: 'lane', bucketId: 'accepted', pathIndexes: [0] }],
    provenance: 'validated command executor',
    digest: 'evidence-digest',
    commandId: command.id,
    commandResultDigest: commandResultDigest(command),
  });
  return dossier;
}

describe('worker dossier validation', () => {
  it.each(['command', 'inventory'] as const)(
    'rejects evidence-free complete accepted %s dossiers from valid plans',
    (strategy) => {
      const candidate = acceptedPlan(strategy);
      expect(validateReviewPlan(candidate.context, candidate.plan)).toEqual([]);
      expect(
        validateWorkerDossier(
          candidate.plan,
          'plan-digest',
          acceptedDossier(strategy, false),
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code:
              strategy === 'command'
                ? 'missing-command-provenance-evidence'
                : 'missing-inventory-provenance-evidence',
          }),
        ]),
      );
    },
  );

  it('preserves valid command, inventory, replayed, and partial dossiers', () => {
    for (const strategy of ['command', 'inventory'] as const) {
      const candidate = acceptedPlan(strategy);
      expect(validateReviewPlan(candidate.context, candidate.plan)).toEqual([]);
      expect(
        validateWorkerDossier(
          candidate.plan,
          'plan-digest',
          acceptedDossier(strategy, true),
        ),
      ).toEqual([]);
    }

    const commandPlan = acceptedPlan('command');
    const replayed = acceptedDossier('command', false);
    replayed.laneId = 'semantic';
    replayed.inspectedPaths = ['a.ts'];
    replayed.inspectedObligationIds = ['FR1'];
    expect(
      validateWorkerDossier(commandPlan.plan, 'plan-digest', replayed),
    ).toEqual([]);

    const partial = acceptedDossier('command', false);
    partial.outcome = 'partial';
    partial.inspectedPaths = [];
    partial.inspectedObligationIds = [];
    partial.uncoveredObligationIds = ['FR2'];
    partial.uncertainty = ['Worker deadline expired before evidence.'];
    expect(
      validateWorkerDossier(commandPlan.plan, 'plan-digest', partial),
    ).toEqual([]);
  });

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

  it.each([
    [
      'result-only',
      (dossier: WorkerDossierV1) =>
        hashCanonicalJson(dossier.commands[0]!.result),
    ],
    [
      'output-only',
      (dossier: WorkerDossierV1) => {
        const result = dossier.commands[0]!.result;
        return hashCanonicalJson(
          result.status === 'completed' ? result.outputDigest : null,
        );
      },
    ],
  ] as const)(
    'rejects %s delegated command evidence digests',
    (_label, digestFor) => {
      const dossier = completeDossier();
      dossier.evidence[0]!.commandResultDigest = digestFor(dossier);

      expect(validateWorkerDossier(plan(), 'plan-digest', dossier)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'command-result-digest-mismatch' }),
        ]),
      );
    },
  );

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
