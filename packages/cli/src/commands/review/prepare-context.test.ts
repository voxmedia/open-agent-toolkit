import { resolve } from 'node:path';
import { Readable } from 'node:stream';

import type { PrepareReviewContextResultV1 } from '@review/types';
import { describe, expect, it, vi } from 'vitest';

import {
  createReviewPrepareContextCommand,
  normalizeReviewCommandLaunch,
} from './prepare-context';

const baseInput = {
  schemaVersion: 1,
  repoRoot: '/repo',
  project: '.oat/projects/shared/demo',
  scope: 'p02',
  workflowMode: 'spec-driven',
  range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
  sink: 'artifact',
  invocation: 'manual',
  budget: { totalMs: 120_000, source: 'outer' },
  gateRunId: null,
  launchAttemptId: null,
  obligationSources: {
    plan: {
      source:
        '### Task p02-t01: Test\n\n**Files:**\n\n- Modify: `a.ts`\n\n**Step 1: Test** Run.',
      path: 'plan.md',
    },
    spec: null,
    implementation: null,
  },
  priorEvidenceCandidates: [],
  target: 'reviewer',
};

const normalizedInput = {
  ...baseInput,
  throughTaskId: null,
  gateRunId: undefined,
  launchAttemptId: undefined,
  obligationSources: {
    ...baseInput.obligationSources,
    spec: undefined,
  },
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
      cwd: '/branch',
      argv: ['/branch/oat.js', 'review', 'checkpoint-artifacts'],
      stdin: 'none',
    },
    validatePlan: {
      executable: process.execPath,
      cwd: '/branch',
      argv: ['/branch/oat.js', 'review', 'validate-plan'],
      stdin: 'review-plan-json',
    },
    beginEvidence: {
      executable: process.execPath,
      cwd: '/branch',
      argv: ['/branch/oat.js', 'review', 'begin-evidence'],
      stdin: 'none',
    },
    bindWorkerDossier: {
      executable: process.execPath,
      cwd: '/branch',
      argv: [
        '/branch/oat.js',
        'review',
        'bind-worker-dossier',
        '--receipt',
        '__OAT_PLAN_RECEIPT__',
      ],
      stdin: 'worker-dossier-json',
    },
  },
  coordinatorCommands: {
    bindAcceptedContinuation: {
      executable: process.execPath,
      cwd: '/branch',
      argv: [
        '/branch/oat.js',
        'review',
        'bind-accepted-continuation',
        '--coordinator-token',
        'bind-token',
      ],
      stdin: 'accepted-continuation-json',
    },
    cleanupValidationRun: {
      executable: process.execPath,
      cwd: '/branch',
      argv: [
        '/branch/oat.js',
        'review',
        'cleanup-validation-run',
        '--coordinator-token',
        'cleanup-token',
      ],
      stdin: 'none',
    },
  },
} as unknown as PrepareReviewContextResultV1;

