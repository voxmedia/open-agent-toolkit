import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
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
import { CliError } from '@errors/index';
import { createEmptyManifest, type Manifest } from '@manifest/index';
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
  ProviderScopeContext,
} from '@providers/shared';
import { OAT_VERSION } from '@shared/oat-version';
import type { ConcreteScope, Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSyncCommand } from './index';
import type { SyncMaterializationExtension } from './sync.types';

interface HarnessOptions {
  adapters?: ProviderAdapter[];
  providerContext?: ProviderScopeContext;
  providerContextResolver?: () => Promise<ProviderScopeContext>;
  plans?: SyncPlan[];
  executeResults?: SyncResult[];
  codexExtensionPlans?: CodexExtensionPlan[];
  codexExtensionApplyResults?: CodexExtensionApplyResult[];
  interactive?: boolean;
  loadedSyncConfig?: SyncConfig;
  loadedManifests?: Manifest[];
  loadManifestError?: Error;
  configAwareResults?: ConfigAwareAdaptersResult[];
  providerSelectResponses?: Array<string[] | null>;
  canonicalEntries?: CanonicalEntry[];
  canonicalEntriesByScope?: Partial<Record<Scope, CanonicalEntry[]>>;
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

function versionSkewWarning(
  producingVersion: string,
  scope: ConcreteScope = 'project',
  invokingVersion: string = OAT_VERSION,
): string {
  return `Sync manifest version skew [${scope}]: manifest produced by oat "${producingVersion}" but invoked by oat "${invokingVersion}".`;
}

function createCanonicalEntry(
  name = 'skill-one',
  root = '/tmp/workspace',
): CanonicalEntry {
  return {
    name,
    type: 'skill',
    canonicalPath: `${root}/.agents/skills/${name}`,
    isFile: false,
  };
}

function createAgentCanonicalEntry(
  name = 'agent-one.md',
  root = '/tmp/workspace',
): CanonicalEntry {
  return {
    name,
    type: 'agent',
    canonicalPath: `${root}/.agents/agents/${name}`,
    isFile: true,
  };
}

function createScopedAdapter(name = 'claude'): ProviderAdapter {
  const mappings = [
    {
      contentType: 'skill' as const,
      canonicalDir: '.agents/skills',
      providerDir: `.${name}/skills`,
      nativeRead: false,
    },
    {
      contentType: 'agent' as const,
      canonicalDir: '.agents/agents',
      providerDir: `.${name}/agents`,
      nativeRead: false,
    },
  ];
  return {
    name,
    displayName: name,
    defaultStrategy: 'symlink',
    projectMappings: mappings,
    userMappings: mappings,
    detect: async () => true,
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
  scanCanonical: ReturnType<typeof vi.fn>;
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
  const selectProvidersWithAbort = vi.fn(async () =>
    providerSelectResponses.length > 0 ? providerSelectResponses.shift()! : [],
  );

  const saveSyncConfig = vi.fn(
    async (_configPath: string, config: SyncConfig) => {
      return config;
    },
  );
  const manifestQueue = [...(options.loadedManifests ?? [])];

  const scanCanonical = options.useDiskScanner
    ? vi.fn(scanCanonicalFromDisk)
    : vi.fn(async (_scopeRoot: string, scope: 'project' | 'user') => {
        return (
          options.canonicalEntriesByScope?.[scope] ??
          options.canonicalEntries ?? [createCanonicalEntry()]
        );
      });
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
    loadManifest: vi.fn(async () => {
      if (options.loadManifestError) {
        throw options.loadManifestError;
      }
      return manifestQueue.shift() ?? createManifest();
    }),
    loadSyncConfig: vi.fn(
      async () =>
        options.loadedSyncConfig ?? (DEFAULT_SYNC_CONFIG as SyncConfig),
    ),
    saveSyncConfig,
    scanCanonical,
    scanBundledManagedAgents: options.useDiskBundledCodexAgents
      ? vi.fn(scanBundledManagedAgentsFromDisk)
      : vi.fn(async () => []),
    getAdapters: () => adapters,
    getConfigAwareAdapters,
    ...(options.providerContextResolver
      ? { resolveProviderScopeContext: options.providerContextResolver }
      : options.providerContext
        ? {
            resolveProviderScopeContext: vi.fn(
              async () => options.providerContext!,
            ),
          }
        : {}),
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
    scanCanonical,
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

  it('routes a registry-only provider context into sync planning', async () => {
    const adapter = createAdapter('registry-only');
    const { command, computeSyncPlan } = createHarness({
      adapters: [],
      providerContext: {
        scope: 'project',
        configSource: '<project>/.oat/sync/config.json',
        activeProviders: ['registry-only'],
        detectedProviders: ['registry-only'],
        mismatches: { detectedUnset: [], detectedDisabled: [] },
        activation: [],
        registrations: [{ adapter, extensions: [], capabilities: [] }],
      },
    });

    await runSyncCommand(command, ['--dry-run']);

    expect(computeSyncPlan.mock.calls[0]?.[0].adapters).toEqual([adapter]);
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

    // The restamp is the *only* mutation on this path, so it is the exact case
    // the advisory exists to protect: capture the warnings visible at the
    // moment the restamp is dispatched, not merely by the end of the run.
    let warningsWhenExecuted: string[] = [];
    executeSyncPlan.mockImplementationOnce(async () => {
      warningsWhenExecuted = [...capture.warn];
      return { applied: 0, failed: 0, skipped: 0 };
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    const expected = versionSkewWarning('0.0.1');
    expect(warningsWhenExecuted).toContain(expected);
    expect(capture.warn.filter((message) => message === expected)).toHaveLength(
      1,
    );
    expect(executeSyncPlan).toHaveBeenCalledWith(
      expect.objectContaining({ entries: [], removals: [] }),
      staleManifest,
      '/tmp/workspace/.oat/sync/manifest.json',
    );
    expect(capture.info).toContain('\nNo changes required.');
  });

  it('apply: warns once about version skew before the sync plan executes', async () => {
    const staleManifest = createManifest({ oatVersion: '0.0.1' });
    const { capture, command, executeSyncPlan } = createHarness({
      loadedManifests: [staleManifest],
      plans: [createPlan('create_symlink')],
    });

    let warningsWhenExecuted: string[] = [];
    executeSyncPlan.mockImplementationOnce(async () => {
      warningsWhenExecuted = [...capture.warn];
      return { applied: 1, failed: 0, skipped: 0 };
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    const expected = versionSkewWarning('0.0.1');
    expect(warningsWhenExecuted).toContain(expected);
    expect(capture.warn.filter((message) => message === expected)).toHaveLength(
      1,
    );
    expect(executeSyncPlan).toHaveBeenCalledTimes(1);
    expect(capture.success).toContain('\nSync applied successfully.');
    expect(process.exitCode).toBe(0);
  });

  it('dry-run: warns about version skew without executing the sync plan', async () => {
    const { capture, command, executeSyncPlan } = createHarness({
      loadedManifests: [createManifest({ oatVersion: '0.0.1' })],
      plans: [createPlan('create_symlink')],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--dry-run'],
    });

    expect(executeSyncPlan).not.toHaveBeenCalled();
    expect(
      capture.warn.filter((message) => message === versionSkewWarning('0.0.1')),
    ).toHaveLength(1);
    expect(process.exitCode).toBe(0);
  });

  it('apply --json: exposes version skew structurally with no human warning', async () => {
    const { capture, command, executeSyncPlan } = createHarness({
      loadedManifests: [createManifest({ oatVersion: '0.0.1' })],
      plans: [createPlan('create_symlink')],
      executeResults: [{ applied: 1, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });

    expect(executeSyncPlan).toHaveBeenCalledTimes(1);
    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      dryRun: false,
      versionSkew: [
        {
          scope: 'project',
          producingVersion: '0.0.1',
          invokingVersion: OAT_VERSION,
        },
      ],
    });
    expect(capture.info).toHaveLength(0);
    expect(capture.warn).toHaveLength(0);
    expect(process.exitCode).toBe(0);
  });

  it('dry-run --json no-op: exposes version skew structurally with no human warning', async () => {
    const { capture, command, executeSyncPlan } = createHarness({
      loadedManifests: [createManifest({ oatVersion: '0.0.1' })],
      plans: [createEmptyPlan('project')],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
      commandArgs: ['--dry-run'],
    });

    expect(executeSyncPlan).not.toHaveBeenCalled();
    expect(capture.jsonPayloads[0]).toMatchObject({
      dryRun: true,
      summary: { plannedOperations: 0 },
      versionSkew: [
        {
          scope: 'project',
          producingVersion: '0.0.1',
          invokingVersion: OAT_VERSION,
        },
      ],
    });
    expect(capture.info).toHaveLength(0);
    expect(capture.warn).toHaveLength(0);
  });

  it('emits no version-skew diagnostic when the manifest matches the invoking version', async () => {
    const { capture, command } = createHarness({
      loadedManifests: [createManifest({ oatVersion: OAT_VERSION })],
      plans: [createPlan('create_symlink')],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
    });

    expect(
      capture.warn.filter((message) => message.includes('version skew')),
    ).toHaveLength(0);
    expect(capture.success).toContain('\nSync applied successfully.');
  });

  it('--json: omits version-skew entries when the manifest matches the invoking version', async () => {
    const { capture, command } = createHarness({
      loadedManifests: [createManifest({ oatVersion: OAT_VERSION })],
      plans: [createPlan('create_symlink')],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({ versionSkew: [] });
    expect(capture.warn).toHaveLength(0);
  });

  it('reports both older and newer producing versions as symmetric inequality', async () => {
    for (const producingVersion of ['0.0.1', '999.0.0']) {
      const { capture, command } = createHarness({
        loadedManifests: [createManifest({ oatVersion: producingVersion })],
        plans: [createPlan('create_symlink')],
      });

      await runSyncCommand(command, {
        globalArgs: ['--scope', 'project'],
      });

      expect(capture.warn).toContain(versionSkewWarning(producingVersion));

      const jsonHarness = createHarness({
        loadedManifests: [createManifest({ oatVersion: producingVersion })],
        plans: [createPlan('create_symlink')],
      });

      await runSyncCommand(jsonHarness.command, {
        globalArgs: ['--scope', 'project', '--json'],
      });

      expect(jsonHarness.capture.jsonPayloads[0]).toMatchObject({
        versionSkew: [
          {
            scope: 'project',
            producingVersion,
            invokingVersion: OAT_VERSION,
          },
        ],
      });
    }
  });

  it('treats an absent manifest as no skew because it is created at the invoking version', async () => {
    const { capture, command } = createHarness({
      loadedManifests: [createEmptyManifest()],
      plans: [createEmptyPlan('project')],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({ versionSkew: [] });
    expect(capture.warn).toHaveLength(0);
  });

  it('propagates manifest validation failures instead of reporting version skew', async () => {
    const validationError = new CliError(
      'Manifest at /tmp/workspace/.oat/sync/manifest.json failed validation: oatVersion: Too small. Delete or repair the file and re-run oat sync.',
    );
    const { capture, command, executeSyncPlan } = createHarness({
      loadManifestError: validationError,
    });

    await expect(
      runSyncCommand(command, { globalArgs: ['--scope', 'project'] }),
    ).rejects.toBe(validationError);

    expect(executeSyncPlan).not.toHaveBeenCalled();
    expect(capture.warn).toHaveLength(0);
    expect(capture.jsonPayloads).toHaveLength(0);
  });

  it('couples the advisory and the manifest restamp for equal, older, and newer versions', async () => {
    // `runSyncApply` derives `shouldRefreshManifestVersion` from the same
    // diagnostic that drives the advisory. With an empty plan the restamp is
    // the only thing that can call `executeSyncPlan`, so "advisory emitted" and
    // "manifest restamped" must agree exactly for every version relationship.
    const cases: Array<{ producingVersion: string; expectSkew: boolean }> = [
      { producingVersion: OAT_VERSION, expectSkew: false },
      { producingVersion: '0.0.1', expectSkew: true },
      { producingVersion: '999.0.0', expectSkew: true },
    ];

    for (const { producingVersion, expectSkew } of cases) {
      const { capture, command, executeSyncPlan } = createHarness({
        loadedManifests: [createManifest({ oatVersion: producingVersion })],
        plans: [createEmptyPlan('project')],
        executeResults: [{ applied: 0, failed: 0, skipped: 0 }],
      });

      await runSyncCommand(command, {
        globalArgs: ['--scope', 'project'],
      });

      const warned = capture.warn.includes(
        versionSkewWarning(producingVersion),
      );
      const restamped = executeSyncPlan.mock.calls.length > 0;

      expect(warned).toBe(expectSkew);
      expect(restamped).toBe(expectSkew);
      expect(warned).toBe(restamped);
    }
  });

  it('--scope all: attributes one warning to each skewed scope only', async () => {
    const { capture, command } = createHarness({
      loadedManifests: [
        createManifest({ oatVersion: '0.0.1' }),
        createManifest({ oatVersion: OAT_VERSION }),
      ],
      plans: [createEmptyPlan('project'), createEmptyPlan('user')],
      executeResults: [{ applied: 0, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'all'],
    });

    const skewWarnings = capture.warn.filter((message) =>
      message.includes('version skew'),
    );
    expect(skewWarnings).toEqual([versionSkewWarning('0.0.1', 'project')]);
  });

  it('--scope all --json: carries the skewed scope through the structured diagnostic', async () => {
    const { capture, command } = createHarness({
      loadedManifests: [
        createManifest({ oatVersion: OAT_VERSION }),
        createManifest({ oatVersion: '0.0.1' }),
      ],
      plans: [createEmptyPlan('project'), createEmptyPlan('user')],
      executeResults: [{ applied: 0, failed: 0, skipped: 0 }],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'all', '--json'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'all',
      versionSkew: [
        {
          scope: 'user',
          producingVersion: '0.0.1',
          invokingVersion: OAT_VERSION,
        },
      ],
    });
    expect(capture.warn).toHaveLength(0);
    expect(capture.info).toHaveLength(0);
  });

  it('--scope all: warns once per skewed scope when both scopes are stale', async () => {
    const { capture, command } = createHarness({
      loadedManifests: [
        createManifest({ oatVersion: '0.0.1' }),
        createManifest({ oatVersion: '999.0.0' }),
      ],
      plans: [createEmptyPlan('project'), createEmptyPlan('user')],
      executeResults: [
        { applied: 0, failed: 0, skipped: 0 },
        { applied: 0, failed: 0, skipped: 0 },
      ],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'all'],
    });

    expect(
      capture.warn.filter((message) => message.includes('version skew')),
    ).toEqual([
      versionSkewWarning('0.0.1', 'project'),
      versionSkewWarning('999.0.0', 'user'),
    ]);
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

  for (const [path, response] of [
    ['cancel', null],
    ['save', ['registry-only']],
  ] as const) {
    it(`detects each provider once during interactive sync ${path}`, async () => {
      const adapter = createAdapter('registry-only');
      const detect = vi.spyOn(adapter, 'detect').mockResolvedValue(true);
      const providerContextResolver = vi.fn(async () => {
        await adapter.detect('/tmp/workspace');
        return {
          scope: 'project' as const,
          configSource: '<project>/.oat/sync/config.json',
          activeProviders: ['registry-only'],
          detectedProviders: ['registry-only'],
          mismatches: {
            detectedUnset: ['registry-only'],
            detectedDisabled: [],
          },
          activation: [
            {
              provider: 'registry-only',
              state: 'active' as const,
              source: 'detected-unset' as const,
              reason: 'detected without explicit configuration',
            },
          ],
          registrations: [{ adapter, extensions: [], capabilities: [] }],
        };
      });
      const { command } = createHarness({
        interactive: true,
        adapters: [adapter],
        providerContextResolver,
        providerSelectResponses: [response],
      });

      await runSyncCommand(command, { globalArgs: ['--scope', 'project'] });

      expect(providerContextResolver).toHaveBeenCalledTimes(1);
      expect(detect).toHaveBeenCalledTimes(1);
    });
  }

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

  it('forwards absent removal canonical filters into exact provider pruning', async () => {
    const { command, computeSyncPlan } = createHarness({
      canonicalEntries: [],
    });

    await runSyncCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: [
        '--dry-run',
        '--remove-canonical',
        '.agents/skills/oat-docs-analyze',
      ],
    });

    expect(computeSyncPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedCanonicalPaths: ['.agents/skills/oat-docs-analyze'],
      }),
    );
  });

  it('rejects removal pruning while the canonical source still exists', async () => {
    const { command, computeSyncPlan } = createHarness({
      canonicalEntries: [createCanonicalEntry('oat-docs-analyze')],
    });

    await expect(
      runSyncCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: [
          '--dry-run',
          '--remove-canonical',
          '.agents/skills/oat-docs-analyze',
        ],
      }),
    ).rejects.toMatchObject({
      message:
        'Cannot remove canonical provider views while source exists: .agents/skills/oat-docs-analyze',
    });
    expect(computeSyncPlan).not.toHaveBeenCalled();
  });

  it('rejects invalid or mixed removal canonical filters', async () => {
    const invalidHarness = createHarness();
    await expect(
      runSyncCommand(invalidHarness.command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--dry-run', '--remove-canonical', '../../etc/passwd'],
      }),
    ).rejects.toMatchObject({
      message: 'Invalid --remove-canonical path: ../../etc/passwd',
    });
    const mixedHarness = createHarness();
    await expect(
      runSyncCommand(mixedHarness.command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: [
          '--dry-run',
          '--install-canonical',
          '.agents/skills/oat-docs-analyze',
          '--remove-canonical',
          '.agents/agents/oat-reviewer.md',
        ],
      }),
    ).rejects.toMatchObject({
      message: '--install-canonical and --remove-canonical cannot be combined',
    });
    expect(invalidHarness.computeSyncPlan).not.toHaveBeenCalled();
    expect(mixedHarness.computeSyncPlan).not.toHaveBeenCalled();
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

  it('materializes portable agent sibling reads into generated provider roles', async () => {
    // Materialize the *current* canonical agents through the sync harness into
    // a temporary root. Reading the tracked provider views instead would test
    // stale generated content; p02-t02 owns refreshing those.
    const repoRoot = join(import.meta.dirname, '../../../../..');
    const project = await mkdtemp(join(tmpdir(), 'oat-sync-portable-agents-'));
    const agentNames = [
      'oat-phase-implementer',
      'oat-reviewer',
      'oat-codebase-mapper',
    ];

    try {
      await mkdir(join(project, '.agents', 'agents'), { recursive: true });
      for (const name of agentNames) {
        await writeFile(
          join(project, '.agents', 'agents', `${name}.md`),
          await readFile(
            join(repoRoot, '.agents', 'agents', `${name}.md`),
            'utf8',
          ),
          'utf8',
        );
      }

      const harness = createHarness({
        adapters: [createCodexAdapter()],
        plans: [createEmptyPlan('project')],
        configAwareResults: [
          {
            activeAdapters: [createCodexAdapter()],
            detectedUnset: [],
            detectedDisabled: [],
          },
        ],
        cwd: project,
        useDiskCodexExtension: true,
        useDiskScanner: true,
      });

      await runSyncCommand(harness.command, {
        globalArgs: ['--scope', 'project'],
      });

      const plan = (await harness.computeCodexProjectExtensionPlan.mock
        .results[0]!.value) as CodexExtensionPlan;
      const managedRoles = plan.managedRoles ?? [];

      expect(managedRoles.length).toBeGreaterThan(0);

      const portableMarkers: Record<string, string[]> = {
        'oat-phase-implementer': [
          '${PROJECT_DISPATCH_SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md',
          '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
          '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md',
        ],
        'oat-reviewer': [
          '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
          '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md',
        ],
        'oat-codebase-mapper': [
          '${KNOWLEDGE_INDEX_SKILLS_ROOT}/oat-repo-knowledge-index/references/templates/',
        ],
      };
      const covered = new Set<string>();

      for (const role of managedRoles) {
        const agentName = agentNames.find((name) => role.startsWith(name));
        if (!agentName) continue;
        covered.add(agentName);

        const generated = await readFile(
          join(project, '.codex', 'agents', `${role}.toml`),
          'utf8',
        );

        for (const marker of portableMarkers[agentName]!) {
          expect(generated, `${role} keeps ${marker}`).toContain(marker);
        }
        // User scope is probed before project scope in every generated copy.
        expect(generated, `${role} candidate order`).toMatch(
          /\$\{HOME\}\/\.agents\/skills[\s\S]{0,400}<repo-root>\/\.agents\/skills/,
        );
        expect(generated, `${role} fails closed`).toContain(
          'never ambient discovery',
        );
        // Executable bare sibling-skill paths must not survive materialization.
        expect(generated, `${role} has no bare sibling read`).not.toMatch(
          /(?:\.\.?\/)?\.agents\/skills\/[a-zA-Z0-9_-]+\/(?:SKILL\.md|references)/,
        );
      }

      expect([...covered].sort()).toEqual([...agentNames].sort());
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  });

  it('preserves bounded phase recovery semantics across generated provider agents', async () => {
    const repoRoot = join(import.meta.dirname, '../../../../..');
    const generatedAgentPaths = [
      '.claude/agents/oat-phase-implementer.md',
      '.cursor/agents/oat-phase-implementer.md',
      '.cursor/agents/oat-phase-implementer-gpt-5-6-sol-medium.md',
      '.codex/agents/oat-phase-implementer.toml',
      '.codex/agents/oat-phase-implementer-gpt-5-6-sol-medium.toml',
    ];

    for (const relativePath of generatedAgentPaths) {
      const content = (await readFile(join(repoRoot, relativePath), 'utf8'))
        .replaceAll('`', '')
        .replaceAll(/\s+/g, ' ');
      const reservation = content.indexOf(
        'Before the first code edit for a new recovery attempt',
      );
      const terminalMark = content.indexOf(
        'pre-commit pass atomically marks the pending entry completed',
        reservation,
      );
      const authoritativeRerun = content.indexOf(
        'Immediately rerun both checks against committed HEAD',
        terminalMark,
      );
      const committedHandoff = content.indexOf(
        'committed pre-bookkeeping terminal handoff',
        authoritativeRerun,
      );
      const rootClear = content.indexOf(
        'Root clears an attempted-recovery marker',
        committedHandoff,
      );

      expect(content, relativePath).toContain(
        'Prevention is the first recovery control.',
      );
      expect(content, relativePath).toContain(
        'phase_recovery_attempts_used < phase_recovery_limit',
      );
      expect(content, relativePath).toContain(
        'Continue and finish that same reserved attempt without incrementing used_attempts or creating another reservation, even when the existing count equals the limit.',
      );
      expect(content, relativePath).toContain(
        'With limit=1, used=1, and no pending_attempt, stop direction-required before edit with no new reservation and no fallback.',
      );
      expect(content, relativePath).toContain('### Canonical Recovery Event');
      expect(content, relativePath).toContain(
        '- Authorization: phase-standing | operator-extension | operator-scope',
      );
      expect(content, relativePath).toContain(
        'stays equal to the launcher-owned dispatch target',
      );
      expect(content, relativePath).toContain(
        'No stop condition authorizes fallback or another model, provider, route, or worker.',
      );
      expect(
        [
          reservation,
          terminalMark,
          authoritativeRerun,
          committedHandoff,
          rootClear,
        ],
        `${relativePath} reservation → candidate marker → authoritative rerun → committed handoff → root clear order`,
      ).toEqual(
        [
          ...new Set([
            reservation,
            terminalMark,
            authoritativeRerun,
            committedHandoff,
            rootClear,
          ]),
        ].sort((left, right) => left - right),
      );
      expect(reservation, `${relativePath} reservation`).toBeGreaterThan(-1);
      expect(content, relativePath).toContain(
        'A report of recovered or failed-attempt returns with that marker still present.',
      );
      expect(content, relativePath).toContain(
        'A pre-attempt direction-required report instead returns with pending_attempt: null, unchanged usage, and evidence of no reservation, edit, or recovery commit.',
      );
      expect(content, relativePath).toContain(
        'An active, mismatched, prematurely cleared, unreconciled, or contradictory attempted-recovery marker must fail closed before root bookkeeping.',
      );
    }
  });

  it('keeps every materialized phase implementer aligned with fail-closed project push handling', async () => {
    const repoRoot = join(import.meta.dirname, '../../../../..');
    const providerDirectories = [
      ['.codex/agents', '.toml'],
      ['.cursor/agents', '.md'],
    ] as const;
    const generatedAgentPaths = (
      await Promise.all(
        providerDirectories.map(async ([directory, extension]) =>
          (await readdir(join(repoRoot, directory)))
            .filter(
              (name) =>
                name.startsWith('oat-phase-implementer') &&
                name.endsWith(extension),
            )
            .map((name) => join(directory, name)),
        ),
      )
    ).flat();

    expect(generatedAgentPaths.length).toBeGreaterThan(30);
    for (const relativePath of generatedAgentPaths) {
      await expect(
        readFile(join(repoRoot, relativePath), 'utf8'),
        relativePath,
      ).resolves.toContain(
        'A nonzero project-push exit stops bookkeeping until the reported',
      );
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

  describe('scoped provider materialization', () => {
    it('scans user canonical content from active provider declarations', async () => {
      const adapter = createScopedAdapter();
      const { command, scanCanonical } = createHarness({ adapters: [adapter] });

      await runSyncCommand(command, {
        globalArgs: ['--scope', 'user'],
        commandArgs: ['--dry-run'],
      });

      expect(scanCanonical).toHaveBeenCalledWith('/tmp/home', 'user', [
        { contentType: 'skill', canonicalDir: '.agents/skills' },
        { contentType: 'agent', canonicalDir: '.agents/agents' },
      ]);
    });

    it('plans project and user scopes independently for --scope all', async () => {
      const adapter = createScopedAdapter();
      const { command, computeSyncPlan } = createHarness({
        adapters: [adapter],
        configAwareResults: [
          {
            activeAdapters: [adapter],
            detectedUnset: [],
            detectedDisabled: [],
          },
          {
            activeAdapters: [adapter],
            detectedUnset: [],
            detectedDisabled: [],
          },
        ],
        canonicalEntriesByScope: {
          project: [
            createCanonicalEntry('skill-project'),
            createAgentCanonicalEntry('agent-project.md'),
          ],
          user: [
            createCanonicalEntry('skill-user', '/tmp/home'),
            createCanonicalEntry('skill-user-secondary', '/tmp/home'),
          ],
        },
      });

      await runSyncCommand(command, {
        globalArgs: ['--scope', 'all'],
        commandArgs: ['--dry-run'],
      });

      expect(computeSyncPlan).toHaveBeenCalledTimes(2);
      expect(computeSyncPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'project',
          scopeRoot: '/tmp/workspace',
          canonical: [
            expect.objectContaining({ name: 'skill-project', type: 'skill' }),
            expect.objectContaining({
              name: 'agent-project.md',
              type: 'agent',
            }),
          ],
        }),
      );
      expect(computeSyncPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'user',
          scopeRoot: '/tmp/home',
          canonical: [
            expect.objectContaining({ name: 'skill-user', type: 'skill' }),
            expect.objectContaining({
              name: 'skill-user-secondary',
              type: 'skill',
            }),
          ],
        }),
      );
    });

    it('keeps duplicate cross-scope canonical sources separate without inferring precedence', async () => {
      const adapter = createScopedAdapter();
      const duplicate = 'oat-brainstorm';
      const { command, computeSyncPlan } = createHarness({
        adapters: [adapter],
        configAwareResults: [
          {
            activeAdapters: [adapter],
            detectedUnset: [],
            detectedDisabled: [],
          },
          {
            activeAdapters: [adapter],
            detectedUnset: [],
            detectedDisabled: [],
          },
        ],
        canonicalEntriesByScope: {
          project: [createCanonicalEntry(duplicate)],
          user: [createCanonicalEntry(duplicate, '/tmp/home')],
        },
      });

      await runSyncCommand(command, {
        globalArgs: ['--scope', 'all'],
        commandArgs: ['--dry-run'],
      });

      // The same canonical name exists at both scopes. Sync must plan each
      // scope against its own root and must not drop, dedupe, or reorder one
      // of them to imply which copy a provider executes.
      const scopes = computeSyncPlan.mock.calls.map(
        ([input]: [
          { scope: string; scopeRoot: string; canonical: CanonicalEntry[] },
        ]) => ({
          scope: input.scope,
          scopeRoot: input.scopeRoot,
          paths: input.canonical.map((entry) => entry.canonicalPath),
        }),
      );
      expect(scopes).toEqual([
        {
          scope: 'project',
          scopeRoot: '/tmp/workspace',
          paths: [`/tmp/workspace/.agents/skills/${duplicate}`],
        },
        {
          scope: 'user',
          scopeRoot: '/tmp/home',
          paths: [`/tmp/home/.agents/skills/${duplicate}`],
        },
      ]);
    });

    it('applies the exact install filter to every synced scope', async () => {
      const adapter = createScopedAdapter();
      const { command, computeSyncPlan } = createHarness({
        adapters: [adapter],
        configAwareResults: [
          {
            activeAdapters: [adapter],
            detectedUnset: [],
            detectedDisabled: [],
          },
          {
            activeAdapters: [adapter],
            detectedUnset: [],
            detectedDisabled: [],
          },
        ],
      });

      await runSyncCommand(command, {
        globalArgs: ['--scope', 'all'],
        commandArgs: [
          '--dry-run',
          '--install-canonical',
          '.agents/agents/oat-reviewer.md',
        ],
      });

      expect(computeSyncPlan).toHaveBeenCalledTimes(2);
      for (const [input] of computeSyncPlan.mock.calls as Array<
        [{ allowedCanonicalPaths?: string[] }]
      >) {
        expect(input.allowedCanonicalPaths).toEqual([
          '.agents/agents/oat-reviewer.md',
        ]);
      }
    });

    it('scopes removal pruning to the requested scope only', async () => {
      const adapter = createScopedAdapter();
      const removed = '.agents/skills/oat-idea-new';
      const { command, computeSyncPlan } = createHarness({
        adapters: [adapter],
        canonicalEntriesByScope: {
          // Still present at project scope, already absent at user scope.
          project: [createCanonicalEntry('oat-idea-new')],
          user: [],
        },
      });

      await runSyncCommand(command, {
        globalArgs: ['--scope', 'user'],
        commandArgs: ['--dry-run', '--remove-canonical', removed],
      });

      expect(computeSyncPlan).toHaveBeenCalledTimes(1);
      expect(computeSyncPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'user',
          scopeRoot: '/tmp/home',
          allowedCanonicalPaths: [removed],
        }),
      );
    });

    it('refuses cross-scope removal pruning when any synced scope still has the source', async () => {
      const adapter = createScopedAdapter();
      const removed = '.agents/skills/oat-idea-new';
      const { command, computeSyncPlan } = createHarness({
        adapters: [adapter],
        canonicalEntriesByScope: {
          project: [createCanonicalEntry('oat-idea-new')],
          user: [],
        },
      });

      await expect(
        runSyncCommand(command, {
          globalArgs: ['--scope', 'all'],
          commandArgs: ['--dry-run', '--remove-canonical', removed],
        }),
      ).rejects.toMatchObject({
        message: `Cannot remove canonical provider views while source exists: ${removed}`,
      });
      expect(computeSyncPlan).not.toHaveBeenCalled();
    });

    it('forwards the exact filter into user-scope materialization extension planning', async () => {
      const adapter = createCodexAdapter();
      const { command, computeCodexProjectExtensionPlan } = createHarness({
        adapters: [adapter],
        configAwareResults: [
          {
            activeAdapters: [adapter],
            detectedUnset: [],
            detectedDisabled: [],
          },
        ],
        canonicalEntriesByScope: {
          user: [createAgentCanonicalEntry('oat-reviewer.md', '/tmp/home')],
        },
      });

      await runSyncCommand(command, {
        globalArgs: ['--scope', 'user'],
        commandArgs: [
          '--dry-run',
          '--install-canonical',
          '.agents/agents/oat-reviewer.md',
        ],
      });

      expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
        '/tmp/home',
        expect.arrayContaining([
          expect.objectContaining({ name: 'oat-reviewer.md' }),
        ]),
        ['.agents/agents/oat-reviewer.md'],
        expect.objectContaining({ userConfigDir: '/tmp/home/.oat' }),
      );
    });
  });
});
