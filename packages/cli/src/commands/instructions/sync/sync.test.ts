import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type {
  InstructionEntry,
  InstructionsSyncCommandDependencies,
} from '@commands/instructions/instructions.types';
import { EXPECTED_CLAUDE_CONTENT } from '@commands/instructions/instructions.utils';
import { CliError } from '@errors/cli-error';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInstructionsSyncCommand } from './sync';

interface HarnessOptions {
  entries?: InstructionEntry[];
  json?: boolean;
  commandError?: Error;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  scanInstructionFiles: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const entries = options.entries ?? [];

  const scanInstructionFiles = vi.fn(async () => {
    if (options.commandError) {
      throw options.commandError;
    }
    return entries;
  });

  const writeFile = vi.fn(async () => undefined);

  const command = createInstructionsSyncCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: globalOptions.scope ?? 'project',
      apply: globalOptions.apply ?? false,
      verbose: globalOptions.verbose ?? false,
      json: options.json ?? globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
    scanInstructionFiles,
    writeFile,
  } satisfies Partial<InstructionsSyncCommandDependencies>);

  return {
    capture,
    command,
    scanInstructionFiles,
    writeFile,
  };
}

async function runSyncCommand(
  command: Command,
  {
    globalArgs = [],
    commandArgs = [],
  }: { globalArgs?: string[]; commandArgs?: string[] } = {},
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);

  await program.parseAsync([...globalArgs, 'sync', ...commandArgs], {
    from: 'user',
  });
}

describe('createInstructionsSyncCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('dry-run plans create actions and prints apply guidance', async () => {
    const { command, capture, writeFile } = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/AGENTS.md',
          claudePath: '/tmp/workspace/CLAUDE.md',
          status: 'missing',
          detail: 'CLAUDE.md missing',
        },
      ],
    });

    await runSyncCommand(command);

    expect(writeFile).not.toHaveBeenCalled();
    expect(capture.info[0]).toContain('instructions dry-run');
    expect(capture.warn).toContain(
      '\nDry-run only: no filesystem changes were made.',
    );
    expect(capture.info).toContain(
      'Apply changes with: oat instructions sync --apply',
    );
    expect(process.exitCode).toBe(0);
  });

  it('dry-run without --force marks mismatches as skipped and exits 1', async () => {
    const { command, capture, writeFile } = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/packages/cli/AGENTS.md',
          claudePath: '/tmp/workspace/packages/cli/CLAUDE.md',
          status: 'content_mismatch',
          detail: 'custom content',
        },
      ],
    });

    await runSyncCommand(command);

    expect(writeFile).not.toHaveBeenCalled();
    expect(capture.info[0]).toContain('status: drift');
    expect(capture.info[0]).toContain('[skipped]');
    expect(process.exitCode).toBe(1);
  });

  it('dry-run with --force plans update actions', async () => {
    const { command, capture } = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/packages/cli/AGENTS.md',
          claudePath: '/tmp/workspace/packages/cli/CLAUDE.md',
          status: 'content_mismatch',
          detail: 'custom content',
        },
      ],
    });

    await runSyncCommand(command, { commandArgs: ['--force'] });

    expect(capture.info[0]).toContain('update packages/cli/CLAUDE.md');
    expect(capture.info[0]).toContain('[planned]');
    expect(process.exitCode).toBe(0);
  });

  it('--apply writes pointer content for planned create and update actions', async () => {
    const { command, writeFile, capture } = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/AGENTS.md',
          claudePath: '/tmp/workspace/CLAUDE.md',
          status: 'missing',
          detail: 'CLAUDE.md missing',
        },
        {
          agentsPath: '/tmp/workspace/packages/cli/AGENTS.md',
          claudePath: '/tmp/workspace/packages/cli/CLAUDE.md',
          status: 'content_mismatch',
          detail: 'custom content',
        },
      ],
    });

    await runSyncCommand(command, { commandArgs: ['--apply', '--force'] });

    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      '/tmp/workspace/CLAUDE.md',
      EXPECTED_CLAUDE_CONTENT,
      'utf8',
    );
    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      '/tmp/workspace/packages/cli/CLAUDE.md',
      EXPECTED_CLAUDE_CONTENT,
      'utf8',
    );
    expect(capture.info[0]).toContain('instructions apply');
    expect(process.exitCode).toBe(0);
  });

  it('--apply without --force leaves mismatches skipped and exits 1', async () => {
    const { command, writeFile } = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/packages/cli/AGENTS.md',
          claudePath: '/tmp/workspace/packages/cli/CLAUDE.md',
          status: 'content_mismatch',
          detail: 'custom content',
        },
      ],
    });

    await runSyncCommand(command, { commandArgs: ['--apply'] });

    expect(writeFile).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('emits JSON payload for dry-run and apply modes', async () => {
    const dryRun = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/AGENTS.md',
          claudePath: '/tmp/workspace/CLAUDE.md',
          status: 'missing',
          detail: 'CLAUDE.md missing',
        },
      ],
    });

    await runSyncCommand(dryRun.command, { globalArgs: ['--json'] });
    expect(dryRun.capture.jsonPayloads[0]).toMatchObject({
      mode: 'dry-run',
      status: 'drift',
      summary: { scanned: 1, missing: 1, created: 1 },
      actions: [
        {
          type: 'create',
          result: 'planned',
        },
      ],
    });

    const apply = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/AGENTS.md',
          claudePath: '/tmp/workspace/CLAUDE.md',
          status: 'missing',
          detail: 'CLAUDE.md missing',
        },
      ],
    });

    await runSyncCommand(apply.command, {
      globalArgs: ['--json'],
      commandArgs: ['--apply'],
    });

    expect(apply.capture.jsonPayloads[0]).toMatchObject({
      mode: 'apply',
      status: 'ok',
      summary: { scanned: 1, ok: 1, created: 1 },
      actions: [
        {
          type: 'create',
          result: 'applied',
        },
      ],
    });
  });

  it('propagates CliError exit code', async () => {
    const { command, capture } = createHarness({
      commandError: new CliError('sync failed', 2),
    });

    await runSyncCommand(command);

    expect(capture.error).toContain('sync failed');
    expect(process.exitCode).toBe(2);
  });
});
