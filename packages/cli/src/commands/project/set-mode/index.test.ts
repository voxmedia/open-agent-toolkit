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
import { createProjectSetModeCommand } from './index';

interface HarnessOptions {
  cwd: string;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const command = createProjectSetModeCommand({
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

  await program.parseAsync(
    [...globalArgs, 'project', 'set-mode', ...commandArgs],
    {
      from: 'user',
    },
  );
}

async function writeState(
  root: string,
  stateFrontmatterLines: string[],
): Promise<string> {
  const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
  await mkdir(projectPath, { recursive: true });

  const statePath = join(projectPath, 'state.md');
  const content = `---\n${stateFrontmatterLines.join('\n')}\n---\n\n# State\n`;
  await writeFile(statePath, content, 'utf8');

  await mkdir(join(root, '.oat'), { recursive: true });
  await writeFile(
    join(root, '.oat', 'config.local.json'),
    `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
    'utf8',
  );

  return statePath;
}

describe('oat project set-mode', () => {
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

  it('sets oat_execution_mode when field does not exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-set-mode-'));
    tempDirs.push(root);

    const statePath = await writeState(root, [
      'oat_phase: plan',
      'oat_phase_status: complete',
    ]);

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['single-thread']);

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_execution_mode: single-thread');
    expect(process.exitCode).toBe(0);
  });

  it('updates oat_execution_mode when field already exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-set-mode-'));
    tempDirs.push(root);

    const statePath = await writeState(root, [
      'oat_phase: plan',
      'oat_phase_status: complete',
      'oat_execution_mode: single-thread',
    ]);

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['subagent-driven']);

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_execution_mode: subagent-driven');
    expect(process.exitCode).toBe(0);
  });

  it('rejects invalid mode values', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-set-mode-'));
    tempDirs.push(root);

    await writeState(root, [
      'oat_phase: plan',
      'oat_phase_status: complete',
      'oat_execution_mode: single-thread',
    ]);

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['parallel']);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('Invalid mode: parallel');
  });

  it('persists orchestration policy defaults when setting subagent-driven', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-set-mode-'));
    tempDirs.push(root);

    const statePath = await writeState(root, [
      'oat_phase: plan',
      'oat_phase_status: complete',
      'oat_execution_mode: single-thread',
    ]);

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['subagent-driven']);

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_orchestration_merge_strategy: merge');
    expect(state).toContain('oat_orchestration_retry_limit: 2');
    expect(state).toContain('oat_orchestration_baseline_policy: strict');
    expect(state).toContain('oat_orchestration_unit_granularity: phase');
    expect(process.exitCode).toBe(0);
  });

  it('does not overwrite existing orchestration policy values', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-set-mode-'));
    tempDirs.push(root);

    const statePath = await writeState(root, [
      'oat_phase: plan',
      'oat_phase_status: complete',
      'oat_execution_mode: single-thread',
      'oat_orchestration_merge_strategy: cherry-pick',
      'oat_orchestration_retry_limit: 5',
      'oat_orchestration_baseline_policy: allow-failing',
      'oat_orchestration_unit_granularity: task',
    ]);

    const { command } = createHarness({ cwd: root });
    await runCommand(command, ['subagent-driven']);

    const state = await readFile(statePath, 'utf8');
    expect(state).toContain('oat_orchestration_merge_strategy: cherry-pick');
    expect(state).toContain('oat_orchestration_retry_limit: 5');
    expect(state).toContain('oat_orchestration_baseline_policy: allow-failing');
    expect(state).toContain('oat_orchestration_unit_granularity: task');
    expect(process.exitCode).toBe(0);
  });

  it('errors when no active project exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-set-mode-'));
    tempDirs.push(root);

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['single-thread']);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('No active project found');
  });

  it('errors when state.md is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-set-mode-'));
    tempDirs.push(root);

    await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
      recursive: true,
    });
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['single-thread']);

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('state.md not found');
  });

  it('supports json output mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-set-mode-'));
    tempDirs.push(root);

    const statePath = await writeState(root, [
      'oat_phase: plan',
      'oat_phase_status: complete',
      'oat_execution_mode: single-thread',
    ]);

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['subagent-driven'], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      mode: 'subagent-driven',
      previousMode: 'single-thread',
      statePath,
    });
    expect(process.exitCode).toBe(0);
  });
});
