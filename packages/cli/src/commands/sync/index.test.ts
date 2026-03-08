import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from '@config/index';
import type { CanonicalEntry, SyncPlan, SyncResult } from '@engine/index';
import type { Manifest } from '@manifest/index';
import type {
  CodexExtensionApplyResult,
  CodexExtensionPlan,
} from '@providers/codex/codec/sync-extension';
import type {
  ConfigAwareAdaptersResult,
  ProviderAdapter,
} from '@providers/shared';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSyncCommand } from './index';

interface HarnessOptions {
  adapters?: ProviderAdapter[];
  plans?: SyncPlan[];
  executeResults?: SyncResult[];
  codexExtensionPlans?: CodexExtensionPlan[];
  codexExtensionApplyResults?: CodexExtensionApplyResult[];
  interactive?: boolean;
  loadedSyncConfig?: SyncConfig;
  configAwareResults?: ConfigAwareAdaptersResult[];
  providerSelectResponses?: Array<string[] | null>;
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
    isFile: false,
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
  const computeCodexProjectExtensionPlan = vi.fn(async () => {
    return (
      codexExtensionPlans.shift() ?? {
        operations: [],
        managedRoles: [],
        aggregateConfigHash: 'hash',
      }
    );
  });
  const codexApplyResults = [...(options.codexExtensionApplyResults ?? [])];
  const applyCodexProjectExtensionPlan = vi.fn(async () => {
    return codexApplyResults.shift() ?? { applied: 0, failed: 0, skipped: 0 };
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

  const command = createSyncCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      dryRun: globalOptions.dryRun ?? false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: options.interactive ?? !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot: vi.fn(async () => '/tmp/workspace'),
    loadManifest: vi.fn(async () => createManifest()),
    loadSyncConfig: vi.fn(
      async () =>
        options.loadedSyncConfig ?? (DEFAULT_SYNC_CONFIG as SyncConfig),
    ),
    saveSyncConfig,
    scanCanonical: vi.fn(async () => [createCanonicalEntry()]),
    getAdapters: () => adapters,
    getConfigAwareAdapters,
    selectProvidersWithAbort,
    computeSyncPlan,
    executeSyncPlan,
    computeCodexProjectExtensionPlan,
    toCodexExtensionOperations: vi.fn((plan: CodexExtensionPlan) =>
      plan.operations.map((operation) => ({
        action: operation.action,
        target: operation.target,
        path: operation.path,
        reason: operation.reason,
        roleName: operation.roleName,
      })),
    ),
    applyCodexProjectExtensionPlan,
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
          ],
          managedRoles: ['reviewer'],
          aggregateConfigHash: 'hash-reviewer',
        },
      ],
    });
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
