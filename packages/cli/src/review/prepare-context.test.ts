import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GitChangeMapAdapter } from './change-map';
import { prepareReviewContext } from './prepare-context';
import type { ContextBudgetTelemetry } from './types';
import { ValidationStore } from './validation-store';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

function clock() {
  let tick = 0;
  return () => new Date(Date.UTC(2098, 0, 1, 0, 0, 0, tick++));
}

const planSource = `## Phase 2

### Task p02-t01: Prepare

**Files:**

- Create: \`a.ts\`

**Step 1: Test** Cover preparation.
`;

describe('prepareReviewContext', () => {
  async function dependencies(events: string[]) {
    const parent = await mkdtemp(join(tmpdir(), 'oat-prepare-'));
    roots.push(parent);
    const telemetry: ContextBudgetTelemetry = {
      observedAt: '2098-01-01T00:00:00.002Z',
      contextWindowTokens: 100_000,
      consumedTokens: 50_000,
      remainingTokens: 50_000,
      adapterId: 'host',
      source: 'host',
    };
    const git: GitChangeMapAdapter = {
      nameStatus: vi.fn(async () => {
        events.push('git');
        return Buffer.from('A\0a.ts\0');
      }),
      numstat: vi.fn(async () => Buffer.from('1\t0\ta.ts\0')),
      patch: vi.fn(async () => ({
        output: (async function* () {
          yield new Uint8Array(9);
        })(),
        stop: vi.fn(),
      })),
    };
    return {
      store: new ValidationStore(join(parent, 'store')),
      git,
      telemetryAdapter: {
        observe: async () => {
          events.push('telemetry');
          return telemetry;
        },
      },
      telemetryAdapterId: 'host',
      commandExecutable: process.execPath,
      commandArgvPrefix: ['/repo/packages/cli/dist/index.js'],
      clock: clock(),
      reap: async () => {
        events.push('reap');
      },
    };
  }

  it('reaps first and returns metadata, private draft, and trusted commands', async () => {
    const events: string[] = [];
    const deps = await dependencies(events);
    const result = await prepareReviewContext(
      {
        repoRoot: '/repo',
        project: 'project',
        scope: 'p02-t01',
        workflowMode: 'spec-driven',
        range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
        sink: 'artifact',
        invocation: 'manual',
        budget: { totalMs: 120_000, source: 'gate' },
        obligationSources: {
          plan: { source: planSource, path: 'plan.md' },
          implementation: null,
        },
        target: 'p02-t01',
      },
      deps,
    );
    expect(events[0]).toBe('reap');
    expect(result.preparation.changeMap.files).toHaveLength(1);
    expect(result.preparation.obligations.map(({ id }) => id)).toEqual([
      'p02-t01',
    ]);
    expect(result.preparation).not.toHaveProperty('contentDiff');
    expect(result.artifactDraftPath).toMatch(/artifact-draft\.md$/);
    expect(result.commands.checkpointArtifacts.executable).toBe(
      process.execPath,
    );
    expect(result.commands.checkpointArtifacts.argv).toContain(
      result.preparation.runId,
    );
    expect(result.commands.checkpointArtifacts.argv[0]).toBe(
      '/repo/packages/cli/dist/index.js',
    );
    expect(JSON.stringify(result.preparation)).not.toContain(
      '--checkpoint-token',
    );
  });

  it('requires exact gate correlation and binds its private index', async () => {
    const events: string[] = [];
    const deps = await dependencies(events);
    await expect(
      prepareReviewContext(
        {
          repoRoot: '/repo',
          project: 'project',
          scope: 'p02-t01',
          workflowMode: 'spec-driven',
          range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
          sink: 'structured',
          invocation: 'gate',
          budget: null,
          obligationSources: {
            plan: { source: planSource, path: 'plan.md' },
            implementation: null,
          },
          target: 'p02-t01',
        },
        deps,
      ),
    ).rejects.toThrow(/correlation/);

    const result = await prepareReviewContext(
      {
        repoRoot: '/repo',
        project: 'project',
        scope: 'p02-t01',
        workflowMode: 'spec-driven',
        range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
        sink: 'structured',
        invocation: 'gate',
        budget: null,
        gateRunId: 'gate-1',
        launchAttemptId: 'attempt-1',
        obligationSources: {
          plan: { source: planSource, path: 'plan.md' },
          implementation: null,
        },
        target: 'p02-t01',
      },
      deps,
    );
    await expect(
      deps.store.resolveGateCorrelation('gate-1', 'attempt-1'),
    ).resolves.toBe(result.preparation.runId);
    expect(result.artifactDraftPath).toBeNull();
  });
});
