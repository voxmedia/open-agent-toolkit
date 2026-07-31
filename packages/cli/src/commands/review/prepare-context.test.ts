import { Readable } from 'node:stream';

import type { PrepareReviewContextResultV1 } from '@review/types';
import { describe, expect, it, vi } from 'vitest';

import { createReviewPrepareContextCommand } from './prepare-context';

const baseInput = {
  repoRoot: '/repo',
  project: '.oat/projects/shared/demo',
  scope: 'p02',
  workflowMode: 'spec-driven',
  range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
  sink: 'artifact',
  invocation: 'manual',
  budget: { totalMs: 60_000, source: 'outer' },
  obligationSources: {},
  target: 'reviewer',
};

const prepared = {
  preparation: {
    runId: 'run-1',
    preparationDigest: 'digest',
    correlation: { gateRunId: null, launchAttemptId: 'attempt-1' },
    range: baseInput.range,
    expiresAt: '2098-01-01T01:00:00.000Z',
    prepareContextTelemetry: {
      contextWindowTokens: 100_000,
      consumedTokens: 10_000,
      remainingTokens: 90_000,
    },
  },
  artifactDraftPath: '/private/draft.md',
  commands: {
    checkpointArtifacts: {
      executable: process.execPath,
      argv: ['/branch/oat.js', 'review', 'checkpoint-artifacts'],
      stdin: 'none',
    },
    validatePlan: {
      executable: process.execPath,
      argv: ['/branch/oat.js', 'review', 'validate-plan'],
      stdin: 'review-plan-json',
    },
    beginEvidence: {
      executable: process.execPath,
      argv: ['/branch/oat.js', 'review', 'begin-evidence'],
      stdin: 'none',
    },
  },
} as unknown as PrepareReviewContextResultV1;

describe('createReviewPrepareContextCommand', () => {
  it('uses the launcher broker by default without constructing local authority', async () => {
    const brokerPrepare = vi.fn(async () => prepared);
    const createDependencies = vi.fn();
    const write = vi.fn();
    const command = createReviewPrepareContextCommand({
      stdin: Readable.from([JSON.stringify(baseInput)]),
      write,
      setExitCode: vi.fn(),
      brokerPrepare,
      createDependencies,
      launcherInvocation: {
        executable: process.execPath,
        argvPrefix: ['/branch/oat.js'],
      },
    });

    await command.parseAsync(['node', 'oat', 'prepare-context']);

    expect(brokerPrepare).toHaveBeenCalledWith({
      preparationInput: baseInput,
      launcherInvocation: {
        executable: process.execPath,
        argvPrefix: ['/branch/oat.js'],
      },
    });
    expect(createDependencies).not.toHaveBeenCalled();
    expect(JSON.parse(write.mock.calls[0]?.[0] as string).ok).toBe(true);
  });

  it('pairs budgets and emits metadata without numeric telemetry', async () => {
    const write = vi.fn();
    const prepare = vi.fn(async () => prepared);
    const setExitCode = vi.fn();
    const createDependencies = vi.fn(() => ({}) as never);
    const command = createReviewPrepareContextCommand({
      stdin: Readable.from([JSON.stringify(baseInput)]),
      write,
      setExitCode,
      prepare,
      createDependencies,
      launcherInvocation: {
        executable: process.execPath,
        argvPrefix: ['/branch/oat.js'],
      },
    });

    await command.parseAsync(['node', 'oat', 'prepare-context']);

    expect(prepare).toHaveBeenCalledOnce();
    expect(createDependencies).toHaveBeenCalledWith(baseInput, {
      executable: process.execPath,
      argvPrefix: ['/branch/oat.js'],
    });
    expect(setExitCode).toHaveBeenCalledWith(0);
    const output = write.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toMatchObject({
      ok: true,
      result: {
        validationRunId: 'run-1',
        preparationDigest: 'digest',
        commands: prepared.commands,
      },
    });
    expect(output).not.toContain('contextWindowTokens');
    expect(output).not.toContain('remainingTokens');
  });

  it('rejects partial budgets and mismatched gate correlation', async () => {
    for (const input of [
      { ...baseInput, budget: { totalMs: 1000 } },
      { ...baseInput, invocation: 'gate' },
      { ...baseInput, gateRunId: 'gate-1' },
    ]) {
      const write = vi.fn();
      const command = createReviewPrepareContextCommand({
        stdin: Readable.from([JSON.stringify(input)]),
        write,
        setExitCode: vi.fn(),
        prepare: vi.fn(),
        createDependencies: () => ({}) as never,
      });

      await command.parseAsync(['node', 'oat', 'prepare-context']);

      expect(JSON.parse(write.mock.calls[0]?.[0] as string).ok).toBe(false);
    }
  });
});
