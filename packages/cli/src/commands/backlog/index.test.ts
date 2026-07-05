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
  archiveBacklogItem: ReturnType<typeof vi.fn>;
  pathExists: ReturnType<typeof vi.fn>;
  resolveProjectRoot: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const initializeBacklog = vi.fn(async (_backlogRoot: string) => {});
  const archiveBacklogItem = vi.fn(
    async (_backlogRoot: string, id: string) => ({
      id,
      result: 'archived' as const,
      status: 'closed' as const,
      completedEntry: 'written' as const,
      movedTo: `/tmp/workspace/repo/.oat/repo/pjm/backlog/archived/${id}.md`,
      indexRegenerated: true,
      warnings: [] as string[],
    }),
  );
  const pathExists = vi.fn(async (_path: string) => false);
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
    archiveBacklogItem,
    pathExists,
    resolveProjectRoot,
  });

  return {
    capture,
    command,
    initializeBacklog,
    archiveBacklogItem,
    pathExists,
    resolveProjectRoot,
  };
}

async function runCommand(
  command: Command,
  subcommand: string,
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

  await program.parseAsync([...globalArgs, 'backlog', subcommand, ...cmdArgs], {
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

    await runCommand(command, 'init');

    expect(resolveProjectRoot).toHaveBeenCalledWith('/tmp/workspace');
    expect(initializeBacklog).toHaveBeenCalledWith(
      '/tmp/workspace/repo/.oat/repo/pjm/backlog',
    );
    expect(capture.info).toContain(
      'Initialized backlog scaffold at /tmp/workspace/repo/.oat/repo/pjm/backlog',
    );
    expect(process.exitCode).toBe(0);
  });

  it('uses the configured backlog root override relative to cwd', async () => {
    const { command, capture, initializeBacklog, resolveProjectRoot } =
      createHarness();

    await runCommand(
      command,
      'init',
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

    await runCommand(command, 'init', ['--json']);

    expect(initializeBacklog).toHaveBeenCalledWith(
      '/tmp/workspace/repo/.oat/repo/pjm/backlog',
    );
    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      backlogRoot: '/tmp/workspace/repo/.oat/repo/pjm/backlog',
    });
    expect(process.exitCode).toBe(0);
  });

  it('generates a date slug id from a title', async () => {
    const { command, capture, pathExists } = createHarness();

    await runCommand(
      command,
      'generate-id',
      [],
      ['Streaming Cache Layer', '--created-at', '2026-06-22T10:00:00Z'],
    );

    expect(pathExists).toHaveBeenCalledWith(
      '/tmp/workspace/repo/.oat/repo/pjm/backlog/items/BL-260622-streaming-cache-layer.md',
    );
    expect(pathExists).toHaveBeenCalledWith(
      '/tmp/workspace/repo/.oat/repo/pjm/backlog/archived/BL-260622-streaming-cache-layer.md',
    );
    expect(capture.info).toContain('BL-260622-streaming-cache-layer');
    expect(process.exitCode).toBe(0);
  });

  it('outputs structured JSON for generated ids', async () => {
    const { command, capture } = createHarness();

    await runCommand(
      command,
      'generate-id',
      ['--json'],
      ['Streaming Cache Layer', '--created-at', '2026-06-22T10:00:00Z'],
    );

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      id: 'BL-260622-streaming-cache-layer',
      titleOrSlug: 'Streaming Cache Layer',
      createdAt: '2026-06-22T10:00:00Z',
    });
    expect(process.exitCode).toBe(0);
  });

  it('archives an item through the resolved backlog root with parsed options', async () => {
    const { command, capture, archiveBacklogItem, resolveProjectRoot } =
      createHarness();

    await runCommand(
      command,
      'archive',
      [],
      ['BL-260705-demo', '--wont-do', '--summary', 'Not pursuing'],
    );

    expect(resolveProjectRoot).toHaveBeenCalledWith('/tmp/workspace');
    expect(archiveBacklogItem).toHaveBeenCalledWith(
      '/tmp/workspace/repo/.oat/repo/pjm/backlog',
      'BL-260705-demo',
      { wontDo: true, summary: 'Not pursuing' },
    );
    expect(capture.success.join('\n')).toContain('Archived BL-260705-demo');
    expect(process.exitCode).toBe(0);
  });

  it('emits a structured JSON payload for archive results', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, 'archive', ['--json'], ['BL-260705-demo']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      id: 'BL-260705-demo',
      result: 'archived',
      status: 'closed',
      completedEntry: 'written',
      indexRegenerated: true,
    });
    expect(process.exitCode).toBe(0);
  });

  it('emits the no-op JSON payload when the item is already archived', async () => {
    const { command, capture, archiveBacklogItem } = createHarness();
    archiveBacklogItem.mockResolvedValueOnce({
      id: 'BL-260705-demo',
      result: 'noop',
      status: 'closed',
      completedEntry: 'skipped',
      movedTo:
        '/tmp/workspace/repo/.oat/repo/pjm/backlog/archived/BL-260705-demo.md',
      indexRegenerated: false,
      warnings: ['Backlog item BL-260705-demo is already archived'],
    });

    await runCommand(command, 'archive', ['--json'], ['BL-260705-demo']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      id: 'BL-260705-demo',
      result: 'noop',
      completedEntry: 'skipped',
      indexRegenerated: false,
    });
    expect(process.exitCode).toBe(0);
  });

  it('maps an actionable archive failure to exit code 1', async () => {
    const { command, capture, archiveBacklogItem } = createHarness();
    const { BacklogArchiveError } = await import('./archive');
    archiveBacklogItem.mockRejectedValueOnce(
      new BacklogArchiveError('Backlog item BL-260705-demo not found.', 1),
    );

    await runCommand(command, 'archive', [], ['BL-260705-demo']);

    expect(capture.error.join('\n')).toContain('not found');
    expect(process.exitCode).toBe(1);
  });

  it('reports a collision when the candidate item path exists', async () => {
    const { command, capture, pathExists } = createHarness();
    pathExists.mockImplementation(async (path: string) =>
      path.endsWith('/items/BL-260622-streaming-cache-layer.md'),
    );

    await runCommand(
      command,
      'generate-id',
      ['--json'],
      ['Streaming Cache Layer', '--created-at', '2026-06-22T10:00:00Z'],
    );

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'error',
      id: 'BL-260622-streaming-cache-layer',
      message:
        'Backlog item BL-260622-streaming-cache-layer already exists. Use a more specific title or slug to disambiguate.',
    });
    expect(process.exitCode).toBe(1);
  });
});
