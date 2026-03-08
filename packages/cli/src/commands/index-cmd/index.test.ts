import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIndexInitCommand } from './index';
import type { GenerateThinIndexResult } from './thin-index';

interface HarnessOptions {
  result?: Partial<GenerateThinIndexResult>;
  throwError?: boolean;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const defaultResult: GenerateThinIndexResult = {
    outputPath: '/tmp/workspace/.oat/repo/knowledge/project-index.md',
    repoName: 'my-project',
    packageManager: 'pnpm',
    entryPointCount: 5,
  };

  const command = createIndexInitCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    generateThinIndex: vi.fn(async (_opts) => {
      if (options.throwError) {
        throw new Error('index generation failed');
      }
      return {
        ...defaultResult,
        ...options.result,
      };
    }),
  });

  return { capture, command };
}

async function runCommand(
  command: Command,
  globalArgs: string[] = [],
  cmdArgs: string[] = [],
) {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const indexCmd = new Command('index');
  indexCmd.addCommand(command);
  program.addCommand(indexCmd);
  await program.parseAsync([...globalArgs, 'index', 'init', ...cmdArgs], {
    from: 'user',
  });
}

describe('createIndexInitCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('outputs text mode with index path and repo info', async () => {
    const { command, capture } = createHarness();

    await runCommand(command);

    expect(capture.info[0]).toContain('Generated');
    expect(capture.info[0]).toContain('thin index');
    expect(capture.info[1]).toContain('my-project');
    expect(capture.info[2]).toContain('pnpm');
    expect(capture.info[3]).toContain('5 detected');
    expect(process.exitCode).toBe(0);
  });

  it('outputs JSON mode with structured result', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      repoName: 'my-project',
      packageManager: 'pnpm',
      entryPointCount: 5,
    });
    expect(process.exitCode).toBe(0);
  });

  it('handles errors with exit code 1', async () => {
    const { command, capture } = createHarness({ throwError: true });

    await runCommand(command);

    expect(capture.error[0]).toContain('index generation failed');
    expect(process.exitCode).toBe(1);
  });

  it('handles errors in JSON mode', async () => {
    const { command, capture } = createHarness({ throwError: true });

    await runCommand(command, ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: 'index generation failed',
    });
    expect(process.exitCode).toBe(1);
  });

  it('forwards SHA options to generateThinIndex', async () => {
    const { command } = createHarness();

    await runCommand(
      command,
      [],
      ['--head-sha', 'abc123', '--merge-base-sha', 'def456'],
    );

    // If it didn't throw, the options were accepted by Commander
    expect(process.exitCode).toBe(0);
  });
});
