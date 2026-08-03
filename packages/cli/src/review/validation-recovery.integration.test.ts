import { readdirSync, rmSync } from 'node:fs';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { validateStoredReviewOutput } from '../commands/review/validate-output';
import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import {
  bindAcceptedHandle,
  issueCommandCapabilities,
} from './command-capabilities';
import {
  beginEvidence,
  checkpointArtifactsLoaded,
  validateAndReceiptPlan,
} from './review-lifecycle';
import type {
  PreparedReviewContextV1,
  ReviewAccountingSeedV1,
  ReviewPlanV1,
  ReviewPreparationV1,
  ReviewerTerminalOverlayV1,
  ReviewerTerminalV1,
  ValidatedWorkerCoverageProjectionV1,
  WorkerDossierV1,
} from './types';
import { reapExpiredValidationState } from './validation-reaper';
import { type ValidationRunState, ValidationStore } from './validation-store';
import { ValidationStoreAuthority } from './validation-store-authority';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

function preparation(
  runId: string,
  expiresAt: string,
  delegated = false,
): ReviewPreparationV1 {
  return {
    schemaVersion: 1,
    runId,
    mode: 'enforce',
    project: '.oat/projects/shared/demo',
    scope: 'p02',
    invocation: 'manual',
    sink: 'artifact',
    correlation: { gateRunId: null, launchAttemptId: `attempt-${runId}` },
    range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
    changeMap: {
      files: delegated
        ? [
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
          ]
        : [],
      totals: {
        files: delegated ? 2 : 0,
        additions: delegated ? 2 : 0,
        deletions: delegated ? 2 : 0,
        binaryFiles: 0,
        numstatChangedLines: delegated ? 4 : 0,
        numstatTokenDenialEstimate: delegated ? 1 : 0,
        patchBytes: delegated ? 40 : 0,
        patchByteLowerBound: null,
        patchEstimateState: 'exact',
        patchCountingSkippedReason: null,
        estimatedPatchTokens: delegated ? 10 : 0,
      },
    },
    obligations: delegated
      ? [
          {
            id: 'FR1',
            kind: 'requirement',
            source: 'test',
            summary: 'Inspect the delegated path.',
            expectedPaths: ['a.ts'],
            expectedChecks: ['inspect'],
          },
          {
            id: 'FR2',
            kind: 'requirement',
            source: 'test',
            summary: 'Run deterministic verification.',
            expectedPaths: ['b.ts'],
            expectedChecks: ['verify'],
          },
        ]
      : [],
    priorEvidence: [],
    timeBudget: delegated
      ? allocateReviewTimeBudget({
          totalMs: 120_000,
          source: 'test',
          startedAtMs: Date.now(),
        }).time
      : null,
    prepareContextTelemetry: null,
    prepareTelemetryEvidenceDigest: `telemetry-${runId}`,
    preparationDigest: `preparation-${runId}`,
    createdAt: '2098-01-01T00:00:00.000Z',
    expiresAt,
  };
}

