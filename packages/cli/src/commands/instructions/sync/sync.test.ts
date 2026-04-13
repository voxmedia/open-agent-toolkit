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

import { createInstructionsSyncCommand, removeInstructionFile } from './sync';

interface HarnessOptions {
  entries?: InstructionEntry[];
  json?: boolean;
  commandError?: Error;
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  readFile: ReturnType<typeof vi.fn>;
  removeFile: ReturnType<typeof vi.fn>;
  scanInstructionFiles: ReturnType<typeof vi.fn>;
  symlinkFile: ReturnType<typeof vi.fn>;
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
  const readFile = vi.fn(async () => '# canonical instructions\n');
  const removeFile = vi.fn(async () => undefined);
  const symlinkFile = vi.fn(async () => undefined);

  const command = createInstructionsSyncCommand({
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
    readFile,
    removeFile,
    resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
    scanInstructionFiles,
    symlinkFile,
    writeFile,
  } satisfies Partial<InstructionsSyncCommandDependencies>);

  return {
    capture,
    command,
    readFile,
    removeFile,
    scanInstructionFiles,
    symlinkFile,
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

  it('removeInstructionFile only uses force when deleting a file target', async () => {
    const remove = vi.fn(async () => undefined);

    await removeInstructionFile('/tmp/workspace/CLAUDE.md', remove);

    expect(remove).toHaveBeenCalledWith('/tmp/workspace/CLAUDE.md', {
      force: true,
    });
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

    await runSyncCommand(command, { commandArgs: ['--dry-run'] });

    expect(writeFile).not.toHaveBeenCalled();
    expect(capture.info[0]).toContain('instructions dry-run');
    expect(capture.warn).toContain(
      '\nDry-run only: no filesystem changes were made.',
    );
    expect(capture.info).toContain('Run without --dry-run to apply changes.');
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

    await runSyncCommand(command, { commandArgs: ['--dry-run'] });

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

    await runSyncCommand(command, { commandArgs: ['--dry-run', '--force'] });

    expect(capture.info[0]).toContain('update packages/cli/CLAUDE.md');
    expect(capture.info[0]).toContain('[planned]');
    expect(process.exitCode).toBe(0);
  });

  it('apply (default) writes pointer content for planned create and update actions', async () => {
    const { command, removeFile, writeFile, capture } = createHarness({
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

    await runSyncCommand(command, { commandArgs: ['--force'] });

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
    expect(removeFile).toHaveBeenCalledWith(
      '/tmp/workspace/packages/cli/CLAUDE.md',
    );
    expect(capture.info[0]).toContain('instructions apply');
    expect(process.exitCode).toBe(0);
  });

  it('apply with --strategy symlink creates relative file symlinks', async () => {
    const { command, removeFile, symlinkFile, writeFile } = createHarness({
      entries: [
        {
          agentsPath: '/tmp/workspace/docs/AGENTS.md',
          claudePath: '/tmp/workspace/docs/CLAUDE.md',
          status: 'missing',
          detail: 'CLAUDE.md missing',
        },
        {
          agentsPath: '/tmp/workspace/packages/cli/AGENTS.md',
          claudePath: '/tmp/workspace/packages/cli/CLAUDE.md',
          status: 'content_mismatch',
          detail: 'wrong file type',
        },
      ],
    });

    await runSyncCommand(command, {
      commandArgs: ['--strategy', 'symlink', '--force'],
    });

    expect(writeFile).not.toHaveBeenCalled();
    expect(symlinkFile).toHaveBeenCalledTimes(2);
    expect(symlinkFile).toHaveBeenNthCalledWith(
      1,
      'AGENTS.md',
      '/tmp/workspace/docs/CLAUDE.md',
    );
    expect(symlinkFile).toHaveBeenNthCalledWith(
      2,
      'AGENTS.md',
      '/tmp/workspace/packages/cli/CLAUDE.md',
    );
    expect(removeFile).toHaveBeenCalledWith(
      '/tmp/workspace/packages/cli/CLAUDE.md',
    );
  });

  it('apply with --strategy copy writes AGENTS.md content into CLAUDE.md', async () => {
    const { command, readFile, removeFile, symlinkFile, writeFile } =
      createHarness({
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
            detail: 'pointer file present',
          },
        ],
      });

    readFile
      .mockResolvedValueOnce('# root instructions\n')
      .mockResolvedValueOnce('# cli instructions\n');

    await runSyncCommand(command, {
      commandArgs: ['--strategy', 'copy', '--force'],
    });

    expect(symlinkFile).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      '/tmp/workspace/CLAUDE.md',
      '# root instructions\n',
      'utf8',
    );
    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      '/tmp/workspace/packages/cli/CLAUDE.md',
      '# cli instructions\n',
      'utf8',
    );
    expect(removeFile).toHaveBeenCalledWith(
      '/tmp/workspace/packages/cli/CLAUDE.md',
    );
  });

  it('adopts stray CLAUDE.md content into AGENTS.md before re-syncing Claude', async () => {
    const { command, readFile, removeFile, symlinkFile, writeFile } =
      createHarness({
        entries: [
          {
            agentsPath: null,
            claudePath: '/tmp/workspace/docs/CLAUDE.md',
            status: 'stray',
            detail: 'CLAUDE.md found without AGENTS.md',
          },
        ],
      });

    readFile.mockResolvedValueOnce('# stray claude instructions\n');

    await runSyncCommand(command);

    expect(symlinkFile).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      '/tmp/workspace/docs/AGENTS.md',
      '# stray claude instructions\n',
      'utf8',
    );
    expect(removeFile).toHaveBeenCalledWith('/tmp/workspace/docs/CLAUDE.md');
    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      '/tmp/workspace/docs/CLAUDE.md',
      EXPECTED_CLAUDE_CONTENT,
      'utf8',
    );
  });

  it('apply (default) without --force leaves mismatches skipped and exits 1', async () => {
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

    await runSyncCommand(command);

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

    await runSyncCommand(dryRun.command, {
      globalArgs: ['--json'],
      commandArgs: ['--dry-run'],
    });
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

  it('passes the requested strategy through the shared scan path', async () => {
    const { command, scanInstructionFiles } = createHarness({
      entries: [],
    });

    await runSyncCommand(command, {
      commandArgs: ['--dry-run', '--strategy', 'copy'],
    });

    expect(scanInstructionFiles).toHaveBeenCalledWith('/tmp/workspace', {
      strategy: 'copy',
    });
  });
});
