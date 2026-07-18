import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from '@config/index';
import {
  scanBundledManagedAgents as scanBundledManagedAgentsFromDisk,
  scanCanonical as scanCanonicalFromDisk,
  type CanonicalEntry,
  type SyncPlan,
  type SyncResult,
} from '@engine/index';
import type { Manifest } from '@manifest/index';
import { buildCodexMaterializedTargetRoleName } from '@providers/codex/codec/shared';
import type {
  CodexExtensionApplyResult,
  CodexExtensionPlan,
} from '@providers/codex/codec/sync-extension';
import {
  applyCodexProjectExtensionPlan as applyCodexExtensionPlanToDisk,
  computeCodexProjectExtensionPlan as computeCodexExtensionPlanFromDisk,
} from '@providers/codex/codec/sync-extension';
import type {
  ConfigAwareAdaptersResult,
  ProviderAdapter,
} from '@providers/shared';
import { OAT_VERSION } from '@shared/oat-version';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSyncCommand } from './index';
import type { SyncMaterializationExtension } from './sync.types';

interface HarnessOptions {
  adapters?: ProviderAdapter[];
  plans?: SyncPlan[];
  executeResults?: SyncResult[];
  codexExtensionPlans?: CodexExtensionPlan[];
  codexExtensionApplyResults?: CodexExtensionApplyResult[];
  interactive?: boolean;
  loadedSyncConfig?: SyncConfig;
  loadedManifests?: Manifest[];
  configAwareResults?: ConfigAwareAdaptersResult[];
  providerSelectResponses?: Array<string[] | null>;
  canonicalEntries?: CanonicalEntry[];
  cwd?: string;
  home?: string;
  useDiskCodexExtension?: boolean;
  useDiskScanner?: boolean;
  useDiskBundledCodexAgents?: boolean;
  extraMaterializationExtensions?: SyncMaterializationExtension[];
}

interface RunSyncArgs {
  globalArgs?: string[];
  commandArgs?: string[];
}

function createAdapter(name = 'claude'): ProviderAdapter {
  return {
    name,
    displayName: name === 'claude' ? 'Claude Code' : name,
    defaultStrategy: 'symlink',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: `.${name}/skills`,
        nativeRead: false,
      },
    ],
    userMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: `.${name}/skills`,
        nativeRead: false,
      },
    ],
    detect: async () => true,
  };
}

function createCodexAdapter(): ProviderAdapter {
  return {
    name: 'codex',
    displayName: 'Codex CLI',
    defaultStrategy: 'copy',
    projectMappings: [
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.codex/agents',
        nativeRead: false,
      },
    ],
    userMappings: [],
    detect: async () => true,
  };
}

function createManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    version: 1,
    oatVersion: OAT_VERSION,
    entries: [],
    lastUpdated: '2026-02-14T00:00:00.000Z',
    ...overrides,
  };
}

function createCanonicalEntry(name = 'skill-one'): CanonicalEntry {
  return {
    name,
    type: 'skill',
    canonicalPath: `/tmp/workspace/.agents/skills/${name}`,
    isFile: false,
  };
}