function reviewPlan(
  context: PreparedReviewContextV1,
  delegated = false,
): ReviewPlanV1 {
  const time = context.budget.time;
  const timeAllocation =
    time === null
      ? null
      : allocateReviewTimeBudget({
          totalMs: time.totalMs,
          source: time.source,
          startedAtMs: time.deadlineMs - time.totalMs,
        }).allocation;
  return {
    schemaVersion: 1,
    runId: context.runId,
    contextDigest: context.contextDigest,
    strategy: delegated ? 'delegated' : 'selective-inline',
    lanes: [
      {
        id: 'legacy-lane',
        paths: delegated ? ['a.ts'] : [],
        primaryObligationIds: delegated ? ['FR1'] : [],
        seamObligationIds: [],
        risk: 'low',
        evidenceClass: 'semantic',
        strategy: 'path-diff',
        checks: ['inspect'],
        delegated,
        independenceRationale: delegated ? 'Independent bounded lane.' : null,
        substantial: delegated,
        substantialityRationale: delegated
          ? 'Owns the complete changed path.'
          : null,
        deadlineMs: timeAllocation
          ? timeAllocation.planningDeadlineMs + 1
          : null,
        dossier: { contractVersion: 1, partialAllowed: true },
        replay: delegated ? 'sample' : 'direct-verify',
        primaryContingency: delegated
          ? { allowed: true, paths: ['a.ts'], obligationIds: ['FR1'] }
          : { allowed: false, paths: [], obligationIds: [] },
      },
      ...(delegated
        ? [
            {
              id: 'verification-lane',
              paths: ['b.ts'],
              primaryObligationIds: ['FR2'],
              seamObligationIds: [],
              risk: 'low' as const,
              evidenceClass: 'deterministic' as const,
              strategy: 'inventory' as const,
              checks: ['verify'],
              delegated: true,
              independenceRationale: 'Independent deterministic verification.',
              substantial: true,
              substantialityRationale: 'Owns the verification boundary.',
              deadlineMs: timeAllocation!.planningDeadlineMs + 1,
              dossier: { contractVersion: 1 as const, partialAllowed: true },
              replay: 'accept-provenance' as const,
              primaryContingency: {
                allowed: false as const,
                paths: [],
                obligationIds: [],
              },
            },
          ]
        : []),
    ],
    classifications: [],
    crossLaneInvariants: [],
    delegationEconomics: {
      independentLaneIds: delegated ? ['legacy-lane', 'verification-lane'] : [],
      nonReplayedLaneIds: delegated ? ['verification-lane'] : [],
      expectedSavings: delegated ? ['Bounded concurrent inspection.'] : [],
      coordinationCosts: delegated ? ['One dossier reconciliation.'] : [],
      decisionRationale: delegated
        ? 'Delegation is bounded.'
        : 'single coherent lane',
      decision: delegated ? 'delegate' : 'inline',
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
        laneIds: delegated
          ? ['legacy-lane', 'verification-lane']
          : ['legacy-lane'],
        rationale: 'legacy compatibility fixture',
      },
      deterministicAcceptance: {
        mode: 'provenance',
        requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
      },
    },
    wholeDiff: evaluateWholeDiffEligibility({
      changeMap: context.changeMap,
      contextBudget: context.budget.context,
      coherentLaneCount: 1,
      hasConsequentialSeam: false,
    }),
    timeAllocation,
  };
}

async function lifecycleSnapshots(root: string, delegated = false) {
  const authority = new ValidationStoreAuthority(Buffer.alloc(32, 19));
  const store = new ValidationStore(join(root, 'private-store'), authority);
  const created = await store.createRun({
    preparation: preparation(
      'legacytelemetry01',
      '2098-01-01T02:00:00.000Z',
      delegated,
    ),
    artifactDraft: false,
  });
  const prepared = (await store.unsafeReadStateForTesting(
    created.runId,
  )) as ValidationRunState;
  const tokens = await issueCommandCapabilities(store, created.runId);
  await bindAcceptedHandle(store, created.runId, 'accepted-handle');
  const context = await checkpointArtifactsLoaded(
    { runId: created.runId, checkpointToken: tokens.checkpointToken },
    { store, telemetryAdapter: null, telemetryAdapterId: null },
  );
  const artifactsLoaded = (await store.unsafeReadStateForTesting(
    created.runId,
  )) as ValidationRunState;
  const validated = await validateAndReceiptPlan(
    {
      runId: created.runId,
      commandToken: tokens.planToken,
      plan: reviewPlan(context, delegated),
    },
    { store },
  );
  if (!validated.valid) {
    throw new Error(
      `expected valid compatibility plan: ${JSON.stringify(validated.errors)}`,
    );
  }
  const planValidated = (await store.unsafeReadStateForTesting(
    created.runId,
  )) as ValidationRunState;
  await beginEvidence(
    { runId: created.runId, receipt: validated.receipt.token },
    { store },
  );
  const evidenceStarted = (await store.unsafeReadStateForTesting(
    created.runId,
  )) as ValidationRunState;
  return {
    authority,
    store,
    created,
    prepared,
    artifactsLoaded,
    validated,
    planValidated,
    evidenceStarted,
  };
}

