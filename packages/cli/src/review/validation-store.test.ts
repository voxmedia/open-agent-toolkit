import {
  access,
  lstat,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { bindAcceptedHandle } from './command-capabilities';
import type { ReviewPreparationV1 } from './types';
import { ValidationStore } from './validation-store';
import { ValidationStoreAuthority } from './validation-store-authority';

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
      output: { immutableSubstanceDigest: null, attempts: 0 },
      acceptedSnapshot: null,
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

describe('validation state and gate correlation', () => {
  it('stores only the digest of an accepted handle', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    await store.createRun({
      preparation: preparation(),
      artifactDraft: false,
    });
    await bindAcceptedHandle(store, 'abcdefghijklmnop', 'raw-secret-handle');
    const serialized = JSON.stringify(
      await store.unsafeReadStateForTesting('abcdefghijklmnop'),
    );
    expect(serialized).not.toContain('raw-secret-handle');
    expect(serialized).toMatch(/acceptedHandleDigest/);
  });

  it('reads and atomically updates valid state', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    await store.createRun({
      preparation: preparation(),
      artifactDraft: false,
    });
    const updated = await store.updateRun('abcdefghijklmnop', (state) => ({
      ...state,
      planValidationAttempts: 1,
    }));
    expect(updated.state.planValidationAttempts).toBe(1);
  });

  it('validates the complete next state before atomic rename', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    await store.createRun({
      preparation: preparation(),
      artifactDraft: false,
    });
    const before = await store.unsafeReadStateForTesting('abcdefghijklmnop');

    await expect(
      store.updateRun('abcdefghijklmnop', (state) => {
        (state as unknown as Record<string, unknown>)['unknown'] = true;
        return state;
      }),
    ).rejects.toThrow(/invalid schema/);

    expect(await store.unsafeReadStateForTesting('abcdefghijklmnop')).toEqual(
      before,
    );
    await expect(store.readRun('abcdefghijklmnop')).resolves.toMatchObject({
      state: { phase: 'prepared', planValidationAttempts: 0 },
    });
  });

  it('recovers a lock whose owning process has died', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    await store.createRun({
      preparation: preparation(),
      artifactDraft: false,
    });
    await writeFile(
      join(store.root, '.store.lock'),
      JSON.stringify({
        schemaVersion: 1,
        pid: 2_147_483_647,
        nonce: 'dead-owner',
        acquiredAtMs: Date.now(),
        leaseMs: 30_000,
      }),
      { mode: 0o600 },
    );

    await expect(
      store.updateRun('abcdefghijklmnop', (state) => state),
    ).resolves.toMatchObject({ runId: 'abcdefghijklmnop' });
    await expect(access(join(store.root, '.store.lock'))).rejects.toMatchObject(
      {
        code: 'ENOENT',
      },
    );
  });

  it('rejects schema corruption, expiry, and changed draft identity', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const created = await store.createRun({
      preparation: preparation(),
      artifactDraft: true,
    });
    const envelope = JSON.parse(await readFile(created.statePath, 'utf8')) as {
      state: { schemaVersion: number };
    };
    envelope.state.schemaVersion = 2;
    await writeFile(created.statePath, JSON.stringify(envelope));
    await expect(store.readRun(created.runId)).rejects.toThrow(
      /authentication/,
    );

    const expired = preparation('expiredvalidation');
    expired.expiresAt = '2020-01-01T00:00:00.000Z';
    await store.createRun({ preparation: expired, artifactDraft: false });
    await expect(store.readRun(expired.runId)).rejects.toThrow(/expired/);

    const replacement = preparation('replacementdraft');
    const replaced = await store.createRun({
      preparation: replacement,
      artifactDraft: true,
    });
    await rm(replaced.artifactDraftPath!);
    await writeFile(replaced.artifactDraftPath!, '');
    await expect(store.readRun(replacement.runId)).rejects.toThrow(/identity/);
  });

  it('rejects linked drafts', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const created = await store.createRun({
      preparation: preparation('hardlinkvalidation'),
      artifactDraft: true,
    });
    await link(created.artifactDraftPath!, join(parent, 'second-link'));
    await expect(store.readRun(created.runId)).rejects.toThrow(/identity/);
  });

  it('binds, resolves, and deletes exact gate-attempt pairs', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const gatePreparation = preparation('gatevalidationrun');
    gatePreparation.invocation = 'gate';
    gatePreparation.correlation = {
      gateRunId: 'gate-1',
      launchAttemptId: 'attempt-1',
    };
    await store.createRun({
      preparation: gatePreparation,
      artifactDraft: false,
    });
    await store.bindGateCorrelation(
      'gate-1',
      'attempt-1',
      gatePreparation.runId,
    );
    await expect(
      store.resolveGateCorrelation('gate-1', 'attempt-1'),
    ).resolves.toBe(gatePreparation.runId);
    await expect(
      store.resolveGateCorrelation('gate-1', 'attempt-2'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await store.deleteRun(gatePreparation.runId);
    await expect(
      store.resolveGateCorrelation('gate-1', 'attempt-1'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('encodes colliding tuples injectively', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const gatePreparation = preparation('collisionrun0001');
    gatePreparation.invocation = 'gate';
    gatePreparation.correlation = {
      gateRunId: 'a-b',
      launchAttemptId: 'c',
    };
    await store.createRun({
      preparation: gatePreparation,
      artifactDraft: false,
    });
    await store.bindGateCorrelation('a-b', 'c', gatePreparation.runId);

    await expect(store.resolveGateCorrelation('a-b', 'c')).resolves.toBe(
      gatePreparation.runId,
    );
    await expect(
      store.resolveGateCorrelation('a', 'b-c'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects tampered index records and loaded-run tuple mismatches', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const authority = new ValidationStoreAuthority(Buffer.alloc(32, 9));
    const store = new ValidationStore(join(parent, 'store'), authority);
    const gatePreparation = preparation('tamperedrun00001');
    gatePreparation.invocation = 'gate';
    gatePreparation.correlation = {
      gateRunId: 'gate',
      launchAttemptId: 'attempt',
    };
    const created = await store.createRun({
      preparation: gatePreparation,
      artifactDraft: false,
    });
    await store.bindGateCorrelation('gate', 'attempt', gatePreparation.runId);
    const correlationName = (await readdir(store.root)).find((name) =>
      name.startsWith('correlation-'),
    )!;
    const correlationPath = join(store.root, correlationName);
    const record = JSON.parse(await readFile(correlationPath, 'utf8')) as {
      gateRunId: string;
    };
    record.gateRunId = 'other';
    await writeFile(correlationPath, JSON.stringify(record), { mode: 0o600 });
    await expect(
      store.resolveGateCorrelation('gate', 'attempt'),
    ).rejects.toThrow(/schema/);

    await rm(correlationPath);
    await store.bindGateCorrelation('gate', 'attempt', gatePreparation.runId);
    const state = authority.open(await readFile(created.statePath, 'utf8')) as {
      preparation: ReviewPreparationV1;
    };
    state.preparation.correlation.launchAttemptId = 'other';
    await writeFile(created.statePath, authority.seal(state), { mode: 0o600 });
    await expect(
      store.resolveGateCorrelation('gate', 'attempt'),
    ).rejects.toThrow(/does not match/);
  });

  it('rejects authenticated malformed telemetry and incoherent phases', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const authority = new ValidationStoreAuthority(Buffer.alloc(32, 11));
    const store = new ValidationStore(join(parent, 'store'), authority);
    const created = await store.createRun({
      preparation: preparation('stricttelemetry1'),
      artifactDraft: false,
    });
    const initial = authority.open(
      await readFile(created.statePath, 'utf8'),
    ) as Record<string, unknown>;
    await writeFile(
      created.statePath,
      authority.seal({
        ...initial,
        telemetry: [
          {
            schemaVersion: 1,
            validationRunId: created.runId,
            phase: 'pre_artifact',
            adapterId: 7,
            requestStartedAt: '2026-07-30T20:00:00.000Z',
            requestCompletedAt: '2026-07-30T20:00:01.000Z',
            observation: null,
            disposition: 'missing',
            rejectionReason: null,
          },
        ],
      }),
      { mode: 0o600 },
    );
    await expect(store.readRun(created.runId)).rejects.toThrow(/adapterId/);

    await writeFile(
      created.statePath,
      authority.seal({
        ...initial,
        telemetry: [
          {
            schemaVersion: 1,
            validationRunId: created.runId,
            phase: 'post_artifact',
            adapterId: null,
            requestStartedAt: '2026-07-30T20:00:00.000Z',
            requestCompletedAt: '2026-07-30T20:00:01.000Z',
            observation: null,
            disposition: 'missing',
            rejectionReason: null,
          },
        ],
      }),
      { mode: 0o600 },
    );
    await expect(store.readRun(created.runId)).rejects.toThrow(/incoherent/);

    await writeFile(
      created.statePath,
      authority.seal({
        ...initial,
        phase: 'evidence_started',
        telemetry: [],
        context: null,
        plan: null,
        assignment: null,
        receipt: null,
      }),
      { mode: 0o600 },
    );
    await expect(store.readRun(created.runId)).rejects.toThrow(
      /post-checkpoint/,
    );
  });
});
