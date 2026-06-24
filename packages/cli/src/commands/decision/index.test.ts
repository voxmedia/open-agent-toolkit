import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDecisionCommand } from './index';

function createHarness(): {
  capture: LoggerCapture;
  command: Command;
  createDecisionRecord: ReturnType<typeof vi.fn>;
  initializeDecisionRecords: ReturnType<typeof vi.fn>;
  migrateDecisionRecords: ReturnType<typeof vi.fn>;
  regenerateDecisionIndex: ReturnType<typeof vi.fn>;
  resolveAssetsRoot: ReturnType<typeof vi.fn>;
  resolveProjectRoot: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const initializeDecisionRecords = vi.fn(async (decisionsRoot: string) => ({
    decisionsRoot,
    created: ['index.md'],
    skipped: [],
  }));
  const regenerateDecisionIndex = vi.fn(async (_decisionsRoot: string) => {});
  const createDecisionRecord = vi.fn(async (options) => ({
    id: 'dr-260622-adopt-pjm-split',
    decisionsRoot: options.decisionsRoot,
    filePath: `${options.decisionsRoot}/dr-260622-adopt-pjm-split.md`,
  }));
  const migrateDecisionRecords = vi.fn(async (options) => ({
    referenceRoot: options.referenceRoot,
    decisionsRoot: `${options.referenceRoot}/decisions`,
    dryRun: options.dryRun ?? false,
    deletedLegacy: false,
    mappings: [
      {
        legacyId: 'ADR-001',
        id: 'dr-260622-adopt-pjm-split',
        title: 'Adopt PJM split',
        date: '2026-06-22',
        filePath: `${options.referenceRoot}/decisions/dr-260622-adopt-pjm-split.md`,
      },
    ],
    written: [],
  }));
  const resolveProjectRoot = vi.fn(
    async (_cwd: string) => '/tmp/workspace/repo',
  );
  const resolveAssetsRoot = vi.fn(async () => '/tmp/assets');

  const command = createDecisionCommand({
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
    createDecisionRecord,
    initializeDecisionRecords,
    migrateDecisionRecords,
    regenerateDecisionIndex,
    resolveAssetsRoot,
    resolveProjectRoot,
  });

  return {
    capture,
    command,
    createDecisionRecord,
    initializeDecisionRecords,
    migrateDecisionRecords,
    regenerateDecisionIndex,
    resolveAssetsRoot,
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

  await program.parseAsync(
    [...globalArgs, 'decision', subcommand, ...cmdArgs],
    {
      from: 'user',
    },
  );
}

describe('createDecisionCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('initializes the default decisions root resolved from the project root', async () => {
    const { command, capture, initializeDecisionRecords } = createHarness();

    await runCommand(command, 'init', ['--json']);

    expect(initializeDecisionRecords).toHaveBeenCalledWith(
      '/tmp/workspace/repo/.oat/repo/reference/decisions',
    );
    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      decisionsRoot: '/tmp/workspace/repo/.oat/repo/reference/decisions',
      created: ['index.md'],
      skipped: [],
    });
    expect(process.exitCode).toBe(0);
  });

  it('regenerates the managed decision index', async () => {
    const { command, capture, regenerateDecisionIndex } = createHarness();

    await runCommand(
      command,
      'regenerate-index',
      [],
      ['--decisions-root', 'custom'],
    );

    expect(regenerateDecisionIndex).toHaveBeenCalledWith(
      '/tmp/workspace/custom',
    );
    expect(capture.info).toContain(
      'Regenerated decision index at /tmp/workspace/custom',
    );
    expect(process.exitCode).toBe(0);
  });

  it('creates a new decision record and reports JSON output', async () => {
    const { command, capture, createDecisionRecord } = createHarness();

    await runCommand(
      command,
      'new',
      ['--json'],
      [
        'Adopt PJM Split',
        '--status',
        'accepted',
        '--context',
        'Shared monoliths collide.',
        '--created-at',
        '2026-06-22T10:30:00Z',
      ],
    );

    expect(createDecisionRecord).toHaveBeenCalledWith({
      decisionsRoot: '/tmp/workspace/repo/.oat/repo/reference/decisions',
      assetsRoot: '/tmp/assets',
      templatesRoot: '/tmp/workspace/repo/.oat/templates',
      title: 'Adopt PJM Split',
      status: 'accepted',
      context: 'Shared monoliths collide.',
      createdAt: '2026-06-22T10:30:00Z',
    });
    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      id: 'dr-260622-adopt-pjm-split',
      decisionsRoot: '/tmp/workspace/repo/.oat/repo/reference/decisions',
      filePath:
        '/tmp/workspace/repo/.oat/repo/reference/decisions/dr-260622-adopt-pjm-split.md',
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports JSON errors and exit code 1 for decision creation failures', async () => {
    const { command, capture, createDecisionRecord } = createHarness();
    createDecisionRecord.mockRejectedValueOnce(new Error('collision'));

    await runCommand(command, 'new', ['--json'], ['Collision']);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'error',
      message: 'collision',
    });
    expect(process.exitCode).toBe(1);
  });

  it('runs legacy decision migration and prints mappings', async () => {
    const { command, capture, migrateDecisionRecords } = createHarness();

    await runCommand(
      command,
      'migrate',
      [],
      ['--reference-root', 'custom/reference', '--dry-run'],
    );

    expect(migrateDecisionRecords).toHaveBeenCalledWith({
      referenceRoot: '/tmp/workspace/custom/reference',
      dryRun: true,
      deleteLegacy: false,
    });
    expect(capture.info).toContain(
      'ADR-001 -> dr-260622-adopt-pjm-split (/tmp/workspace/custom/reference/decisions/dr-260622-adopt-pjm-split.md)',
    );
    expect(process.exitCode).toBe(0);
  });
});