function invalidAccountingTerminal(summary = 'reviewed'): ReviewerTerminalV1 {
  const evidence = {
    id: 'evidence-1',
    kind: 'source' as const,
    locator: 'validated review scope',
    scopeRefs: [
      { bucket: 'lane' as const, bucketId: 'legacy-lane', pathIndexes: [] },
    ],
    provenance: 'reviewer',
    digest: 'evidence',
    commandId: null,
    commandResultDigest: null,
  };
  return {
    schemaVersion: 1,
    status: 'complete',
    candidate: {
      kind: 'structured',
      review: { summary, findings: [], verification_commands: [] },
    },
    reviewAccounting: {
      schemaVersion: 1,
      receipt: 'wrong-receipt',
      contextDigest: 'placeholder',
      planDigest: 'placeholder',
      assignmentDigest: 'placeholder',
      strategy: 'selective-inline',
      completion: 'complete',
      evidence: [evidence],
      lanes: [
        {
          id: 'legacy-lane',
          paths: [],
          primaryObligationIds: [],
          seamObligationIds: [],
          workerOutcome: 'not-delegated',
          dossierDigest: null,
          inspectionCoverage: 'all',
          uninspectedPathIndexes: [],
          uncoveredObligationIds: [],
          commands: [],
          evidenceRefIds: ['evidence-1'],
          uncertainty: [],
          primaryCompletion: {
            outcome: 'not-needed',
            completedPathIndexes: [],
            completedObligationIds: [],
            commands: [],
            evidenceRefIds: [],
          },
        },
      ],
      classifications: [],
      verification: [
        {
          claimId: 'promoted',
          kind: 'promoted-finding',
          findingId: null,
          laneIds: ['legacy-lane'],
          mode: 'direct',
          disposition: 'rejected',
          evidenceRefIds: ['evidence-1'],
        },
        ...(
          [
            'consequential-absence',
            'worker-conflict',
            'cross-lane-gap',
          ] as const
        ).map((kind) => ({
          claimId: kind,
          kind,
          findingId: null,
          laneIds: ['legacy-lane'],
          mode: 'direct' as const,
          disposition: 'rejected' as const,
          evidenceRefIds: ['evidence-1'],
        })),
        {
          claimId: 'positive',
          kind: 'positive-coverage-sample',
          findingId: null,
          laneIds: ['legacy-lane'],
          mode: 'sample',
          disposition: 'verified',
          evidenceRefIds: ['evidence-1'],
        },
      ],
      budget: { evidenceStoppedAt: null, outputReservePreserved: null },
    },
  };
}

function terminalOverlayWithoutSeed(): ReviewerTerminalOverlayV1 {
  const terminal = invalidAccountingTerminal('assembled from sealed state');
  if (terminal.status !== 'complete') throw new Error('invalid test terminal');
  const lane = terminal.reviewAccounting.lanes[0]!;
  const claims = new Map(
    terminal.reviewAccounting.verification.map((claim) => [claim.kind, claim]),
  );
  const overlayClaim = (kind: string) => {
    const claim = claims.get(
      kind as (typeof terminal.reviewAccounting.verification)[number]['kind'],
    )!;
    return {
      claimId: claim.claimId,
      laneIds: [...claim.laneIds],
      disposition: claim.disposition,
      evidenceRefIds: [...claim.evidenceRefIds],
    };
  };
  return {
    schemaVersion: 1,
    contract: 'reviewer-terminal-overlay/v1',
    status: 'complete',
    candidate: structuredClone(terminal.candidate),
    reviewAccounting: {
      evidence: structuredClone(terminal.reviewAccounting.evidence),
      lanes: [
        {
          laneId: lane.id,
          inspectionCoverage: lane.inspectionCoverage,
          uninspectedPathIndexes: [...lane.uninspectedPathIndexes],
          uncoveredObligationIds: [...lane.uncoveredObligationIds],
          commands: structuredClone(lane.commands),
          evidenceRefIds: [...lane.evidenceRefIds],
          uncertainty: [...lane.uncertainty],
          primaryCompletion: structuredClone(lane.primaryCompletion),
        },
      ],
      classifications: [],
      verification: {
        promotedFindings: [
          {
            ...overlayClaim('promoted-finding'),
            findingId: null,
          },
        ],
        consequentialAbsence: overlayClaim('consequential-absence'),
        workerConflict: overlayClaim('worker-conflict'),
        crossLaneGap: overlayClaim('cross-lane-gap'),
        positiveCoverage: [
          {
            claimId: 'positive',
            laneId: 'legacy-lane',
            disposition: 'verified',
            evidenceRefIds: ['evidence-1'],
          },
        ],
        deterministicResults: [],
      },
      budget: structuredClone(terminal.reviewAccounting.budget),
    },
  };
}

