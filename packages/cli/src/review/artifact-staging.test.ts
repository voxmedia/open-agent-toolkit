import {
  chmod,
  link,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupAcceptedArtifactProof,
  createArtifactDraft,
  publishAcceptedArtifact,
  snapshotArtifactDraft,
} from './artifact-staging';
import type { ReviewAccountingV1, ReviewerAccountingOverlayV1 } from './types';

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

function artifact(value = accounting()): string {
  return `# Review\n\n## Review Accounting\n\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\`\n`;
}

function accountingOverlay(): ReviewerAccountingOverlayV1 {
  return {
    evidence: [],
    lanes: [],
    classifications: [],
    verification: {
      promotedFindings: [],
      consequentialAbsence: null,
      workerConflict: null,
      crossLaneGap: null,
      positiveCoverage: [],
      deterministicResults: [],
    },
    budget: { evidenceStoppedAt: null, outputReservePreserved: null },
  };
}

async function privateRoot(): Promise<string> {
  const root = join(
    tmpdir(),
    `oat-artifact-staging-${process.pid}-${roots.length}-${Date.now()}`,
  );
  roots.push(root);
  await mkdir(root, { mode: 0o700 });
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('private artifact staging', () => {
  it('creates one exclusive no-follow 0600 draft', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    const info = await lstat(draft.path);
    expect(info.isFile()).toBe(true);
    expect(info.isSymbolicLink()).toBe(false);
    expect(info.mode & 0o077).toBe(0);
    await expect(createArtifactDraft(root)).rejects.toThrow();

    const symlinkRoot = await privateRoot();
    await symlink(draft.path, join(symlinkRoot, 'artifact-draft.md'));
    await expect(createArtifactDraft(symlinkRoot)).rejects.toThrow();
  });

  it('rejects inode and link replacement before descriptor snapshot', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    const replacement = join(root, 'replacement.md');
    await writeFile(draft.path, artifact());
    await writeFile(replacement, artifact(), { mode: 0o600 });
    await rm(draft.path);
    await rename(replacement, draft.path);
    await expect(snapshotArtifactDraft(draft, accounting())).rejects.toThrow(
      /identity/,
    );
  });

  it('captures descriptor bytes and requires embedded/envelope equality', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    await writeFile(draft.path, '# mutated after snapshot');
    expect(Buffer.from(snapshot.bytesBase64, 'base64').toString('utf8')).toBe(
      artifact(),
    );
    await expect(
      snapshotArtifactDraft(draft, {
        ...accounting(),
        receipt: 'different',
      }),
    ).rejects.toThrow(/accounting/i);
  });

  it('materializes overlay-authored accounting only in the immutable snapshot', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    const overlay = accountingOverlay();
    await writeFile(draft.path, artifact(overlay as never));

    const snapshot = await snapshotArtifactDraft(draft, accounting(), overlay);
    const snapshotSource = Buffer.from(snapshot.bytesBase64, 'base64').toString(
      'utf8',
    );
    expect(snapshot.accounting).toEqual(accounting());
    expect(snapshotSource).toContain('"receipt":"receipt"');
    expect(await readFile(draft.path, 'utf8')).toBe(artifact(overlay as never));
    await expect(
      snapshotArtifactDraft(draft, accounting(), {
        ...overlay,
        budget: { ...overlay.budget, outputReservePreserved: true },
      }),
    ).rejects.toThrow(/overlay accounting/i);
  });

  it('rechecks snapshot digest and publishes only validated bytes atomically', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const destination = join(root, 'published', 'review.md');
    const reservationId = 'a'.repeat(64);
    const identity = await publishAcceptedArtifact(
      snapshot,
      destination,
      reservationId,
    );
    await cleanupAcceptedArtifactProof(
      snapshot,
      destination,
      reservationId,
      identity,
    );
    expect(await readFile(destination, 'utf8')).toBe(artifact());
    expect((await lstat(destination)).mode & 0o077).toBe(0);
    await expect(
      publishAcceptedArtifact(snapshot, destination, reservationId),
    ).rejects.toThrow();

    await expect(
      publishAcceptedArtifact(
        { ...snapshot, digest: '0'.repeat(64) },
        join(root, 'published', 'tampered.md'),
        'b'.repeat(64),
      ),
    ).rejects.toThrow(/digest/);
  });

  it('atomically rejects a destination created in the former commit gap', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const destination = join(root, 'published', 'review.md');
    const unrelatedBytes = Buffer.from(snapshot.bytesBase64, 'base64');

    await expect(
      publishAcceptedArtifact(snapshot, destination, 'c'.repeat(64), null, {
        beforeCommit: async () => {
          await writeFile(destination, unrelatedBytes, { mode: 0o600 });
        },
      }),
    ).rejects.toThrow(/already exists/);
    expect(await readFile(destination)).toEqual(unrelatedBytes);
    expect(await readdir(join(root, 'published'))).toEqual(['review.md']);
  });

  it.each([
    ['proof creation', 'afterProofCreation'],
    ['partial proof write', 'afterPartialProofWrite'],
  ] as const)(
    'recovers after a process crash following %s',
    async (_name, hookName) => {
      const root = await privateRoot();
      const draft = await createArtifactDraft(root);
      await writeFile(draft.path, artifact());
      const snapshot = await snapshotArtifactDraft(draft, accounting());
      const destination = join(root, 'published', 'review.md');
      const reservationId = '3'.repeat(64);
      const crash = new Error(`simulated crash after ${hookName}`);

      await expect(
        publishAcceptedArtifact(snapshot, destination, reservationId, null, {
          [hookName]: async () => Promise.reject(crash),
        }),
      ).rejects.toBe(crash);
      await expect(lstat(destination)).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(await readdir(join(root, 'published'))).toEqual([
        expect.stringMatching(/\.initializing$/),
      ]);

      const identity = await publishAcceptedArtifact(
        snapshot,
        destination,
        reservationId,
      );
      await cleanupAcceptedArtifactProof(
        snapshot,
        destination,
        reservationId,
        identity,
      );
      expect(await readFile(destination, 'utf8')).toBe(artifact());
      expect(await readdir(join(root, 'published'))).toEqual(['review.md']);
    },
  );

  it.each([
    ['beforeCommit', 'same-size'],
    ['beforeCommit', 'resized'],
    ['afterCommit', 'same-size'],
    ['afterCommit', 'resized'],
  ] as const)(
    'rejects %s descriptor mutation with %s bytes',
    async (hookName, mutation) => {
      const root = await privateRoot();
      const draft = await createArtifactDraft(root);
      await writeFile(draft.path, artifact());
      const snapshot = await snapshotArtifactDraft(draft, accounting());
      const destination = join(root, 'published', 'review.md');
      const original = Buffer.from(snapshot.bytesBase64, 'base64');
      const replacement =
        mutation === 'same-size'
          ? Buffer.alloc(original.length, 0x78)
          : Buffer.concat([original, Buffer.from('resized')]);

      await expect(
        publishAcceptedArtifact(snapshot, destination, '4'.repeat(64), null, {
          [hookName]: async (proofPath: string) => {
            await writeFile(proofPath, replacement);
          },
        }),
      ).rejects.toThrow(/digest|identity/);
    },
  );

  it('serializes concurrent retries through publication and cleanup', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const destination = join(root, 'published', 'review.md');
    const reservationId = '5'.repeat(64);
    let releasePublish!: () => void;
    let publishEntered!: () => void;
    const publishBarrier = new Promise<void>((resolve) => {
      releasePublish = resolve;
    });
    const atPublishBarrier = new Promise<void>((resolve) => {
      publishEntered = resolve;
    });
    const firstPublish = publishAcceptedArtifact(
      snapshot,
      destination,
      reservationId,
      null,
      {
        beforeCommit: async () => {
          publishEntered();
          await publishBarrier;
        },
      },
    );
    await atPublishBarrier;
    let secondPublishSettled = false;
    const secondPublish = publishAcceptedArtifact(
      snapshot,
      destination,
      reservationId,
    ).finally(() => {
      secondPublishSettled = true;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(secondPublishSettled).toBe(false);
    releasePublish();
    const [firstIdentity, secondIdentity] = await Promise.all([
      firstPublish,
      secondPublish,
    ]);
    expect(secondIdentity).toEqual(firstIdentity);

    let releaseCleanup!: () => void;
    let cleanupEntered!: () => void;
    const cleanupBarrier = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const atCleanupBarrier = new Promise<void>((resolve) => {
      cleanupEntered = resolve;
    });
    const firstCleanup = cleanupAcceptedArtifactProof(
      snapshot,
      destination,
      reservationId,
      firstIdentity,
      {
        beforeUnlink: async () => {
          cleanupEntered();
          await cleanupBarrier;
        },
      },
    );
    await atCleanupBarrier;
    let secondCleanupSettled = false;
    const secondCleanup = cleanupAcceptedArtifactProof(
      snapshot,
      destination,
      reservationId,
      secondIdentity,
    ).finally(() => {
      secondCleanupSettled = true;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(secondCleanupSettled).toBe(false);
    releaseCleanup();
    await expect(Promise.all([firstCleanup, secondCleanup])).resolves.toEqual([
      undefined,
      undefined,
    ]);
    expect(await readdir(join(root, 'published'))).toEqual(['review.md']);
  });

  it('preserves a replacement observed before proof removal', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const destination = join(root, 'published', 'review.md');
    const reservationId = '6'.repeat(64);
    const identity = await publishAcceptedArtifact(
      snapshot,
      destination,
      reservationId,
    );
    let replacementPath = '';

    await expect(
      cleanupAcceptedArtifactProof(
        snapshot,
        destination,
        reservationId,
        identity,
        {
          beforeUnlink: async (proofPath) => {
            replacementPath = proofPath;
            await rm(proofPath);
            await writeFile(proofPath, 'unrelated replacement', {
              mode: 0o600,
            });
          },
        },
      ),
    ).rejects.toThrow(/removal identity drift/);
    expect(await readFile(replacementPath, 'utf8')).toBe(
      'unrelated replacement',
    );
  });

  it('preserves the proof when cleanup detects corrupted bytes', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const destination = join(root, 'published', 'review.md');
    const reservationId = '7'.repeat(64);
    const identity = await publishAcceptedArtifact(
      snapshot,
      destination,
      reservationId,
    );
    const original = Buffer.from(snapshot.bytesBase64, 'base64');
    await writeFile(destination, Buffer.alloc(original.length, 0x78));

    await expect(
      cleanupAcceptedArtifactProof(
        snapshot,
        destination,
        reservationId,
        identity,
      ),
    ).rejects.toThrow(/digest/);
    const entries = await readdir(join(root, 'published'));
    const proofName = entries.find((entry) => entry.endsWith('.proof'));
    expect(proofName).toBeDefined();
    const destinationInfo = await lstat(destination);
    const proofInfo = await lstat(join(root, 'published', proofName!));
    expect(proofInfo.nlink).toBe(2);
    expect(destinationInfo.nlink).toBe(2);
    expect(proofInfo.dev).toBe(destinationInfo.dev);
    expect(proofInfo.ino).toBe(destinationInfo.ino);
  });

  it('rejects mutated destination bytes on a consumed replay', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const destination = join(root, 'published', 'review.md');
    const reservationId = 'f'.repeat(64);
    const identity = await publishAcceptedArtifact(
      snapshot,
      destination,
      reservationId,
    );
    await cleanupAcceptedArtifactProof(
      snapshot,
      destination,
      reservationId,
      identity,
    );
    const mutated = Buffer.from(snapshot.bytesBase64, 'base64');
    mutated[0] = mutated[0]! ^ 1;
    await writeFile(destination, mutated);

    await expect(
      publishAcceptedArtifact(snapshot, destination, reservationId, identity),
    ).rejects.toThrow(/digest/);
  });

  it('rejects an extra destination hard link on a consumed replay', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const destination = join(root, 'published', 'review.md');
    const reservationId = '1'.repeat(64);
    const identity = await publishAcceptedArtifact(
      snapshot,
      destination,
      reservationId,
    );
    await cleanupAcceptedArtifactProof(
      snapshot,
      destination,
      reservationId,
      identity,
    );
    await link(destination, join(root, 'unrelated-hard-link'));

    await expect(
      publishAcceptedArtifact(snapshot, destination, reservationId, identity),
    ).rejects.toThrow(/identity|link/);
  });

  it('rejects destination path replacement on a consumed replay', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const destination = join(root, 'published', 'review.md');
    const reservationId = '2'.repeat(64);
    const identity = await publishAcceptedArtifact(
      snapshot,
      destination,
      reservationId,
    );
    await cleanupAcceptedArtifactProof(
      snapshot,
      destination,
      reservationId,
      identity,
    );
    await rm(destination);
    await writeFile(destination, Buffer.from(snapshot.bytesBase64, 'base64'), {
      mode: 0o600,
    });

    await expect(
      publishAcceptedArtifact(snapshot, destination, reservationId, identity),
    ).rejects.toThrow(/identity/);
  });

  it('rejects publication temporary path replacement and link drift', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const replacedDestination = join(root, 'published', 'replaced.md');
    await expect(
      publishAcceptedArtifact(
        snapshot,
        replacedDestination,
        'd'.repeat(64),
        null,
        {
          beforeCommit: async (temporaryPath) => {
            await rm(temporaryPath);
            await writeFile(temporaryPath, 'unverified replacement', {
              mode: 0o600,
            });
          },
        },
      ),
    ).rejects.toThrow(/drift|identity/);
    await expect(lstat(replacedDestination)).rejects.toMatchObject({
      code: 'ENOENT',
    });

    const linkedDestination = join(root, 'published', 'linked.md');
    await expect(
      publishAcceptedArtifact(
        snapshot,
        linkedDestination,
        'e'.repeat(64),
        null,
        {
          beforeCommit: async (temporaryPath) => {
            await link(temporaryPath, join(root, 'second-publication-link'));
          },
        },
      ),
    ).rejects.toThrow(/link|identity/);
    await expect(lstat(linkedDestination)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('leaves blocked drafts private and deletable without publication', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    await chmod(draft.path, 0o600);
    await rm(draft.path);
    await expect(lstat(draft.path)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(lstat(join(root, 'published'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
