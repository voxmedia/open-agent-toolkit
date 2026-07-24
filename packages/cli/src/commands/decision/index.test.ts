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
  initializeDecisionAgentsGuidance: ReturnType<typeof vi.fn>;
  initializeDecisionRecords: ReturnType<typeof vi.fn>;
  migrateDecisionRecords: ReturnType<typeof vi.fn>;
  regenerateDecisionIndex: ReturnType<typeof vi.fn>;
  resolveAssetsRoot: ReturnType<typeof vi.fn>;
  resolveProjectRoot: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const initializeDecisionAgentsGuidance = vi.fn(async () => ({
    root: 'created' as const,
    scoped: 'created' as const,
  }));
  const initializeDecisionRecords = vi.fn(async (decisionsRoot: string) => ({
    decisionsRoot,
    created: ['index.md'],
    skipped: [],
  }));
  const regenerateDecisionIndex = vi.fn(async (_decisionsRoot: string) => {});
  const createDecisionRecord = vi.fn(async (options) => ({
    id: 'DR-260622-adopt-pjm-split',
    decisionsRoot: options.decisionsRoot,
    filePath: `${options.decisionsRoot}/DR-260622-adopt-pjm-split.md`,
  }));
  const migrateDecisionRecords = vi.fn(async (options) => ({
    referenceRoot: options.referenceRoot,
    decisionsRoot: `${options.referenceRoot}/decisions`,
    dryRun: options.dryRun ?? false,
    deletedLegacy: false,
    mappings: [
      {
        legacyId: 'ADR-001',
        id: 'DR-260622-adopt-pjm-split',
        title: 'Adopt PJM split',
        date: '2026-06-22',
        filePath: `${options.referenceRoot}/decisions/DR-260622-adopt-pjm-split.md`,
      },
    ],
    written: [],
    legacyPresent: true,
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
    initializeDecisionAgentsGuidance,
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
    initializeDecisionAgentsGuidance,
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
    const {
      command,
      capture,
      initializeDecisionAgentsGuidance,
      initializeDecisionRecords,
    } = createHarness();

    await runCommand(command, 'init', ['--json']);

    expect(initializeDecisionRecords).toHaveBeenCalledWith(
      '/tmp/workspace/repo/.oat/repo/reference/decisions',
    );
    expect(initializeDecisionAgentsGuidance).toHaveBeenCalledWith({
      projectRoot: '/tmp/workspace/repo',
      decisionsRoot: '/tmp/workspace/repo/.oat/repo/reference/decisions',
    });
    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      decisionsRoot: '/tmp/workspace/repo/.oat/repo/reference/decisions',
      created: ['index.md'],
      skipped: [],
      guidance: {
        root: 'created',
        scoped: 'created',
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports a decision init failure when AGENTS guidance cannot be written', async () => {
    const {
      command,
      capture,
      initializeDecisionAgentsGuidance,
      initializeDecisionRecords,
    } = createHarness();
    initializeDecisionAgentsGuidance.mockRejectedValueOnce(
      new Error('permission denied'),
    );

    await runCommand(command, 'init', ['--json']);

    expect(initializeDecisionRecords).toHaveBeenCalledOnce();
    expect(capture.jsonPayloads).toEqual([
      {
        status: 'error',
        message:
          'Decision index initialized at /tmp/workspace/repo/.oat/repo/reference/decisions, but AGENTS.md guidance could not be written: permission denied. Fix the guidance write error and rerun `oat decision init`.',
      },
    ]);
    expect(process.exitCode).toBe(1);
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
        '--decision',
        'Split project management into file-backed records.',
        '--consequences',
        'Parallel worktrees can update independent records.',
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
      decision: 'Split project management into file-backed records.',
      consequences: 'Parallel worktrees can update independent records.',
      createdAt: '2026-06-22T10:30:00Z',
    });
    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      id: 'DR-260622-adopt-pjm-split',
      decisionsRoot: '/tmp/workspace/repo/.oat/repo/reference/decisions',
      filePath:
        '/tmp/workspace/repo/.oat/repo/reference/decisions/DR-260622-adopt-pjm-split.md',
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
      'ADR-001 -> DR-260622-adopt-pjm-split (/tmp/workspace/custom/reference/decisions/DR-260622-adopt-pjm-split.md)',
    );
    expect(process.exitCode).toBe(0);
  });

  it('prints a friendly no-op and exits 0 when no legacy record is present (F4)', async () => {
    const { command, capture, migrateDecisionRecords } = createHarness();
    migrateDecisionRecords.mockResolvedValueOnce({
      referenceRoot: '/tmp/workspace/custom/reference',
      decisionsRoot: '/tmp/workspace/custom/reference/decisions',
      dryRun: true,
      deletedLegacy: false,
      mappings: [],
      written: [],
      legacyPresent: false,
      message: 'Nothing to migrate; no legacy decision-record.md found.',
    });

    await runCommand(
      command,
      'migrate',
      [],
      ['--reference-root', 'custom/reference', '--dry-run'],
    );

    expect(capture.info).toContain(
      'Nothing to migrate; no legacy decision-record.md found.',
    );
    // No mapping lines are emitted for a clean no-op.
    expect(capture.info.some((line) => line.includes('->'))).toBe(false);
    expect(process.exitCode).toBe(0);
  });
});
