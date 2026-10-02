import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import {
  buildState,
  contextFactory,
  createProjectFixture,
  PROJECT_REL,
  runProjectSubcommand,
  snapshotYaml,
  type ProjectFixture,
} from '@commands/project/closeout-check/__tests__/fixtures';
import { createProjectCloseoutCheckCommand } from '@commands/project/closeout-check/index';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectCompleteStateCommand } from './index';

function buildStateContent(extraFrontmatter: string[] = []): string {
  return [
    '---',
    'oat_current_task: p02-t01',
    'oat_phase: implement',
    'oat_phase_status: in_progress',
    ...extraFrontmatter,
    'oat_project_completed: null',
    'oat_project_state_updated: "2026-04-13T18:17:21.000Z"',
    'oat_generated: false',
    '---',
    '',
    '# Project State: demo',
    '',
    '**Status:** In Progress',
    '**Started:** 2026-04-13',
    '**Last Updated:** 2026-04-13',
    '',
    '## Current Phase',
    '',
    'Implementation in progress.',
    '',
    '## Artifacts',
    '',
    '- **Plan:** `plan.md` (complete)',
    '- **Implementation:** `implementation.md` (in progress)',
    '',
    '## Progress',
    '',
    '- ✓ Discovery completed',
    '- ⧗ Executing `p02-t01`',
    '',
    '## Blockers',
    '',
    'None',
    '',
    '## Next Milestone',
    '',
    'Complete `p02-t01`: add a shell-callable CLI command for completion-state mutation.',
    '',
  ].join('\n');
}

function createHarness(cwd: string): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const command = createProjectCompleteStateCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? cwd,
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => cwd),
    now: () => new Date('2026-04-13T22:00:00.000Z'),
    env: {},
  } as never);

  return { capture, command };
}

async function runCommand(
  command: Command,
  commandArgs: string[],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);

  await program.parseAsync(
    [...globalArgs, 'project', 'complete-state', ...commandArgs],
    {
      from: 'user',
    },
  );
}

