import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

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
  ContextBudgetTelemetry,
  PreparedReviewContextV1,
  ReviewPlanV1,
  ReviewPreparationV1,
} from './types';
import { ValidationStore } from './validation-store';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

function preparation(runId: string): ReviewPreparationV1 {
  return {
    schemaVersion: 1,
    runId,
    mode: 'enforce',
    project: 'project',
    scope: 'p02',
    invocation: 'manual',
    sink: 'structured',
    correlation: { gateRunId: null, launchAttemptId: 'attempt' },
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
        patchBytes: 30,
        patchByteLowerBound: null,
        patchEstimateState: 'exact',
        patchCountingSkippedReason: null,
        estimatedPatchTokens: 10,
      },
    },
    obligations: [],
    priorEvidence: [],
    timeBudget: { totalMs: 120_000, source: 'gate', deadlineMs: 120_000 },
    prepareContextTelemetry: null,
    prepareTelemetryEvidenceDigest: 'pre-evidence',
    preparationDigest: 'preparation',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
}

async function setup(runId: string) {
  const parent = await mkdtemp(join(tmpdir(), 'oat-lifecycle-'));
  roots.push(parent);
  const store = new ValidationStore(join(parent, 'store'));
  await store.createRun({
    preparation: preparation(runId),
    artifactDraft: false,
  });
  const tokens = await issueCommandCapabilities(store, runId);
  return { store, tokens };
}

function clock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, tick++));
}

const observation: ContextBudgetTelemetry = {
  observedAt: '2026-01-01T00:00:00.001Z',
  contextWindowTokens: 100_000,
  consumedTokens: 40_000,
  remainingTokens: 60_000,
  adapterId: 'host',
  source: 'host',
};

function validPlan(context: PreparedReviewContextV1): ReviewPlanV1 {
  return {
    schemaVersion: 1,
    runId: context.runId,
    contextDigest: context.contextDigest,
    strategy: 'whole-diff-inline',
    lanes: [
      {
        id: 'lane',
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
        replay: 'sample',
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
        laneIds: ['lane'],
        rationale: 'small coherent review',
      },
      deterministicAcceptance: {
        mode: 'provenance',
        requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
      },
    },
    wholeDiff: {
      allowed: true,
      estimatedTokens: 10,
      evidenceBudgetTokens: 48_000,
      reason: 'whole diff is eligible',
    },
    timeAllocation: {
      planningDeadlineMs: 5_000,
      evidenceDeadlineMs: 20_000,
      reconciliationDeadlineMs: 30_000,
      outputDeadlineMs: 120_000,
      outputReserveMs: 90_000,
      reconciliationReserveMs: 10_000,
    },
  };
}

