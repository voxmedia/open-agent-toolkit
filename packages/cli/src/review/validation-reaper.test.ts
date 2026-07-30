import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ReviewPreparationV1 } from './types';
import {
  reapExpiredValidationState,
  computeValidationTtlMs,
} from './validation-reaper';
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
    expiresAt,
  };
}

describe('validation TTL and reaping', () => {
  it('computes exact bounded budget-derived TTLs', () => {
    expect(computeValidationTtlMs(null)).toBe(7_200_000);
    expect(computeValidationTtlMs(1_000)).toBe(1_800_000);
    expect(computeValidationTtlMs(3_600_000)).toBe(7_200_000);
    expect(computeValidationTtlMs(10_000_000)).toBe(14_400_000);
  });

  it('preserves live state and removes expired runs and terminal receipts', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-reaper-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'private-store'));
    await store.createRun({
      preparation: preparation('expiredrunentry1', '2026-01-01T00:00:00.000Z'),
      artifactDraft: false,
    });
    const live = await store.createRun({
      preparation: preparation('liverunentry0001', '2028-01-01T00:00:00.000Z'),
      artifactDraft: false,
    });
    const terminal = join(store.root, 'terminal-old.json');
    await writeFile(
      terminal,
      JSON.stringify({ expiresAt: '2026-01-01T00:00:00.000Z' }),
      { mode: 0o600 },
    );
    await expect(
      reapExpiredValidationState(store, {
        now: new Date('2027-01-01T00:00:00.000Z'),
      }),
    ).resolves.toEqual({ scanned: 3, deleted: 2 });
    await expect(access(live.runDirectory)).resolves.toBeUndefined();
    await expect(access(terminal)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('bounds entry scans', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-reaper-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'private-store'));
    for (const runId of [
      'expiredrunentry1',
      'expiredrunentry2',
      'expiredrunentry3',
    ]) {
      await store.createRun({
        preparation: preparation(runId, '2020-01-01T00:00:00.000Z'),
        artifactDraft: false,
      });
    }
    const result = await reapExpiredValidationState(store, {
      now: new Date('2027-01-01T00:00:00.000Z'),
      maxEntries: 1,
    });
    expect(result).toEqual({ scanned: 1, deleted: 1 });
  });
});
