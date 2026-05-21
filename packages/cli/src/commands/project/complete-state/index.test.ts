import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectCompleteStateCommand } from './index';

function buildStateContent(): string {
  return [
    '---',
    'oat_current_task: p02-t01',
    'oat_phase: implement',
    'oat_phase_status: in_progress',
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
});
