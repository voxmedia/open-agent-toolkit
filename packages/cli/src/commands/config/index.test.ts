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

import { createConfigCommand } from './index';

interface HarnessOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const command = createConfigCommand({
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
    processEnv: options.env ?? {},
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

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'config', ...commandArgs], {
    from: 'user',
  });
}

describe('oat config', () => {
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
    const root = await mkdtemp(join(tmpdir(), 'oat-config-command-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    return root;
  }

  it('gets existing local config key values', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['get', 'activeProject']);

    expect(capture.info[0]).toBe('.oat/projects/shared/demo');
    expect(process.exitCode).toBe(0);
  });

  it('gets empty string for missing local config values', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'activeProject']);

    expect(capture.info[0]).toBe('');
    expect(process.exitCode).toBe(0);
  });

  it('returns exit code 1 for unknown get keys', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, ['get', 'unknown.key']);

    expect(capture.error[0]).toContain('Unknown config key: unknown.key');
    expect(process.exitCode).toBe(1);
  });

  it('gets projects.root with env override precedence', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, projects: { root: '.oat/projects/from-config' } })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({
      cwd: root,
      env: { OAT_PROJECTS_ROOT: '.oat/projects/from-env' },
    });
    await runCommand(command, ['get', 'projects.root']);

    expect(capture.info[0]).toBe('.oat/projects/from-env');
    expect(process.exitCode).toBe(0);
  });

  it('sets local config keys in config.local.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, [
      'set',
      'activeProject',
      '.oat/projects/shared/demo',
    ]);

    const raw = await readFile(join(root, '.oat', 'config.local.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      activeProject: '.oat/projects/shared/demo',
    });
    expect(process.exitCode).toBe(0);
  });

  it('sets shared config keys in config.json', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'projects.root', '.oat/projects/custom']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      projects: { root: '.oat/projects/custom' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('set creates config.json when missing', async () => {
    const root = await createRepoRoot();
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'worktrees.root', '.worktrees/custom']);

    const raw = await readFile(join(root, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      worktrees: { root: '.worktrees/custom' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('coerces empty string to null for nullable keys', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );
    const { command } = createHarness({ cwd: root });

    await runCommand(command, ['set', 'activeProject', '']);

    const raw = await readFile(join(root, '.oat', 'config.local.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      activeProject: null,
    });
    expect(process.exitCode).toBe(0);
  });

  it('list shows merged values with sources', async () => {
    const root = await createRepoRoot();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, worktrees: { root: '.worktrees/from-config' } })}\n`,
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root });
    await runCommand(command, ['list']);

    expect(capture.info[0]).toContain('activeProject');
    expect(capture.info[0]).toContain('config.local.json');
    expect(capture.info[0]).toContain('projects.root');
    expect(capture.info[0]).toContain('.oat/projects/shared');
    expect(capture.info[0]).toContain('worktrees.root');
    expect(capture.info[0]).toContain('config.json');
    expect(process.exitCode).toBe(0);
  });

  it('supports json mode for get, set, and list', async () => {
    const root = await createRepoRoot();

    const getHarness = createHarness({ cwd: root });
    await runCommand(getHarness.command, ['get', 'activeProject'], ['--json']);
    expect(getHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'activeProject',
      value: null,
    });
    expect(process.exitCode).toBe(0);

    const setHarness = createHarness({ cwd: root });
    await runCommand(
      setHarness.command,
      ['set', 'projects.root', '.oat/projects/custom'],
      ['--json'],
    );
    expect(setHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      key: 'projects.root',
      value: '.oat/projects/custom',
      source: 'config.json',
    });
    expect(process.exitCode).toBe(0);

    const listHarness = createHarness({ cwd: root });
    await runCommand(listHarness.command, ['list'], ['--json']);
    expect(listHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      values: expect.any(Array),
    });
    expect(process.exitCode).toBe(0);
  });
});
