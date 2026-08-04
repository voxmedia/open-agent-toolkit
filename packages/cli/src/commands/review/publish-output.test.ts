import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createArtifactDraft,
  snapshotArtifactDraft,
} from '@review/artifact-staging';
import type { ReviewAccountingV1 } from '@review/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createPublishOutputCommand,
  publishStoredReviewOutput,
} from './publish-output';

const roots: string[] = [];

function accounting(): ReviewAccountingV1 {
  return {
    schemaVersion: 1,
    receipt: 'receipt',
    contextDigest: 'context',
    planDigest: 'plan',
    assignmentDigest: 'assignment',
    strategy: 'selective-inline',
    completion: 'complete',
    evidence: [],
    lanes: [],
    classifications: [],
    verification: [],
    budget: { evidenceStoppedAt: null, outputReservePreserved: null },
  };
}

function artifact(): string {
  return `# Accepted review\n\nFindings: 0 critical, 0 important, 0 medium, 0 minor\n\n## Review Accounting\n\n\`\`\`json\n${JSON.stringify(accounting())}\n\`\`\`\n`;
}

function fakeStore(
  phase: string,
  acceptedSnapshot: {
    id: string;
    bytesBase64: string;
    digest: string;
    accounting: ReviewAccountingV1;
    publication: 'available' | 'consuming' | 'consumed';
    publicationIntent: {
      destination: string;
      reservationId: string;
      destinationDevice: number | null;
      destinationInode: number | null;
    } | null;
  } | null,
) {
  let state = { phase, acceptedSnapshot };
  return {
    updateRun: vi.fn(
      async (
        _runId: string,
        update: (current: typeof state) => typeof state,
      ) => {
        state = update(structuredClone(state));
        return { state };
      },
    ),
    get state() {
      return state;
    },
  };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('publish-output command', () => {
  it('publishes the exact accepted snapshot once without reading the draft', async () => {
    const root = join(
      tmpdir(),
      `oat-publish-output-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const store = fakeStore('accepted', {
      id: 'a'.repeat(64),
      ...snapshot,
      publication: 'available',
      publicationIntent: null,
    });
    await writeFile(draft.path, '# mutated reviewer draft');
    const destination = join(root, 'published', 'review.md');

    await expect(
      publishStoredReviewOutput(
        { runId: 'validation-run-1', destination },
        store as never,
      ),
    ).resolves.toEqual({
      snapshotId: 'a'.repeat(64),
      digest: snapshot.digest,
      destination,
    });
    expect(await readFile(destination, 'utf8')).toBe(artifact());
    expect(store.state.acceptedSnapshot?.publication).toBe('consumed');
    await expect(
      publishStoredReviewOutput(
        { runId: 'validation-run-1', destination },
        store as never,
      ),
    ).resolves.toMatchObject({ destination });
    expect(await readdir(join(root, 'published'))).toEqual(['review.md']);
    await expect(
      publishStoredReviewOutput(
        { runId: 'validation-run-1', destination: `${destination}.replay` },
        store as never,
      ),
    ).rejects.toMatchObject({ code: 'accepted-snapshot-consumed' });
  });

  it.each([
    ['reservation', 'afterReservation', 'consuming', false],
    ['filesystem link', 'afterFilesystemCommit', 'consuming', true],
    ['consumed update', 'afterConsumed', 'consumed', true],
  ] as const)(
    'recovers idempotently after a crash at the %s point',
    async (_name, hookName, expectedPublication, destinationExists) => {
      const root = join(
        tmpdir(),
        `oat-publish-recovery-${hookName}-${process.pid}-${Date.now()}`,
      );
      roots.push(root);
      await mkdir(root, { mode: 0o700 });
      const draft = await createArtifactDraft(root);
      await writeFile(draft.path, artifact());
      const snapshot = await snapshotArtifactDraft(draft, accounting());
      const store = fakeStore('accepted', {
        id: 'b'.repeat(64),
        ...snapshot,
        publication: 'available',
        publicationIntent: null,
      });
      const destination = join(root, 'published', 'review.md');
      const crash = new Error(`simulated crash after ${hookName}`);

      await expect(
        publishStoredReviewOutput(
          { runId: 'validation-run-1', destination },
          store as never,
          { [hookName]: async () => Promise.reject(crash) },
        ),
      ).rejects.toBe(crash);
      expect(store.state.acceptedSnapshot?.publication).toBe(
        expectedPublication,
      );
      if (destinationExists) {
        expect(await readFile(destination, 'utf8')).toBe(artifact());
      } else {
        await expect(lstat(destination)).rejects.toMatchObject({
          code: 'ENOENT',
        });
      }
      const differentDestination = join(root, 'published', 'different.md');
      await expect(
        publishStoredReviewOutput(
          {
            runId: 'validation-run-1',
            destination: differentDestination,
          },
          store as never,
        ),
      ).rejects.toMatchObject({ code: 'accepted-snapshot-consumed' });
      await expect(lstat(differentDestination)).rejects.toMatchObject({
        code: 'ENOENT',
      });

      await expect(
        publishStoredReviewOutput(
          { runId: 'validation-run-1', destination },
          store as never,
        ),
      ).resolves.toMatchObject({ destination });
      expect(store.state.acceptedSnapshot?.publication).toBe('consumed');
      expect(await readFile(destination, 'utf8')).toBe(artifact());
      expect(await readdir(join(root, 'published'))).toEqual(['review.md']);
    },
  );

  it.each(['consuming', 'consumed'] as const)(
    'fails closed for a legacy %s snapshot with unknown destination',
    async (publication) => {
      const bytes = Buffer.from(artifact());
      const store = fakeStore('accepted', {
        id: 'c'.repeat(64),
        bytesBase64: bytes.toString('base64'),
        digest: createHash('sha256').update(bytes).digest('hex'),
        accounting: accounting(),
        publication,
        publicationIntent: null,
      });
      await expect(
        publishStoredReviewOutput(
          {
            runId: 'validation-run-1',
            destination: '/unused/review.md',
          },
          store as never,
        ),
      ).rejects.toMatchObject({ code: 'accepted-snapshot-consumed' });
    },
  );

  it('reconciles concurrent same-reservation publication retries', async () => {
    const root = join(
      tmpdir(),
      `oat-publish-concurrent-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const store = fakeStore('accepted', {
      id: 'd'.repeat(64),
      ...snapshot,
      publication: 'available',
      publicationIntent: null,
    });
    const destination = join(root, 'published', 'review.md');
    let reservations = 0;
    let releaseReservations!: () => void;
    const reservationBarrier = new Promise<void>((resolve) => {
      releaseReservations = resolve;
    });
    const afterReservation = async () => {
      reservations++;
      if (reservations === 2) releaseReservations();
      await reservationBarrier;
    };

    await expect(
      Promise.all([
        publishStoredReviewOutput(
          { runId: 'validation-run-1', destination },
          store as never,
          { afterReservation },
        ),
        publishStoredReviewOutput(
          { runId: 'validation-run-1', destination },
          store as never,
          { afterReservation },
        ),
      ]),
    ).resolves.toEqual([
      expect.objectContaining({ destination }),
      expect.objectContaining({ destination }),
    ]);
    expect(store.state.acceptedSnapshot?.publication).toBe('consumed');
    expect(await readFile(destination, 'utf8')).toBe(artifact());
    expect(await readdir(join(root, 'published'))).toEqual(['review.md']);
  });

  it('refreshes consumed identity for a delayed same-reservation retry', async () => {
    const root = join(
      tmpdir(),
      `oat-publish-delayed-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const store = fakeStore('accepted', {
      id: 'e'.repeat(64),
      ...snapshot,
      publication: 'available',
      publicationIntent: null,
    });
    const destination = join(root, 'published', 'review.md');
    let firstReserved!: () => void;
    let releaseFirst!: () => void;
    const firstReservation = new Promise<void>((resolve) => {
      firstReserved = resolve;
    });
    const firstBarrier = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const first = publishStoredReviewOutput(
      { runId: 'validation-run-1', destination },
      store as never,
      {
        afterReservation: async () => {
          firstReserved();
          await firstBarrier;
        },
      },
    );
    await firstReservation;

    let secondReserved!: () => void;
    let releaseSecond!: () => void;
    const secondReservation = new Promise<void>((resolve) => {
      secondReserved = resolve;
    });
    const secondBarrier = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const second = publishStoredReviewOutput(
      { runId: 'validation-run-1', destination },
      store as never,
      {
        afterReservation: async () => {
          secondReserved();
          await secondBarrier;
        },
      },
    );
    await secondReservation;

    releaseFirst();
    await expect(first).resolves.toMatchObject({ destination });
    expect(await readdir(join(root, 'published'))).toEqual(['review.md']);
    releaseSecond();
    await expect(second).resolves.toMatchObject({ destination });
    expect(store.state.acceptedSnapshot?.publication).toBe('consumed');
    expect(await readFile(destination, 'utf8')).toBe(artifact());
    expect(await readdir(join(root, 'published'))).toEqual(['review.md']);
  });

  it.each([
    ['afterFilesystemCommit', 'same-size'],
    ['afterConsumed', 'resized'],
  ] as const)(
    'preserves proof when %s observes %s corruption',
    async (hookName, mutation) => {
      const root = join(
        tmpdir(),
        `oat-publish-corruption-${hookName}-${process.pid}-${Date.now()}`,
      );
      roots.push(root);
      await mkdir(root, { mode: 0o700 });
      const draft = await createArtifactDraft(root);
      await writeFile(draft.path, artifact());
      const snapshot = await snapshotArtifactDraft(draft, accounting());
      const store = fakeStore('accepted', {
        id: 'f'.repeat(64),
        ...snapshot,
        publication: 'available',
        publicationIntent: null,
      });
      const destination = join(root, 'published', 'review.md');
      const original = Buffer.from(snapshot.bytesBase64, 'base64');
      const replacement =
        mutation === 'same-size'
          ? Buffer.alloc(original.length, 0x78)
          : Buffer.concat([original, Buffer.from('resized')]);

      await expect(
        publishStoredReviewOutput(
          { runId: 'validation-run-1', destination },
          store as never,
          {
            [hookName]: async () => {
              await writeFile(destination, replacement);
            },
          },
        ),
      ).rejects.toThrow(/digest|identity/);
      expect(store.state.acceptedSnapshot?.publication).toBe('consumed');
      const entries = await readdir(join(root, 'published'));
      expect(entries).toContain('review.md');
      const proofName = entries.find((entry) => entry.endsWith('.proof'));
      expect(proofName).toBeDefined();
      const destinationInfo = await lstat(destination);
      const proofInfo = await lstat(join(root, 'published', proofName!));
      expect(proofInfo.nlink).toBe(2);
      expect(destinationInfo.nlink).toBe(2);
      expect(proofInfo.dev).toBe(destinationInfo.dev);
      expect(proofInfo.ino).toBe(destinationInfo.ino);
    },
  );

  it.each([
    ['blocked', 'terminal', null, 'output-publication-phase-invalid'],
    ['invalid', 'accounting_repair', null, 'output-publication-phase-invalid'],
    [
      'unaccepted',
      'evidence_started',
      null,
      'output-publication-phase-invalid',
    ],
    ['missing', 'accepted', null, 'accepted-snapshot-unavailable'],
  ])('rejects %s state', async (_name, phase, snapshot, code) => {
    const store = fakeStore(phase, snapshot);
    await expect(
      publishStoredReviewOutput(
        { runId: 'validation-run-1', destination: '/unused/review.md' },
        store as never,
      ),
    ).rejects.toMatchObject({ code });
  });

  it('emits one JSON success envelope', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    await createPublishOutputCommand({
      write,
      setExitCode,
      publish: vi.fn(async ({ destination }) => ({
        snapshotId: 'a'.repeat(64),
        digest: 'b'.repeat(64),
        destination,
      })),
    }).parseAsync([
      'node',
      'oat',
      '--run-id',
      'validation-run-1',
      '--destination',
      '/repo/review.md',
      '--json',
    ]);
    expect(setExitCode).toHaveBeenCalledWith(0);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toEqual({
      ok: true,
      result: {
        snapshotId: 'a'.repeat(64),
        digest: 'b'.repeat(64),
        destination: '/repo/review.md',
      },
    });
  });
});