describe('post-artifact review checkpoint', () => {
  it('seals immutable telemetry and preserves the time budget', async () => {
    const { store, tokens } = await setup('lifecyclerun0001');
    await bindAcceptedHandle(store, 'lifecyclerun0001', 'handle');
    const context = await checkpointArtifactsLoaded(
      {
        runId: 'lifecyclerun0001',
        checkpointToken: tokens.checkpointToken,
      },
      {
        store,
        telemetryAdapter: { observe: async () => observation },
        telemetryAdapterId: 'host',
        clock: clock(),
      },
    );
    expect(context.budget.time).toEqual(preparation('x'.repeat(16)).timeBudget);
    expect(context.budget.context?.evidenceBudgetTokens).toBe(48_000);
    expect(context.postArtifactTelemetryEvidenceDigest).toHaveLength(64);
    context.budget.context!.evidenceBudgetTokens = 0;
    expect(
      (await store.readRun('lifecyclerun0001')).state.context?.budget.context
        ?.evidenceBudgetTokens,
    ).toBe(48_000);
  });

  it('rejects checkpoint before binding and rejects replay', async () => {
    const { store, tokens } = await setup('lifecyclerun0002');
    const dependencies = {
      store,
      telemetryAdapter: { observe: async () => observation },
      telemetryAdapterId: 'host',
      clock: clock(),
    };
    await expect(
      checkpointArtifactsLoaded(
        {
          runId: 'lifecyclerun0002',
          checkpointToken: tokens.checkpointToken,
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'command-capability-rejected' });
    await bindAcceptedHandle(store, 'lifecyclerun0002', 'handle');
    await checkpointArtifactsLoaded(
      {
        runId: 'lifecyclerun0002',
        checkpointToken: tokens.checkpointToken,
      },
      dependencies,
    );
    await expect(
      checkpointArtifactsLoaded(
        {
          runId: 'lifecyclerun0002',
          checkpointToken: tokens.checkpointToken,
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'command-capability-rejected' });
  });

  it('rejects post-plan checkpoint attempts', async () => {
    const { store, tokens } = await setup('lifecyclerun0003');
    await bindAcceptedHandle(store, 'lifecyclerun0003', 'handle');
    const dependencies = {
      store,
      telemetryAdapter: { observe: async () => observation },
      telemetryAdapterId: 'host',
      clock: clock(),
    };
    const context = await checkpointArtifactsLoaded(
      {
        runId: 'lifecyclerun0003',
        checkpointToken: tokens.checkpointToken,
      },
      dependencies,
    );
    await expect(
      validateAndReceiptPlan(
        {
          runId: 'lifecyclerun0003',
          commandToken: tokens.planToken,
          plan: validPlan(context),
        },
        dependencies,
      ),
    ).resolves.toMatchObject({ valid: true });
    await store.updateRun('lifecyclerun0003', (state) => {
      state.capabilities!.checkpointUsed = false;
      return state;
    });
    await expect(
      checkpointArtifactsLoaded(
        {
          runId: 'lifecyclerun0003',
          checkpointToken: tokens.checkpointToken,
        },
        dependencies,
      ),
    ).rejects.toThrow(/current phase/);
  });

  it('keeps the checkpoint capability live when preparation crashes', async () => {
    const { store, tokens } = await setup('lifecyclerun0004');
    await bindAcceptedHandle(store, 'lifecyclerun0004', 'handle');
    let clockCalls = 0;
    const crashingClock = () => {
      if (clockCalls++ === 2) throw new Error('simulated transition crash');
      return new Date(Date.UTC(2026, 0, 1, 0, 0, 0, clockCalls - 1));
    };
    await expect(
      checkpointArtifactsLoaded(
        {
          runId: 'lifecyclerun0004',
          checkpointToken: tokens.checkpointToken,
        },
        {
          store,
          telemetryAdapter: { observe: async () => observation },
          telemetryAdapterId: 'host',
          clock: crashingClock,
        },
      ),
    ).rejects.toThrow(/simulated/);

    await expect(
      checkpointArtifactsLoaded(
        {
          runId: 'lifecyclerun0004',
          checkpointToken: tokens.checkpointToken,
        },
        {
          store,
          telemetryAdapter: { observe: async () => observation },
          telemetryAdapterId: 'host',
          clock: clock(),
        },
      ),
    ).resolves.toMatchObject({ runId: 'lifecyclerun0004' });
  });
});

describe('receipt-bound evidence authorization', () => {
  async function sealed(runId: string) {
    const setupResult = await setup(runId);
    await bindAcceptedHandle(setupResult.store, runId, `handle-${runId}`);
    const lifecycleClock = clock();
    const context = await checkpointArtifactsLoaded(
      {
        runId,
        checkpointToken: setupResult.tokens.checkpointToken,
      },
      {
        store: setupResult.store,
        telemetryAdapter: { observe: async () => observation },
        telemetryAdapterId: 'host',
        clock: lifecycleClock,
      },
    );
    return { ...setupResult, context, lifecycleClock };
  }

  it('permits one correction, issues a bound receipt, and starts once', async () => {
    const { store, tokens, context, lifecycleClock } =
      await sealed('receiptrun000001');
    const invalid = validPlan(context);
    invalid.contextDigest = 'wrong';
    await expect(
      validateAndReceiptPlan(
        {
          runId: context.runId,
          commandToken: tokens.planToken,
          plan: invalid,
        },
        { store, clock: lifecycleClock },
      ),
    ).resolves.toMatchObject({ valid: false });
    const accepted = await validateAndReceiptPlan(
      {
        runId: context.runId,
        commandToken: tokens.planToken,
        plan: validPlan(context),
      },
      { store, clock: lifecycleClock },
    );
    expect(accepted.valid).toBe(true);
    if (!accepted.valid) throw new Error('expected receipt');
    expect(accepted.receipt).toMatchObject({
      validationRunId: context.runId,
      contextDigest: context.contextDigest,
    });
    await expect(
      beginEvidence(
        { runId: context.runId, receipt: accepted.receipt.token },
        { store, clock: lifecycleClock },
      ),
    ).resolves.toEqual({
      validationRunId: context.runId,
      phase: 'evidence_started',
    });
    await expect(
      beginEvidence(
        { runId: context.runId, receipt: accepted.receipt.token },
        { store, clock: lifecycleClock },
      ),
    ).rejects.toThrow(/validated plan/);
  });

  it('rejects mismatched, pre-validation, and exhausted attempts', async () => {
    const first = await sealed('receiptrun000002');
    await expect(
      beginEvidence(
        { runId: first.context.runId, receipt: 'fabricated' },
        { store: first.store },
      ),
    ).rejects.toThrow(/validated plan/);
    const invalid = validPlan(first.context);
    invalid.runId = 'wrong';
    await validateAndReceiptPlan(
      {
        runId: first.context.runId,
        commandToken: first.tokens.planToken,
        plan: invalid,
      },
      { store: first.store },
    );
    await validateAndReceiptPlan(
      {
        runId: first.context.runId,
        commandToken: first.tokens.planToken,
        plan: invalid,
      },
      { store: first.store },
    );
    await expect(
      validateAndReceiptPlan(
        {
          runId: first.context.runId,
          commandToken: first.tokens.planToken,
          plan: validPlan(first.context),
        },
        { store: first.store },
      ),
    ).rejects.toThrow(/limit/);

    const second = await sealed('receiptrun000003');
    const accepted = await validateAndReceiptPlan(
      {
        runId: second.context.runId,
        commandToken: second.tokens.planToken,
        plan: validPlan(second.context),
      },
      { store: second.store },
    );
    if (!accepted.valid) throw new Error('expected receipt');
    await expect(
      beginEvidence(
        { runId: second.context.runId, receipt: 'mismatch' },
        { store: second.store },
      ),
    ).rejects.toThrow(/mismatch/);
  });
});
