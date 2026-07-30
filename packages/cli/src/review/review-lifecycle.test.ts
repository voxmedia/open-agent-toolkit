import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  bindAcceptedHandle,
  issueCommandCapabilities,
} from './command-capabilities';
import { checkpointArtifactsLoaded } from './review-lifecycle';
import type { ContextBudgetTelemetry, ReviewPreparationV1 } from './types';
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
    ).rejects.toThrow(/bound/);
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
    ).rejects.toThrow(/consumed/);
  });

  it('rejects post-plan checkpoint attempts', async () => {
    const { store, tokens } = await setup('lifecyclerun0003');
    await bindAcceptedHandle(store, 'lifecyclerun0003', 'handle');
    await store.updateRun('lifecyclerun0003', (state) => {
      state.phase = 'plan_validated';
      return state;
    });
    await expect(
      checkpointArtifactsLoaded(
        {
          runId: 'lifecyclerun0003',
          checkpointToken: tokens.checkpointToken,
        },
        {
          store,
          telemetryAdapter: { observe: async () => observation },
          telemetryAdapterId: 'host',
          clock: clock(),
        },
      ),
    ).rejects.toThrow(/current phase/);
  });
});
