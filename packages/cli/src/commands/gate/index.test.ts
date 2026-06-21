import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGateCommand } from './index';

interface HarnessOptions {
  cwd: string;
  home: string;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const command = createGateCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home: options.home,
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
  globalArgs: string[] = ['--json'],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'gate', ...commandArgs], {
    from: 'user',
  });
}

describe('oat gate', () => {
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

  async function setup(): Promise<{ root: string; home: string }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-gate-command-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-gate-home-'));
    tempDirs.push(root, home);
    await mkdir(join(root, '.oat'), { recursive: true });
    return { root, home };
  }

  it('resolves a configured gate as JSON and exits zero', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              'oat-project-plan': {
                command: 'pnpm test',
                description: 'Run the test suite before finishing.',
                onFailure: 'block',
                maxAttempts: 3,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toEqual({
      command: 'pnpm test',
      description: 'Run the test suite before finishing.',
      onFailure: 'block',
      maxAttempts: 3,
    });
    expect(process.exitCode).toBe(0);
  });

  it('prints null and exits zero when a gate is absent', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('prints null and exits zero when a gate is disabled', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              'oat-project-plan': null,
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('prints null and exits zero for an unknown skill', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              'oat-project-implement': {
                command: 'pnpm lint',
                onFailure: 'warn',
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);
  });
});
