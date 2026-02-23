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
import { createProjectPauseCommand } from './index';

interface HarnessOptions {
  cwd: string;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const command = createProjectPauseCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      apply: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => options.cwd),
    now: () => new Date('2026-02-21T12:00:00.000Z'),
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

  await program.parseAsync(
    [...globalArgs, 'project', 'pause', ...commandArgs],
    {
      from: 'user',
    },
  );
}

async function writeProjectState(root: string, name: string): Promise<string> {
  const projectPath = join(root, '.oat', 'projects', 'shared', name);
  await mkdir(projectPath, { recursive: true });
  const statePath = join(projectPath, 'state.md');
  await writeFile(
    statePath,
    '---\noat_phase: implement\noat_phase_status: in_progress\noat_lifecycle: active\n---\n\n# State\n',
    'utf8',
  );
  return statePath;
}

describe('oat project pause', () => {
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
    const root = await mkdtemp(join(tmpdir(), 'oat-project-pause-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'shared'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'projects-root'),
      '.oat/projects/shared\n',
      'utf8',
    );
    return root;
  }

  it('pauses active project and clears active pointer with lastPausedProject', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'demo');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command } = createHarness({ cwd: root });
    await runCommand(command, []);

    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBeNull();
    expect(localConfig.lastPausedProject).toBe('.oat/projects/shared/demo');

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_lifecycle: paused');
    expect(state).toContain('oat_pause_timestamp: 2026-02-21T12:00:00.000Z');
    expect(process.exitCode).toBe(0);
  });

  it('pauses named project without clearing pointer when different project is active', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'alpha');
    await writeProjectState(root, 'beta');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/alpha' })}\n`,
      'utf8',
    );

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['beta']);

    const localConfig = JSON.parse(
      await readFile(join(root, '.oat', 'config.local.json'), 'utf8'),
    );
    expect(localConfig.activeProject).toBe('.oat/projects/shared/alpha');
    expect(localConfig.lastPausedProject ?? null).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('persists pause reason when provided', async () => {
    const root = await createRepoRoot();
    const statePath = await writeProjectState(root, 'demo');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['--reason', 'waiting on review']);

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_pause_reason: waiting on review');
    expect(process.exitCode).toBe(0);
  });

  it('errors when project does not exist', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['missing']);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('Project not found');
  });

  it('errors when no active project and no name provided', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, []);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain(
      'No project specified and no active project',
    );
  });

  it('supports json output mode', async () => {
    const root = await createRepoRoot();
    await writeProjectState(root, 'demo');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['--reason', 'break time'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      projectName: 'demo',
      projectPath: '.oat/projects/shared/demo',
      pointerCleared: true,
      reason: 'break time',
    });
    expect(process.exitCode).toBe(0);
  });
});
