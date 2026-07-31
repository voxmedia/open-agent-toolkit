import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
        { runId: 'validation-run-1', destination: `${destination}.replay` },
        store as never,
      ),
    ).rejects.toMatchObject({ code: 'accepted-snapshot-consumed' });
  });

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
