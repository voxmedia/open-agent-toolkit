import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { ResolvedConfig } from '@config/resolve';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConfigDumpCommand } from './dump';

interface HarnessOptions {
  cwd: string;
  result?: ResolvedConfig;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const result: ResolvedConfig = options.result ?? {
    shared: { version: 1, projects: { root: '.oat/projects/shared' } },
    local: { version: 1, activeProject: '.oat/projects/shared/demo' },
    user: { version: 1, activeIdea: '.oat/ideas/demo' },
    resolved: {
      'projects.root': {
        value: '.oat/projects/shared',
        source: 'shared',
      },
      activeProject: {
        value: '.oat/projects/shared/demo',
        source: 'local',
      },
      activeIdea: {
        value: '.oat/ideas/demo',
        source: 'user',
      },
    },
  };

  const command = createConfigDumpCommand({
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
    resolveEffectiveConfig: vi.fn(async () => result),
    processEnv: {},
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

  const config = new Command('config');
  config.addCommand(command);
  program.addCommand(config);

  await program.parseAsync([...globalArgs, 'config', 'dump', ...commandArgs], {
    from: 'user',
  });
}

describe('oat config dump', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('outputs shared, local, user, and resolved sections as json', async () => {
    const { command, capture } = createHarness({ cwd: '/repo' });

    await runCommand(command, [], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      shared: { projects: { root: '.oat/projects/shared' } },
      local: { activeProject: '.oat/projects/shared/demo' },
      user: { activeIdea: '.oat/ideas/demo' },
      resolved: {
        activeProject: {
          source: 'local',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('preserves per-key source attribution in resolved output', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      result: {
        shared: { version: 1 },
        local: { version: 1 },
        user: { version: 1 },
        resolved: {
          'projects.root': {
            value: '.oat/projects/from-env',
            source: 'env',
          },
          activeProject: {
            value: null,
            source: 'default',
          },
        },
      },
    });

    await runCommand(command, [], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      resolved: {
        'projects.root': {
          value: '.oat/projects/from-env',
          source: 'env',
        },
        activeProject: {
          value: null,
          source: 'default',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('returns defaults when config files are missing', async () => {
    const { command, capture } = createHarness({
      cwd: '/repo',
      result: {
        shared: { version: 1 },
        local: { version: 1 },
        user: { version: 1 },
        resolved: {
          'projects.root': {
            value: '.oat/projects/shared',
            source: 'default',
          },
          'worktrees.root': {
            value: '.worktrees',
            source: 'default',
          },
        },
      },
    });

    await runCommand(command, [], ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      resolved: {
        'projects.root': {
          source: 'default',
        },
        'worktrees.root': {
          source: 'default',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });
});