describe('createReviewPrepareContextCommand', () => {
  it('anchors source launches without changing packaged launch cwd', () => {
    const sourceLaunch = {
      command: process.execPath,
      args: ['--import', 'tsx', resolve('src/index.ts')],
      cwd: '/ephemeral/repo',
    };
    expect(normalizeReviewCommandLaunch(sourceLaunch)).toEqual({
      ...sourceLaunch,
      cwd: resolve('.'),
    });

    const packagedLaunch = {
      command: '/opt/oat/bin/node',
      args: ['/opt/oat/dist/index.js'],
      cwd: '/ephemeral/repo',
    };
    expect(normalizeReviewCommandLaunch(packagedLaunch)).toEqual(
      packagedLaunch,
    );
  });

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
        cwd: '/branch',
      },
    });

    await command.parseAsync(['node', 'oat', 'prepare-context']);

    expect(brokerPrepare).toHaveBeenCalledWith({
      preparationInput: normalizedInput,
      launcherInvocation: {
        executable: process.execPath,
        argvPrefix: ['/branch/oat.js'],
        cwd: '/branch',
      },
    });
    expect(createDependencies).not.toHaveBeenCalled();
    expect(JSON.parse(write.mock.calls[0]?.[0] as string).ok).toBe(true);
  });

  it('forwards complete gate correlation from the environment', async () => {
    const brokerPrepare = vi.fn(async () => prepared);
    const write = vi.fn();
    const command = createReviewPrepareContextCommand({
      stdin: Readable.from([
        JSON.stringify({ ...baseInput, invocation: 'gate' }),
      ]),
      write,
      setExitCode: vi.fn(),
      brokerPrepare,
      processEnv: {
        OAT_GATE_RUN_ID: 'gate-run',
        OAT_GATE_LAUNCH_ATTEMPT_ID: 'launch-attempt',
      },
    });

    await command.parseAsync(['node', 'oat', 'prepare-context']);

    expect(brokerPrepare).toHaveBeenCalledWith(
      expect.objectContaining({
        preparationInput: expect.objectContaining({
          invocation: 'gate',
          gateRunId: 'gate-run',
          launchAttemptId: 'launch-attempt',
        }),
      }),
    );
    expect(JSON.parse(write.mock.calls[0]?.[0] as string).ok).toBe(true);
  });

  it.each([
    {
      name: 'partial environment',
      input: { ...baseInput, invocation: 'gate' },
      processEnv: { OAT_GATE_RUN_ID: 'gate-run' },
    },
    {
      name: 'mismatched input and environment',
      input: {
        ...baseInput,
        invocation: 'gate',
        gateRunId: 'gate-run',
        launchAttemptId: 'input-attempt',
      },
      processEnv: {
        OAT_GATE_RUN_ID: 'gate-run',
        OAT_GATE_LAUNCH_ATTEMPT_ID: 'environment-attempt',
      },
    },
  ])('rejects $name without downgrading', async ({ input, processEnv }) => {
    const brokerPrepare = vi.fn();
    const write = vi.fn();
    const command = createReviewPrepareContextCommand({
      stdin: Readable.from([JSON.stringify(input)]),
      write,
      setExitCode: vi.fn(),
      brokerPrepare,
      processEnv,
    });

    await command.parseAsync(['node', 'oat', 'prepare-context']);

    expect(brokerPrepare).not.toHaveBeenCalled();
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { code: 'invalid-prepare-context-input' },
    });
  });

  it('does not apply gate environment correlation to manual input', async () => {
    const brokerPrepare = vi.fn(async () => prepared);
    const command = createReviewPrepareContextCommand({
      stdin: Readable.from([JSON.stringify(baseInput)]),
      write: vi.fn(),
      setExitCode: vi.fn(),
      brokerPrepare,
      processEnv: {
        OAT_GATE_RUN_ID: 'gate-run',
        OAT_GATE_LAUNCH_ATTEMPT_ID: 'launch-attempt',
      },
    });

    await command.parseAsync(['node', 'oat', 'prepare-context']);

    expect(brokerPrepare).toHaveBeenCalledWith(
      expect.objectContaining({ preparationInput: normalizedInput }),
    );
  });

  it('forwards an explicit inclusive through-task boundary', async () => {
    const brokerPrepare = vi.fn(async () => prepared);
    const command = createReviewPrepareContextCommand({
      stdin: Readable.from([
        JSON.stringify({ ...baseInput, throughTaskId: 'p02-t01' }),
      ]),
      write: vi.fn(),
      setExitCode: vi.fn(),
      brokerPrepare,
    });
    await command.parseAsync(['node', 'oat', 'prepare-context']);
    expect(brokerPrepare).toHaveBeenCalledWith(
      expect.objectContaining({
        preparationInput: expect.objectContaining({
          scope: 'p02',
          throughTaskId: 'p02-t01',
        }),
      }),
    );
  });

  it('rejects a cross-phase through-task as input without broker preparation', async () => {
    const brokerPrepare = vi.fn();
    const write = vi.fn();
    const setExitCode = vi.fn();
    const command = createReviewPrepareContextCommand({
      stdin: Readable.from([
        JSON.stringify({ ...baseInput, throughTaskId: 'p03-t01' }),
      ]),
      write,
      setExitCode,
      brokerPrepare,
    });

    await command.parseAsync(['node', 'oat', 'prepare-context']);

    expect(brokerPrepare).not.toHaveBeenCalled();
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: {
        category: 'input',
        code: 'invalid-prepare-context-input',
      },
    });
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
        cwd: '/branch',
      },
    });

    await command.parseAsync(['node', 'oat', 'prepare-context']);

    expect(prepare).toHaveBeenCalledOnce();
    expect(createDependencies).toHaveBeenCalledWith(normalizedInput, {
      executable: process.execPath,
      argvPrefix: ['/branch/oat.js'],
      cwd: '/branch',
    });
    expect(setExitCode).toHaveBeenCalledWith(0);
    const output = write.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toMatchObject({
      ok: true,
      result: {
        validationRunId: 'run-1',
        preparationDigest: 'digest',
        commands: prepared.commands,
        coordinatorCommands: prepared.coordinatorCommands,
      },
    });
    expect(JSON.parse(output).result.commands.bindWorkerDossier).toEqual(
      prepared.commands.bindWorkerDossier,
    );
    expect(JSON.parse(output).result.commands).not.toHaveProperty(
      'bindAcceptedContinuation',
    );
    expect(output).not.toContain('contextWindowTokens');
    expect(output).not.toContain('remainingTokens');
  });

  it('rejects malformed nested input and policy failures as exit one', async () => {
    for (const input of [
      { ...baseInput, budget: { totalMs: 1000 } },
      { ...baseInput, scope: 'final', throughTaskId: 'p02-t01' },
      { ...baseInput, scope: 'p02-t01', throughTaskId: 'p02-t01' },
      { ...baseInput, invocation: 'gate' },
      {
        ...baseInput,
        gateRunId: 'gate-1',
      },
      { ...baseInput, unknown: true },
      { ...baseInput, scope: 'everything' },
      { ...baseInput, range: { baseSha: 'bad', headSha: 'also-bad' } },
      {
        ...baseInput,
        obligationSources: { ...baseInput.obligationSources, plan: null },
      },
    ]) {
      const write = vi.fn();
      const command = createReviewPrepareContextCommand({
        stdin: Readable.from([JSON.stringify(input)]),
        write,
        setExitCode: vi.fn(),
        prepare: vi.fn(),
        createDependencies: () => ({}) as never,
        processEnv: {},
      });

      await command.parseAsync(['node', 'oat', 'prepare-context']);

      expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
        ok: false,
        error: { category: 'input' },
      });
    }
  });
});
