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

import { createProjectOpenCommand } from './index';

interface HarnessOptions {
  cwd: string;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const command = createProjectOpenCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => options.cwd),
  });

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

  await program.parseAsync([...globalArgs, 'project', 'open', ...commandArgs], {
    from: 'user',
  });
}

async function writeProjectState(
  root: string,
  name: string,
  lifecycle: 'active' | 'paused' = 'active',
): Promise<string> {
  const projectPath = join(root, '.oat', 'projects', 'shared', name);
  await mkdir(projectPath, { recursive: true });
  const statePath = join(projectPath, 'state.md');

  const lines = ['oat_phase: plan', 'oat_phase_status: complete'];
  if (lifecycle === 'paused') {
    lines.push('oat_lifecycle: paused');
    lines.push('oat_pause_timestamp: 2026-02-21T00:00:00.000Z');
    lines.push('oat_pause_reason: waiting');
  } else {
    lines.push('oat_lifecycle: active');
  }

  await writeFile(
    statePath,
    `---\n${lines.join('\n')}\n---\n\n# State\n`,
    'utf8',
  );
  return statePath;
}

describe('oat project open', () => {
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
    const root = await mkdtemp(join(tmpdir(), 'oat-project-open-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'shared'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'projects-root'),
      '.oat/projects/shared\n',
      'utf8',
    );
    return root;
  }

  it('opens project when no prior active project exists', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'demo');

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['demo']);

    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBe('.oat/projects/shared/demo');
    expect(process.exitCode).toBe(0);
  });

  it('shows switching message when a different project is active', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'alpha');
    await writeProjectState(root, 'beta');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/alpha' })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['beta']);

    expect(capture.info.join('\n')).toContain('Switching from alpha to beta.');
    expect(process.exitCode).toBe(0);
  });

  it('opens paused project and clears pause metadata', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'paused-demo', 'paused');

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['paused-demo']);

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_lifecycle: active');
    expect(state).not.toContain('oat_pause_timestamp:');
    expect(state).not.toContain('oat_pause_reason:');
    expect(process.exitCode).toBe(0);
  });

  it('errors when project does not exist', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['missing']);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('Project not found');
  });

  it('errors when project state.md is missing', async () => {
    const root = await createRepoRoot();
    await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
      recursive: true,
    });
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['demo']);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('state.md not found');
  });

  it('supports json output mode', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'demo');

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['demo', '--reason', 'resume work'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      projectName: 'demo',
      projectPath: '.oat/projects/shared/demo',
      previousActiveProject: null,
      reason: 'resume work',
    });
    expect(process.exitCode).toBe(0);
  });
});
