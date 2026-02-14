import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext, GlobalOptions } from '../../app/command-context';
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from '../../config';
import type { CanonicalEntry, SyncPlan, SyncResult } from '../../engine';
import type { Manifest } from '../../manifest';
import type { ProviderAdapter } from '../../providers/shared';
import type { Scope } from '../../shared/types';
import { createLoggerCapture, type LoggerCapture } from '../__tests__/helpers';
import { createSyncCommand } from './index';

interface HarnessOptions {
  plans?: SyncPlan[];
  executeResults?: SyncResult[];
}

interface RunSyncArgs {
  globalArgs?: string[];
  commandArgs?: string[];
}

const ADAPTER: ProviderAdapter = {
  name: 'claude',
  displayName: 'Claude Code',
  defaultStrategy: 'symlink',
  projectMappings: [
    {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir: '.claude/skills',
      nativeRead: false,
    },
  ],
  userMappings: [
    {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir: '.claude/skills',
      nativeRead: false,
    },
  ],
  detect: async () => true,
};

function createManifest(): Manifest {
  return {
    version: 1,
    oatVersion: '0.0.1',
    entries: [],
    lastUpdated: '2026-02-14T00:00:00.000Z',
  };
}

function createCanonicalEntry(name = 'skill-one'): CanonicalEntry {
  return {
    name,
    type: 'skill',
    canonicalPath: `/tmp/workspace/.agents/skills/${name}`,
  };
}

function createPlan(
  operation: SyncPlan['entries'][number]['operation'],
  scope: SyncPlan['scope'] = 'project',
): SyncPlan {
  const canonical = createCanonicalEntry();
  return {
    scope,
    entries: [
      {
        canonical,
        provider: 'claude',
        providerPath: `/tmp/workspace/.claude/skills/${canonical.name}`,
        operation,
        strategy: operation.includes('copy') ? 'copy' : 'symlink',
        reason: operation,
      },
    ],
    removals: [],
  };
}

function createEmptyPlan(scope: SyncPlan['scope'] = 'project'): SyncPlan {
  return {
    scope,
    entries: [],
    removals: [],
  };
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  computeSyncPlan: ReturnType<typeof vi.fn>;
  executeSyncPlan: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const plansQueue = options.plans
    ? [...options.plans]
    : [createPlan('create_symlink')];
  const executeQueue = options.executeResults
    ? [...options.executeResults]
    : [{ applied: 1, failed: 0, skipped: 0 }];
  const computeSyncPlan = vi.fn(
    async ({ scope }: { scope: SyncPlan['scope'] }) => {
      return plansQueue.shift() ?? createEmptyPlan(scope);
    },
  );
  const executeSyncPlan = vi.fn(async () => {
    return executeQueue.shift() ?? { applied: 0, failed: 0, skipped: 0 };
  });
  const command = createSyncCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      apply: globalOptions.apply ?? false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot: vi.fn(async () => '/tmp/workspace'),
    loadManifest: vi.fn(async () => createManifest()),
    loadSyncConfig: vi.fn(async () => DEFAULT_SYNC_CONFIG as SyncConfig),
    scanCanonical: vi.fn(async () => [createCanonicalEntry()]),
    getAdapters: () => [ADAPTER],
    getActiveAdapters: vi.fn(async (adapters: ProviderAdapter[]) => adapters),
    computeSyncPlan,
    executeSyncPlan,
    formatSyncPlan: vi.fn((plan: SyncPlan, applied: boolean) => {
      return `sync-${applied ? 'applied' : 'dry'}-${plan.scope}-${plan.entries.length + plan.removals.length}`;
    }),
  });

  return { capture, command, computeSyncPlan, executeSyncPlan };
}

async function runSyncCommand(
  command: Command,
  { globalArgs = [], commandArgs = [] }: RunSyncArgs = {},
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

describe('createSyncCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('dry-run: shows plan without making changes', async () => {
    const { capture, command, executeSyncPlan } = createHarness();

    await runSyncCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(executeSyncPlan).not.toHaveBeenCalled();
    expect(capture.info[0]).toContain('sync-dry-project');
  });

  it('--apply: executes sync plan', async () => {
    const { capture, command, executeSyncPlan } = createHarness({
      plans: [createPlan('create_symlink')],
      executeResults: [{ applied: 1, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--apply'],
    });

    expect(executeSyncPlan).toHaveBeenCalledTimes(1);
    expect(capture.success).toContain('Sync applied successfully.');
  });

  it('--apply idempotent: second run reports nothing to do', async () => {
    const { capture, command, executeSyncPlan } = createHarness({
      plans: [createPlan('create_symlink'), createEmptyPlan()],
      executeResults: [{ applied: 1, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--apply'],
    });
    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--apply'],
    });

    expect(executeSyncPlan).toHaveBeenCalledTimes(1);
    expect(capture.info).toContain('No changes required.');
  });

  it('handles partial failure gracefully', async () => {
    const { capture, command } = createHarness({
      plans: [createPlan('create_symlink')],
      executeResults: [{ applied: 1, failed: 1, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--apply'],
    });

    expect(capture.warn).toContain('Sync completed with partial failures.');
    expect(process.exitCode).toBe(1);
  });

  it('outputs JSON plan when --json set', async () => {
    const { capture, command } = createHarness({
      plans: [createPlan('create_copy')],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.info).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      apply: false,
      scope: 'project',
      summary: {
        plannedOperations: 1,
      },
    });
  });

  it('exits 0 on success, 1 on partial failure', async () => {
    const successHarness = createHarness({
      plans: [createPlan('create_symlink')],
      executeResults: [{ applied: 1, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(successHarness.command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--apply'],
    });
    expect(process.exitCode).toBe(0);

    const failureHarness = createHarness({
      plans: [createPlan('create_symlink')],
      executeResults: [{ applied: 0, failed: 1, skipped: 0 }],
    });

    await runSyncCommand(failureHarness.command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--apply'],
    });
    expect(process.exitCode).toBe(1);
  });
});