describe('oat project complete-state', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-complete-state-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'shared'), { recursive: true });
    return root;
  }

  it('updates a project state.md to completed state', async () => {
    const root = await createRepoRoot();
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), buildStateContent(), 'utf8');

    const { command } = createHarness(root);
    await runCommand(command, ['.oat/projects/shared/demo']);

    const state = await readFile(join(projectPath, 'state.md'), 'utf8');
    expect(state).toContain('oat_lifecycle: complete');
    expect(state).toContain(
      'oat_project_completed: "2026-04-13T22:00:00.000Z"',
    );
    expect(state).toContain('**Status:** Complete');
    expect(state).toContain('## Current Phase\n\nLifecycle complete\n');
    expect(process.exitCode).toBe(0);
  });

  it('rejects completed-state writes that would preserve invalid decomposition state', async () => {
    const root = await createRepoRoot();
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      join(projectPath, 'state.md'),
      buildStateContent().replace(
        'oat_phase: implement',
        'oat_phase: decomposition',
      ),
      'utf8',
    );

    const { command, capture } = createHarness(root);
    await runCommand(command, ['.oat/projects/shared/demo']);

    expect(capture.error[0]).toContain(
      'oat_phase: decomposition requires oat_kind: coordination',
    );
    expect(process.exitCode).toBe(1);
  });

  it('rejects completed-state writes when child oat_parent is missing', async () => {
    const root = await createRepoRoot();
    const projectPath = join(root, '.oat', 'projects', 'shared', 'child');
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      join(projectPath, 'state.md'),
      buildStateContent(['oat_parent: missing-parent']),
      'utf8',
    );

    const { command, capture } = createHarness(root);
    await runCommand(command, ['.oat/projects/shared/child']);

    const state = await readFile(join(projectPath, 'state.md'), 'utf8');
    expect(capture.error[0]).toContain(
      'oat_parent missing-parent must reference an existing project',
    );
    expect(state).toContain('oat_project_completed: null');
    expect(process.exitCode).toBe(1);
  });

  it('passes archived status through to the rendered body text', async () => {
    const root = await createRepoRoot();
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), buildStateContent(), 'utf8');

    const { command } = createHarness(root);
    await runCommand(command, ['.oat/projects/shared/demo', '--archived']);

    const state = await readFile(join(projectPath, 'state.md'), 'utf8');
    expect(state).toContain(
      '## Current Phase\n\nLifecycle complete; archived locally\n',
    );
  });

  it('returns a clear error when the project path does not exist', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness(root);

    await runCommand(command, ['.oat/projects/shared/missing']);

    expect(capture.error[0]).toContain('Project not found');
    expect(process.exitCode).toBe(1);
  });

  it('returns a clear error when state.md is missing', async () => {
    const root = await createRepoRoot();
    await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
      recursive: true,
    });

    const { command, capture } = createHarness(root);
    await runCommand(command, ['.oat/projects/shared/demo']);

    expect(capture.error[0]).toContain('Project state.md not found');
    expect(process.exitCode).toBe(1);
  });

  describe('closeout invariant', () => {
    const CONFIGURED = {
      preApproval: ['summary', 'document', 'pr'],
      postApproval: [],
    };

    async function completeState(
      fixture: ProjectFixture,
      options: { args?: string[]; env?: NodeJS.ProcessEnv } = {},
    ): Promise<{ capture: LoggerCapture; exitCode: number | undefined }> {
      const capture = createLoggerCapture();
      const command = createProjectCompleteStateCommand({
        buildCommandContext: contextFactory(fixture, capture),
        resolveProjectRoot: async () => fixture.root,
        now: () => new Date('2026-10-01T12:00:00.000Z'),
        env: options.env ?? {},
      } as never);
      process.exitCode = undefined;
      await runProjectSubcommand(command, 'complete-state', [
        PROJECT_REL,
        ...(options.args ?? []),
      ]);
      return { capture, exitCode: process.exitCode as number | undefined };
    }

    async function closeoutMessage(
      fixture: ProjectFixture,
      options: { args?: string[]; env?: NodeJS.ProcessEnv } = {},
    ): Promise<string> {
      const capture = createLoggerCapture();
      const command = createProjectCloseoutCheckCommand({
        buildCommandContext: contextFactory(fixture, capture),
        resolveProjectRoot: async () => fixture.root,
        env: options.env ?? {},
      });
      process.exitCode = undefined;
      await runProjectSubcommand(command, 'closeout-check', [
        PROJECT_REL,
        ...(options.args ?? []),
      ]);
      return capture.info[0] ?? '';
    }

    const refused: Array<
      [
        string,
        {
          configured?: unknown;
          state: string;
          args?: string[];
          env?: NodeJS.ProcessEnv;
        },
      ]
    > = [
      ['case 1 configured', { configured: CONFIGURED, state: buildState() }],
      [
        'case 1 autonomous flag',
        { state: buildState(), args: ['--autonomous'] },
      ],
      ['case 1 lite', { state: buildState({ workflowMode: 'lite' }) }],
      [
        'case 2 steps pending',
        {
          state: buildState({
            snapshotLines: snapshotYaml({ preApprovalCompleted: ['summary'] }),
          }),
        },
      ],
      [
        'case 3 approval pending',
        {
          state: buildState({
            snapshotLines: snapshotYaml({
              status: 'awaiting_approval',
              preApprovalCompleted: ['summary', 'document', 'pr'],
            }),
          }),
        },
      ],
      [
        'case 6 malformed',
        {
          state: buildState({
            snapshotLines: snapshotYaml({ status: 'pending' }),
          }),
        },
      ],
      [
        'case 7 OAT_AUTONOMOUS=1 only',
        { state: buildState(), env: { OAT_AUTONOMOUS: '1' } },
      ],
    ];

    for (const [label, setup] of refused) {
      it(`refuses ${label} with the closeout-check message`, async () => {
        const fixture = await createProjectFixture(tempDirs, {
          configured: setup.configured,
          state: setup.state,
        });
        const before = await readFile(fixture.statePath, 'utf8');
        const { capture, exitCode } = await completeState(fixture, setup);
        const expected = await closeoutMessage(fixture, setup);

        expect(expected).toContain('Closeout invariant not satisfied');
        expect(capture.error[0]).toBe(expected);
        expect(exitCode).toBe(1);
        expect(await readFile(fixture.statePath, 'utf8')).toBe(before);
      });
    }

    it('completes case 4: every step and approval recorded', async () => {
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
      const { exitCode } = await completeState(fixture);
      const state = await readFile(fixture.statePath, 'utf8');
      expect(exitCode).toBe(0);
      expect(state).toContain('oat_lifecycle: complete');
      // The completed snapshot survives completion untouched.
      expect(state).toContain(
        'pre_approval_completed: [summary, document, pr]',
      );
    });

    it('completes case 5 (control): unconfigured, interactive, no snapshot', async () => {
      const fixture = await createProjectFixture(tempDirs, {
        state: buildState(),
      });
      const { exitCode } = await completeState(fixture);
      expect(exitCode).toBe(0);
      expect(await readFile(fixture.statePath, 'utf8')).toContain(
        'oat_lifecycle: complete',
      );
    });

    it('takes --autonomous and documents it', () => {
      const command = createProjectCompleteStateCommand();
      expect(command.options.map((option) => option.long)).toContain(
        '--autonomous',
      );
    });
  });
});
