import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  bindAcceptedHandle,
  consumeCommandCapability,
  issueCommandCapabilities,
  renderReviewCommands,
  verifyAndConsumeCommandCapability,
} from './command-capabilities';
import type { ReviewPreparationV1 } from './types';
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
    prepareTelemetryEvidenceDigest: 'evidence',
    preparationDigest: 'digest',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
}

async function setup(runId = 'capabilityrun0001') {
  const parent = await mkdtemp(join(tmpdir(), 'oat-capability-'));
  roots.push(parent);
  const store = new ValidationStore(join(parent, 'store'));
  await store.createRun({
    preparation: preparation(runId),
    artifactDraft: false,
  });
  return store;
}

describe('review command capabilities', () => {
  it('issues distinct tokens while storing only digests', async () => {
    const store = await setup();
    const issued = await issueCommandCapabilities(store, 'capabilityrun0001');
    expect(issued.checkpointToken).not.toBe(issued.planToken);
    const serialized = JSON.stringify(
      await store.unsafeReadStateForTesting('capabilityrun0001'),
    );
    expect(serialized).not.toContain(issued.checkpointToken);
    expect(serialized).not.toContain(issued.planToken);
  });

  it('rejects mutation before binding and rejects rebinding', async () => {
    const store = await setup();
    const issued = await issueCommandCapabilities(store, 'capabilityrun0001');
    await expect(
      consumeCommandCapability(
        store,
        'capabilityrun0001',
        'checkpoint',
        issued.checkpointToken,
      ),
    ).rejects.toThrow(/bound/);
    await bindAcceptedHandle(store, 'capabilityrun0001', 'handle');
    await expect(
      bindAcceptedHandle(store, 'capabilityrun0001', 'other'),
    ).rejects.toThrow(/already/);
  });

  it('enforces one-shot and sibling isolation', async () => {
    const first = await setup('capabilityrun0001');
    const second = await setup('capabilityrun0002');
    const firstTokens = await issueCommandCapabilities(
      first,
      'capabilityrun0001',
    );
    await issueCommandCapabilities(second, 'capabilityrun0002');
    await bindAcceptedHandle(first, 'capabilityrun0001', 'handle-1');
    await bindAcceptedHandle(second, 'capabilityrun0002', 'handle-2');
    await expect(
      consumeCommandCapability(
        second,
        'capabilityrun0002',
        'checkpoint',
        firstTokens.checkpointToken,
      ),
    ).rejects.toThrow(/invalid/);
    await consumeCommandCapability(
      first,
      'capabilityrun0001',
      'checkpoint',
      firstTokens.checkpointToken,
    );
    await expect(
      consumeCommandCapability(
        first,
        'capabilityrun0001',
        'checkpoint',
        firstTokens.checkpointToken,
      ),
    ).rejects.toThrow(/consumed/);
  });

  it('does not burn a capability when its atomic mutation aborts', async () => {
    const store = await setup();
    const issued = await issueCommandCapabilities(store, 'capabilityrun0001');
    await bindAcceptedHandle(store, 'capabilityrun0001', 'handle');
    await expect(
      store.updateRun('capabilityrun0001', (state) => {
        verifyAndConsumeCommandCapability(
          state,
          'checkpoint',
          issued.checkpointToken,
        );
        throw new Error('simulated transition crash');
      }),
    ).rejects.toThrow(/simulated/);

    await expect(
      consumeCommandCapability(
        store,
        'capabilityrun0001',
        'checkpoint',
        issued.checkpointToken,
      ),
    ).resolves.toBeUndefined();
  });

  it('preserves launcher-owned executable and arguments without shell quoting', () => {
    const commands = renderReviewCommands({
      executable: "/tmp/oat'bin",
      argvPrefix: ['--branch', 'feature & fix'],
      runId: 'run id',
      checkpointToken: "check'token",
      planToken: 'plan-token',
    });
    expect(commands.checkpointArtifacts).toEqual({
      executable: "/tmp/oat'bin",
      argv: [
        '--branch',
        'feature & fix',
        'review',
        'checkpoint-artifacts',
        '--run-id',
        'run id',
        '--checkpoint-token',
        "check'token",
        '--json',
      ],
      stdin: 'none',
    });
    expect(commands.validatePlan.argv).toContain('plan-token');
    expect(commands.validatePlan.stdin).toBe('review-plan-json');
    expect(commands.beginEvidence.argv).toContain('__OAT_PLAN_RECEIPT__');
  });
});
