import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerateStateResult } from './generate';
import { createStateRefreshCommand } from './index';

interface HarnessOptions {
  result?: Partial<GenerateStateResult>;
  throwError?: boolean;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const defaultResult: GenerateStateResult = {
    dashboardPath: '/tmp/workspace/.oat/state.md',
    projectName: 'test-project',
    projectStatus: 'active',
    stalenessStatus: 'fresh',
    recommendedStep: 'oat-project-implement',
    recommendedReason: 'Continue implementation',
  };

  const command = createStateRefreshCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      apply: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    generateStateDashboard: vi.fn(async () => {
      if (options.throwError) {
        throw new Error('dashboard generation failed');
      }
      return { ...defaultResult, ...options.result };
    }),
  });

  return { capture, command };
}

async function runCommand(command: Command, globalArgs: string[] = []) {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const stateCmd = new Command('state');
  stateCmd.addCommand(command);
  program.addCommand(stateCmd);
  await program.parseAsync([...globalArgs, 'state', 'refresh'], {
    from: 'user',
  });
}

describe('createStateRefreshCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('outputs text mode with dashboard path and recommendation', async () => {
    const { command, capture } = createHarness();

    await runCommand(command);

    expect(capture.info[0]).toContain('Dashboard generated:');
    expect(capture.info[1]).toContain('oat-project-implement');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON mode with structured result', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      projectName: 'test-project',
      projectStatus: 'active',
      stalenessStatus: 'fresh',
      recommendedStep: 'oat-project-implement',
    });
    expect(process.exitCode).toBe(0);
  });

  it('handles errors with exit code 1', async () => {
    const { command, capture } = createHarness({ throwError: true });

    await runCommand(command);

    expect(capture.error[0]).toContain('dashboard generation failed');
    expect(process.exitCode).toBe(1);
  });

  it('handles errors in JSON mode', async () => {
    const { command, capture } = createHarness({ throwError: true });

    await runCommand(command, ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: 'dashboard generation failed',
    });
    expect(process.exitCode).toBe(1);
  });
});
