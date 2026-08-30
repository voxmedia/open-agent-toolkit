import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { PjmAdoption } from '@commands/pjm/adoption';
import { AdoptionSourceUnavailableError } from '@commands/shared/adopt-stray';
import type { CodexRoleStray } from '@commands/shared/codex-strays';
import type {
  PackAssetInventory,
  PackInventory,
  ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import { PACK_NAMES } from '@commands/tools/shared/pack-manifest';
import type {
  PackAssetDefinition,
  PackAssetStatus,
  PackCompleteness,
  PackName,
} from '@commands/tools/shared/types';
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from '@config/index';
import type { DriftReport } from '@drift/index';
import {
  scanBundledManagedCodexAgents as scanBundledManagedCodexAgentsFromDisk,
  type CanonicalEntry,
} from '@engine/index';
import { CliError } from '@errors/index';
import type { Manifest, ManifestEntry } from '@manifest/index';
import { buildCodexMaterializedTargetRoleName } from '@providers/codex/codec/shared';
import {
  computeCodexProjectExtensionPlan as computeCodexExtensionPlanFromDisk,
  type CodexExtensionPlan,
} from '@providers/codex/codec/sync-extension';
import type { CursorExtensionPlan } from '@providers/cursor/codec/sync-extension';
import type { ProviderAdapter } from '@providers/shared';
import {
  getAdoptionSources,
  getConfigAwareAdapters,
  getSyncMappings,
} from '@providers/shared/adapter.utils';
import { OAT_VERSION } from '@shared/oat-version';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStatusCommand } from './index';

interface TestHarnessOptions {
  adapters?: ProviderAdapter[];
  manifestEntries?: ManifestEntry[];
  driftReports?: DriftReport[];
  strayReports?: DriftReport[];
  codexRoleStrays?: CodexRoleStray[];
  syncConfigKnownStrays?: string[];
  userKnownStrays?: string[];
  syncConfigProviders?: SyncConfig['providers'];
  userSyncConfigProviders?: SyncConfig['providers'];
  codexExtensionPlan?: CodexExtensionPlan;
  cursorExtensionPlan?: CursorExtensionPlan;
  canonicalEntries?: CanonicalEntry[];
  bundledCodexEntries?: CanonicalEntry[];
  cwd?: string;
  home?: string;
  useDiskCodexExtension?: boolean;
  useDiskBundledCodexAgents?: boolean;
  interactive?: boolean;
  selectManyResponses?: Array<string[] | null>;
  singleSelectResponses?: Array<string | null>;
  packInventories?: PackInventory[];
  pjmAdoption?: PjmAdoption;
  projectScopeUnavailable?: boolean;
}

const REMEDIATION_TEXT = 'Run "oat init" to adopt stray entries.';