function createRuleCanonicalEntry(
  name = 'react-components.md',
): CanonicalEntry {
  return {
    name,
    type: 'rule',
    canonicalPath: `/tmp/workspace/.agents/rules/${name}`,
    isFile: true,
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

function createRulePlan(
  operation: SyncPlan['entries'][number]['operation'] = 'create_copy',
  scope: SyncPlan['scope'] = 'project',
): SyncPlan {
  const canonical = createRuleCanonicalEntry();
  return {
    scope,
    entries: [
      {
        canonical,
        provider: 'cursor',
        providerPath: '/tmp/workspace/.cursor/rules/react-components.mdc',
        operation,
        strategy: 'copy',
        reason: operation,
        renderedContent: '# rendered rule\n',
      },
    ],
    removals: [],
  };
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  adapters: ProviderAdapter[];
  computeSyncPlan: ReturnType<typeof vi.fn>;
  executeSyncPlan: ReturnType<typeof vi.fn>;
  computeCodexProjectExtensionPlan: ReturnType<typeof vi.fn>;
  applyCodexProjectExtensionPlan: ReturnType<typeof vi.fn>;
  saveSyncConfig: ReturnType<typeof vi.fn>;
  selectProvidersWithAbort: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const adapters = options.adapters ?? [createAdapter()];
  const primaryAdapter = adapters[0] ?? createAdapter();
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

  const configAwareQueue = options.configAwareResults
    ? [...options.configAwareResults]
    : [
        {
          activeAdapters: [primaryAdapter],
          detectedUnset: [],
          detectedDisabled: [],
        },
      ];
  const getConfigAwareAdapters = vi.fn(async () => {
    return (
      configAwareQueue.shift() ?? {
        activeAdapters: [primaryAdapter],
        detectedUnset: [],
        detectedDisabled: [],
      }
    );
  });

  const codexExtensionPlans = [...(options.codexExtensionPlans ?? [])];
  const computeCodexProjectExtensionPlan = options.useDiskCodexExtension
    ? vi.fn(computeCodexExtensionPlanFromDisk)
    : vi.fn(async () => {
        return (
          codexExtensionPlans.shift() ?? {
            provider: 'codex',
            operations: [],
            managedEntries: [],
            aggregateHash: 'hash',
            metadata: {
              managedRoles: [],
              aggregateConfigHash: 'hash',
            },
            managedRoles: [],
            aggregateConfigHash: 'hash',
          }
        );
      });
  const codexApplyResults = [...(options.codexExtensionApplyResults ?? [])];
  const applyCodexProjectExtensionPlan = options.useDiskCodexExtension
    ? vi.fn(applyCodexExtensionPlanToDisk)
    : vi.fn(async () => {
        return (
          codexApplyResults.shift() ?? { applied: 0, failed: 0, skipped: 0 }
        );
      });

  const providerSelectResponses = [...(options.providerSelectResponses ?? [])];
  const selectProvidersWithAbort = vi.fn(
    async () => providerSelectResponses.shift() ?? [],
  );

  const saveSyncConfig = vi.fn(
    async (_configPath: string, config: SyncConfig) => {
      return config;
    },
  );
  const manifestQueue = [...(options.loadedManifests ?? [])];

  const command = createSyncCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      dryRun: globalOptions.dryRun ?? false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd ?? '/tmp/workspace',
      home: options.home ?? '/tmp/home',
      interactive: options.interactive ?? !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot: vi.fn(async (scope) =>
      scope === 'user'
        ? (options.home ?? '/tmp/home')
        : (options.cwd ?? '/tmp/workspace'),
    ),
    loadManifest: vi.fn(async () => manifestQueue.shift() ?? createManifest()),
    loadSyncConfig: vi.fn(
      async () =>
        options.loadedSyncConfig ?? (DEFAULT_SYNC_CONFIG as SyncConfig),
    ),
    saveSyncConfig,
    scanCanonical: options.useDiskScanner
      ? vi.fn(scanCanonicalFromDisk)
      : vi.fn(async () => options.canonicalEntries ?? [createCanonicalEntry()]),
    scanBundledManagedAgents: options.useDiskBundledCodexAgents
      ? vi.fn(scanBundledManagedAgentsFromDisk)
      : vi.fn(async () => []),
    getAdapters: () => adapters,
    getConfigAwareAdapters,
    selectProvidersWithAbort,
    computeSyncPlan,
    executeSyncPlan,
    getMaterializationExtensions: () => [
      {
        provider: 'codex',
        async computePlan(context) {
          const plan = await computeCodexProjectExtensionPlan(
            context.scopeRoot,
            context.canonicalEntries,
            context.allowedCanonicalPaths,
            context.options,
          );
          return {
            provider: 'codex',
            operations: plan.operations.map((operation) => ({
              provider: 'codex' as const,
              entryName: operation.entryName ?? operation.roleName,
              ...operation,
            })),
            managedEntries: plan.managedEntries ?? plan.managedRoles,
            aggregateHash: plan.aggregateHash ?? plan.aggregateConfigHash,
            metadata: plan.metadata ?? {
              managedRoles: plan.managedRoles,
              aggregateConfigHash: plan.aggregateConfigHash,
            },
          };
        },
        applyPlan: (scopeRoot, plan) =>
          applyCodexProjectExtensionPlan(scopeRoot, plan as CodexExtensionPlan),
      },
      ...(options.extraMaterializationExtensions ?? []),
    ],
    applyMaterializationExtensionPlan: (extension, scopeRoot, plan) =>
      extension.applyPlan(scopeRoot, plan),
    formatSyncPlan: vi.fn((plan: SyncPlan, applied: boolean) => {
      return `sync-${applied ? 'applied' : 'dry'}-${plan.scope}-${plan.entries.length + plan.removals.length}`;
    }),
  });

  return {
    capture,
    command,
    adapters,
    computeSyncPlan,
    executeSyncPlan,
    computeCodexProjectExtensionPlan,
    applyCodexProjectExtensionPlan,
    saveSyncConfig,
    selectProvidersWithAbort,
  };
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

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--dry-run'],
    });

    expect(executeSyncPlan).not.toHaveBeenCalled();
    expect(capture.info[0]).toContain('sync-dry-project');
    expect(capture.warn).toContain(
      '\nDry-run only: no filesystem changes were made.',
    );
    expect(capture.info).toContain('Run without --dry-run to apply changes.');
  });

  it('dry-run no-op: shows no changes to apply guidance', async () => {
    const { capture, command, executeSyncPlan } = createHarness({
      plans: [createEmptyPlan('project')],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--dry-run'],
    });

    expect(executeSyncPlan).not.toHaveBeenCalled();
    expect(capture.warn).toContain(
      '\nDry-run only: no filesystem changes were made.',
    );
    expect(capture.info).toContain('No changes to apply.');
  });

  it('apply (default): executes sync plan', async () => {
    const { capture, command, executeSyncPlan } = createHarness({
      plans: [createPlan('create_symlink')],
      executeResults: [{ applied: 1, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    expect(executeSyncPlan).toHaveBeenCalledTimes(1);
    expect(capture.success).toContain('\nSync applied successfully.');
  });

  it('apply (default): executes skip-only plans to reconcile manifest state', async () => {
    const { capture, command, executeSyncPlan } = createHarness({
      plans: [createPlan('skip')],
      executeResults: [{ applied: 0, failed: 0, skipped: 1 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    expect(executeSyncPlan).toHaveBeenCalledTimes(1);
    expect(capture.info).toContain('\nNo changes required.');
  });

  it('apply (default): executes transformed rule copy plans', async () => {
    const { command, executeSyncPlan } = createHarness({
      adapters: [createAdapter('cursor')],
      canonicalEntries: [createRuleCanonicalEntry()],
      plans: [createRulePlan()],
      executeResults: [{ applied: 1, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    expect(executeSyncPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: [
          expect.objectContaining({
            provider: 'cursor',
            providerPath: '/tmp/workspace/.cursor/rules/react-components.mdc',
            strategy: 'copy',
            operation: 'create_copy',
            canonical: expect.objectContaining({
              name: 'react-components.md',
              type: 'rule',
              isFile: true,
            }),
          }),
        ],
      }),
      expect.any(Object),
      '/tmp/workspace/.oat/sync/manifest.json',
    );
  });

  it('apply idempotent: second run reports nothing to do', async () => {
    const { capture, command, executeSyncPlan } = createHarness({
      plans: [createPlan('create_symlink'), createEmptyPlan()],
      executeResults: [{ applied: 1, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });
    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    expect(executeSyncPlan).toHaveBeenCalledTimes(1);
    expect(capture.info).toContain('\nNo changes required.');
  });

  it('apply no-op: refreshes stale manifest oatVersion even when no files changed', async () => {
    const staleManifest = createManifest({ oatVersion: '0.0.1' });
    const { capture, command, executeSyncPlan } = createHarness({
      loadedManifests: [staleManifest],
      plans: [createEmptyPlan()],
      executeResults: [{ applied: 0, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    expect(executeSyncPlan).toHaveBeenCalledWith(
      expect.objectContaining({ entries: [], removals: [] }),
      staleManifest,
      '/tmp/workspace/.oat/sync/manifest.json',
    );
    expect(capture.info).toContain('\nNo changes required.');
  });

  it('handles partial failure gracefully', async () => {
    const { capture, command } = createHarness({
      plans: [createPlan('create_symlink')],
      executeResults: [{ applied: 1, failed: 1, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    expect(capture.warn).toContain('\nSync completed with partial failures.');
    expect(process.exitCode).toBe(1);
  });

  it('prompts to remediate detected unset providers in interactive mode', async () => {
    const {
      command,
      adapters,
      selectProvidersWithAbort,
      saveSyncConfig,
      computeSyncPlan,
    } = createHarness({
      configAwareResults: [
        {
          activeAdapters: [createAdapter()],
          detectedUnset: ['claude'],
          detectedDisabled: [],
        },
        {
          activeAdapters: [createAdapter()],
          detectedUnset: [],
          detectedDisabled: [],
        },
      ],
      providerSelectResponses: [['claude']],
    });

    await runSyncCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectProvidersWithAbort).toHaveBeenCalledTimes(1);
    expect(selectProvidersWithAbort.mock.calls[0]?.[0]).toContain(
      'Detected provider directories are not enabled in config',
    );
    expect(saveSyncConfig).toHaveBeenCalledWith(
      '/tmp/workspace/.oat/sync/config.json',
      expect.objectContaining({
        providers: expect.objectContaining({
          claude: { enabled: true },
        }),
      }),
    );
    expect(
      (computeSyncPlan.mock.calls[0]?.[0].adapters as ProviderAdapter[]).map(
        (current) => current.name,
      ),
    ).toEqual([adapters[0]?.name]);
  });

  it('prompts to remediate detected disabled providers in interactive mode', async () => {
    const { command, adapters, saveSyncConfig, computeSyncPlan } =
      createHarness({
        configAwareResults: [
          {
            activeAdapters: [],
            detectedUnset: [],
            detectedDisabled: ['claude'],
          },
          {
            activeAdapters: [createAdapter()],
            detectedUnset: [],
            detectedDisabled: [],
          },
        ],
        providerSelectResponses: [['claude']],
        loadedSyncConfig: {
          ...DEFAULT_SYNC_CONFIG,
          providers: {
            claude: { enabled: false },
          },
        },
      });

    await runSyncCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(saveSyncConfig).toHaveBeenCalledWith(
      '/tmp/workspace/.oat/sync/config.json',
      expect.objectContaining({
        providers: expect.objectContaining({
          claude: { enabled: true },
        }),
      }),
    );
    expect(
      (computeSyncPlan.mock.calls[0]?.[0].adapters as ProviderAdapter[]).map(
        (current) => current.name,
      ),
    ).toEqual([adapters[0]?.name]);
  });

  it('persists declined detected unset providers as disabled', async () => {
    const { command, saveSyncConfig, computeSyncPlan } = createHarness({
      configAwareResults: [
        {
          activeAdapters: [createAdapter()],
          detectedUnset: ['claude'],
          detectedDisabled: [],
        },
        {
          activeAdapters: [],
          detectedUnset: [],
          detectedDisabled: ['claude'],
        },
      ],
      providerSelectResponses: [[]],
    });

    await runSyncCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(saveSyncConfig).toHaveBeenCalledWith(
      '/tmp/workspace/.oat/sync/config.json',
      expect.objectContaining({
        providers: expect.objectContaining({
          claude: { enabled: false },
        }),
      }),
    );
    expect(computeSyncPlan.mock.calls[0]?.[0].adapters).toEqual([]);
  });

  it('warns in non-interactive mode and does not mutate config on mismatches', async () => {
    const { command, saveSyncConfig, capture, selectProvidersWithAbort } =
      createHarness({
        interactive: false,
        configAwareResults: [
          {
            activeAdapters: [createAdapter()],
            detectedUnset: ['claude'],
            detectedDisabled: [],
          },
        ],
      });

    await runSyncCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(saveSyncConfig).not.toHaveBeenCalled();
    expect(selectProvidersWithAbort).not.toHaveBeenCalled();
    expect(capture.warn).toContain(
      'Provider config mismatch detected [project] (unset: claude).',
    );
    expect(capture.info).toContain(
      'Run "oat providers set --scope project --enabled <providers> --disabled <providers>" to configure supported providers.',
    );
  });

  it('outputs JSON plan when --json set', async () => {
    const { capture, command } = createHarness({
      plans: [createPlan('create_copy')],
      configAwareResults: [
        {
          activeAdapters: [createAdapter()],
          detectedUnset: ['claude'],
          detectedDisabled: [],
        },
      ],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
      commandArgs: ['--dry-run'],
    });

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.info).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      dryRun: true,
      scope: 'project',
      summary: {
        plannedOperations: 1,
      },
      providerMismatches: [
        {
          detectedUnset: ['claude'],
          detectedDisabled: [],
        },
      ],
    });
  });

  it('forwards install-triggered canonical filters into computeSyncPlan', async () => {
    const { command, computeSyncPlan } = createHarness();

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: [
        '--dry-run',
        '--install-canonical',
        '.agents/skills/oat-docs-analyze',
      ],
    });

    expect(computeSyncPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedCanonicalPaths: ['.agents/skills/oat-docs-analyze'],
      }),
    );
  });

  it('rejects invalid install-triggered canonical filters', async () => {
    const { command, computeSyncPlan } = createHarness();

    await expect(
      runSyncCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--dry-run', '--install-canonical', '../../etc/passwd'],
      }),
    ).rejects.toMatchObject({
      message: 'Invalid --install-canonical path: ../../etc/passwd',
    });
    expect(computeSyncPlan).not.toHaveBeenCalled();
  });

  it('combines enabled Codex and Cursor materialization plans in dry-run JSON', async () => {
    const cursorCompute = vi.fn(async () => ({
      provider: 'cursor' as const,
      operations: [
        {
          provider: 'cursor' as const,
          action: 'create' as const,
          target: 'role',
          path: '.cursor/agents/oat-reviewer-gpt.md',
          reason: 'managed Cursor role file missing',
          entryName: 'oat-reviewer-gpt',
          content: '# reviewer',
        },
      ],
      managedEntries: ['oat-reviewer-gpt'],
      aggregateHash: 'cursor-hash',
      metadata: {},
    }));
    const cursorExtension: SyncMaterializationExtension = {
      provider: 'cursor',
      computePlan: cursorCompute,
      applyPlan: vi.fn(async () => ({ applied: 1, failed: 0, skipped: 0 })),
    };
    const codexAdapter = createCodexAdapter();
    const cursorAdapter = createAdapter('cursor');
    const { capture, command } = createHarness({
      adapters: [codexAdapter, cursorAdapter],
      plans: [createEmptyPlan('project')],
      configAwareResults: [
        {
          activeAdapters: [codexAdapter, cursorAdapter],
          detectedUnset: [],
          detectedDisabled: [],
        },
        {
          activeAdapters: [codexAdapter, cursorAdapter],
          detectedUnset: [],
          detectedDisabled: [],
        },
      ],
      codexExtensionPlans: [
        {
          provider: 'codex',
          operations: [],
          managedEntries: [],
          aggregateHash: 'codex-hash',
          metadata: {
            managedRoles: [],
            aggregateConfigHash: 'codex-hash',
          },
          managedRoles: [],
          aggregateConfigHash: 'codex-hash',
        },
      ],
      extraMaterializationExtensions: [cursorExtension],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
      commandArgs: ['--dry-run'],
    });

    expect(cursorCompute).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeRoot: '/tmp/workspace',
        options: { userConfigDir: '/tmp/home/.oat' },
      }),
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      materializationExtensions: [
        { provider: 'codex' },
        {
          provider: 'cursor',
          operations: [{ action: 'create', entryName: 'oat-reviewer-gpt' }],
        },
      ],
      summary: { plannedOperations: 1 },
    });
  });

  it('applies combined project extensions in deterministic order with partial filters and aggregate counts', async () => {
    const cursorCompute = vi.fn(async () => ({
      provider: 'cursor' as const,
      operations: [
        {
          provider: 'cursor' as const,
          action: 'create' as const,
          target: 'role',
          path: '.cursor/agents/oat-reviewer-gpt.md',
          reason: 'managed Cursor role file missing',
          entryName: 'oat-reviewer-gpt',
          content: '# reviewer',
        },
      ],
      managedEntries: ['oat-reviewer-gpt'],
      aggregateHash: 'cursor-hash',
      metadata: {},
    }));
    const cursorApply = vi.fn(async () => ({
      applied: 1,
      failed: 0,
      skipped: 0,
    }));
    const cursorExtension: SyncMaterializationExtension = {
      provider: 'cursor',
      computePlan: cursorCompute,
      applyPlan: cursorApply,
    };
    const codexAdapter = createCodexAdapter();
    const cursorAdapter = createAdapter('cursor');
    const {
      capture,
      command,
      computeCodexProjectExtensionPlan,
      applyCodexProjectExtensionPlan,
    } = createHarness({
      adapters: [codexAdapter, cursorAdapter],
      plans: [createEmptyPlan('project')],
      configAwareResults: [
        {
          activeAdapters: [codexAdapter, cursorAdapter],
          detectedUnset: [],
          detectedDisabled: [],
        },
        {
          activeAdapters: [codexAdapter, cursorAdapter],
          detectedUnset: [],
          detectedDisabled: [],
        },
      ],
      codexExtensionPlans: [
        {
          provider: 'codex',
          operations: [
            {
              action: 'create',
              target: 'role',
              path: '.codex/agents/oat-reviewer.toml',
              reason: 'managed Codex role file missing',
              roleName: 'oat-reviewer',
              content: 'developer_instructions = "review"',
            },
          ],
          managedEntries: ['oat-reviewer'],
          aggregateHash: 'codex-hash',
          metadata: {
            managedRoles: ['oat-reviewer'],
            aggregateConfigHash: 'codex-hash',
          },
          managedRoles: ['oat-reviewer'],
          aggregateConfigHash: 'codex-hash',
        },
      ],
      codexExtensionApplyResults: [{ applied: 1, failed: 0, skipped: 0 }],
      extraMaterializationExtensions: [cursorExtension],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
      commandArgs: ['--install-canonical', '.agents/agents/oat-reviewer.md'],
    });

    expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.any(Array),
      ['.agents/agents/oat-reviewer.md'],
      { userConfigDir: '/tmp/home/.oat' },
    );
    expect(cursorCompute).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeRoot: '/tmp/workspace',
        allowedCanonicalPaths: ['.agents/agents/oat-reviewer.md'],
        options: { userConfigDir: '/tmp/home/.oat' },
      }),
    );
    expect(
      applyCodexProjectExtensionPlan.mock.invocationCallOrder[0],
    ).toBeLessThan(cursorApply.mock.invocationCallOrder[0]!);
    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'project',
      dryRun: false,
      summary: {
        plannedOperations: 2,
        applied: 2,
        failed: 0,
        skipped: 0,
      },
      materializationExtensions: [
        { provider: 'codex', applied: 1, failed: 0 },
        { provider: 'cursor', applied: 1, failed: 0 },
      ],
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports combined user extension partial failure in JSON and exits nonzero', async () => {
    const cursorCompute = vi.fn(async () => ({
      provider: 'cursor' as const,
      operations: [
        {
          provider: 'cursor' as const,
          action: 'create' as const,
          target: 'role',
          path: '.cursor/agents/oat-reviewer-gpt.md',
          reason: 'managed Cursor role file missing',
          entryName: 'oat-reviewer-gpt',
          content: '# reviewer',
        },
      ],
      managedEntries: ['oat-reviewer-gpt'],
      aggregateHash: 'cursor-hash',
      metadata: {},
    }));
    const cursorApply = vi.fn(async () => ({
      applied: 1,
      failed: 0,
      skipped: 0,
    }));
    const cursorExtension: SyncMaterializationExtension = {
      provider: 'cursor',
      computePlan: cursorCompute,
      applyPlan: cursorApply,
    };
    const codexAdapter = createCodexAdapter();
    const cursorAdapter = createAdapter('cursor');
    const { capture, command } = createHarness({
      home: '/tmp/custom-home',
      adapters: [codexAdapter, cursorAdapter],
      plans: [createEmptyPlan('user')],
      configAwareResults: [
        {
          activeAdapters: [codexAdapter, cursorAdapter],
          detectedUnset: [],
          detectedDisabled: [],
        },
        {
          activeAdapters: [codexAdapter, cursorAdapter],
          detectedUnset: [],
          detectedDisabled: [],
        },
      ],
      codexExtensionPlans: [
        {
          provider: 'codex',
          operations: [
            {
              action: 'create',
              target: 'role',
              path: '.codex/agents/oat-reviewer.toml',
              reason: 'managed Codex role file missing',
              roleName: 'oat-reviewer',
              content: 'developer_instructions = "review"',
            },
          ],
          managedEntries: ['oat-reviewer'],
          aggregateHash: 'codex-hash',
          metadata: {
            managedRoles: ['oat-reviewer'],
            aggregateConfigHash: 'codex-hash',
          },
          managedRoles: ['oat-reviewer'],
          aggregateConfigHash: 'codex-hash',
        },
      ],
      codexExtensionApplyResults: [{ applied: 0, failed: 1, skipped: 0 }],
      extraMaterializationExtensions: [cursorExtension],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'user', '--json'],
    });

    expect(cursorCompute).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeRoot: '/tmp/custom-home',
        options: { userConfigDir: '/tmp/custom-home/.oat' },
      }),
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'user',
      dryRun: false,
      summary: {
        plannedOperations: 2,
        applied: 1,
        failed: 1,
        skipped: 0,
      },
      materializationExtensions: [
        { provider: 'codex', applied: 0, failed: 1 },
        { provider: 'cursor', applied: 1, failed: 0 },
      ],
    });
    expect(process.exitCode).toBe(1);
  });

  it('makes a combined extension second run a no-op', async () => {
    const cursorPlans = [
      {
        provider: 'cursor' as const,
        operations: [
          {
            provider: 'cursor' as const,
            action: 'create' as const,
            target: 'role',
            path: '.cursor/agents/oat-reviewer-gpt.md',
            reason: 'managed Cursor role file missing',
            entryName: 'oat-reviewer-gpt',
            content: '# reviewer',
          },
        ],
        managedEntries: ['oat-reviewer-gpt'],
        aggregateHash: 'cursor-hash',
        metadata: {},
      },
      {
        provider: 'cursor' as const,
        operations: [],
        managedEntries: ['oat-reviewer-gpt'],
        aggregateHash: 'cursor-hash',
        metadata: {},
      },
    ];
    const cursorCompute = vi.fn(async () => cursorPlans.shift()!);
    const cursorApply = vi.fn(async () => ({
      applied: 1,
      failed: 0,
      skipped: 0,
    }));
    const cursorExtension: SyncMaterializationExtension = {
      provider: 'cursor',
      computePlan: cursorCompute,
      applyPlan: cursorApply,
    };
    const codexAdapter = createCodexAdapter();
    const cursorAdapter = createAdapter('cursor');
    const { capture, command, applyCodexProjectExtensionPlan } = createHarness({
      adapters: [codexAdapter, cursorAdapter],
      plans: [createEmptyPlan('project'), createEmptyPlan('project')],
      configAwareResults: Array.from({ length: 4 }, () => ({
        activeAdapters: [codexAdapter, cursorAdapter],
        detectedUnset: [],
        detectedDisabled: [],
      })),
      codexExtensionPlans: [
        {
          provider: 'codex',
          operations: [
            {
              action: 'create',
              target: 'role',
              path: '.codex/agents/oat-reviewer.toml',
              reason: 'managed Codex role file missing',
              roleName: 'oat-reviewer',
              content: 'developer_instructions = "review"',
            },
          ],
          managedEntries: ['oat-reviewer'],
          aggregateHash: 'codex-hash',
          metadata: {
            managedRoles: ['oat-reviewer'],
            aggregateConfigHash: 'codex-hash',
          },
          managedRoles: ['oat-reviewer'],
          aggregateConfigHash: 'codex-hash',
        },
        {
          provider: 'codex',
          operations: [],
          managedEntries: ['oat-reviewer'],
          aggregateHash: 'codex-hash',
          metadata: {
            managedRoles: ['oat-reviewer'],
            aggregateConfigHash: 'codex-hash',
          },
          managedRoles: ['oat-reviewer'],
          aggregateConfigHash: 'codex-hash',
        },
      ],
      codexExtensionApplyResults: [{ applied: 1, failed: 0, skipped: 0 }],
      extraMaterializationExtensions: [cursorExtension],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });
    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });

    expect(capture.jsonPayloads).toHaveLength(2);
    expect(capture.jsonPayloads[0]).toMatchObject({
      summary: { plannedOperations: 2, applied: 2, failed: 0 },
    });
    expect(capture.jsonPayloads[1]).toMatchObject({
      summary: { plannedOperations: 0, applied: 0, failed: 0 },
      materializationExtensions: [
        { provider: 'codex', operations: [] },
        { provider: 'cursor', operations: [] },
      ],
    });
    expect(applyCodexProjectExtensionPlan).toHaveBeenCalledTimes(1);
    expect(cursorApply).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(0);
  });

  it('includes codex extension operations in dry-run JSON output', async () => {
    const { capture, command, computeCodexProjectExtensionPlan } =
      createHarness({
        adapters: [createCodexAdapter()],
        plans: [createEmptyPlan('project')],
        configAwareResults: [
          {
            activeAdapters: [createCodexAdapter()],
            detectedUnset: [],
            detectedDisabled: [],
          },
        ],
        codexExtensionPlans: [
          {
            operations: [
              {
                action: 'create',
                target: 'role',
                path: '.codex/agents/reviewer.toml',
                reason: 'managed role file missing',
                roleName: 'reviewer',
                content: 'developer_instructions = "review"',
              },
              {
                action: 'update',
                target: 'config',
                path: '.codex/config.toml',
                reason: 'codex config differs from desired managed state',
                content:
                  '[features]\nmulti_agent = true\n\n[agents]\nmax_depth = 4\n',
              },
            ],
            managedRoles: ['reviewer'],
            aggregateConfigHash: 'hash-reviewer',
          },
        ],
      });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });

    expect(computeCodexProjectExtensionPlan).toHaveBeenCalledTimes(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      codexExtensions: [
        {
          operations: [
            {
              action: 'create',
              target: 'role',
              path: '.codex/agents/reviewer.toml',
              reason: 'managed role file missing',
              roleName: 'reviewer',
            },
            {
              action: 'update',
              target: 'config',
              path: '.codex/config.toml',
              reason: 'codex config differs from desired managed state',
            },
          ],
          managedRoles: ['reviewer'],
          aggregateConfigHash: 'hash-reviewer',
        },
      ],
    });
  });

  it.each(['user', 'project'] as const)(
    'routes Codex extension reconciliation for %s sync scope',
    async (scope) => {
      const { command, computeCodexProjectExtensionPlan } = createHarness({
        adapters: [createCodexAdapter()],
        plans: [createEmptyPlan(scope)],
        configAwareResults: [
          {
            activeAdapters: [createCodexAdapter()],
            detectedUnset: [],
            detectedDisabled: [],
          },
        ],
      });

      await runSyncCommand(command, {
        globalArgs: ['--scope', scope],
        commandArgs: ['--dry-run'],
      });

      expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
        scope === 'user' ? '/tmp/home' : '/tmp/workspace',
        expect.any(Array),
        undefined,
        { userConfigDir: '/tmp/home/.oat' },
      );
    },
  );

  it('routes Codex extension reconciliation for both scopes during all sync', async () => {
    const { command, computeCodexProjectExtensionPlan } = createHarness({
      adapters: [createCodexAdapter()],
      plans: [createEmptyPlan('user'), createEmptyPlan('project')],
      configAwareResults: [
        {
          activeAdapters: [createCodexAdapter()],
          detectedUnset: [],
          detectedDisabled: [],
        },
        {
          activeAdapters: [createCodexAdapter()],
          detectedUnset: [],
          detectedDisabled: [],
        },
      ],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'all'],
      commandArgs: ['--dry-run'],
    });

    expect(computeCodexProjectExtensionPlan).toHaveBeenCalledTimes(2);
    expect(computeCodexProjectExtensionPlan).toHaveBeenNthCalledWith(
      1,
      '/tmp/workspace',
      expect.any(Array),
      undefined,
      { userConfigDir: '/tmp/home/.oat' },
    );
    expect(computeCodexProjectExtensionPlan).toHaveBeenNthCalledWith(
      2,
      '/tmp/home',
      expect.any(Array),
      undefined,
      { userConfigDir: '/tmp/home/.oat' },
    );
  });

  it('forwards install-triggered canonical filters into codex extension planning', async () => {
    const { command, computeCodexProjectExtensionPlan } = createHarness({
      adapters: [createCodexAdapter()],
      canonicalEntries: [
        {
          name: 'oat-docs-analyze',
          type: 'skill',
          canonicalPath: '/tmp/workspace/.agents/skills/oat-docs-analyze',
          isFile: false,
        },
        {
          name: 'skeptical-evaluator.md',
          type: 'agent',
          canonicalPath: '/tmp/workspace/.agents/agents/skeptical-evaluator.md',
          isFile: true,
        },
      ],
      plans: [createEmptyPlan('project')],
      configAwareResults: [
        {
          activeAdapters: [createCodexAdapter()],
          detectedUnset: [],
          detectedDisabled: [],
        },
      ],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: [
        '--dry-run',
        '--install-canonical',
        '.agents/skills/oat-docs-analyze',
      ],
    });

    expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
      '/tmp/workspace',
      expect.any(Array),
      ['.agents/skills/oat-docs-analyze'],
      { userConfigDir: '/tmp/home/.oat' },
    );
  });

  it('applies codex extension plan during apply (default) when codex operations are pending', async () => {
    const {
      command,
      executeSyncPlan,
      applyCodexProjectExtensionPlan,
      capture,
    } = createHarness({
      adapters: [createCodexAdapter()],
      plans: [createEmptyPlan('project')],
      configAwareResults: [
        {
          activeAdapters: [createCodexAdapter()],
          detectedUnset: [],
          detectedDisabled: [],
        },
      ],
      codexExtensionPlans: [
        {
          operations: [
            {
              action: 'update',
              target: 'config',
              path: '.codex/config.toml',
              reason: 'codex config differs',
              content: '[features]\nmulti_agent = true\n',
            },
          ],
          managedRoles: ['reviewer'],
          aggregateConfigHash: 'hash-cfg',
        },
      ],
      codexExtensionApplyResults: [{ applied: 1, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    expect(executeSyncPlan).not.toHaveBeenCalled();
    expect(applyCodexProjectExtensionPlan).toHaveBeenCalledTimes(1);
    expect(capture.success).toContain('\nSync applied successfully.');
  });

  it('materializes user-owned Codex roles through the real user scanner and preserves every owner idempotently', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-sync-user-home-'));
    const project = await mkdtemp(join(tmpdir(), 'oat-sync-user-project-'));

    try {
      await mkdir(join(home, '.oat'), { recursive: true });
      await mkdir(join(home, '.codex', 'agents'), { recursive: true });
      await writeFile(
        join(home, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          workflow: {
            dispatchCeiling: {
              providers: {
                codex: {
                  high: {
                    candidates: [
                      {
                        harness: 'codex',
                        model: 'gpt-5.7-user-lower-custom',
                        effort: 'medium',
                      },
                      {
                        harness: 'codex',
                        model: 'gpt-5.7-user-custom',
                        effort: 'high',
                      },
                    ],
                  },
                },
              },
            },
          },
        }),
        'utf8',
      );

      const existingUserRole = buildCodexMaterializedTargetRoleName({
        agentName: 'oat-reviewer',
        model: 'gpt-5.7-user-custom',
        effort: 'high',
      });
      const preservedRoles = [
        [existingUserRole, 'user-config'],
        ['keep-project', 'project-config'],
        ['keep-supported', 'supported-catalogue'],
        ['keep-unrelated', null],
      ] as const;
      for (const [role, owner] of preservedRoles) {
        await writeFile(
          join(home, '.codex', 'agents', `${role}.toml`),
          [
            '# oat-managed: true',
            `# oat-role: ${role}`,
            ...(owner ? [`# oat-owner: ${owner}`] : []),
            'developer_instructions = "preserve"',
            '',
          ].join('\n'),
          'utf8',
        );
      }
      await writeFile(
        join(home, '.codex', 'config.toml'),
        preservedRoles
          .map(
            ([role]) =>
              `[agents.${role}]\ndescription = "${role}"\nconfig_file = "agents/${role}.toml"\n`,
          )
          .join('\n'),
        'utf8',
      );

      const run = async () => {
        const harness = createHarness({
          adapters: [createCodexAdapter()],
          plans: [createEmptyPlan('user')],
          configAwareResults: [
            {
              activeAdapters: [createCodexAdapter()],
              detectedUnset: [],
              detectedDisabled: [],
            },
          ],
          cwd: project,
          home,
          useDiskCodexExtension: true,
          useDiskScanner: true,
          useDiskBundledCodexAgents: true,
        });
        await runSyncCommand(harness.command, {
          globalArgs: ['--scope', 'user'],
        });
        return harness;
      };

      const first = await run();
      expect(first.computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
        home,
        expect.arrayContaining([
          expect.objectContaining({
            name: 'oat-phase-implementer.md',
            type: 'agent',
          }),
          expect.objectContaining({ name: 'oat-reviewer.md', type: 'agent' }),
        ]),
        undefined,
        { userConfigDir: join(home, '.oat') },
      );
      expect(first.computeSyncPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          canonical: expect.not.arrayContaining([
            expect.objectContaining({ type: 'agent' }),
          ]),
        }),
      );

      const generatedRoles = ['oat-phase-implementer', 'oat-reviewer'].flatMap(
        (agentName) =>
          [
            ['gpt-5.7-user-lower-custom', 'medium'],
            ['gpt-5.7-user-custom', 'high'],
          ].map(([model, effort]) =>
            buildCodexMaterializedTargetRoleName({
              agentName,
              model,
              effort,
            }),
          ),
      );
      expect(generatedRoles).toContain(existingUserRole);
      for (const role of generatedRoles) {
        await expect(
          readFile(join(home, '.codex', 'agents', `${role}.toml`), 'utf8'),
        ).resolves.toContain('# oat-owner: user-config');
      }
      for (const [role] of preservedRoles.slice(1)) {
        await expect(
          readFile(join(home, '.codex', 'agents', `${role}.toml`), 'utf8'),
        ).resolves.toContain('developer_instructions = "preserve"');
      }

      const trackedFiles = [
        join(home, '.codex', 'config.toml'),
        ...[...generatedRoles, ...preservedRoles.map(([role]) => role)].map(
          (role) => join(home, '.codex', 'agents', `${role}.toml`),
        ),
      ];
      const firstBytes = await Promise.all(
        trackedFiles.map((path) => readFile(path, 'utf8')),
      );
      await run();
      const secondBytes = await Promise.all(
        trackedFiles.map((path) => readFile(path, 'utf8')),
      );
      expect(secondBytes).toEqual(firstBytes);
    } finally {
      await Promise.all([
        rm(home, { recursive: true, force: true }),
        rm(project, { recursive: true, force: true }),
      ]);
    }
  });

  it('exits 0 on success, 1 on partial failure', async () => {
    const successHarness = createHarness({
      plans: [createPlan('create_symlink')],
      executeResults: [{ applied: 1, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(successHarness.command, {
      globalArgs: ['--scope', 'project'],
    });
    expect(process.exitCode).toBe(0);

    const failureHarness = createHarness({
      plans: [createPlan('create_symlink')],
      executeResults: [{ applied: 0, failed: 1, skipped: 0 }],
    });

    await runSyncCommand(failureHarness.command, {
      globalArgs: ['--scope', 'project'],
    });
    expect(process.exitCode).toBe(1);
  });
});
