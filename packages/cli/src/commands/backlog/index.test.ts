import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBacklogCommand } from './index';

function createHarness(): {
  capture: LoggerCapture;
  command: Command;
  initializeBacklog: ReturnType<typeof vi.fn>;
  resolveProjectRoot: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const initializeBacklog = vi.fn(async (_backlogRoot: string) => {});
  const resolveProjectRoot = vi.fn(
    async (_cwd: string) => '/tmp/workspace/repo',
  );

  const command = createBacklogCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'all') as CommandContext['scope'],
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    initializeBacklog,
    resolveProjectRoot,
  });

  return {
    capture,
    command,
    initializeBacklog,
    resolveProjectRoot,
  };
}

async function runCommand(
  command: Command,
  globalArgs: string[] = [],
  cmdArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);

  await program.parseAsync([...globalArgs, 'backlog', 'init', ...cmdArgs], {
    from: 'user',
  });
}

describe('createBacklogCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('initializes the default backlog root resolved from the project root', async () => {
    const { command, capture, initializeBacklog, resolveProjectRoot } =
      createHarness();

    await runCommand(command);

    expect(resolveProjectRoot).toHaveBeenCalledWith('/tmp/workspace');
    expect(initializeBacklog).toHaveBeenCalledWith(
      '/tmp/workspace/repo/.oat/repo/reference/backlog',
    );
    expect(capture.info).toContain(
      'Initialized backlog scaffold at /tmp/workspace/repo/.oat/repo/reference/backlog',
    );
    expect(process.exitCode).toBe(0);
  });

  it('uses the configured backlog root override relative to cwd', async () => {
    const { command, capture, initializeBacklog, resolveProjectRoot } =
      createHarness();

    await runCommand(
      command,
      ['--cwd', '/tmp/override-workspace'],
      ['--backlog-root', 'custom/backlog'],
    );

    expect(resolveProjectRoot).not.toHaveBeenCalled();
    expect(initializeBacklog).toHaveBeenCalledWith(
      '/tmp/override-workspace/custom/backlog',
    );
    expect(capture.info).toContain(
      'Initialized backlog scaffold at /tmp/override-workspace/custom/backlog',
    );
    expect(process.exitCode).toBe(0);
  });

  it('outputs structured JSON for backlog init', async () => {
    const { command, capture, initializeBacklog } = createHarness();

    await runCommand(command, ['--json']);

    expect(initializeBacklog).toHaveBeenCalledWith(
      '/tmp/workspace/repo/.oat/repo/reference/backlog',
    );
    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      backlogRoot: '/tmp/workspace/repo/.oat/repo/reference/backlog',
    });
    expect(process.exitCode).toBe(0);
  });
});