function createManifestEntry(
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry {
  return {
    canonicalPath: '.agents/skills/skill-one',
    providerPath: '.claude/skills/skill-one',
    provider: 'claude',
    contentType: 'skill',
    strategy: 'symlink',
    contentHash: null,
    lastSynced: '2026-02-14T00:00:00.000Z',
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

function createBundledCodexEntries(): CanonicalEntry[] {
  return ['oat-phase-implementer.md', 'oat-reviewer.md'].map((name) => ({
    name,
    type: 'agent',
    canonicalPath: `/tmp/bundled/agents/${name}`,
    isFile: true,
  }));
}

function createAdapter(): ProviderAdapter {
  return {
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

function createCursorAdapter(): ProviderAdapter {
  const skillMapping = {
    contentType: 'skill' as const,
    canonicalDir: '.agents/skills',
    providerDir: '.agents/skills',
    nativeRead: true,
    adoptionSourceDirs: ['.cursor/skills'],
  };

  return {
    name: 'cursor',
    displayName: 'Cursor',
    defaultStrategy: 'symlink',
    projectMappings: [skillMapping],
    userMappings: [skillMapping],
    detect: async () => true,
  };
}

function createCopilotAdapter(): ProviderAdapter {
  return {
    name: 'copilot',
    displayName: 'GitHub Copilot',
    defaultStrategy: 'symlink',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.agents/skills',
        nativeRead: true,
        adoptionSourceDirs: ['.github/skills'],
      },
    ],
    userMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.agents/skills',
        nativeRead: true,
        adoptionSourceDirs: ['.copilot/skills'],
      },
    ],
    detect: async () => true,
  };
}

function createDetectedAdapter(
  name: string,
  detected: boolean,
): ProviderAdapter {
  return {
    name,
    displayName: name,
    defaultStrategy: 'auto',
    projectMappings: [],
    userMappings: [],
    detect: async () => detected,
  };
}

function createManifest(entries: ManifestEntry[]): Manifest {
  return {
    version: 1,
    oatVersion: OAT_VERSION,
    entries,
    lastUpdated: '2026-02-14T00:00:00.000Z',
  };
}

function formatReports(reports: DriftReport[]): string {
  if (reports.length === 0) {
    return 'No managed entries found.';
  }

  return reports
    .map((report) => {
      const label =
        report.state.status === 'drifted'
          ? `drifted:${report.state.reason}`
          : report.state.status;
      return `${report.provider}:${label}:${report.providerPath}`;
    })
    .join('\n');
}

function packAsset(
  destination: string,
  status: PackAssetStatus,
  scope: 'project' | 'user',
  ownership: 'managed' | 'seed-if-missing' = 'managed',
): PackAssetInventory {
  const definition: PackAssetDefinition = {
    id: `skill:${destination}`,
    kind: 'skill',
    source: destination,
    destination,
    scopes: [scope],
    ownership: { [scope]: ownership },
  };
  return {
    definition,
    path: `${scope === 'project' ? '/tmp/workspace' : '/tmp/home'}/${destination}`,
    status,
    installedVersion: null,
    bundledVersion: null,
  };
}

function scopedInventory(
  pack: PackName,
  scope: 'project' | 'user',
  completeness: PackCompleteness,
  assets: PackAssetInventory[],
  overrides: Partial<ScopedPackInventory> = {},
): ScopedPackInventory {
  return {
    pack,
    scope,
    intent: {
      pack,
      scope,
      enabled: true,
      source: 'declared',
      configPath: `${scope === 'project' ? '/tmp/workspace' : '/tmp/home'}/.oat/config.json`,
      diagnostics: [],
    },
    completeness,
    assets,
    diagnostics: [],
    ...overrides,
  };
}

function packInventory(
  pack: PackName,
  scopes: ScopedPackInventory[],
  overrides: Partial<PackInventory> = {},
): PackInventory {
  const placement =
    scopes.length === 2 ? 'both' : (scopes[0]?.scope ?? 'unavailable');
  return {
    pack,
    placement: placement as PackInventory['placement'],
    scopes,
    diagnostics: [],
    ...overrides,
  };
}

function createHarness(options: TestHarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  selectManyWithAbort: ReturnType<typeof vi.fn>;
  selectWithAbort: ReturnType<typeof vi.fn>;
  confirmAction: ReturnType<typeof vi.fn>;
  adoptStray: ReturnType<typeof vi.fn>;
  applyNativeSkillDisposition: ReturnType<typeof vi.fn>;
  saveManifest: ReturnType<typeof vi.fn>;
  scanCanonical: ReturnType<typeof vi.fn>;
  scanBundledManagedCodexAgents: ReturnType<typeof vi.fn>;
  computeCodexProjectExtensionPlan: ReturnType<typeof vi.fn>;
  detectStrays: ReturnType<typeof vi.fn>;
  inventoryPack: ReturnType<typeof vi.fn>;
  resolvePjmAdoption: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const adapters = options.adapters ?? [createAdapter()];
  const fallbackManifestEntries =
    options.driftReports && options.driftReports.length === 0
      ? []
      : [createManifestEntry()];
  const manifestEntries = options.manifestEntries ?? fallbackManifestEntries;
  const driftReports =
    options.driftReports ??
    (manifestEntries.length > 0
      ? [
          {
            canonical:
              manifestEntries[0]?.canonicalPath ?? '.agents/skills/skill-one',
            provider: 'claude',
            providerPath:
              manifestEntries[0]?.providerPath ?? '.claude/skills/skill-one',
            state: { status: 'in_sync' as const },
          },
        ]
      : []);
  const strayReports = options.strayReports ?? [];
  const canonicalEntries = options.canonicalEntries ?? [];
  const interactive = options.interactive ?? true;
  const selectManyResponses = [...(options.selectManyResponses ?? [])];
  const singleSelectResponses = [...(options.singleSelectResponses ?? [])];
  const selectManyWithAbort = vi.fn(
    async () => selectManyResponses.shift() ?? [],
  );
  const selectWithAbort = vi.fn(
    async () => singleSelectResponses.shift() ?? null,
  );
  const confirmAction = vi.fn(async () => false);
  const adoptStray = vi.fn(async (_scopeRoot, _stray, manifest: Manifest) => {
    return manifest;
  });
  const applyNativeSkillDisposition = vi.fn(
    async (_scopeRoot, _stray, manifest: Manifest) => manifest,
  );
  const saveManifest = vi.fn(async () => undefined);
  const syncConfig: SyncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    knownStrays: options.syncConfigKnownStrays ?? [],
    providers: options.syncConfigProviders ?? {},
  };
  const userSyncConfig: SyncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    knownStrays: options.userKnownStrays ?? [],
    providers: options.userSyncConfigProviders ?? {},
  };
  const detectCodexRoleStrays = vi.fn(
    async () => options.codexRoleStrays ?? [],
  );
  const computeCodexProjectExtensionPlan = options.useDiskCodexExtension
    ? vi.fn(computeCodexExtensionPlanFromDisk)
    : vi.fn(async () => {
        return (
          options.codexExtensionPlan ?? {
            operations: [],
            managedRoles: [],
            aggregateConfigHash: 'hash',
          }
        );
      });
  const scanCanonical = vi.fn(async () => canonicalEntries);
  const scanBundledManagedCodexAgents = options.useDiskBundledCodexAgents
    ? vi.fn(scanBundledManagedCodexAgentsFromDisk)
    : vi.fn(
        async () => options.bundledCodexEntries ?? createBundledCodexEntries(),
      );
  const applyCodexProjectExtensionPlan = vi.fn(async () => ({
    applied: 0,
    failed: 0,
    skipped: 0,
  }));
  const detectStrays = vi.fn(async () => strayReports);
  const inventoriesByPack = new Map<PackName, PackInventory>(
    (options.packInventories ?? []).map((inventory) => [
      inventory.pack,
      inventory,
    ]),
  );
  const inventoryPack = vi.fn(async ({ pack }: { pack: PackName }) => {
    return (
      inventoriesByPack.get(pack) ?? {
        pack,
        placement: 'unavailable' as const,
        scopes: [],
        diagnostics: [],
      }
    );
  });
  const resolvePjmAdoption = vi.fn(
    async ({ repoRoot }: { repoRoot: string }): Promise<PjmAdoption> => {
      return (
        options.pjmAdoption ?? {
          state: 'none',
          repoRoot,
          recovery: 'oat pjm init',
        }
      );
    },
  );
  const computeCursorProjectExtensionPlan = vi.fn(async () => {
    return (
      options.cursorExtensionPlan ?? {
        provider: 'cursor',
        operations: [],
        managedEntries: [],
        aggregateHash: 'cursor-hash',
        metadata: { cleanupOwners: [], isPartialSync: false },
      }
    );
  });
  const applyCursorProjectExtensionPlan = vi.fn(async () => ({
    applied: 0,
    failed: 0,
    skipped: 0,
  }));
  let driftIndex = 0;

  const command = createStatusCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd ?? '/tmp/workspace',
      home: options.home ?? '/tmp/home',
      interactive: interactive && !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveScopeRoot: vi.fn(async (scope) => {
      if (scope === 'project' && options.projectScopeUnavailable) {
        throw new CliError('Not inside a Git repository', 1);
      }
      return scope === 'user'
        ? (options.home ?? '/tmp/home')
        : (options.cwd ?? '/tmp/workspace');
    }),
    loadManifest: vi.fn(async () => createManifest(manifestEntries)),
    loadSyncConfig: vi.fn(async () => syncConfig),
    resolveUserSyncConfig: vi.fn(async () => userSyncConfig),
    saveManifest,
    scanCanonical,
    scanBundledManagedAgents: scanBundledManagedCodexAgents,
    getAdapters: () => adapters,
    getConfigAwareAdapters: vi.fn(getConfigAwareAdapters),
    getSyncMappings: vi.fn(getSyncMappings),
    getAdoptionSources: vi.fn(getAdoptionSources),
    detectDrift: vi.fn(async () => {
      const report = driftReports[driftIndex] ?? driftReports.at(-1);
      driftIndex += 1;
      return report ?? driftReports[0]!;
    }),
    detectStrays,
    detectCodexRoleStrays,
    computeCodexProjectExtensionPlan,
    applyCodexProjectExtensionPlan,
    computeCursorProjectExtensionPlan,
    applyCursorProjectExtensionPlan,
    selectManyWithAbort,
    selectWithAbort,
    confirmAction,
    adoptStray,
    applyNativeSkillDisposition,
    formatStatusTable: formatReports,
    resolveAssetsRoot: vi.fn(async () => '/tmp/assets'),
    inventoryPack,
    resolvePjmAdoption,
  });

  return {
    capture,
    command,
    selectManyWithAbort,
    selectWithAbort,
    confirmAction,
    adoptStray,
    applyNativeSkillDisposition,
    saveManifest,
    scanCanonical,
    scanBundledManagedCodexAgents,
    computeCodexProjectExtensionPlan,
    detectStrays,
    inventoryPack,
    resolvePjmAdoption,
  };
}

