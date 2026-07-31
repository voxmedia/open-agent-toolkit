import { readdirSync, rmSync } from 'node:fs';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { validateStoredReviewOutput } from '../commands/review/validate-output';
import { evaluateWholeDiffEligibility } from './budget';
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
  ReviewPlanV1,
  ReviewPreparationV1,
  ReviewerTerminalV1,
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

function preparation(runId: string, expiresAt: string): ReviewPreparationV1 {
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
      files: [],
      totals: {
        files: 0,
        additions: 0,
        deletions: 0,
        binaryFiles: 0,
        numstatChangedLines: 0,
        numstatTokenDenialEstimate: 0,
        patchBytes: 0,
        patchByteLowerBound: null,
        patchEstimateState: 'exact',
        patchCountingSkippedReason: null,
        estimatedPatchTokens: 0,
      },
    },
    obligations: [],
    priorEvidence: [],
    timeBudget: null,
    prepareContextTelemetry: null,
    prepareTelemetryEvidenceDigest: `telemetry-${runId}`,
    preparationDigest: `preparation-${runId}`,
    createdAt: '2098-01-01T00:00:00.000Z',
    expiresAt,
  };
}

function reviewPlan(context: PreparedReviewContextV1): ReviewPlanV1 {
  return {
    schemaVersion: 1,
    runId: context.runId,
    contextDigest: context.contextDigest,
    strategy: 'selective-inline',
    lanes: [
      {
        id: 'legacy-lane',
        paths: [],
        primaryObligationIds: [],
        seamObligationIds: [],
        risk: 'low',
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
      decisionRationale: 'single coherent lane',
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
        laneIds: ['legacy-lane'],
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
    timeAllocation: null,
  };
}

async function lifecycleSnapshots(root: string) {
  const authority = new ValidationStoreAuthority(Buffer.alloc(32, 19));
  const store = new ValidationStore(join(root, 'private-store'), authority);
  const created = await store.createRun({
    preparation: preparation('legacytelemetry01', '2098-01-01T02:00:00.000Z'),
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
      plan: reviewPlan(context),
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

describe('validation recovery integration', () => {
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