function terminalFromAccountingSeed(
  seed: ReviewAccountingSeedV1,
): ReviewerTerminalV1 {
  const terminal = invalidAccountingTerminal();
  if (terminal.status !== 'complete') throw new Error('invalid test terminal');
  terminal.reviewAccounting.receipt = seed.receipt;
  terminal.reviewAccounting.contextDigest = seed.contextDigest;
  terminal.reviewAccounting.planDigest = seed.planDigest;
  terminal.reviewAccounting.assignmentDigest = seed.assignmentDigest;
  terminal.reviewAccounting.strategy = seed.strategy;
  terminal.reviewAccounting.lanes = seed.lanes.map((lane) => ({
    ...structuredClone(lane),
    workerOutcome: 'not-delegated',
    dossierDigest: null,
    inspectionCoverage: 'all',
    uninspectedPathIndexes: [],
    uncoveredObligationIds: [],
    commands: [],
    evidenceRefIds: ['evidence-1'],
    uncertainty: [],
    primaryCompletion: {
      outcome: 'not-needed',
      completedPathIndexes: [],
      completedObligationIds: [],
      commands: [],
      evidenceRefIds: [],
    },
  }));
  terminal.reviewAccounting.classifications = seed.classifications.map(
    (classification) => ({
      ...structuredClone(classification),
      outcome:
        classification.planDisposition === 'justified-exclusion'
          ? 'excluded'
          : 'complete',
      inspectionCoverage:
        classification.planDisposition === 'justified-exclusion'
          ? 'excluded'
          : 'all',
      uninspectedPathIndexes: [],
      commands: [],
      uncertainty: [],
    }),
  );
  terminal.reviewAccounting.verification = [
    ...seed.verificationBoundary.requiredClaims.map(({ kind, mode }) => ({
      claimId: `required-${kind}`,
      kind,
      findingId: null,
      laneIds: seed.lanes.map((lane) => lane.id),
      mode,
      disposition: 'rejected' as const,
      evidenceRefIds: ['evidence-1'],
    })),
    {
      claimId: 'positive-coverage',
      kind: 'positive-coverage-sample',
      findingId: null,
      laneIds: [...seed.verificationBoundary.positiveCoverage.laneIds],
      mode: seed.verificationBoundary.positiveCoverage.mode,
      disposition: 'verified',
      evidenceRefIds: ['evidence-1'],
    },
  ];
  return terminal;
}

function delegatedTerminal(
  state: ValidationRunState,
  coverage: ValidatedWorkerCoverageProjectionV1,
  verificationCoverage: ValidatedWorkerCoverageProjectionV1,
): ReviewerTerminalV1 {
  const terminal = invalidAccountingTerminal(
    `${coverage.outcome} delegated review`,
  );
  if (terminal.status !== 'complete') throw new Error('invalid test terminal');
  terminal.reviewAccounting.receipt = state.receipt!.token;
  terminal.reviewAccounting.contextDigest = state.receipt!.contextDigest;
  terminal.reviewAccounting.planDigest = state.receipt!.planDigest;
  terminal.reviewAccounting.assignmentDigest = state.receipt!.assignmentDigest;
  terminal.reviewAccounting.strategy = 'delegated';
  terminal.reviewAccounting.lanes[0] = {
    ...terminal.reviewAccounting.lanes[0]!,
    paths: ['a.ts'],
    primaryObligationIds: ['FR1'],
    workerOutcome: coverage.outcome,
    dossierDigest: coverage.dossierDigest,
    inspectionCoverage: 'all',
    uninspectedPathIndexes: [],
    uncoveredObligationIds: [],
    primaryCompletion:
      coverage.outcome === 'partial'
        ? {
            outcome: 'complete',
            completedPathIndexes: [0],
            completedObligationIds: ['FR1'],
            commands: [],
            evidenceRefIds: ['evidence-1'],
          }
        : {
            outcome: 'not-needed',
            completedPathIndexes: [],
            completedObligationIds: [],
            commands: [],
            evidenceRefIds: [],
          },
  };
  terminal.reviewAccounting.evidence[0]!.scopeRefs[0]!.pathIndexes = [0];
  terminal.reviewAccounting.evidence[0]!.scopeRefs.push({
    bucket: 'lane',
    bucketId: 'verification-lane',
    pathIndexes: [0],
  });
  terminal.reviewAccounting.lanes.push({
    id: 'verification-lane',
    paths: ['b.ts'],
    primaryObligationIds: ['FR2'],
    seamObligationIds: [],
    workerOutcome: 'complete',
    dossierDigest: verificationCoverage.dossierDigest,
    inspectionCoverage: 'all',
    uninspectedPathIndexes: [],
    uncoveredObligationIds: [],
    commands: [],
    evidenceRefIds: ['evidence-1'],
    uncertainty: [],
    primaryCompletion: {
      outcome: 'not-needed',
      completedPathIndexes: [],
      completedObligationIds: [],
      commands: [],
      evidenceRefIds: [],
    },
  });
  const positive = terminal.reviewAccounting.verification.find(
    (claim) => claim.kind === 'positive-coverage-sample',
  )!;
  positive.laneIds = ['legacy-lane', 'verification-lane'];
  return terminal;
}