async function runStatusCommand(
  command: Command,
  argv: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);

  // Subcommand-specific flags (e.g. `--hook`) must follow the `status`
  // subcommand name. Split `argv` into parent-level globals and subcommand
  // flags so both are routed to the right parser.
  const subcommandOnlyFlags = new Set(['--hook']);
  const parentArgs: string[] = [];
  const subArgs: string[] = [];
  for (const arg of argv) {
    if (subcommandOnlyFlags.has(arg)) {
      subArgs.push(arg);
    } else {
      parentArgs.push(arg);
    }
  }

  await program.parseAsync([...parentArgs, 'status', ...subArgs], {
    from: 'user',
  });
}

describe('createStatusCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('reports all in_sync when no drift', async () => {
    const { capture, command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'in_sync' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('in_sync');
  });

  it('reports drifted entries with reasons', async () => {
    const { capture, command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'drifted', reason: 'modified' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('drifted:modified');
  });

  it('reports missing entries', async () => {
    const { capture, command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'missing' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('missing');
  });

  it('reports missing entries for canonical content not yet synced', async () => {
    const { capture, command } = createHarness({
      manifestEntries: [],
      driftReports: [],
      canonicalEntries: [createCanonicalEntry('unsynced-skill')],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('missing');
    expect(process.exitCode).toBe(1);
  });

  it('scans Cursor adoption sources without reporting native-read skills as missing views', async () => {
    const { capture, command, detectStrays } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: false,
      manifestEntries: [],
      driftReports: [],
      canonicalEntries: [createCanonicalEntry('cursor-skill')],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/cursor-local',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(detectStrays).toHaveBeenCalledWith(
      'cursor',
      join('/tmp/workspace', '.cursor/skills'),
      expect.any(Object),
      expect.any(Array),
      expect.objectContaining({
        providerDir: '.agents/skills',
        nativeRead: true,
      }),
    );
    expect(capture.info[0]).toContain('cursor:stray');
    expect(capture.info[0]).not.toContain('missing');
  });

  it('reports strays with remediation text', async () => {
    const { capture, command } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-skill',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.warn).toContain(REMEDIATION_TEXT);
  });

  it('prompts with one checklist and adopts only selected entries', async () => {
    const { command, selectManyWithAbort, adoptStray, saveManifest } =
      createHarness({
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-one',
            state: { status: 'stray' },
          },
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-two',
            state: { status: 'stray' },
          },
        ],
        selectManyResponses: [['0']],
      });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(selectManyWithAbort.mock.calls[0]?.[0]).toContain(
      'Select stray entries to adopt [project]',
    );
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      value: string;
      description?: string;
    }>;
    expect(choices[0]?.label).toContain('[project] stray-one (claude)');
    expect(choices[0]?.description).toContain('.claude/skills/stray-one');
    expect(choices[1]?.label).toContain('[project] stray-two (claude)');
    expect(choices[1]?.description).toContain('.claude/skills/stray-two');
    expect(adoptStray).toHaveBeenCalledTimes(1);
    expect(saveManifest).toHaveBeenCalledTimes(1);
  });

  it('prompts for each Cursor skill with only adopt and keep choices', async () => {
    const {
      command,
      selectWithAbort,
      selectManyWithAbort,
      applyNativeSkillDisposition,
    } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/adopt-me',
          state: { status: 'stray' },
        },
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/keep-me',
          state: { status: 'stray' },
        },
      ],
      singleSelectResponses: ['adopt', 'keep'],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectWithAbort).toHaveBeenCalledTimes(2);
    for (const call of selectWithAbort.mock.calls) {
      expect(call[1]).toEqual([
        expect.objectContaining({
          label: 'Adopt into canonical',
          value: 'adopt',
        }),
        expect.objectContaining({
          label: 'Keep Cursor-only',
          value: 'keep',
        }),
      ]);
      expect(call[1]).toHaveLength(2);
    }
    expect(
      applyNativeSkillDisposition.mock.calls.map((call) => call[3]),
    ).toEqual(['adopt', 'keep']);
    expect(applyNativeSkillDisposition.mock.calls[1]?.[4]).toBe(
      '/tmp/workspace/.oat/sync/config.json',
    );
    expect(selectManyWithAbort).not.toHaveBeenCalled();
  });

  it.each([
    {
      scope: 'project',
      providerPath: '.github/skills/copilot-local',
      syncConfigPath: '/tmp/workspace/.oat/sync/config.json',
    },
    {
      scope: 'user',
      providerPath: '.copilot/skills/copilot-local',
      syncConfigPath: '/tmp/home/.oat/sync/config.json',
    },
  ])(
    'offers explicit Copilot adoption or keep-local in $scope status',
    async ({ scope, providerPath, syncConfigPath }) => {
      const {
        command,
        selectWithAbort,
        selectManyWithAbort,
        applyNativeSkillDisposition,
      } = createHarness({
        adapters: [createCopilotAdapter()],
        interactive: true,
        manifestEntries: [],
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'copilot',
            providerPath,
            state: { status: 'stray' },
          },
        ],
        singleSelectResponses: ['keep'],
      });

      await runStatusCommand(command, ['--scope', scope]);

      expect(selectWithAbort).toHaveBeenCalledWith(
        expect.stringContaining(`Migrate Copilot skill [${scope}]`),
        [
          expect.objectContaining({
            label: 'Adopt into canonical',
            value: 'adopt',
          }),
          expect.objectContaining({
            label: 'Keep Copilot-only',
            value: 'keep',
          }),
        ],
        expect.any(Object),
      );
      expect(applyNativeSkillDisposition).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ provider: 'copilot' }),
        expect.any(Object),
        'keep',
        syncConfigPath,
      );
      expect(selectManyWithAbort).not.toHaveBeenCalled();
    },
  );

  it('stops current and remaining status migration processing on abort', async () => {
    const {
      command,
      selectWithAbort,
      selectManyWithAbort,
      applyNativeSkillDisposition,
    } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/answered',
          state: { status: 'stray' },
        },
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/aborted',
          state: { status: 'stray' },
        },
      ],
      singleSelectResponses: ['keep', null],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectWithAbort).toHaveBeenCalledTimes(2);
    expect(applyNativeSkillDisposition).toHaveBeenCalledTimes(1);
    expect(selectManyWithAbort).not.toHaveBeenCalled();
  });

  it('uses project and user sync config paths for scope-all dispositions', async () => {
    const { command, applyNativeSkillDisposition } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/local-only',
          state: { status: 'stray' },
        },
      ],
      singleSelectResponses: ['keep', 'keep'],
    });

    await runStatusCommand(command, ['--scope', 'all']);

    expect(
      applyNativeSkillDisposition.mock.calls.map((call) => call[4]),
    ).toEqual([
      '/tmp/workspace/.oat/sync/config.json',
      '/tmp/home/.oat/sync/config.json',
    ]);
  });

  it('reports keep-local name collisions without recording the choice', async () => {
    const { command, capture, applyNativeSkillDisposition } = createHarness({
      adapters: [createCursorAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'cursor',
          providerPath: '.cursor/skills/local-only',
          state: { status: 'stray' },
        },
      ],
      singleSelectResponses: ['keep'],
    });
    applyNativeSkillDisposition.mockRejectedValueOnce(
      new CliError(
        'Cannot keep .cursor/skills/local-only Cursor-only because canonical skill .agents/skills/local-only has the same name. Rename one skill, then run the command again.',
      ),
    );

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.warn.join('\n')).toContain('Rename one skill');
    expect(applyNativeSkillDisposition).toHaveBeenCalledTimes(1);
  });

  it('warns and continues when a native skill adoption source is unavailable', async () => {
    const { command, capture, confirmAction, applyNativeSkillDisposition } =
      createHarness({
        adapters: [createCopilotAdapter()],
        interactive: true,
        manifestEntries: [],
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'copilot',
            providerPath: '.github/skills/broken',
            state: { status: 'stray' },
          },
          {
            canonical: null,
            provider: 'copilot',
            providerPath: '.github/skills/keep-me',
            state: { status: 'stray' },
          },
        ],
        singleSelectResponses: ['adopt', 'keep'],
      });
    applyNativeSkillDisposition.mockRejectedValueOnce(
      new AdoptionSourceUnavailableError(
        'Cannot adopt .github/skills/broken: the path is missing or a broken symlink.',
      ),
    );

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.warn.join('\n')).toContain('broken symlink');
    expect(confirmAction).not.toHaveBeenCalled();
    expect(applyNativeSkillDisposition).toHaveBeenCalledTimes(2);
  });

  it('outputs JSON when --json flag set', async () => {
    const { capture, command } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-skill',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project', '--json']);

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.info).toHaveLength(0);
    expect(capture.warn).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'project',
      remediation: REMEDIATION_TEXT,
      summary: {
        stray: 1,
      },
    });
  });

  it('suppresses project-level known strays from text and JSON status', async () => {
    const knownStray: DriftReport = {
      canonical: null,
      provider: 'claude',
      providerPath: '.claude/skills/local-only',
      state: { status: 'stray' },
    };
    const { capture, command, selectManyWithAbort } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [knownStray],
      syncConfigKnownStrays: ['.claude/skills/local-only'],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).not.toContain('.claude/skills/local-only');
    expect(capture.warn).not.toContain(REMEDIATION_TEXT);
    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);

    const jsonHarness = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [knownStray],
      syncConfigKnownStrays: ['.claude/skills/local-only'],
    });

    await runStatusCommand(jsonHarness.command, [
      '--scope',
      'project',
      '--json',
    ]);

    expect(jsonHarness.capture.jsonPayloads[0]).toMatchObject({
      summary: {
        total: 0,
        stray: 0,
      },
      reports: [],
    });
    expect(jsonHarness.capture.jsonPayloads[0]).not.toHaveProperty(
      'remediation',
    );
  });

  it('suppresses user-level known strays from prompts', async () => {
    const { capture, command, selectManyWithAbort } = createHarness({
      interactive: true,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/user-local',
          state: { status: 'stray' },
        },
      ],
      userKnownStrays: ['.claude/skills/user-local'],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).not.toContain('.claude/skills/user-local');
    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('keeps unconfigured strays reportable and adoptable', async () => {
    const { capture, command, selectManyWithAbort, adoptStray } = createHarness(
      {
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/local-only',
            state: { status: 'stray' },
          },
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/actionable',
            state: { status: 'stray' },
          },
        ],
        syncConfigKnownStrays: ['.claude/skills/local-only'],
        selectManyResponses: [['0']],
      },
    );

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).not.toContain('.claude/skills/local-only');
    expect(capture.info[0]).toContain('.claude/skills/actionable');
    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      description?: string;
    }>;
    expect(choices).toHaveLength(1);
    expect(choices[0]?.label).toContain('actionable');
    expect(choices[0]?.description).toContain('.claude/skills/actionable');
    expect(adoptStray.mock.calls[0]?.[1].report.providerPath).toBe(
      '.claude/skills/actionable',
    );
  });

  it('suppresses configured Codex role strays', async () => {
    const { capture, command, selectManyWithAbort } = createHarness({
      adapters: [createCodexAdapter()],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      codexRoleStrays: [
        {
          roleName: 'reviewer',
          providerPath: '.codex/agents/reviewer.toml',
          description: 'Reviewer role',
        },
      ],
      syncConfigKnownStrays: ['.codex/agents/reviewer.toml'],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).not.toContain('.codex/agents/reviewer.toml');
    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('does not prompt in non-interactive mode', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: false,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/stray-skill',
          state: { status: 'stray' },
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).not.toHaveBeenCalled();
  });

  it('non-interactive mode skips adoption attempts even when strays exist', async () => {
    const { command, selectManyWithAbort, confirmAction, adoptStray, capture } =
      createHarness({
        interactive: false,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
      });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(confirmAction).not.toHaveBeenCalled();
    expect(adoptStray).not.toHaveBeenCalled();
    expect(capture.warn).toContain(REMEDIATION_TEXT);
    expect(process.exitCode).toBe(1);
  });

  it('reports codex extension drift operations for project scope', async () => {
    const { capture, command } = createHarness({
      adapters: [createCodexAdapter()],
      manifestEntries: [],
      driftReports: [],
      canonicalEntries: [],
      codexExtensionPlan: {
        operations: [
          {
            action: 'create',
            target: 'role',
            path: '.codex/agents/reviewer.toml',
            reason: 'missing role',
            roleName: 'reviewer',
            content: 'role content',
          },
          {
            action: 'update',
            target: 'config',
            path: '.codex/config.toml',
            reason: 'config drifted',
            content: 'config content',
          },
        ],
        managedRoles: ['reviewer'],
        aggregateConfigHash: 'abc123',
      },
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('codex:missing');
    expect(capture.info[0]).toContain('codex:drifted:modified');
    expect(process.exitCode).toBe(1);
  });

  it('reports managed Cursor variants as desired-state drift, not strays', async () => {
    const cursorOnlyAdapter: ProviderAdapter = {
      name: 'cursor',
      displayName: 'Cursor',
      defaultStrategy: 'symlink',
      projectMappings: [],
      userMappings: [],
      detect: async () => true,
    };
    const { capture, command, selectManyWithAbort } = createHarness({
      adapters: [cursorOnlyAdapter],
      interactive: true,
      manifestEntries: [],
      driftReports: [],
      cursorExtensionPlan: {
        provider: 'cursor',
        operations: [
          {
            provider: 'cursor',
            action: 'create',
            target: 'role',
            path: '.cursor/agents/oat-reviewer-gpt.md',
            reason: 'managed Cursor role file missing',
            entryName: 'oat-reviewer-gpt',
            roleName: 'oat-reviewer-gpt',
            content: '# reviewer',
          },
        ],
        managedEntries: ['oat-reviewer-gpt'],
        aggregateHash: 'cursor-hash',
        metadata: {
          cleanupOwners: ['supported-catalogue'],
          isPartialSync: false,
        },
      },
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain(
      'cursor:missing:.cursor/agents/oat-reviewer-gpt.md',
    );
    expect(selectManyWithAbort).not.toHaveBeenCalled();
  });

  it('reports Codex extension drift for user scope', async () => {
    const {
      command,
      scanCanonical,
      scanBundledManagedCodexAgents,
      computeCodexProjectExtensionPlan,
    } = createHarness({
      adapters: [createCodexAdapter()],
      manifestEntries: [],
      driftReports: [],
      canonicalEntries: [],
    });

    await runStatusCommand(command, ['--scope', 'user']);

    expect(scanCanonical).toHaveBeenCalledWith('/tmp/home', 'user');
    expect(scanBundledManagedCodexAgents).toHaveBeenCalledTimes(1);
    expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
      '/tmp/home',
      expect.arrayContaining([
        expect.objectContaining({
          name: 'oat-phase-implementer.md',
          type: 'agent',
        }),
        expect.objectContaining({ name: 'oat-reviewer.md', type: 'agent' }),
      ]),
      undefined,
      { userConfigDir: '/tmp/home/.oat' },
    );
  });

  it('reports real custom user Codex drift in both managed base roles', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-status-user-home-'));
    const project = await mkdtemp(join(tmpdir(), 'oat-status-project-'));

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
                  high: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.7-user-status',
                      effort: 'high',
                    },
                  ],
                },
              },
            },
          },
        }),
        'utf8',
      );

      const roleNames = ['oat-phase-implementer', 'oat-reviewer'].map(
        (agentName) =>
          buildCodexMaterializedTargetRoleName({
            agentName,
            model: 'gpt-5.7-user-status',
            effort: 'high',
          }),
      );
      for (const roleName of roleNames) {
        await writeFile(
          join(home, '.codex', 'agents', `${roleName}.toml`),
          [
            '# oat-managed: true',
            `# oat-role: ${roleName}`,
            '# oat-owner: user-config',
            'developer_instructions = "drifted role"',
            '',
          ].join('\n'),
          'utf8',
        );
      }

      const { capture, command, computeCodexProjectExtensionPlan } =
        createHarness({
          adapters: [createCodexAdapter()],
          manifestEntries: [],
          driftReports: [],
          canonicalEntries: [],
          cwd: project,
          home,
          useDiskCodexExtension: true,
          useDiskBundledCodexAgents: true,
          interactive: false,
        });

      await runStatusCommand(command, ['--scope', 'user', '--json']);

      expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
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
      const payload = capture.jsonPayloads[0] as {
        scope: Scope;
        reports: DriftReport[];
        summary: { drifted: number };
      };
      expect(payload).toMatchObject({
        scope: 'user',
        summary: { drifted: 3 },
      });
      expect(payload.reports).toEqual(
        expect.arrayContaining(
          roleNames.map((roleName) =>
            expect.objectContaining({
              provider: 'codex',
              providerPath: `.codex/agents/${roleName}.toml`,
              state: { status: 'drifted', reason: 'modified' },
            }),
          ),
        ),
      );
      expect(process.exitCode).toBe(1);
    } finally {
      await Promise.all([
        rm(home, { recursive: true, force: true }),
        rm(project, { recursive: true, force: true }),
      ]);
    }
  });

  it.each([
    ['project', createCodexAdapter()],
    ['user', createAdapter()],
  ] as const)(
    'does not compose bundled Codex inputs for %s status without user Codex planning',
    async (scope, adapter) => {
      const {
        command,
        scanBundledManagedCodexAgents,
        computeCodexProjectExtensionPlan,
      } = createHarness({
        adapters: [adapter],
        manifestEntries: [],
        driftReports: [],
        canonicalEntries: [],
      });

      await runStatusCommand(command, ['--scope', scope]);

      expect(scanBundledManagedCodexAgents).not.toHaveBeenCalled();
      if (scope === 'project') {
        expect(computeCodexProjectExtensionPlan).toHaveBeenCalledWith(
          '/tmp/workspace',
          [],
          undefined,
          { userConfigDir: '/tmp/home/.oat' },
        );
      } else {
        expect(computeCodexProjectExtensionPlan).not.toHaveBeenCalled();
      }
    },
  );

  it('reports codex role strays discovered from codex detector', async () => {
    const { capture, command } = createHarness({
      adapters: [createCodexAdapter()],
      interactive: false,
      manifestEntries: [],
      driftReports: [],
      strayReports: [],
      codexRoleStrays: [
        {
          roleName: 'reviewer',
          providerPath: '.codex/agents/reviewer.toml',
          description: 'Reviewer role',
        },
      ],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(capture.info[0]).toContain('codex:stray');
    expect(capture.warn).toContain(REMEDIATION_TEXT);
    expect(process.exitCode).toBe(1);
  });

  it('prompts for replacement on adoption conflict and skips when declined', async () => {
    const { command, selectManyWithAbort, confirmAction, adoptStray } =
      createHarness({
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
        selectManyResponses: [['0']],
      });

    adoptStray.mockRejectedValueOnce(
      new CliError(
        'Cannot adopt .claude/skills/stray-skill because canonical file already exists.',
      ),
    );
    confirmAction.mockResolvedValue(false);

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(adoptStray).toHaveBeenCalledTimes(1);
  });

  it('retries adoption with replaceCanonical when conflict replacement is confirmed', async () => {
    const { command, selectManyWithAbort, confirmAction, adoptStray } =
      createHarness({
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
        selectManyResponses: [['0']],
      });

    adoptStray
      .mockRejectedValueOnce(
        new CliError(
          'Cannot adopt .claude/skills/stray-skill because canonical file already exists.',
        ),
      )
      .mockResolvedValueOnce(
        createManifest([
          createManifestEntry({ providerPath: '.claude/skills/stray-skill' }),
        ]),
      );
    confirmAction.mockResolvedValue(true);

    await runStatusCommand(command, ['--scope', 'project']);

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(adoptStray).toHaveBeenCalledTimes(2);
    expect(adoptStray.mock.calls[1]?.[3]).toEqual({ replaceCanonical: true });
  });

  it('renders user-scope stray labels as [user] ~/.<provider path>', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
      driftReports: [],
      strayReports: [
        {
          canonical: null,
          provider: 'claude',
          providerPath: '.claude/skills/user-stray',
          state: { status: 'stray' },
        },
      ],
      selectManyResponses: [[]],
    });

    await runStatusCommand(command, ['--scope', 'user']);

    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      value: string;
      description?: string;
    }>;
    expect(choices[0]?.label).toContain('[user] user-stray (claude)');
    expect(choices[0]?.description).toContain('~/.claude/skills/user-stray');
  });

  it('exits 0 when all in sync', async () => {
    const { command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'in_sync' },
        },
      ],
      strayReports: [],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(process.exitCode).toBe(0);
  });

  it('exits 1 when drift or strays detected', async () => {
    const { command } = createHarness({
      driftReports: [
        {
          canonical: '.agents/skills/skill-one',
          provider: 'claude',
          providerPath: '.claude/skills/skill-one',
          state: { status: 'drifted', reason: 'replaced' },
        },
      ],
      strayReports: [],
    });

    await runStatusCommand(command, ['--scope', 'project']);

    expect(process.exitCode).toBe(1);
  });

  describe('--hook mode', () => {
    const DRIFT_WARNING =
      "oat: managed provider views are out of sync - run 'oat sync --scope project'";
    const STRAY_INFO =
      "oat: unmanaged provider files detected - run 'oat status --scope project' to review";

    it('is silent and exits 0 when all in sync', async () => {
      const { capture, command } = createHarness({
        driftReports: [
          {
            canonical: '.agents/skills/skill-one',
            provider: 'claude',
            providerPath: '.claude/skills/skill-one',
            state: { status: 'in_sync' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.info).toHaveLength(0);
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('warns and exits 1 on managed drift', async () => {
      const { capture, command } = createHarness({
        driftReports: [
          {
            canonical: '.agents/skills/skill-one',
            provider: 'claude',
            providerPath: '.claude/skills/skill-one',
            state: { status: 'drifted', reason: 'modified' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.warn).toContain(DRIFT_WARNING);
      expect(capture.info).toHaveLength(0);
      expect(process.exitCode).toBe(1);
    });

    it('warns and exits 1 on missing managed entry', async () => {
      const { capture, command } = createHarness({
        driftReports: [
          {
            canonical: '.agents/skills/skill-one',
            provider: 'claude',
            providerPath: '.claude/skills/skill-one',
            state: { status: 'missing' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.warn).toContain(DRIFT_WARNING);
      expect(process.exitCode).toBe(1);
    });

    it('emits info and exits 0 when only strays exist', async () => {
      const { capture, command } = createHarness({
        interactive: false,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.info).toContain(STRAY_INFO);
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('does not emit stray info when only known strays exist', async () => {
      const { capture, command } = createHarness({
        interactive: false,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/local-only',
            state: { status: 'stray' },
          },
        ],
        syncConfigKnownStrays: ['.claude/skills/local-only'],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.info).toHaveLength(0);
      expect(capture.warn).toHaveLength(0);
      expect(process.exitCode).toBe(0);
    });

    it('prefers drift warning when both drift and strays exist', async () => {
      const { capture, command } = createHarness({
        interactive: false,
        driftReports: [
          {
            canonical: '.agents/skills/skill-one',
            provider: 'claude',
            providerPath: '.claude/skills/skill-one',
            state: { status: 'drifted', reason: 'modified' },
          },
        ],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-skill',
            state: { status: 'stray' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(capture.warn).toContain(DRIFT_WARNING);
      expect(capture.info).not.toContain(STRAY_INFO);
      expect(process.exitCode).toBe(1);
    });

    it('suppresses the status table and adoption prompts', async () => {
      const { capture, command, selectManyWithAbort } = createHarness({
        interactive: true,
        driftReports: [],
        strayReports: [
          {
            canonical: null,
            provider: 'claude',
            providerPath: '.claude/skills/stray-one',
            state: { status: 'stray' },
          },
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      // Status table goes via logger.info. In --hook mode we emit exactly
      // the stray info line — no table, no remediation prompt.
      expect(capture.info).toEqual([STRAY_INFO]);
      expect(selectManyWithAbort).not.toHaveBeenCalled();
    });
  });

  describe('managed pack state', () => {
    it.each([
      {
        label: 'Claude-only detection',
        adapters: [createDetectedAdapter('claude', true)],
        providers: {},
        expected: false,
      },
      {
        label: 'Codex configured enabled without detection',
        adapters: [createDetectedAdapter('codex', false)],
        providers: { codex: { enabled: true } },
        expected: true,
      },
      {
        label: 'Codex configured disabled with detection',
        adapters: [createDetectedAdapter('codex', true)],
        providers: { codex: { enabled: false } },
        expected: false,
      },
      {
        label: 'Codex detected with unset config',
        adapters: [createDetectedAdapter('codex', true)],
        providers: {},
        expected: true,
      },
      {
        label: 'Codex absent with unset config',
        adapters: [createDetectedAdapter('codex', false)],
        providers: {},
        expected: false,
      },
      {
        label: 'Cursor configured enabled without detection',
        adapters: [createDetectedAdapter('cursor', false)],
        providers: { cursor: { enabled: true } },
        expected: true,
      },
      {
        label: 'Cursor configured disabled with detection',
        adapters: [createDetectedAdapter('cursor', true)],
        providers: { cursor: { enabled: false } },
        expected: false,
      },
      {
        label: 'Cursor detected with unset config',
        adapters: [createDetectedAdapter('cursor', true)],
        providers: {},
        expected: true,
      },
      {
        label: 'Cursor absent with unset config',
        adapters: [createDetectedAdapter('cursor', false)],
        providers: {},
        expected: false,
      },
      {
        label: 'mixed Claude and Cursor detection',
        adapters: [
          createDetectedAdapter('claude', true),
          createDetectedAdapter('cursor', true),
        ],
        providers: {},
        expected: true,
      },
      {
        label: 'no providers',
        adapters: [],
        providers: {},
        expected: false,
      },
    ])(
      'uses config-aware user managed-role capability for $label',
      async ({ adapters, providers, expected }) => {
        const { command, inventoryPack } = createHarness({
          adapters,
          userSyncConfigProviders: providers,
          driftReports: [],
        });

        await runStatusCommand(command, ['--scope', 'user']);

        expect(inventoryPack).toHaveBeenCalledWith(
          expect.objectContaining({
            pack: 'core',
            userManagedRoleMaterialization: expected,
          }),
        );
      },
    );

    it('reports the same redacted affected agents in human and JSON output', async () => {
      const affected = [
        '/tmp/home/.agents/agents/oat-codebase-mapper.md',
        '/tmp/home/.agents/agents/skeptical-evaluator.md',
      ];
      const inventories = [
        packInventory('research', [
          scopedInventory(
            'research',
            'user',
            'complete',
            [packAsset('.agents/skills/analyze', 'current', 'user')],
            {
              diagnostics: [
                {
                  code: 'user-agent-unmaterialized',
                  message:
                    'Native provider-role materialization is unavailable for the affected user agents; canonical instruction reads are unaffected.',
                  paths: affected,
                },
              ],
            },
          ),
        ]),
      ];
      const human = createHarness({
        driftReports: [],
        packInventories: inventories,
      });
      const json = createHarness({
        driftReports: [],
        packInventories: inventories,
      });

      await runStatusCommand(human.command, ['--scope', 'user']);
      await runStatusCommand(json.command, ['--scope', 'user', '--json']);

      const humanOutput = human.capture.info.join('\n');
      const payload = json.capture.jsonPayloads[0] as {
        packs: {
          states: Array<{
            scopes: Array<{
              diagnostics: Array<{ code: string; paths: string[] }>;
            }>;
          }>;
        };
      };
      const jsonAffected = payload.packs.states
        .flatMap(({ scopes }) => scopes)
        .flatMap(({ diagnostics }) => diagnostics)
        .find(({ code }) => code === 'user-agent-unmaterialized')?.paths;
      expect(jsonAffected).toEqual([
        '~/.agents/agents/oat-codebase-mapper.md',
        '~/.agents/agents/skeptical-evaluator.md',
      ]);
      for (const path of jsonAffected ?? []) {
        expect(humanOutput).toContain(path);
      }
      expect(humanOutput).not.toContain('/tmp/home/.agents');
    });

    it('reports partial pack completeness with a scoped recovery command', async () => {
      const { capture, command } = createHarness({
        driftReports: [],
        packInventories: [
          packInventory('docs', [
            scopedInventory('docs', 'project', 'partial', [
              packAsset(
                '.agents/skills/oat-docs-analyze',
                'current',
                'project',
              ),
              packAsset('.agents/skills/oat-docs-apply', 'missing', 'project'),
            ]),
          ]),
        ],
      });

      await runStatusCommand(command, ['--scope', 'project']);

      const packSection = capture.info.join('\n');
      expect(packSection).toContain('Pack state:');
      expect(packSection).toContain('docs');
      expect(packSection).toContain('partial');
      expect(packSection).toContain('.agents/skills/oat-docs-apply');
      expect(packSection).toContain(
        'oat tools update --pack docs --scope project',
      );
    });

    it('emits structured pack state in JSON mode', async () => {
      const { capture, command } = createHarness({
        driftReports: [],
        packInventories: [
          packInventory('utility', [
            scopedInventory('utility', 'project', 'complete', [
              packAsset('.agents/skills/oat-utility', 'outdated', 'project'),
              packAsset('.agents/skills/oat-utility-two', 'newer', 'project'),
              packAsset(
                '.oat/ideas/backlog.md',
                'current',
                'project',
                'seed-if-missing',
              ),
              packAsset(
                '.oat/templates/state.md',
                'present',
                'project',
                'seed-if-missing',
              ),
            ]),
          ]),
        ],
      });

      await runStatusCommand(command, ['--scope', 'project', '--json']);

      const payload = capture.jsonPayloads[0] as {
        packs: {
          states: Array<{
            pack: string;
            placement: string;
            scopes: Array<{
              scope: string;
              completeness: string;
              stale: number;
              newer: number;
              retainedOverrides: number;
              missing: string[];
              recovery: string | null;
            }>;
            diagnostics: Array<{ code: string; recovery: string | null }>;
          }>;
          unavailableScopes: string[];
          pjm: { state: string; recovery: string | null } | null;
        };
      };

      const utility = payload.packs.states.find(
        (state) => state.pack === 'utility',
      );
      expect(utility?.placement).toBe('project');
      expect(utility?.scopes[0]).toMatchObject({
        scope: 'project',
        completeness: 'complete',
        stale: 1,
        newer: 1,
        retainedOverrides: 1,
        missing: [],
        recovery: 'oat tools update --pack utility --scope project',
      });
      expect(payload.packs.unavailableScopes).toEqual([]);
    });

    it('reports duplicate cross-scope packs with a migration recovery command', async () => {
      const { capture, command } = createHarness({
        driftReports: [],
        packInventories: [
          packInventory(
            'ideas',
            [
              scopedInventory('ideas', 'project', 'complete', [
                packAsset('.agents/skills/oat-idea', 'current', 'project'),
              ]),
              scopedInventory('ideas', 'user', 'complete', [
                packAsset('.agents/skills/oat-idea', 'current', 'user'),
              ]),
            ],
            {
              diagnostics: [
                {
                  code: 'duplicate-scope',
                  message:
                    'Pack ideas has canonical assets at project and user scope; provider precedence is not inferred',
                  paths: [
                    '/tmp/workspace/.agents/skills/oat-idea',
                    '/tmp/home/.agents/skills/oat-idea',
                  ],
                  versions: [null, null],
                },
              ],
            },
          ),
        ],
      });

      await runStatusCommand(command, ['--scope', 'all']);

      const output = capture.info.join('\n');
      expect(output).toContain('duplicate-scope');
      expect(output).toContain('provider precedence is not inferred');
      expect(output).toContain(
        'oat tools migrate --pack ideas --from project --to user',
      );
    });

    it('reports legacy false pack intent with a scoped recovery command', async () => {
      const { capture, command } = createHarness({
        driftReports: [],
        packInventories: [
          packInventory('research', [
            scopedInventory(
              'research',
              'project',
              'complete',
              [packAsset('.agents/skills/oat-research', 'current', 'project')],
              {
                intent: {
                  pack: 'research',
                  scope: 'project',
                  enabled: true,
                  source: 'inferred-legacy',
                  configPath: '/tmp/workspace/.oat/config.json',
                  diagnostics: [],
                },
                diagnostics: [
                  {
                    code: 'legacy-false-conflict',
                    message:
                      'Pack research has legacy false intent but managed assets exist at project scope',
                    paths: ['/tmp/workspace/.agents/skills/oat-research'],
                  },
                ],
              },
            ),
          ]),
        ],
      });

      await runStatusCommand(command, ['--scope', 'project']);

      const output = capture.info.join('\n');
      expect(output).toContain('legacy-false-conflict');
      expect(output).toContain(
        'oat tools update --pack research --scope project',
      );
    });

    it('renders user-scope pack paths as home-relative', async () => {
      const { capture, command } = createHarness({
        driftReports: [],
        packInventories: [
          packInventory('brainstorm', [
            scopedInventory('brainstorm', 'user', 'partial', [
              packAsset('.agents/skills/oat-brainstorm', 'missing', 'user'),
            ]),
          ]),
        ],
      });

      await runStatusCommand(command, ['--scope', 'user']);

      const output = capture.info.join('\n');
      expect(output).toContain('~/.agents/skills/oat-brainstorm');
      expect(output).not.toContain('/tmp/home/.agents');
    });

    it('inventories every manifest pack once for the resolved scopes', async () => {
      const { command, inventoryPack } = createHarness({ driftReports: [] });

      await runStatusCommand(command, ['--scope', 'all']);

      expect(inventoryPack).toHaveBeenCalledTimes(PACK_NAMES.length);
      expect(inventoryPack).toHaveBeenCalledWith({
        pack: 'core',
        assetsRoot: '/tmp/assets',
        projectRoot: '/tmp/workspace',
        userRoot: '/tmp/home',
        userManagedRoleMaterialization: false,
      });
    });

    it('reports project scope as unavailable for --scope all and still reports user scope', async () => {
      const { capture, command, inventoryPack } = createHarness({
        driftReports: [],
        projectScopeUnavailable: true,
      });

      await runStatusCommand(command, ['--scope', 'all', '--json']);

      const payload = capture.jsonPayloads[0] as {
        packs: { unavailableScopes: string[]; pjm: unknown };
      };
      expect(payload.packs.unavailableScopes).toEqual(['project']);
      expect(payload.packs.pjm).toBeNull();
      expect(inventoryPack).toHaveBeenCalledWith({
        pack: 'core',
        assetsRoot: '/tmp/assets',
        userRoot: '/tmp/home',
        userManagedRoleMaterialization: false,
      });
    });

    it('fails when an explicitly requested project scope is unavailable', async () => {
      const { command } = createHarness({
        driftReports: [],
        projectScopeUnavailable: true,
      });

      await expect(
        runStatusCommand(command, ['--scope', 'project']),
      ).rejects.toThrow('Not inside a Git repository');
    });

    it('reports an uninitialized repository when project PJM assets exist', async () => {
      const { capture, command } = createHarness({
        driftReports: [],
        pjmAdoption: {
          state: 'none',
          repoRoot: '/tmp/workspace/.oat/repo',
          recovery: 'oat pjm init',
        },
        packInventories: [
          packInventory('project-management', [
            scopedInventory('project-management', 'project', 'complete', [
              packAsset(
                '.agents/skills/oat-pjm-decision',
                'current',
                'project',
              ),
            ]),
          ]),
        ],
      });

      await runStatusCommand(command, ['--scope', 'project']);

      const output = capture.info.join('\n');
      expect(output).toContain('has not adopted PJM');
      expect(output).toContain('oat pjm init');
    });

    it('stays quiet about PJM adoption when only user-scope PJM capability exists', async () => {
      const { capture, command } = createHarness({
        driftReports: [],
        pjmAdoption: {
          state: 'none',
          repoRoot: '/tmp/workspace/.oat/repo',
          recovery: 'oat pjm init',
        },
        packInventories: [
          packInventory('project-management', [
            scopedInventory('project-management', 'user', 'complete', [
              packAsset('.agents/skills/oat-pjm-decision', 'current', 'user'),
            ]),
          ]),
        ],
      });

      await runStatusCommand(command, ['--scope', 'all']);

      const output = capture.info.join('\n');
      expect(output).not.toContain('oat pjm init');
    });

    it('redacts the PJM repo root in JSON output like every other pack path', async () => {
      const { capture, command } = createHarness({
        driftReports: [],
        pjmAdoption: {
          state: 'declared',
          repoRoot: '/tmp/workspace/.oat/repo',
          recovery: null,
        },
      });

      await runStatusCommand(command, ['--scope', 'project', '--json']);

      const payload = capture.jsonPayloads[0] as {
        packs: { pjm: { repoRoot: string } | null };
      };
      expect(payload.packs.pjm?.repoRoot).toBe('.oat/repo');
    });

    it('skips managed pack inventory in hook mode', async () => {
      const { command, inventoryPack, resolvePjmAdoption } = createHarness({
        driftReports: [],
      });

      await runStatusCommand(command, ['--scope', 'project', '--hook']);

      expect(inventoryPack).not.toHaveBeenCalled();
      expect(resolvePjmAdoption).not.toHaveBeenCalled();
    });
  });
});
