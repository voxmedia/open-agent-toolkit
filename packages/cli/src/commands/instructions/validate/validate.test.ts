import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { InstructionEntry } from '@commands/instructions/instructions.types';
import { CliError } from '@errors/cli-error';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInstructionsValidateCommand } from './validate';

interface HarnessOptions {
  entries?: InstructionEntry[];
  json?: boolean;
  scanError?: Error;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  scanInstructionFiles: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const entries = options.entries ?? [];

  const scanInstructionFiles = vi.fn(async () => {
    if (options.scanError) {
      throw options.scanError;
    }
    return entries;
  });

  const command = createInstructionsValidateCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: globalOptions.scope ?? 'project',
      dryRun: globalOptions.dryRun ?? false,
      verbose: globalOptions.verbose ?? false,
      json: options.json ?? globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
    scanInstructionFiles,
  });

  return {
    capture,
    command,
    scanInstructionFiles,
  };
}

async function runValidateCommand(
  command: Command,
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

  await program.parseAsync([...globalArgs, 'validate'], {
    from: 'user',
  });
}

describe('createInstructionsValidateCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('returns exit code 0 when all entries are valid', async () => {
    const { command, capture } = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/AGENTS.md',
          claudePath: '/tmp/workspace/CLAUDE.md',
          status: 'ok',
          detail: 'pointer valid',
        },
      ],
    });

    await runValidateCommand(command);

    expect(process.exitCode).toBe(0);
    expect(capture.info[0]).toContain('instructions validate');
    expect(capture.error).toEqual([]);
  });

  it('returns exit code 1 when issues are found', async () => {
    const { command, capture, scanInstructionFiles } = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/packages/cli/AGENTS.md',
          claudePath: '/tmp/workspace/packages/cli/CLAUDE.md',
          status: 'missing',
          detail: 'CLAUDE.md missing',
        },
      ],
    });

    await runValidateCommand(command);

    expect(scanInstructionFiles).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
    expect(capture.info[0]).toContain('status: drift');
  });

  it('emits JSON payload when --json is passed', async () => {
    const { command, capture } = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/AGENTS.md',
          claudePath: '/tmp/workspace/CLAUDE.md',
          status: 'ok',
          detail: 'pointer valid',
        },
      ],
    });

    await runValidateCommand(command, ['--json']);

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      mode: 'validate',
      status: 'ok',
      summary: { scanned: 1, ok: 1 },
      entries: [
        {
          agentsPath: '/tmp/workspace/AGENTS.md',
          claudePath: '/tmp/workspace/CLAUDE.md',
          status: 'ok',
        },
      ],
      actions: [],
    });
    expect(process.exitCode).toBe(0);
  });

  it('uses CliError exit code when dependencies fail', async () => {
    const { command, capture } = createHarness({
      scanError: new CliError('unable to scan', 2),
    });

    await runValidateCommand(command);

    expect(process.exitCode).toBe(2);
    expect(capture.error).toContain('unable to scan');
  });
});