describe('validation recovery integration', () => {
  it('validates an overlay from stored state after the transient seed is unavailable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validation-overlay-state-'));
    roots.push(root);
    const fixture = await lifecycleSnapshots(root);
    const overlay = terminalOverlayWithoutSeed();

    await expect(
      validateStoredReviewOutput(
        { runId: fixture.created.runId, terminal: overlay },
        fixture.store,
      ),
    ).resolves.toMatchObject({ valid: true });
    await expect(
      fixture.store.readRun(fixture.created.runId),
    ).resolves.toMatchObject({
      state: {
        phase: 'accepted',
        output: { attempts: 1 },
      },
    });
    expect(overlay.reviewAccounting).not.toHaveProperty('receipt');
    expect(overlay.reviewAccounting.lanes[0]).not.toHaveProperty('paths');
  });

  it('repairs reconstructed terminal accounting from the launcher-owned seed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validation-seed-repair-'));
    roots.push(root);
    const fixture = await lifecycleSnapshots(root);
    const malformed = terminalFromAccountingSeed(
      fixture.validated.accountingSeed,
    );
    malformed.reviewAccounting.receipt = 'reconstructed-receipt';
    malformed.reviewAccounting.lanes[0]!.paths = ['reconstructed-path.ts'];

    await expect(
      validateStoredReviewOutput(
        { runId: fixture.created.runId, terminal: malformed },
        fixture.store,
      ),
    ).resolves.toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: 'receipt-mismatch' }),
        expect.objectContaining({ code: 'assignment-mismatch' }),
      ]),
    });
    await expect(
      fixture.store.readRun(fixture.created.runId),
    ).resolves.toMatchObject({ state: { phase: 'accounting_repair' } });

    const repaired = terminalFromAccountingSeed(
      fixture.validated.accountingSeed,
    );
    expect(
      repaired.reviewAccounting.verification
        .filter(({ mode }) => mode === 'direct')
        .map(({ kind }) => kind),
    ).toEqual([
      'promoted-finding',
      'consequential-absence',
      'worker-conflict',
      'cross-lane-gap',
    ]);
    await expect(
      validateStoredReviewOutput(
        { runId: fixture.created.runId, terminal: repaired },
        fixture.store,
      ),
    ).resolves.toMatchObject({ valid: true });
    await expect(
      fixture.store.readRun(fixture.created.runId),
    ).resolves.toMatchObject({ state: { phase: 'accepted' } });
  });

  it.each(['complete', 'partial'] as const)(
    'accepts delegated %s output after real-store dossier binding',
    async (outcome) => {
      const root = await mkdtemp(
        join(tmpdir(), `oat-validation-worker-${outcome}-`),
      );
      roots.push(root);
      const fixture = await lifecycleSnapshots(root, true);
      const state = fixture.evidenceStarted;
      const dossier: WorkerDossierV1 = {
        schemaVersion: 1,
        runId: fixture.created.runId,
        planDigest: state.receipt!.planDigest,
        laneId: 'legacy-lane',
        outcome,
        inspectedPaths: outcome === 'complete' ? ['a.ts'] : [],
        inspectedObligationIds: outcome === 'complete' ? ['FR1'] : [],
        commands: [],
        evidence: [],
        candidateFindings: [],
        uncoveredObligationIds: outcome === 'complete' ? [] : ['FR1'],
        uncertainty:
          outcome === 'complete' ? [] : ['Worker stopped before inspection.'],
      };
      const coverage = await fixture.store.bindValidatedWorkerDossier(
        fixture.created.runId,
        { receipt: state.receipt!.token, dossier },
      );
      const verificationCoverage =
        await fixture.store.bindValidatedWorkerDossier(fixture.created.runId, {
          receipt: state.receipt!.token,
          dossier: {
            schemaVersion: 1,
            runId: fixture.created.runId,
            planDigest: state.receipt!.planDigest,
            laneId: 'verification-lane',
            outcome: 'complete',
            inspectedPaths: ['b.ts'],
            inspectedObligationIds: ['FR2'],
            commands: [],
            evidence: [
              {
                id: 'inventory-1',
                kind: 'inventory',
                locator: 'inventory:verification-lane',
                scopeRefs: [
                  {
                    bucket: 'lane',
                    bucketId: 'verification-lane',
                    pathIndexes: [0],
                  },
                ],
                provenance: 'validated inventory executor',
                digest: 'inventory-digest',
                commandId: null,
                commandResultDigest: null,
              },
            ],
            candidateFindings: [],
            uncoveredObligationIds: [],
            uncertainty: [],
          },
        });

      const validation = await validateStoredReviewOutput(
        {
          runId: fixture.created.runId,
          terminal: delegatedTerminal(state, coverage, verificationCoverage),
        },
        fixture.store,
      );
      expect(validation, JSON.stringify(validation)).toMatchObject({
        valid: true,
      });
      await expect(
        fixture.store.readRun(fixture.created.runId),
      ).resolves.toMatchObject({
        state: {
          phase: 'accepted',
          workerCoverage: [
            { outcome, dossierDigest: coverage.dossierDigest },
            {
              outcome: 'complete',
              dossierDigest: verificationCoverage.dossierDigest,
            },
          ],
        },
      });
    },
  );

  it('enforces immutable substance and the total-attempt cap through the real store transition', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validation-output-repair-'));
    roots.push(root);
    const fixture = await lifecycleSnapshots(root);
    const terminal = invalidAccountingTerminal();
    terminal.reviewAccounting.contextDigest =
      fixture.evidenceStarted.receipt!.contextDigest;
    terminal.reviewAccounting.planDigest =
      fixture.evidenceStarted.receipt!.planDigest;
    terminal.reviewAccounting.assignmentDigest =
      fixture.evidenceStarted.receipt!.assignmentDigest;

    for (let attempt = 1; attempt <= 3; attempt++) {
      await expect(
        validateStoredReviewOutput(
          { runId: fixture.created.runId, terminal },
          fixture.store,
        ),
      ).resolves.toMatchObject({ valid: false });
      await expect(
        fixture.store.readRun(fixture.created.runId),
      ).resolves.toMatchObject({
        state: {
          phase: attempt < 3 ? 'accounting_repair' : 'terminal',
          output: { attempts: attempt },
        },
      });
    }
    await expect(
      validateStoredReviewOutput(
        { runId: fixture.created.runId, terminal },
        fixture.store,
      ),
    ).rejects.toMatchObject({ code: 'output-attempt-limit' });

    const mutationRoot = await mkdtemp(
      join(tmpdir(), 'oat-validation-output-mutation-'),
    );
    roots.push(mutationRoot);
    const mutationFixture = await lifecycleSnapshots(mutationRoot);
    const first = invalidAccountingTerminal();
    first.reviewAccounting.contextDigest =
      mutationFixture.evidenceStarted.receipt!.contextDigest;
    first.reviewAccounting.planDigest =
      mutationFixture.evidenceStarted.receipt!.planDigest;
    first.reviewAccounting.assignmentDigest =
      mutationFixture.evidenceStarted.receipt!.assignmentDigest;
    await validateStoredReviewOutput(
      { runId: mutationFixture.created.runId, terminal: first },
      mutationFixture.store,
    );
    const changed = structuredClone(first);
    if (
      changed.status === 'complete' &&
      changed.candidate.kind === 'structured'
    ) {
      changed.candidate.review.summary = 'changed substance';
    }
    await expect(
      validateStoredReviewOutput(
        { runId: mutationFixture.created.runId, terminal: changed },
        mutationFixture.store,
      ),
    ).resolves.toMatchObject({
      valid: false,
      errors: [{ code: 'immutable-substance-mismatch' }],
    });
    await expect(
      mutationFixture.store.readRun(mutationFixture.created.runId),
    ).resolves.toMatchObject({
      state: { phase: 'terminal', output: { attempts: 2 } },
    });
  });

  it('accepts empty legacy telemetry for every coherent lifecycle phase', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validation-legacy-state-'));
    roots.push(root);
    const fixture = await lifecycleSnapshots(root);
    const candidates: ValidationRunState[] = [
      { ...fixture.prepared, telemetry: [] },
      { ...fixture.artifactsLoaded, telemetry: [] },
      { ...fixture.planValidated, telemetry: [] },
      { ...fixture.evidenceStarted, telemetry: [] },
      {
        ...fixture.evidenceStarted,
        telemetry: [],
        phase: 'accounting_repair',
        output: { immutableSubstanceDigest: 'a'.repeat(64), attempts: 1 },
      },
      {
        ...fixture.evidenceStarted,
        telemetry: [],
        phase: 'accepted',
        output: { immutableSubstanceDigest: 'a'.repeat(64), attempts: 1 },
      },
      {
        ...fixture.evidenceStarted,
        telemetry: [],
        phase: 'terminal',
        output: { immutableSubstanceDigest: 'a'.repeat(64), attempts: 1 },
      },
    ];

    for (const candidate of candidates) {
      await writeFile(
        fixture.created.statePath,
        fixture.authority.seal(candidate),
      );
      await expect(
        fixture.store.readRun(fixture.created.runId),
      ).resolves.toMatchObject({
        state: {
          phase: candidate.phase,
          telemetry: [],
          workerCoverage: [],
        },
      });
    }

    const {
      workerCoverage: _legacyMissingWorkerCoverage,
      ...legacyEvidenceStarted
    } = fixture.evidenceStarted;
    await writeFile(
      fixture.created.statePath,
      fixture.authority.seal(legacyEvidenceStarted),
    );
    await expect(
      fixture.store.readRun(fixture.created.runId),
    ).resolves.toMatchObject({
      state: { phase: 'evidence_started', workerCoverage: [] },
    });
  });

  it('rejects empty-telemetry states with incomplete phase data', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'oat-validation-incoherent-state-'),
    );
    roots.push(root);
    const fixture = await lifecycleSnapshots(root);
    const malformed: ValidationRunState[] = [
      { ...fixture.artifactsLoaded, telemetry: [], context: null },
      {
        ...fixture.artifactsLoaded,
        telemetry: [],
        plan: fixture.planValidated.plan,
      },
      { ...fixture.planValidated, telemetry: [], plan: null },
      { ...fixture.planValidated, telemetry: [], assignment: null },
      { ...fixture.planValidated, telemetry: [], receipt: null },
    ];

    for (const candidate of malformed) {
      await writeFile(
        fixture.created.statePath,
        fixture.authority.seal(candidate),
      );
      await expect(
        fixture.store.readRun(fixture.created.runId),
      ).rejects.toThrow();
    }
  });

  it('recovers from a process death while the store lock is held', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validation-lock-recovery-'));
    roots.push(root);
    const store = new ValidationStore(join(root, 'private-store'));
    const run = await store.createRun({
      preparation: preparation('lockrecoveryrun1', '2098-01-01T02:00:00.000Z'),
      artifactDraft: false,
    });
    await writeFile(
      join(store.root, '.store.lock'),
      JSON.stringify({
        schemaVersion: 1,
        pid: 2_147_483_647,
        nonce: 'crashed-process',
        acquiredAtMs: Date.now(),
        leaseMs: 30_000,
      }),
      { mode: 0o600 },
    );

    await expect(
      store.updateRun(run.runId, (state) => {
        state.acceptedHandleDigest = 'recovered';
        return state;
      }),
    ).resolves.toMatchObject({
      state: { acceptedHandleDigest: 'recovered' },
    });
  });

  it('serializes concurrent reclaimers without removing a new owner', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validation-lock-race-'));
    roots.push(root);
    const store = new ValidationStore(join(root, 'private-store'));
    const run = await store.createRun({
      preparation: preparation('concurrentclaims1', '2098-01-01T02:00:00.000Z'),
      artifactDraft: false,
    });
    const lockDirectory = join(store.root, '.store.lock');
    await mkdir(lockDirectory);
    await writeFile(
      join(lockDirectory, 'dead-owner.claim'),
      JSON.stringify({
        schemaVersion: 1,
        pid: 2_147_483_647,
        nonce: 'dead-owner',
        acquiredAtMs: Date.now(),
        leaseMs: 30_000,
      }),
    );

    await Promise.all(
      [1, 2].map(() =>
        store.updateRun(run.runId, (state) => {
          state.planValidationAttempts++;
          return state;
        }),
      ),
    );
    await expect(store.readRun(run.runId)).resolves.toMatchObject({
      state: { planValidationAttempts: 2 },
    });
  });

  it('does not expire a live owner and fences a superseded writer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validation-live-lock-'));
    roots.push(root);
    const store = new ValidationStore(join(root, 'private-store'));
    const run = await store.createRun({
      preparation: preparation('liveownerclaims1', '2098-01-01T02:00:00.000Z'),
      artifactDraft: false,
    });
    const lockDirectory = join(store.root, '.store.lock');
    await mkdir(lockDirectory);
    const liveClaim = join(lockDirectory, 'live-owner.claim');
    await writeFile(
      liveClaim,
      JSON.stringify({
        schemaVersion: 1,
        pid: process.pid,
        nonce: 'live-owner',
        acquiredAtMs: 0,
        leaseMs: 1,
      }),
    );
    const waiting = store.updateRun(run.runId, (state) => {
      state.planValidationAttempts++;
      return state;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    await expect(access(liveClaim)).resolves.toBeUndefined();
    await rm(liveClaim);
    await expect(waiting).resolves.toMatchObject({
      state: { planValidationAttempts: 1 },
    });

    await expect(
      store.updateRun(run.runId, (state) => {
        const ownClaim = readdirSync(lockDirectory).find((name) =>
          name.endsWith('.claim'),
        )!;
        rmSync(join(lockDirectory, ownClaim));
        state.planValidationAttempts++;
        return state;
      }),
    ).rejects.toThrow(/fencing/);
    await expect(store.readRun(run.runId)).resolves.toMatchObject({
      state: { planValidationAttempts: 1 },
    });
  });

  it('never resolves an unbound tuple that shares its legacy filename', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validation-correlation-'));
    roots.push(root);
    const store = new ValidationStore(join(root, 'private-store'));
    const correlated = preparation(
      'correlatedrun001',
      '2098-01-01T02:00:00.000Z',
    );
    correlated.invocation = 'gate';
    correlated.correlation = {
      gateRunId: 'a-b',
      launchAttemptId: 'c',
    };
    await store.createRun({ preparation: correlated, artifactDraft: false });
    await store.bindGateCorrelation('a-b', 'c', correlated.runId);

    await expect(store.resolveGateCorrelation('a-b', 'c')).resolves.toBe(
      correlated.runId,
    );
    await expect(
      store.resolveGateCorrelation('a', 'b-c'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('reaps a crashed expired run without disturbing a live sibling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validation-recovery-'));
    roots.push(root);
    const store = new ValidationStore(join(root, 'private-store'));
    const crashed = await store.createRun({
      preparation: preparation('crashedrun000001', '2098-01-01T00:01:00.000Z'),
      artifactDraft: true,
    });
    const sibling = await store.createRun({
      preparation: preparation('siblingsrun00001', '2098-01-01T02:00:00.000Z'),
      artifactDraft: true,
    });
    await store.updateRun(sibling.runId, (state) => {
      state.acceptedHandleDigest = 'sibling-handle';
      return state;
    });

    await expect(
      reapExpiredValidationState(store, {
        now: new Date('2098-01-01T01:00:00.000Z'),
      }),
    ).resolves.toEqual({ scanned: 2, deleted: 1 });

    await expect(access(crashed.runDirectory)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(access(crashed.artifactDraftPath!)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const surviving = await store.readRun(sibling.runId);
    expect(surviving.state.acceptedHandleDigest).toBe('sibling-handle');
    await expect(access(sibling.artifactDraftPath!)).resolves.toBeUndefined();
  });
});
