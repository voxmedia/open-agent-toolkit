import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildState,
  contextFactory,
  createLoggerCapture,
  createProjectFixture,
  PROJECT_REL,
  runProjectSubcommand,
  snapshotYaml,
  writeConfig,
  type ProjectFixture,
} from './__tests__/fixtures';
import { createProjectCloseoutCheckCommand } from './index';

const CONFIGURED = {
  preApproval: ['summary', 'document', 'pr'],
  postApproval: [],
};

interface CheckPayload {
  status: string;
  invariant: string | null;
  route: string | null;
  nextOwner: Record<string, unknown> | null;
  inputs: Record<string, unknown>;
  message?: string;
}

async function check(
  fixture: ProjectFixture,
  options: {
    args?: string[];
    env?: NodeJS.ProcessEnv;
    resolveEffectiveConfig?: unknown;
  } = {},
): Promise<{ payload: CheckPayload; exitCode: number | undefined }> {
  const capture = createLoggerCapture();
  const command = createProjectCloseoutCheckCommand({
    buildCommandContext: contextFactory(fixture, capture),
    resolveProjectRoot: async () => fixture.root,
    env: options.env ?? {},
    ...(options.resolveEffectiveConfig
      ? { resolveEffectiveConfig: options.resolveEffectiveConfig as never }
      : {}),
  });
  await runProjectSubcommand(
    command,
    'closeout-check',
    [PROJECT_REL, ...(options.args ?? [])],
    ['--json'],
  );
  return {
    payload: capture.jsonPayloads[0] as CheckPayload,
    exitCode: process.exitCode as number | undefined,
  };
}

