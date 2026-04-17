import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

describe('oat project set-mode (deprecated no-op)', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('prints a deprecation warning and exits 0', async () => {
    const { command, capture } = createHarness({ cwd: '/tmp' });
    await runCommand(command, ['single-thread']);

    expect(process.exitCode).toBe(0);
    expect(capture.warn[0]).toContain('[deprecated]');
    expect(capture.warn[0]).toContain("'oat project set-mode' is a no-op");
    expect(capture.warn[0]).toContain('oat-project-implement');
  });

  it('accepts subagent-driven argument without error', async () => {
    const { command, capture } = createHarness({ cwd: '/tmp' });
    await runCommand(command, ['subagent-driven']);

    expect(process.exitCode).toBe(0);
    expect(capture.warn[0]).toContain('[deprecated]');
  });

  it('does not write to any file (state.md untouched)', async () => {
    // The command no longer takes write dependencies — the absence of
    // writeFile/readFile in the harness proves no writes occur.
    const { command } = createHarness({ cwd: '/tmp' });
    await runCommand(command, ['single-thread']);

    expect(process.exitCode).toBe(0);
  });
});
