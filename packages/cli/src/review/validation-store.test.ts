import { lstat, mkdir, mkdtemp, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ReviewPreparationV1 } from './types';
import { ValidationStore } from './validation-store';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

function preparation(runId = 'abcdefghijklmnop'): ReviewPreparationV1 {
  return {
    schemaVersion: 1,
    runId,
    mode: 'enforce',
    project: 'project',
    scope: 'p02',
    invocation: 'manual',
    sink: 'artifact',
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
    preparationDigest: 'preparation',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
}

describe('ValidationStore.createRun', () => {
  it('creates private state and draft with stored inode identity', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const result = await store.createRun({
      preparation: preparation(),
      artifactDraft: true,
    });
    expect((await stat(store.root)).mode & 0o777).toBe(0o700);
    expect((await stat(result.runDirectory)).mode & 0o777).toBe(0o700);
    expect((await stat(result.statePath)).mode & 0o777).toBe(0o600);
    expect((await stat(result.artifactDraftPath!)).mode & 0o777).toBe(0o600);
    const draft = await stat(result.artifactDraftPath!);
    expect({ device: result.draftDevice, inode: result.draftInode }).toEqual({
      device: draft.dev,
      inode: draft.ino,
    });
    expect(await store.unsafeReadStateForTesting(result.runId)).toMatchObject({
      phase: 'prepared',
      draft: { device: draft.dev, inode: draft.ino },
    });
  });

  it('rejects unsafe pre-existing run paths', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const root = join(parent, 'store');
    await mkdir(root);
    await mkdir(join(root, 'run-abcdefghijklmnop'));
    const store = new ValidationStore(root);
    await expect(
      store.createRun({
        preparation: preparation(),
        artifactDraft: false,
      }),
    ).rejects.toMatchObject({ code: 'EEXIST' });
  });

  it('rejects a symlinked store root', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const target = join(parent, 'target');
    const root = join(parent, 'store');
    await mkdir(target);
    await symlink(target, root, 'dir');
    const store = new ValidationStore(root);
    await expect(
      store.createRun({
        preparation: preparation('qrstuvwxyzabcdef'),
        artifactDraft: false,
      }),
    ).rejects.toThrow(/real directory/);
    expect((await lstat(root)).isSymbolicLink()).toBe(true);
  });
});
