import {
  chmod,
  lstat,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createArtifactDraft,
  publishAcceptedArtifact,
  snapshotArtifactDraft,
} from './artifact-staging';
import type { ReviewAccountingV1 } from './types';

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
    await writeFile(draft.path, artifact());
    await rm(draft.path);
    await writeFile(draft.path, artifact(), { mode: 0o600 });
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

  it('rechecks snapshot digest and publishes only validated bytes atomically', async () => {
    const root = await privateRoot();
    const draft = await createArtifactDraft(root);
    await writeFile(draft.path, artifact());
    const snapshot = await snapshotArtifactDraft(draft, accounting());
    const destination = join(root, 'published', 'review.md');
    await publishAcceptedArtifact(snapshot, destination);
    expect(await readFile(destination, 'utf8')).toBe(artifact());
    expect((await lstat(destination)).mode & 0o077).toBe(0);
    await expect(
      publishAcceptedArtifact(snapshot, destination),
    ).rejects.toThrow();

    await expect(
      publishAcceptedArtifact(
        { ...snapshot, digest: '0'.repeat(64) },
        join(root, 'published', 'tampered.md'),
      ),
    ).rejects.toThrow(/digest/);
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
