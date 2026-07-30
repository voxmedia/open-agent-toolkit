import { access, mkdtemp, rm } from 'node:fs/promises';
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
