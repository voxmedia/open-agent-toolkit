import { readdirSync, rmSync } from 'node:fs';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ReviewPreparationV1 } from './types';
import { reapExpiredValidationState } from './validation-reaper';
import { ValidationStore } from './validation-store';

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

describe('validation recovery integration', () => {
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