describe('oat project closeout-check', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode as number | undefined;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  describe('case 1: snapshot required but absent', () => {
    it('configured: effective workflow.postImplementSequence set', async () => {
      const fixture = await createProjectFixture(tempDirs, {
        configured: CONFIGURED,
      });
      const { payload, exitCode } = await check(fixture);

      expect(payload).toMatchObject({
        status: 'incomplete',
        invariant: 'snapshot_missing',
        route: 'oat-project-implement',
        nextOwner: { kind: 'snapshot', skill: 'oat-project-implement' },
        inputs: { configured: true, lite: false, autonomous: false },
      });
      expect(payload.message).toContain(
        '`oat_post_implement_sequence` is absent, but the effective `workflow.postImplementSequence` is configured',
      );
      expect(payload.message).toContain('Resume with oat-project-implement');
      expect(exitCode).toBe(1);
    });

    it('configured through a legacy value (wait still snapshots)', async () => {
      const fixture = await createProjectFixture(tempDirs, {
        configured: 'wait',
      });
      const { payload } = await check(fixture);
      expect(payload).toMatchObject({
        status: 'incomplete',
        invariant: 'snapshot_missing',
      });
    });

    it('configured through the user layer only', async () => {
      const fixture = await createProjectFixture(tempDirs);
      await mkdir(join(fixture.home, '.oat'), { recursive: true });
      await writeFile(
        join(fixture.home, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          workflow: { postImplementSequence: 'docs-pr' },
        }),
        'utf8',
      );
      const { payload } = await check(fixture);
      expect(payload).toMatchObject({
        status: 'incomplete',
        invariant: 'snapshot_missing',
        inputs: { configured: true },
      });
    });

    it('autonomous: --autonomous flag', async () => {
      const fixture = await createProjectFixture(tempDirs);
      const { payload, exitCode } = await check(fixture, {
        args: ['--autonomous'],
      });
      expect(payload).toMatchObject({
        status: 'incomplete',
        invariant: 'snapshot_missing',
        inputs: { autonomous: true, autonomousSource: 'flag' },
      });
      expect(exitCode).toBe(1);
    });

    it('lite: oat_workflow_mode lite', async () => {
      const fixture = await createProjectFixture(tempDirs, {
        state: buildState({ workflowMode: 'lite' }),
      });
      const { payload, exitCode } = await check(fixture);
      expect(payload).toMatchObject({
        status: 'incomplete',
        invariant: 'snapshot_missing',
        inputs: { lite: true, workflowMode: 'lite' },
      });
      expect(exitCode).toBe(1);
    });
  });

  it('case 2: names the next pending step in stored order', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      configured: CONFIGURED,
      state: buildState({
        snapshotLines: snapshotYaml({
          preApproval: ['summary', 'document', 'pr'],
          preApprovalCompleted: ['summary'],
        }),
      }),
    });
    const { payload, exitCode } = await check(fixture);
    expect(payload).toMatchObject({
      status: 'incomplete',
      invariant: 'pre_approval_step_pending',
      route: 'oat-project-implement',
      nextOwner: {
        kind: 'step',
        phase: 'pre_approval',
        step: 'document',
        skill: 'oat-project-document',
      },
    });
    expect(exitCode).toBe(1);
  });

  it('case 3: stops at the approval transition', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      configured: CONFIGURED,
      state: buildState({
        snapshotLines: snapshotYaml({
          status: 'awaiting_approval',
          preApprovalCompleted: ['summary', 'document', 'pr'],
          postApproval: ['retro'],
        }),
      }),
    });
    const { payload } = await check(fixture);
    expect(payload).toMatchObject({
      status: 'incomplete',
      invariant: 'approval_pending',
      nextOwner: { kind: 'approval' },
    });
  });

  it('case 3c: an empty pre_approval names both approval writes', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      configured: 'wait',
      state: buildState({
        snapshotLines: snapshotYaml({ preApproval: [] }),
      }),
    });
    const { payload } = await check(fixture);
    expect(payload).toMatchObject({
      status: 'incomplete',
      invariant: 'approval_pending',
      nextOwner: {
        kind: 'approval',
        skill: 'oat-project-implement',
        writes: ['approval: approved', 'approval: not_required'],
      },
    });
    expect(payload.message).toContain(
      'Next: record the final approval decision: `approval: approved` after final HiLL sign-off, or `approval: not_required` when no final checkpoint exists.',
    );
  });

  describe('a failed snapshot picks its owner in approval-aware order', () => {
    // p04 gate M1 (reviews/archived/p04-review-2026-10-01T180727Z.md): the
    // exact reproduction fixture. Pre-approval work is complete, approval is
    // pending, and the run failed with post-approval retro still stored.
    const GATE_FIXTURE = [
      'oat_post_implement_sequence:',
      '  status: failed',
      '  source: configured',
      '  pre_approval: [document, summary, pr]',
      '  pre_approval_completed: [document, summary, pr]',
      '  approval: pending',
      '  approval_source: null',
      '  post_approval: [retro]',
      '  post_approval_completed: []',
      '  failure: { boundary: approval, detail: interrupted before sign-off }',
    ];

    it('names the approval boundary, never retro, while approval is pending', async () => {
      const fixture = await createProjectFixture(tempDirs, {
        configured: 'docs-pr',
        state: buildState({ snapshotLines: GATE_FIXTURE }),
      });
      const { payload, exitCode } = await check(fixture);
      expect(payload).toMatchObject({
        status: 'incomplete',
        invariant: 'sequence_failed',
        route: 'oat-project-implement',
        nextOwner: {
          kind: 'approval',
          writes: ['approval: approved', 'approval: not_required'],
        },
      });
      expect(payload.nextOwner).not.toHaveProperty('step');
      expect(payload.message).not.toContain('retro');
      expect(exitCode).toBe(1);
    });

    it('names pending pre-approval work before the approval boundary', async () => {
      const fixture = await createProjectFixture(tempDirs, {
        state: buildState({
          snapshotLines: GATE_FIXTURE.map((line) =>
            line.startsWith('  pre_approval_completed:')
              ? '  pre_approval_completed: [document]'
              : line,
          ),
        }),
      });
      const { payload } = await check(fixture);
      expect(payload).toMatchObject({
        invariant: 'sequence_failed',
        nextOwner: { kind: 'step', phase: 'pre_approval', step: 'summary' },
      });
    });

    it('names post-approval work only once approval is recorded', async () => {
      const fixture = await createProjectFixture(tempDirs, {
        state: buildState({
          snapshotLines: GATE_FIXTURE.map((line) =>
            line.startsWith('  approval: ')
              ? '  approval: approved'
              : line.startsWith('  approval_source:')
                ? '  approval_source: user'
                : line,
          ),
        }),
      });
      const { payload } = await check(fixture);
      expect(payload).toMatchObject({
        invariant: 'sequence_failed',
        nextOwner: { kind: 'step', phase: 'post_approval', step: 'retro' },
      });
    });
  });

  it('case 3b: an approved run still owes its post-approval steps', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      state: buildState({
        snapshotLines: snapshotYaml({
          status: 'post_approval',
          preApprovalCompleted: ['summary', 'document', 'pr'],
          approval: 'approved',
          approvalSource: 'user',
          postApproval: ['retro'],
        }),
      }),
    });
    const { payload } = await check(fixture);
    expect(payload).toMatchObject({
      invariant: 'post_approval_step_pending',
      nextOwner: { step: 'retro', skill: 'oat-project-retro' },
    });
  });

  it('case 4: every step complete and approval recorded is complete', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      configured: CONFIGURED,
      state: buildState({
        snapshotLines: snapshotYaml({
          status: 'complete',
          preApprovalCompleted: ['summary', 'document', 'pr'],
          approval: 'approved',
          approvalSource: 'user',
        }),
      }),
    });
    const { payload, exitCode } = await check(fixture);
    expect(payload).toMatchObject({
      status: 'complete',
      invariant: null,
      route: null,
    });
    expect(exitCode).toBe(0);
  });

  it('case 4b: a lite snapshot completes with approval not_required', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      state: buildState({
        workflowMode: 'lite',
        snapshotLines: snapshotYaml({
          status: 'complete',
          preApproval: ['pr'],
          preApprovalCompleted: ['pr'],
          approval: 'not_required',
        }),
      }),
    });
    const { payload } = await check(fixture);
    expect(payload.status).toBe('complete');
  });

  it('case 4c: steps done but status not yet complete stays incomplete', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      state: buildState({
        snapshotLines: snapshotYaml({
          status: 'post_approval',
          preApprovalCompleted: ['summary', 'document', 'pr'],
          approval: 'approved',
        }),
      }),
    });
    const { payload } = await check(fixture);
    expect(payload).toMatchObject({
      status: 'incomplete',
      invariant: 'sequence_not_complete',
    });
  });

  it('case 5 (control): unconfigured, interactive, non-lite, no snapshot is valid', async () => {
    const fixture = await createProjectFixture(tempDirs);
    const { payload, exitCode } = await check(fixture);
    expect(payload).toMatchObject({
      status: 'not_required',
      invariant: null,
      inputs: {
        configured: false,
        autonomous: false,
        lite: false,
        snapshot: 'absent',
      },
    });
    expect(exitCode).toBe(0);
  });

  describe('case 6: a malformed snapshot fails closed', () => {
    const variants: Array<[string, string[]]> = [
      ['unknown status', snapshotYaml({ status: 'pending' })],
      ['null approval', snapshotYaml({ approval: 'null' })],
      [
        'completed list with a gap',
        snapshotYaml({ preApprovalCompleted: ['summary', 'pr'] }),
      ],
      [
        'completed step that is not stored',
        snapshotYaml({
          preApproval: ['pr'],
          preApprovalCompleted: ['summary'],
        }),
      ],
      ['retro before approval', snapshotYaml({ preApproval: ['retro'] })],
      [
        'complete status with pending steps',
        snapshotYaml({ status: 'complete', approval: 'approved' }),
      ],
      ['scalar snapshot', ['oat_post_implement_sequence: done']],
      [
        'missing arrays',
        ['oat_post_implement_sequence:', '  status: complete'],
      ],
    ];

    for (const [label, lines] of variants) {
      it(label, async () => {
        const fixture = await createProjectFixture(tempDirs, {
          state: buildState({ snapshotLines: lines }),
        });
        const { payload, exitCode } = await check(fixture);
        expect(payload).toMatchObject({
          status: 'incomplete',
          invariant: 'snapshot_malformed',
          route: 'oat-project-implement',
        });
        expect(exitCode).toBe(1);
      });
    }
  });

  it('case 7: OAT_AUTONOMOUS=1 in the environment without the flag', async () => {
    const fixture = await createProjectFixture(tempDirs);
    const { payload, exitCode } = await check(fixture, {
      env: { OAT_AUTONOMOUS: '1' },
    });
    expect(payload).toMatchObject({
      status: 'incomplete',
      invariant: 'snapshot_missing',
      inputs: { autonomous: true, autonomousSource: 'env' },
    });
    expect(exitCode).toBe(1);
  });

  it('treats an OAT_AUTONOMOUS value other than 1 as interactive', async () => {
    const fixture = await createProjectFixture(tempDirs);
    const { payload } = await check(fixture, {
      env: { OAT_AUTONOMOUS: '0' },
    });
    expect(payload.status).toBe('not_required');
  });

  it('never consults configuration once a snapshot exists', async () => {
    const resolveEffectiveConfig = vi.fn(async () => {
      throw new Error('configuration must not be consulted');
    });
    const fixture = await createProjectFixture(tempDirs, {
      state: buildState({
        snapshotLines: snapshotYaml({
          status: 'complete',
          preApprovalCompleted: ['summary', 'document', 'pr'],
          approval: 'approved',
        }),
      }),
    });
    const { payload } = await check(fixture, { resolveEffectiveConfig });
    expect(payload.status).toBe('complete');
    expect(resolveEffectiveConfig).not.toHaveBeenCalled();
  });

  it('keeps a persisted run authoritative after config is removed or changed', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      configured: CONFIGURED,
      state: buildState({
        snapshotLines: snapshotYaml({
          preApproval: ['summary', 'document', 'pr'],
          preApprovalCompleted: ['summary'],
        }),
      }),
    });
    await writeConfig(fixture.root, null);
    let result = await check(fixture);
    expect(result.payload).toMatchObject({
      status: 'incomplete',
      nextOwner: { step: 'document' },
      inputs: { configured: null, snapshotSource: 'configured' },
    });

    await writeConfig(fixture.root, { preApproval: ['pr'], postApproval: [] });
    process.exitCode = undefined;
    result = await check(fixture);
    expect(result.payload).toMatchObject({
      status: 'incomplete',
      nextOwner: { step: 'document' },
    });
  });

  it('accepts an older snapshot that predates the source fields', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      state: buildState({
        snapshotLines: snapshotYaml({
          source: null,
          status: 'complete',
          preApprovalCompleted: ['summary', 'document', 'pr'],
          approval: 'approved',
        }).filter((line) => !line.startsWith('  approval_source')),
      }),
    });
    const { payload } = await check(fixture);
    expect(payload.status).toBe('complete');
  });

  it('fails closed when the project does not exist', async () => {
    const fixture = await createProjectFixture(tempDirs);
    const capture = createLoggerCapture();
    const command = createProjectCloseoutCheckCommand({
      buildCommandContext: contextFactory(fixture, capture),
      resolveProjectRoot: async () => fixture.root,
      env: {},
    });
    await runProjectSubcommand(
      command,
      'closeout-check',
      ['.oat/projects/shared/missing'],
      ['--json'],
    );
    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
    expect(process.exitCode).toBe(1);
  });

  it('prints the refusal in human output', async () => {
    const fixture = await createProjectFixture(tempDirs, {
      configured: CONFIGURED,
    });
    const capture = createLoggerCapture();
    const command = createProjectCloseoutCheckCommand({
      buildCommandContext: contextFactory(fixture, capture),
      resolveProjectRoot: async () => fixture.root,
      env: {},
    });
    await runProjectSubcommand(command, 'closeout-check', [PROJECT_REL]);
    expect(capture.info[0]).toContain(
      `Closeout invariant not satisfied for ${PROJECT_REL} (snapshot_missing)`,
    );
    expect(process.exitCode).toBe(1);
  });
});
