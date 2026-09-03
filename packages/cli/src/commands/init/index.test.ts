import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { AdoptionSourceUnavailableError } from '@commands/shared/adopt-stray';
import { PROVIDER_CONFIG_REMEDIATION } from '@commands/shared/messages';
import type {
  MultiSelectChoice,
  PromptContext,
} from '@commands/shared/shared.prompts';
import { DEFAULT_SYNC_CONFIG, type SyncConfig } from '@config/index';
import type { CanonicalEntry } from '@engine/index';
import { CliError } from '@errors/index';
import { createEmptyManifest, type Manifest } from '@manifest/index';
import { codexAdapter } from '@providers/codex';
import { cursorAdapter } from '@providers/cursor';
import type { ProviderAdapter, ProviderScopeContext } from '@providers/shared';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitCommand, type InitStrayCandidate } from './index';

interface HarnessOptions {
  interactive?: boolean;
  home?: string;
  scopeRootByScope?: Partial<Record<'project' | 'user', string>>;
  strays?: InitStrayCandidate[];
  confirmResponses?: boolean[];
  selectResponses?: Array<string[] | null>;
  singleSelectResponses?: Array<string | null>;
  providerSelectResponses?: Array<string[] | null>;
  hookInstalled?: boolean;
  useDefaultAdopt?: boolean;
  useDefaultCollectStrays?: boolean;
  useDefaultEnsureCanonicalDirs?: boolean;
  adapters?: ProviderAdapter[];
  providerContext?: ProviderScopeContext;
  providerContextResolver?: () => Promise<ProviderScopeContext>;
  configAwareActiveAdapterNames?: string[];
  loadedSyncConfig?: SyncConfig;
  userKnownStrays?: string[];
  oatDirExists?: boolean;
  useDefaultGuidedSetup?: boolean;
  throwOnNonInteractiveSelectMany?: boolean;
  resolvedLocalPaths?: string[];
  toolPacksResult?: string[];
  hookInstallInfo?: {
    hookPath: string;
    suggestedHooksPath: string | null;
    suggestedHookPath: string | null;
  };
}

interface RunInitArgs {
  globalArgs?: string[];
  commandArgs?: string[];
}

function createProviderAdapter(name: string): ProviderAdapter {
  return {
    name,
    displayName: name,
    defaultStrategy: 'symlink',
    projectMappings: [],
    userMappings: [],
    detect: async () => true,
  };
}

const ADOPT_REMEDIATION =
  'Run "oat init" interactively to adopt stray entries.';
const HOOK_GUIDANCE =
  'Run "oat init --hook" to install optional pre-commit hook.';

function createStray(
  providerPath = '.claude/skills/stray-skill',
  provider = 'claude',
  providerDir = '.claude/skills',
): InitStrayCandidate {
  return {
    provider,
    report: {
      canonical: null,
      provider,
      providerPath,
      state: { status: 'stray' },
    },
    mapping: {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir,
      nativeRead: false,
    },
  };
}

function createCursorSkillStray(
  providerPath = '.cursor/skills/cursor-local',
): InitStrayCandidate {
  return {
    provider: 'cursor',
    report: {
      canonical: null,
      provider: 'cursor',
      providerPath,
      state: { status: 'stray' },
    },
    mapping: {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir: '.agents/skills',
      nativeRead: true,
      adoptionSourceDirs: ['.cursor/skills'],
    },
  };
}

function createCopilotSkillStray(
  providerPath = '.github/skills/copilot-local',
): InitStrayCandidate {
  return {
    provider: 'copilot',
    report: {
      canonical: null,
      provider: 'copilot',
      providerPath,
      state: { status: 'stray' },
    },
    mapping: {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir: '.agents/skills',
      nativeRead: true,
      adoptionSourceDirs: [
        providerPath.startsWith('.copilot/')
          ? '.copilot/skills'
          : '.github/skills',
      ],
    },
  };
}

function createCanonicalEntries(): CanonicalEntry[] {
  return [];
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  resolveScopeRoot: ReturnType<typeof vi.fn>;
  ensureCanonicalDirs: ReturnType<typeof vi.fn>;
  saveManifest: ReturnType<typeof vi.fn>;
  collectStrays: ReturnType<typeof vi.fn>;
  confirmAction: ReturnType<typeof vi.fn>;
  selectManyWithAbort: ReturnType<typeof vi.fn>;
  selectWithAbort: ReturnType<typeof vi.fn>;
  selectProvidersWithAbort: ReturnType<typeof vi.fn>;
  loadSyncConfig: ReturnType<typeof vi.fn>;
  saveSyncConfig: ReturnType<typeof vi.fn>;
  adoptStray: ReturnType<typeof vi.fn>;
  applyNativeSkillDisposition: ReturnType<typeof vi.fn>;
  getHookInstallInfo: ReturnType<typeof vi.fn>;
  configureLocalHooksPath: ReturnType<typeof vi.fn>;
  installHook: ReturnType<typeof vi.fn>;
  uninstallHook: ReturnType<typeof vi.fn>;
  runGuidedSetup: ReturnType<typeof vi.fn>;
  runToolPacks: ReturnType<typeof vi.fn>;
  addLocalPaths: ReturnType<typeof vi.fn>;
  applyGitignore: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const scopeRoots = {
    project: '/tmp/workspace',
    user: options.home ?? '/tmp/home',
    ...(options.scopeRootByScope ?? {}),
  };
  const confirmResponses = [...(options.confirmResponses ?? [])];
  const selectResponses = [...(options.selectResponses ?? [])];
  const singleSelectResponses = [...(options.singleSelectResponses ?? [])];
  const providerSelectResponses = [...(options.providerSelectResponses ?? [])];
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? false);
  const selectManyWithAbort = vi.fn(
    async (
      _message: string,
      _choices: MultiSelectChoice<string>[],
      ctx: PromptContext,
    ) => {
      if (options.throwOnNonInteractiveSelectMany && !ctx.interactive) {
        throw new CliError('Selection prompt requires interactive mode.', 1);
      }
      return selectResponses.shift() ?? [];
    },
  );
  const selectWithAbort = vi.fn(async () =>
    singleSelectResponses.length > 0 ? singleSelectResponses.shift()! : 'no',
  );
  const selectProvidersWithAbort = vi.fn(async () =>
    providerSelectResponses.length > 0 ? providerSelectResponses.shift()! : [],
  );
  const resolveScopeRoot = vi.fn(
    async (scope: 'project' | 'user') => scopeRoots[scope],
  );
  const ensureCanonicalDirs = vi.fn(async () => undefined);
  const saveManifest = vi.fn(async () => undefined);
  const collectStrays = vi.fn(async () => options.strays ?? []);
  const adoptStray = vi.fn(
    async (_scopeRoot: string, _stray, manifest: Manifest) => {
      return manifest;
    },
  );
  const applyNativeSkillDisposition = vi.fn(
    async (
      _scopeRoot: string,
      _stray: InitStrayCandidate,
      manifest: Manifest,
    ) => manifest,
  );
  const getHookInstallInfo = vi.fn(async () => ({
    hookPath: '/tmp/workspace/.git/hooks/pre-commit',
    suggestedHooksPath: null,
    suggestedHookPath: null,
    ...(options.hookInstallInfo ?? {}),
  }));
  const configureLocalHooksPath = vi.fn(async () => undefined);
  const installHook = vi.fn(async () => '/tmp/workspace/.git/hooks/pre-commit');
  const uninstallHook = vi.fn(async () => undefined);
  const dirExistsFn = vi.fn(async () => options.oatDirExists ?? true);
  const runGuidedSetup = vi.fn(async () => undefined);
  const runToolPacks = vi.fn(
    async () => options.toolPacksResult ?? ['ideas', 'workflows', 'utility'],
  );
  const addLocalPathsFn = vi.fn(
    async (_root: string, paths: string[]) =>
      ({
        added: paths,
        alreadyPresent: [] as string[],
        rejected: [] as Array<{ path: string; reason: string }>,
        all: paths,
      }) as { added: string[]; all: string[] },
  );
  const applyGitignoreFn = vi.fn(async () => ({
    action: 'updated' as const,
  }));
  const saveSyncConfig = vi.fn(async (_path: string, config: SyncConfig) => {
    return config;
  });
  const loadSyncConfig = vi.fn(
    async () => options.loadedSyncConfig ?? DEFAULT_SYNC_CONFIG,
  );
  const resolveUserSyncConfig = vi.fn(
    async (): Promise<SyncConfig> => ({
      ...DEFAULT_SYNC_CONFIG,
      knownStrays: options.userKnownStrays ?? [],
    }),
  );
  const adapters =
    options.adapters ??
    ([
      {
        name: 'claude',
        displayName: 'Claude Code',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: async () => true,
      },
      {
        name: 'cursor',
        displayName: 'Cursor',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: async () => false,
      },
      {
        name: 'codex',
        displayName: 'Codex CLI',
        defaultStrategy: 'auto',
        projectMappings: [],
        userMappings: [],
        detect: async () => false,
      },
    ] satisfies ProviderAdapter[]);
  const applyOatCoreGitattributes = vi.fn(async () => ({
    action: 'no-change' as const,
    entries: [],
  }));
  const dependencyOverrides = {
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: options.home ?? '/tmp/home',
      interactive: options.interactive ?? true,
      logger: capture.logger,
    }),
    resolveScopeRoot,
    loadManifest: vi.fn(async () => createEmptyManifest()),
    saveManifest,
    scanCanonical: vi.fn(async () => createCanonicalEntries()),
    confirmAction,
    selectManyWithAbort,
    selectWithAbort,
    selectProvidersWithAbort,
    getAdapters: () => adapters,
    loadSyncConfig,
    resolveUserSyncConfig,
    saveSyncConfig,
    applyNativeSkillDisposition,
    getConfigAwareAdapters: vi.fn(async () => ({
      activeAdapters: adapters.filter((adapter) =>
        (options.configAwareActiveAdapterNames ?? ['claude']).includes(
          adapter.name,
        ),
      ),
      detectedUnset: options.configAwareActiveAdapterNames ?? ['claude'],
      detectedDisabled: [],
    })),
    ...(options.providerContextResolver
      ? { resolveProviderScopeContext: options.providerContextResolver }
      : options.providerContext
        ? {
            resolveProviderScopeContext: vi.fn(
              async () => options.providerContext!,
            ),
          }
        : {}),
    isHookInstalled: vi.fn(async () => options.hookInstalled ?? true),
    getHookInstallInfo,
    configureLocalHooksPath,
    installHook,
    uninstallHook,
    applyOatCoreGitignore: vi.fn(async () => ({
      action: 'no-change' as const,
      entries: [],
      stateDashboardIndexAction: 'not-tracked' as const,
    })),
    applyOatCoreGitattributes,
    dirExists: dirExistsFn,
    runToolPacks,
    readOatConfig: vi.fn(async () => ({ version: 1 })),
    resolveLocalPaths: vi.fn(
      () => (options.resolvedLocalPaths ?? []) as string[],
    ),
    addLocalPaths: addLocalPathsFn,
    applyGitignore: applyGitignoreFn,
    runProviderSync: vi.fn(async () => undefined),
    // Guided-setup tests must not shell out: production detectDefaultBranch
    // runs `gh repo view` with a 10s timeout, which exceeds Vitest's 5s
    // default and flakes in CI where `gh` is authenticated.
    writeOatConfig: vi.fn(async () => undefined),
    detectDefaultBranch: vi.fn(() => 'main'),
    detectExistingDocs: vi.fn(async () => null),
    fileExists: vi.fn(async () => false),
    inputWithDefault: vi.fn(async () => null),
  };

  if (!options.useDefaultGuidedSetup) {
    dependencyOverrides.runGuidedSetup = runGuidedSetup;
  }

  if (!options.useDefaultAdopt) {
    dependencyOverrides.adoptStray = adoptStray;
  }
  if (!options.useDefaultCollectStrays) {
    dependencyOverrides.collectStrays = collectStrays;
  }
  if (!options.useDefaultEnsureCanonicalDirs) {
    dependencyOverrides.ensureCanonicalDirs = ensureCanonicalDirs;
  }

  const command = createInitCommand(dependencyOverrides);

  return {
    capture,
    command,
    resolveScopeRoot,
    ensureCanonicalDirs,
    saveManifest,
    collectStrays,
    confirmAction,
    selectManyWithAbort,
    selectWithAbort,
    selectProvidersWithAbort,
    loadSyncConfig,
    saveSyncConfig,
    adoptStray,
    applyNativeSkillDisposition,
    getHookInstallInfo,
    configureLocalHooksPath,
    installHook,
    uninstallHook,
    runGuidedSetup,
    runToolPacks,
    addLocalPaths: addLocalPathsFn,
    applyGitignore: applyGitignoreFn,
    applyOatCoreGitattributes,
  };
}

async function runInitCommand(
  command: Command,
  { globalArgs = [], commandArgs = [] }: RunInitArgs = {},
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'init', ...commandArgs], {
    from: 'user',
  });
}

describe('createInitCommand', () => {
  let originalExitCode: number | undefined;
  const tempDirs: string[] = [];

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('creates canonical directories and manifest', async () => {
    const {
      command,
      ensureCanonicalDirs,
      saveManifest,
      applyOatCoreGitattributes,
    } = createHarness({ interactive: false });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(ensureCanonicalDirs).toHaveBeenCalledWith(
      '/tmp/workspace',
      'project',
    );
    expect(saveManifest).toHaveBeenCalledWith(
      '/tmp/workspace/.oat/sync/manifest.json',
      expect.any(Object),
    );
    expect(applyOatCoreGitattributes).toHaveBeenCalledWith('/tmp/workspace');
  });

  it('bare oat init still works (regression)', async () => {
    const { command, ensureCanonicalDirs } = createHarness({
      interactive: false,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(ensureCanonicalDirs).toHaveBeenCalledWith(
      '/tmp/workspace',
      'project',
    );
    expect(process.exitCode).toBe(0);
  });

  it('oat init tools is a registered subcommand', () => {
    const { command } = createHarness({ interactive: false });
    expect(command.commands.map((subcommand) => subcommand.name())).toContain(
      'tools',
    );
  });

  it('prompts for supported project providers in interactive mode', async () => {
    const { command, selectProvidersWithAbort } = createHarness({
      interactive: true,
      hookInstalled: true,
      providerSelectResponses: [['claude', 'cursor']],
      loadedSyncConfig: {
        ...DEFAULT_SYNC_CONFIG,
        providers: {
          cursor: { enabled: true },
        },
      },
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectProvidersWithAbort).toHaveBeenCalledTimes(1);
    expect(selectProvidersWithAbort.mock.calls[0]?.[0]).toContain(
      'Select supported project providers',
    );
    const choices = selectProvidersWithAbort.mock.calls[0]?.[1] as Array<{
      value: string;
      checked?: boolean;
    }>;
    expect(choices.find((choice) => choice.value === 'claude')?.checked).toBe(
      true,
    );
    expect(choices.find((choice) => choice.value === 'cursor')?.checked).toBe(
      true,
    );
    expect(choices.find((choice) => choice.value === 'codex')?.checked).toBe(
      false,
    );
  });

  it('persists explicit enabled flags for all known providers after prompt', async () => {
    const { command, saveSyncConfig } = createHarness({
      interactive: true,
      hookInstalled: true,
      providerSelectResponses: [['cursor']],
      loadedSyncConfig: {
        ...DEFAULT_SYNC_CONFIG,
        providers: {
          claude: { strategy: 'copy', enabled: true },
        },
      },
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(saveSyncConfig).toHaveBeenCalledWith(
      '/tmp/workspace/.oat/sync/config.json',
      expect.objectContaining({
        providers: expect.objectContaining({
          claude: { strategy: 'copy', enabled: false },
          cursor: { enabled: true },
          codex: { enabled: false },
        }),
      }),
    );
  });

  for (const [path, response] of [
    ['cancel', null],
    ['save', ['registry-only']],
  ] as const) {
    it(`detects each provider once during interactive init ${path}`, async () => {
      const adapter = createProviderAdapter('registry-only');
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
        hookInstalled: true,
        adapters: [adapter],
        providerContextResolver,
        providerSelectResponses: [response],
      });

      await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

      expect(providerContextResolver).toHaveBeenCalledTimes(1);
      expect(detect).toHaveBeenCalledTimes(1);
    });
  }

  it('non-interactive mode does not mutate provider config and shows guidance', async () => {
    const { command, capture, selectProvidersWithAbort, saveSyncConfig } =
      createHarness({
        interactive: false,
        hookInstalled: true,
      });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectProvidersWithAbort).not.toHaveBeenCalled();
    expect(saveSyncConfig).not.toHaveBeenCalled();
    expect(capture.info).toContain(PROVIDER_CONFIG_REMEDIATION);
  });

  it('scope all applies provider config prompt only for project scope', async () => {
    const {
      command,
      selectProvidersWithAbort,
      saveSyncConfig,
      ensureCanonicalDirs,
    } = createHarness({
      interactive: true,
      hookInstalled: true,
      providerSelectResponses: [['claude']],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'all'] });

    expect(selectProvidersWithAbort).toHaveBeenCalledTimes(1);
    expect(saveSyncConfig).toHaveBeenCalledTimes(1);
    expect(saveSyncConfig.mock.calls[0]?.[0]).toBe(
      '/tmp/workspace/.oat/sync/config.json',
    );
    expect(ensureCanonicalDirs).toHaveBeenCalledWith(
      '/tmp/workspace',
      'project',
    );
    expect(ensureCanonicalDirs).toHaveBeenCalledWith('/tmp/home', 'user');
  });

  it('uses config-aware active adapters for project stray scanning', async () => {
    const { command, collectStrays } = createHarness({
      interactive: false,
      hookInstalled: true,
      adapters: [
        {
          name: 'claude',
          displayName: 'Claude Code',
          defaultStrategy: 'symlink',
          projectMappings: [],
          userMappings: [],
          detect: async () => true,
        },
        {
          name: 'cursor',
          displayName: 'Cursor',
          defaultStrategy: 'symlink',
          projectMappings: [],
          userMappings: [],
          detect: async () => true,
        },
      ],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(collectStrays).toHaveBeenCalledTimes(1);
    const activeAdapters = collectStrays.mock
      .calls[0]?.[4] as ProviderAdapter[];
    expect(activeAdapters.map((adapter) => adapter.name)).toEqual(['claude']);
  });

  it('uses a registry-only provider context for project stray scanning', async () => {
    const adapter: ProviderAdapter = {
      name: 'registry-only',
      displayName: 'Registry Only',
      defaultStrategy: 'symlink',
      projectMappings: [],
      userMappings: [],
      detect: async () => true,
    };
    const { command, collectStrays } = createHarness({
      interactive: false,
      hookInstalled: true,
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

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    const activeAdapters = collectStrays.mock
      .calls[0]?.[4] as ProviderAdapter[];
    expect(activeAdapters.map(({ name }) => name)).toEqual(['registry-only']);
  });

  it('detects strays and prompts for adoption in interactive mode', async () => {
    const { command, selectManyWithAbort, confirmAction } = createHarness({
      interactive: true,
      strays: [createStray()],
      hookInstalled: true,
      selectResponses: [[]],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(confirmAction).not.toHaveBeenCalled();
    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(selectManyWithAbort.mock.calls[0]?.[0]).toContain(
      'Select stray entries to adopt',
    );
  });

  it('does not offer project-level known strays for adoption', async () => {
    const { command, selectManyWithAbort, adoptStray } = createHarness({
      interactive: true,
      strays: [createStray('.cursor/skills/cloud-environment-setup', 'cursor')],
      hookInstalled: true,
      loadedSyncConfig: {
        ...DEFAULT_SYNC_CONFIG,
        knownStrays: ['.cursor/skills/cloud-environment-setup'],
      },
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(adoptStray).not.toHaveBeenCalled();
  });

  it('prompts only for unknown strays when known and unknown strays are mixed', async () => {
    const { command, selectManyWithAbort, adoptStray } = createHarness({
      interactive: true,
      strays: [
        createStray('.cursor/skills/cloud-environment-setup', 'cursor'),
        createStray('.cursor/skills/actionable', 'cursor'),
      ],
      hookInstalled: true,
      loadedSyncConfig: {
        ...DEFAULT_SYNC_CONFIG,
        knownStrays: ['.cursor/skills/cloud-environment-setup'],
      },
      selectResponses: [['0']],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      description?: string;
    }>;
    expect(choices).toHaveLength(1);
    expect(choices[0]?.label).toContain('actionable');
    expect(choices[0]?.description).toContain('.cursor/skills/actionable');
    expect(adoptStray).toHaveBeenCalledTimes(1);
    expect(adoptStray.mock.calls[0]?.[1].report.providerPath).toBe(
      '.cursor/skills/actionable',
    );
  });

  it('does not offer user-level known strays for adoption', async () => {
    const { command, selectManyWithAbort, adoptStray } = createHarness({
      interactive: true,
      strays: [createStray('.cursor/skills/cloud-environment-setup', 'cursor')],
      hookInstalled: true,
      userKnownStrays: ['.cursor/skills/cloud-environment-setup'],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(adoptStray).not.toHaveBeenCalled();
  });

  it('discovers Cursor-local skills through native-read adoption sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-cursor-stray-'));
    tempDirs.push(root);
    await mkdir(join(root, '.cursor', 'skills', 'cursor-local'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.cursor', 'skills', 'cursor-local', 'SKILL.md'),
      '# Cursor local\n',
      'utf8',
    );
    const skillMapping = {
      contentType: 'skill' as const,
      canonicalDir: '.agents/skills',
      providerDir: '.agents/skills',
      nativeRead: true,
      adoptionSourceDirs: ['.cursor/skills'],
    };
    const cursorOnlyAdapter: ProviderAdapter = {
      name: 'cursor',
      displayName: 'Cursor',
      defaultStrategy: 'symlink',
      projectMappings: [skillMapping],
      userMappings: [skillMapping],
      detect: async () => true,
    };
    const { command, selectWithAbort } = createHarness({
      interactive: true,
      scopeRootByScope: { project: root },
      useDefaultCollectStrays: true,
      adapters: [cursorOnlyAdapter],
      configAwareActiveAdapterNames: ['cursor'],
      providerSelectResponses: [['cursor']],
      hookInstalled: true,
      singleSelectResponses: [null],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    const choices = selectWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      description?: string;
    }>;
    expect(choices).toEqual([
      expect.objectContaining({
        label: 'Adopt into canonical',
        value: 'adopt',
      }),
      expect.objectContaining({
        label: 'Keep Cursor-only',
        value: 'keep',
      }),
    ]);
    expect(selectWithAbort.mock.calls[0]?.[0]).toContain(
      '.cursor/skills/cursor-local',
    );
  });

  it('prompts for each Cursor skill with only adopt and keep choices', async () => {
    const {
      command,
      selectWithAbort,
      selectManyWithAbort,
      applyNativeSkillDisposition,
    } = createHarness({
      interactive: true,
      hookInstalled: true,
      strays: [
        createCursorSkillStray('.cursor/skills/adopt-me'),
        createCursorSkillStray('.cursor/skills/keep-me'),
      ],
      singleSelectResponses: ['adopt', 'keep'],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(
      selectWithAbort.mock.calls.filter(([message]) =>
        String(message).startsWith('Migrate Cursor skill'),
      ),
    ).toHaveLength(2);
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
    'offers explicit Copilot adoption or keep-local at $scope scope',
    async ({ scope, providerPath, syncConfigPath }) => {
      const {
        command,
        selectWithAbort,
        selectManyWithAbort,
        applyNativeSkillDisposition,
      } = createHarness({
        interactive: true,
        hookInstalled: true,
        strays: [createCopilotSkillStray(providerPath)],
        singleSelectResponses: ['keep'],
      });

      await runInitCommand(command, { globalArgs: ['--scope', scope] });

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

  it('continues later scope setup but stops migration prompts on abort', async () => {
    const {
      command,
      selectWithAbort,
      selectManyWithAbort,
      applyNativeSkillDisposition,
      ensureCanonicalDirs,
      saveManifest,
    } = createHarness({
      interactive: true,
      hookInstalled: true,
      strays: [
        createCursorSkillStray('.cursor/skills/answered'),
        createCursorSkillStray('.cursor/skills/aborted'),
        createCursorSkillStray('.cursor/skills/unanswered'),
        createStray('.claude/skills/ordinary'),
      ],
      singleSelectResponses: ['keep', null],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'all'] });

    expect(
      selectWithAbort.mock.calls.filter(([message]) =>
        String(message).startsWith('Migrate Cursor skill'),
      ),
    ).toHaveLength(2);
    expect(applyNativeSkillDisposition).toHaveBeenCalledTimes(1);
    expect(
      applyNativeSkillDisposition.mock.calls[0]?.[1].report.providerPath,
    ).toBe('.cursor/skills/answered');
    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(ensureCanonicalDirs).toHaveBeenCalledWith('/tmp/home', 'user');
    expect(saveManifest).toHaveBeenCalledWith(
      '/tmp/home/.oat/sync/manifest.json',
      expect.any(Object),
    );
  });

  it('writes Cursor dispositions to each scope sync config', async () => {
    const { command, applyNativeSkillDisposition } = createHarness({
      interactive: true,
      hookInstalled: true,
      strays: [createCursorSkillStray()],
      singleSelectResponses: ['keep', 'keep'],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'all'] });

    expect(
      applyNativeSkillDisposition.mock.calls.map((call) => call[4]),
    ).toEqual([
      '/tmp/workspace/.oat/sync/config.json',
      '/tmp/home/.oat/sync/config.json',
    ]);
  });

  it('reports keep-local name collisions without recording the choice', async () => {
    const { command, capture, applyNativeSkillDisposition } = createHarness({
      interactive: true,
      hookInstalled: true,
      strays: [createCursorSkillStray()],
      singleSelectResponses: ['keep'],
    });
    applyNativeSkillDisposition.mockRejectedValueOnce(
      new CliError(
        'Cannot keep .cursor/skills/cursor-local Cursor-only because canonical skill .agents/skills/cursor-local has the same name. Rename one skill, then run the command again.',
      ),
    );

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(capture.warn.join('\n')).toContain('Rename one skill');
    expect(applyNativeSkillDisposition).toHaveBeenCalledTimes(1);
  });

  it('warns and continues when a native skill adoption source is unavailable', async () => {
    const { command, capture, confirmAction, applyNativeSkillDisposition } =
      createHarness({
        interactive: true,
        hookInstalled: true,
        strays: [
          createCopilotSkillStray('.github/skills/broken'),
          createCopilotSkillStray('.github/skills/keep-me'),
        ],
        singleSelectResponses: ['adopt', 'keep'],
      });
    applyNativeSkillDisposition.mockRejectedValueOnce(
      new AdoptionSourceUnavailableError(
        'Cannot adopt .github/skills/broken: the path is missing or a broken symlink.',
      ),
    );

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(capture.warn.join('\n')).toContain('broken symlink');
    expect(confirmAction).not.toHaveBeenCalled();
    expect(applyNativeSkillDisposition).toHaveBeenCalledTimes(2);
  });

  it('reports unresolved Cursor skills without prompting in non-interactive mode', async () => {
    const { command, capture, selectWithAbort, applyNativeSkillDisposition } =
      createHarness({
        interactive: false,
        hookInstalled: true,
        strays: [createCursorSkillStray()],
      });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(capture.warn).toContain(ADOPT_REMEDIATION);
    expect(selectWithAbort).not.toHaveBeenCalled();
    expect(applyNativeSkillDisposition).not.toHaveBeenCalled();
  });

  it('detects codex role strays via default collector and includes codex adoption metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-codex-stray-'));
    tempDirs.push(root);

    const codexConfigPath = join(root, '.codex', 'config.toml');
    const codexRolePath = join(root, '.codex', 'agents', 'reviewer.toml');
    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      codexConfigPath,
      `[agents.reviewer]
description = "Reviewer"
config_file = "agents/reviewer.toml"
`,
      'utf8',
    );
    await writeFile(
      codexRolePath,
      'developer_instructions = "Review code for defects."\n',
      'utf8',
    );

    const codexOnlyAdapter: ProviderAdapter = {
      name: 'codex',
      displayName: 'Codex CLI',
      defaultStrategy: 'auto',
      projectMappings: [],
      userMappings: [],
      detect: async () => true,
    };

    const { command, selectManyWithAbort, adoptStray } = createHarness({
      interactive: true,
      scopeRootByScope: { project: root },
      useDefaultCollectStrays: true,
      adapters: [codexOnlyAdapter],
      configAwareActiveAdapterNames: ['codex'],
      hookInstalled: true,
      selectResponses: [['0']],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      description?: string;
    }>;
    expect(choices[0]?.label).toContain('(codex)');
    expect(choices[0]?.description).toContain('.codex/agents/reviewer.toml');

    expect(adoptStray).toHaveBeenCalledTimes(1);
    const adoptedCandidate = adoptStray.mock
      .calls[0]?.[1] as InitStrayCandidate;
    expect(adoptedCandidate.provider).toBe('codex');
    expect(adoptedCandidate.adoption).toMatchObject({
      kind: 'codex_role',
      roleName: 'reviewer',
      description: 'Reviewer',
    });
  });

  it('does not offer managed Codex materialized roles as adoptable strays', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-managed-variants-'));
    tempDirs.push(root);

    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        workflow: {
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'xhigh',
                  },
                ],
              },
            },
          },
        },
      }),
      'utf8',
    );

    // Write minimal canonical agent files so computeCodexProjectExtensionPlan
    // can derive generated matrix-backed roles.
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'oat-phase-implementer.md'),
      [
        '---',
        'name: oat-phase-implementer',
        'description: Implements a single plan phase.',
        '---',
        '',
        '## Role',
        '',
        'Implementer body.',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(root, '.agents', 'agents', 'oat-reviewer.md'),
      [
        '---',
        'name: oat-reviewer',
        'description: Reviews a completed OAT phase.',
        '---',
        '',
        '## Role',
        '',
        'Reviewer body.',
      ].join('\n'),
      'utf8',
    );

    // Write the generated materialized .toml files (simulating a prior sync).
    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    for (const [roleName, body] of [
      ['oat-phase-implementer-gpt-5-6-terra-xhigh', 'Implementer body.'],
      ['oat-reviewer-gpt-5-6-terra-xhigh', 'Reviewer body.'],
    ] as const) {
      await writeFile(
        join(root, '.codex', 'agents', `${roleName}.toml`),
        [
          '# oat-managed: true',
          `# oat-role: ${roleName}`,
          'model = "gpt-5.6-terra"',
          'model_reasoning_effort = "xhigh"',
          `developer_instructions = "${body}"`,
        ].join('\n'),
        'utf8',
      );
    }

    // Write a genuine orphan that should still be flagged as stray.
    await writeFile(
      join(root, '.codex', 'agents', 'old-orphan.toml'),
      'developer_instructions = "leftover"\n',
      'utf8',
    );

    const codexOnlyAdapter: ProviderAdapter = {
      name: 'codex',
      displayName: 'Codex CLI',
      defaultStrategy: 'auto',
      projectMappings: [],
      userMappings: [],
      detect: async () => true,
    };

    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 'oat-phase-implementer.md',
        type: 'agent',
        canonicalPath: join(
          root,
          '.agents',
          'agents',
          'oat-phase-implementer.md',
        ),
        isFile: true,
      },
      {
        name: 'oat-reviewer.md',
        type: 'agent',
        canonicalPath: join(root, '.agents', 'agents', 'oat-reviewer.md'),
        isFile: true,
      },
    ];

    const selectManyWithAbort = vi.fn(async () => [] as string[]);
    const capture = createLoggerCapture();

    // Build a command with useDefaultCollectStrays and scanCanonical returning
    // the canonical entry so computeCodexProjectExtensionPlan discovers the
    // materialized roles as managed, preventing them from appearing as strays.
    const testCommand = createInitCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as Scope,
        dryRun: false,
        verbose: globalOptions.verbose ?? false,
        json: globalOptions.json ?? false,
        cwd: globalOptions.cwd ?? root,
        home: '/tmp/home',
        interactive: true,
        logger: capture.logger,
      }),
      resolveScopeRoot: vi.fn(async (scope: 'project' | 'user') =>
        scope === 'project' ? root : '/tmp/home',
      ),
      ensureCanonicalDirs: vi.fn(async () => undefined),
      loadManifest: vi.fn(async () => createEmptyManifest()),
      saveManifest: vi.fn(async () => undefined),
      scanCanonical: vi.fn(async () => canonicalEntries),
      getAdapters: () => [codexOnlyAdapter],
      loadSyncConfig: vi.fn(async () => DEFAULT_SYNC_CONFIG),
      saveSyncConfig: vi.fn(
        async (_path: string, config: SyncConfig) => config,
      ),
      getConfigAwareAdapters: vi.fn(async () => ({
        activeAdapters: [codexOnlyAdapter],
        detectedUnset: ['codex'],
        detectedDisabled: [],
      })),
      isHookInstalled: vi.fn(async () => true),
      getHookInstallInfo: vi.fn(async () => ({
        hookPath: `${root}/.git/hooks/pre-commit`,
        suggestedHooksPath: null,
        suggestedHookPath: null,
      })),
      configureLocalHooksPath: vi.fn(async () => undefined),
      installHook: vi.fn(async () => `${root}/.git/hooks/pre-commit`),
      uninstallHook: vi.fn(async () => undefined),
      applyOatCoreGitignore: vi.fn(async () => ({
        action: 'no-change' as const,
        entries: [],
        stateDashboardIndexAction: 'not-tracked' as const,
      })),
      applyOatCoreGitattributes: vi.fn(async () => ({
        action: 'no-change' as const,
        entries: [],
      })),
      dirExists: vi.fn(async () => true),
      confirmAction: vi.fn(async () => false),
      selectProvidersWithAbort: vi.fn(async () => null),
      selectManyWithAbort,
      adoptStray: vi.fn(
        async (_scopeRoot, _stray, manifest: Manifest) => manifest,
      ),
      readOatConfig: vi.fn(async () => ({ version: 1 })),
      resolveLocalPaths: vi.fn(() => [] as string[]),
      addLocalPaths: vi.fn(async (_r: string, paths: string[]) => ({
        added: paths,
        all: paths,
      })),
      applyGitignore: vi.fn(async () => ({ action: 'no-change' as const })),
      detectDefaultBranch: vi.fn(() => 'main'),
      detectExistingDocs: vi.fn(async () => null),
      fileExists: vi.fn(async () => false),
      inputWithDefault: vi.fn(async () => null),
      selectWithAbort: vi.fn(async () => null),
      runGuidedSetup: vi.fn(async () => undefined),
      runToolPacks: vi.fn(async () => []),
      runProviderSync: vi.fn(async () => undefined),
    });

    await runInitCommand(testCommand, { globalArgs: ['--scope', 'project'] });

    // Only the genuine orphan should appear in the adoption prompt;
    // the generated materialized roles must NOT appear.
    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      description?: string;
    }>;
    const choiceDescriptions = choices.map((c) => c.description ?? '');
    expect(choiceDescriptions.some((d) => d.includes('old-orphan'))).toBe(true);
    expect(
      choiceDescriptions.some((d) =>
        d.includes('oat-phase-implementer-gpt-5-6-terra-xhigh'),
      ),
    ).toBe(false);
    expect(
      choiceDescriptions.some((d) =>
        d.includes('oat-reviewer-gpt-5-6-terra-xhigh'),
      ),
    ).toBe(false);
  });

  it.each(['user', 'all'] as const)(
    'excludes user-owned materialized roles from %s-scope adoption while retaining unmanaged roles',
    async (scope) => {
      const home = await mkdtemp(join(tmpdir(), 'oat-init-user-variants-'));
      tempDirs.push(home);

      await mkdir(join(home, '.oat'), { recursive: true });
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
                      model: 'gpt-5.6-terra',
                      effort: 'xhigh',
                    },
                  ],
                },
                cursor: {
                  high: ['gpt-5.6-sol-high'],
                },
              },
            },
          },
        }),
        'utf8',
      );
      await mkdir(join(home, '.cursor', 'agents'), { recursive: true });
      await writeFile(
        join(
          home,
          '.cursor',
          'agents',
          'oat-phase-implementer-gpt-5-6-sol-high.md',
        ),
        [
          '---',
          '# oat-managed: true',
          '# oat-role: oat-phase-implementer-gpt-5-6-sol-high',
          '# oat-owner: user-config',
          'name: oat-phase-implementer-gpt-5-6-sol-high',
          'description: managed Cursor role',
          'model: gpt-5.6-sol[reasoning=high]',
          '---',
          '',
        ].join('\n'),
        'utf8',
      );
      await writeFile(
        join(home, '.cursor', 'agents', 'cursor-unmanaged.md'),
        '# unmanaged Cursor role\n',
        'utf8',
      );
      await mkdir(join(home, '.codex', 'agents'), { recursive: true });
      await writeFile(
        join(
          home,
          '.codex',
          'agents',
          'oat-phase-implementer-gpt-5-6-terra-xhigh.toml',
        ),
        'developer_instructions = "managed Codex role"\n',
        'utf8',
      );
      await writeFile(
        join(home, '.codex', 'agents', 'codex-unmanaged.toml'),
        'developer_instructions = "unmanaged Codex role"\n',
        'utf8',
      );

      const { command, selectManyWithAbort } = createHarness({
        interactive: true,
        home,
        scopeRootByScope: { user: home },
        useDefaultCollectStrays: true,
        adapters: [cursorAdapter, codexAdapter],
        configAwareActiveAdapterNames: ['cursor', 'codex'],
        hookInstalled: true,
        selectResponses: [[]],
      });

      await runInitCommand(command, { globalArgs: ['--scope', scope] });

      const descriptions = selectManyWithAbort.mock.calls.flatMap((call) =>
        (call[1] as Array<{ description?: string }>).map(
          (choice) => choice.description ?? '',
        ),
      );
      expect(descriptions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('cursor-unmanaged.md'),
          expect.stringContaining('codex-unmanaged.toml'),
        ]),
      );
      expect(
        descriptions.some((description) =>
          description.includes('oat-phase-implementer-gpt-5-6-sol-high.md'),
        ),
      ).toBe(false);
      expect(
        descriptions.some((description) =>
          description.includes(
            'oat-phase-implementer-gpt-5-6-terra-xhigh.toml',
          ),
        ),
      ).toBe(false);
    },
  );

  it('supports skip-all by leaving checklist empty', async () => {
    const { command, selectManyWithAbort, adoptStray } = createHarness({
      interactive: true,
      strays: [
        createStray('.claude/skills/one'),
        createStray('.claude/skills/two'),
        createStray('.claude/skills/three'),
      ],
      hookInstalled: true,
      selectResponses: [[]],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectManyWithAbort).toHaveBeenCalledTimes(1);
    expect(adoptStray).not.toHaveBeenCalled();
  });

  it('on adoption conflict, keeps canonical when replacement is declined', async () => {
    const { command, adoptStray, confirmAction, capture } = createHarness({
      interactive: true,
      strays: [createStray()],
      hookInstalled: true,
      selectResponses: [['0']],
      confirmResponses: [false],
    });
    adoptStray.mockRejectedValueOnce(
      new CliError(
        'Cannot adopt .claude/skills/stray-skill because canonical file already exists.',
      ),
    );

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(adoptStray).toHaveBeenCalledTimes(1);
    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(capture.warn).toContain(
      'Skipped conflicting stray entry [project]: .claude/skills/stray-skill',
    );
  });

  it('on adoption conflict, retries with replaceCanonical when confirmed', async () => {
    const { command, adoptStray, confirmAction } = createHarness({
      interactive: true,
      strays: [createStray()],
      hookInstalled: true,
      selectResponses: [['0']],
      confirmResponses: [true],
    });
    adoptStray
      .mockRejectedValueOnce(
        new CliError(
          'Cannot adopt .claude/skills/stray-skill because canonical file already exists.',
        ),
      )
      .mockResolvedValueOnce(createEmptyManifest());

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(adoptStray).toHaveBeenCalledTimes(2);
    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(adoptStray.mock.calls[1]?.[3]).toEqual({ replaceCanonical: true });
  });

  it('skips adoption in non-interactive mode with guidance text', async () => {
    const { command, capture, selectManyWithAbort } = createHarness({
      interactive: false,
      strays: [createStray()],
      hookInstalled: true,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(selectManyWithAbort).not.toHaveBeenCalled();
    expect(capture.warn).toContain(ADOPT_REMEDIATION);
  });

  it('outputs json summary when --json is set', async () => {
    const { command, capture } = createHarness({
      interactive: false,
      strays: [createStray()],
      hookInstalled: true,
    });

    await runInitCommand(command, {
      globalArgs: ['--scope', 'project', '--json'],
    });

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      scope: 'project',
      directoriesCreated: 1,
      straysFound: 1,
      straysAdopted: 0,
      hookInstalled: true,
      scopes: [
        {
          scope: 'project',
          straysFound: 1,
          straysAdopted: 0,
        },
      ],
    });
  });

  it('adoption moves provider content into .agents and links provider path back', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-command-'));
    tempDirs.push(root);

    const providerPath = join(root, '.claude', 'skills', 'stray-skill');
    await mkdir(providerPath, { recursive: true });
    await writeFile(join(providerPath, 'SKILL.md'), 'stray content', 'utf8');

    const { command } = createHarness({
      interactive: true,
      useDefaultAdopt: true,
      scopeRootByScope: { project: root },
      strays: [createStray('.claude/skills/stray-skill')],
      hookInstalled: true,
      selectResponses: [['0']],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    const canonicalPath = join(root, '.agents', 'skills', 'stray-skill');
    const providerStat = await lstat(providerPath);
    const canonicalStat = await lstat(canonicalPath);

    expect(providerStat.isSymbolicLink()).toBe(true);
    expect(canonicalStat.isDirectory()).toBe(true);
  });

  it('adopts same-name strays from multiple providers without ENOTEMPTY collisions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-command-'));
    tempDirs.push(root);

    const skillName = 'work-chronicler-detect-projects';
    const claudeProviderPath = join(root, '.claude', 'skills', skillName);
    const cursorProviderPath = join(root, '.cursor', 'skills', skillName);
    await mkdir(claudeProviderPath, { recursive: true });
    await mkdir(cursorProviderPath, { recursive: true });
    await writeFile(
      join(claudeProviderPath, 'SKILL.md'),
      'shared stray content',
      'utf8',
    );
    await writeFile(
      join(cursorProviderPath, 'SKILL.md'),
      'shared stray content',
      'utf8',
    );

    const { command } = createHarness({
      interactive: true,
      useDefaultAdopt: true,
      scopeRootByScope: { project: root },
      strays: [
        createStray(`.claude/skills/${skillName}`, 'claude', '.claude/skills'),
        createStray(`.cursor/skills/${skillName}`, 'cursor', '.cursor/skills'),
      ],
      hookInstalled: true,
      selectResponses: [['0', '1']],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    const canonicalPath = join(root, '.agents', 'skills', skillName);
    const claudeStat = await lstat(claudeProviderPath);
    const cursorStat = await lstat(cursorProviderPath);
    const canonicalStat = await lstat(canonicalPath);

    expect(canonicalStat.isDirectory()).toBe(true);
    expect(claudeStat.isSymbolicLink()).toBe(true);
    expect(cursorStat.isSymbolicLink()).toBe(true);
  });

  it('creates canonical rules directory for project scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-command-'));
    tempDirs.push(root);

    const { command } = createHarness({
      interactive: false,
      hookInstalled: true,
      scopeRootByScope: { project: root },
      useDefaultEnsureCanonicalDirs: true,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect((await lstat(join(root, '.agents', 'skills'))).isDirectory()).toBe(
      true,
    );
    expect((await lstat(join(root, '.agents', 'agents'))).isDirectory()).toBe(
      true,
    );
    expect((await lstat(join(root, '.agents', 'rules'))).isDirectory()).toBe(
      true,
    );
  });

  it('is idempotent when re-run on an initialized scope', async () => {
    const { command, adoptStray } = createHarness({
      interactive: false,
      strays: [],
      hookInstalled: true,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });
    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(adoptStray).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('supports --scope flag', async () => {
    const { command, resolveScopeRoot } = createHarness({
      interactive: false,
      hookInstalled: true,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'user'] });

    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ scope: 'user' }),
    );
  });

  it('shows [user] and ~/.claude path for user-scope strays', async () => {
    const { command, selectManyWithAbort } = createHarness({
      interactive: true,
      strays: [createStray('.claude/skills/user-stray')],
      hookInstalled: true,
      selectResponses: [[]],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'user'] });

    const choices = selectManyWithAbort.mock.calls[0]?.[1] as Array<{
      label: string;
      value: string;
      description?: string;
    }>;
    expect(choices[0]?.label).toContain('[user] user-stray (claude)');
    expect(choices[0]?.description).toContain('~/.claude/skills/user-stray');
  });

  it('prompts for git hook consent in interactive mode', async () => {
    const { command, confirmAction } = createHarness({
      interactive: true,
      hookInstalled: false,
      confirmResponses: [true],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(confirmAction.mock.calls[0]?.[0]).toContain(
      'Install optional pre-commit hook',
    );
  });

  it('installs hook when user consents', async () => {
    const { command, installHook, capture } = createHarness({
      interactive: true,
      hookInstalled: false,
      confirmResponses: [true],
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(installHook).toHaveBeenCalledWith('/tmp/workspace');
    expect(capture.success).toContain(
      'Installed optional pre-commit hook at /tmp/workspace/.git/hooks/pre-commit.',
    );
  });

  it('warns when repo-managed .githooks exists without core.hooksPath', async () => {
    const { command, capture, confirmAction, configureLocalHooksPath } =
      createHarness({
        interactive: true,
        hookInstalled: false,
        confirmResponses: [true, false],
        hookInstallInfo: {
          hookPath: '/tmp/workspace/.git/hooks/pre-commit',
          suggestedHooksPath: '.githooks',
          suggestedHookPath: '/tmp/workspace/.githooks/pre-commit',
        },
      });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(capture.warn).toContain(
      'Detected existing repo hook file at /tmp/workspace/.githooks/pre-commit, but Git is not configured to use .githooks. OAT will install into /tmp/workspace/.git/hooks/pre-commit unless you configure Git first.',
    );
    expect(confirmAction.mock.calls[1]?.[0]).toContain(
      'Configure Git hooks to use .githooks before installing the OAT hook?',
    );
    expect(configureLocalHooksPath).not.toHaveBeenCalled();
  });

  it('can configure .githooks before installing the hook', async () => {
    const { command, configureLocalHooksPath, installHook, capture } =
      createHarness({
        interactive: true,
        hookInstalled: false,
        confirmResponses: [true, true],
        hookInstallInfo: {
          hookPath: '/tmp/workspace/.git/hooks/pre-commit',
          suggestedHooksPath: '.githooks',
          suggestedHookPath: '/tmp/workspace/.githooks/pre-commit',
        },
      });
    installHook.mockResolvedValue('/tmp/workspace/.githooks/pre-commit');

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(configureLocalHooksPath).toHaveBeenCalledWith(
      '/tmp/workspace',
      '.githooks',
    );
    expect(capture.success).toContain(
      'Installed optional pre-commit hook at /tmp/workspace/.githooks/pre-commit.',
    );
  });

  it('installs executable hook script with shebang when creating a new hook file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-hook-'));
    tempDirs.push(root);

    const capture = createLoggerCapture();
    const command = createInitCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as Scope,
        dryRun: false,
        verbose: false,
        json: false,
        cwd: root,
        home: '/tmp/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveScopeRoot: vi.fn(async () => root),
      ensureCanonicalDirs: vi.fn(async () => undefined),
      loadManifest: vi.fn(async () => createEmptyManifest()),
      saveManifest: vi.fn(async () => undefined),
      scanCanonical: vi.fn(async () => []),
      collectStrays: vi.fn(async () => []),
      confirmAction: vi.fn(async () => false),
      adoptStray: vi.fn(async (_scopeRoot, _stray, manifest) => manifest),
    });

    await runInitCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--hook'],
    });

    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    const hookContents = await readFile(hookPath, 'utf8');
    const hookStat = await lstat(hookPath);

    expect(hookContents.startsWith('#!/bin/sh\n')).toBe(true);
    expect(hookContents).toContain('oat pre-commit hook');
    expect(hookStat.mode & 0o111).not.toBe(0);
  });

  it('installs hook snippet with non-blocking drift remediation warning', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-hook-warning-'));
    tempDirs.push(root);

    const capture = createLoggerCapture();
    const command = createInitCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as Scope,
        dryRun: false,
        verbose: false,
        json: false,
        cwd: root,
        home: '/tmp/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveScopeRoot: vi.fn(async () => root),
      ensureCanonicalDirs: vi.fn(async () => undefined),
      loadManifest: vi.fn(async () => createEmptyManifest()),
      saveManifest: vi.fn(async () => undefined),
      scanCanonical: vi.fn(async () => []),
      collectStrays: vi.fn(async () => []),
      confirmAction: vi.fn(async () => false),
      adoptStray: vi.fn(async (_scopeRoot, _stray, manifest) => manifest),
    });

    await runInitCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--hook'],
    });

    const hookPath = join(root, '.git', 'hooks', 'pre-commit');
    const hookContents = await readFile(hookPath, 'utf8');

    expect(hookContents).toContain('oat status --scope project --hook');
    // Non-blocking: never aborts the commit on a non-zero status exit.
    expect(hookContents).toContain('|| true');
  });

  it('installs hook when .git/hooks is a symlinked directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-init-hook-symlink-'));
    tempDirs.push(root);
    await mkdir(join(root, '.git'), { recursive: true });
    const hooksTarget = join(root, 'hooks-target');
    await mkdir(hooksTarget, { recursive: true });
    await symlink(hooksTarget, join(root, '.git', 'hooks'));

    const capture = createLoggerCapture();
    const command = createInitCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as Scope,
        dryRun: false,
        verbose: false,
        json: false,
        cwd: root,
        home: '/tmp/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveScopeRoot: vi.fn(async () => root),
      ensureCanonicalDirs: vi.fn(async () => undefined),
      loadManifest: vi.fn(async () => createEmptyManifest()),
      saveManifest: vi.fn(async () => undefined),
      scanCanonical: vi.fn(async () => []),
      collectStrays: vi.fn(async () => []),
      confirmAction: vi.fn(async () => false),
      adoptStray: vi.fn(async (_scopeRoot, _stray, manifest) => manifest),
    });

    await runInitCommand(command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--hook'],
    });

    const hookContents = await readFile(
      join(hooksTarget, 'pre-commit'),
      'utf8',
    );
    expect(hookContents).toContain('oat pre-commit hook');
  });

  it('skips hook in non-interactive mode with guidance', async () => {
    const { command, capture, installHook } = createHarness({
      interactive: false,
      hookInstalled: false,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(installHook).not.toHaveBeenCalled();
    expect(capture.info).toContain(HOOK_GUIDANCE);
  });

  it('does not re-prompt for hook when already installed', async () => {
    const { command, confirmAction, installHook } = createHarness({
      interactive: true,
      hookInstalled: true,
    });

    await runInitCommand(command, { globalArgs: ['--scope', 'project'] });

    expect(confirmAction).not.toHaveBeenCalled();
    expect(installHook).not.toHaveBeenCalled();
  });

  it('respects --hook and --no-hook flags', async () => {
    const withHook = createHarness({
      interactive: false,
      hookInstalled: false,
    });
    await runInitCommand(withHook.command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--hook'],
    });
    expect(withHook.installHook).toHaveBeenCalledWith('/tmp/workspace');

    const noHook = createHarness({
      interactive: true,
      hookInstalled: true,
      confirmResponses: [true],
    });
    await runInitCommand(noHook.command, {
      globalArgs: ['--scope', 'project'],
      commandArgs: ['--no-hook'],
    });
    expect(noHook.confirmAction).not.toHaveBeenCalled();
    expect(noHook.installHook).not.toHaveBeenCalled();
    expect(noHook.uninstallHook).toHaveBeenCalledWith('/tmp/workspace');
  });

  describe('guided setup', () => {
    it('--setup flag triggers guided setup directly without prompt', async () => {
      const { command, runGuidedSetup, confirmAction } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        providerSelectResponses: [['claude']],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(runGuidedSetup).toHaveBeenCalledTimes(1);
      expect(confirmAction).not.toHaveBeenCalled();
    });

    it('fresh init prompts for guided setup when .oat/ did not exist', async () => {
      const { command, runGuidedSetup, confirmAction } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: false,
        confirmResponses: [true],
        providerSelectResponses: [['claude']],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
      });

      expect(confirmAction).toHaveBeenCalledTimes(1);
      expect(confirmAction.mock.calls[0]?.[0]).toContain('guided setup');
      expect(runGuidedSetup).toHaveBeenCalledTimes(1);
    });

    it('existing .oat/ without --setup skips guided setup', async () => {
      const { command, runGuidedSetup } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        providerSelectResponses: [['claude']],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
      });

      expect(runGuidedSetup).not.toHaveBeenCalled();
    });

    it('guided setup always calls tool packs multi-select', async () => {
      const { command, runToolPacks } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        selectResponses: [[]],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(runToolPacks).toHaveBeenCalledTimes(1);
    });

    it('propagates explicit project guidance into guided tool setup', async () => {
      const { command, runToolPacks } = createHarness({
        interactive: false,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup', '--project-guidance'],
      });

      expect(runToolPacks).toHaveBeenCalledWith(
        expect.objectContaining({ scopeSelection: 'defaults' }),
        true,
      );
    });

    it('rejects conflicting project guidance flags', async () => {
      const { command } = createHarness({ interactive: false });

      await expect(
        runInitCommand(command, {
          globalArgs: ['--scope', 'project'],
          commandArgs: [
            '--setup',
            '--project-guidance',
            '--no-project-guidance',
          ],
        }),
      ).rejects.toThrow('cannot be used together');
    });

    it('guided setup defers the per-pack scope gate to the tools flow without prompting upfront', async () => {
      const { command, runToolPacks, selectWithAbort } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        confirmResponses: [
          false, // "Do you have documentation?" — no
          false, // provider sync — skip
        ],
        selectResponses: [[]],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'all'],
        commandArgs: ['--setup'],
      });

      // The gate is no longer shown before pack selection. Guided setup hands a
      // deferred `gate` signal to the tools flow, which prompts the gate after
      // packs (and the eligible subset) are known.
      expect(selectWithAbort).not.toHaveBeenCalledWith(
        'Customize per-pack scope? (y/N)',
        expect.anything(),
        expect.anything(),
      );
      expect(runToolPacks).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'all',
          scopeSelection: 'gate',
        }),
      );
    });

    it('guided setup reports skipped when no tool packs selected', async () => {
      const { command, capture } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        toolPacksResult: [],
        selectResponses: [[]],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(
        capture.info.some(
          (msg) => msg.includes('Tool packs') && msg.includes('skipped'),
        ),
      ).toBe(true);
    });

    it('local paths multi-select is presented with default choices', async () => {
      const { command, selectManyWithAbort } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        selectResponses: [
          [
            '.oat/**/analysis',
            '.oat/**/pr',
            '.oat/**/reviews/archived',
            '.oat/ideas',
          ],
        ],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      const guidedSelectCall = selectManyWithAbort.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).includes('local path'),
      );
      expect(guidedSelectCall).toBeDefined();
      const choices = guidedSelectCall?.[1] as Array<{
        value: string;
        checked?: boolean;
      }>;
      expect(choices).toHaveLength(4);
      expect(choices.every((c) => c.checked)).toBe(true);
    });

    it('local paths exclude .oat/ideas when ideas pack is not installed', async () => {
      const { command, selectManyWithAbort } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        toolPacksResult: ['workflows', 'utility'],
        selectResponses: [['.oat/**/analysis']],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      const guidedSelectCall = selectManyWithAbort.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).includes('local path'),
      );
      expect(guidedSelectCall).toBeDefined();
      const choices = guidedSelectCall?.[1] as Array<{
        value: string;
      }>;
      expect(choices).toHaveLength(3);
      expect(choices.some((c) => c.value === '.oat/ideas')).toBe(false);
    });

    it('selected local paths are added and gitignore is updated', async () => {
      const {
        command,
        addLocalPaths: addLocalPathsMock,
        applyGitignore,
      } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        selectResponses: [['.oat/**/analysis', '.oat/**/reviews/archived']],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(addLocalPathsMock).toHaveBeenCalledWith('/tmp/workspace', [
        '.oat/**/analysis',
        '.oat/**/reviews/archived',
      ]);
      expect(applyGitignore).toHaveBeenCalledTimes(1);
    });

    it('provider sync is offered and runs when confirmed', async () => {
      const { command, capture } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        confirmResponses: [
          false, // "Do you have documentation?" — no
          true, // provider sync — yes
        ],
        selectResponses: [[]],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(capture.info.some((msg) => msg.includes('[4/5]'))).toBe(true);
      expect(capture.info.some((msg) => msg.includes('[5/5]'))).toBe(true);
    });

    it('summary output includes all configured items', async () => {
      const { command, capture } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        confirmResponses: [
          false, // "Do you have documentation?" — no
          false, // provider sync — skip
        ],
        selectResponses: [['.oat/**/analysis']],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(
        capture.info.some((msg) => msg.includes('Guided setup complete')),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) => msg.includes('Providers') && msg.includes('Claude Code'),
        ),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) => msg.includes('Tool packs') && msg.includes('installed'),
        ),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) =>
            msg.includes('Local paths') && msg.includes('1 added, 0 existing'),
        ),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) => msg.includes('Documentation') && msg.includes('skipped'),
        ),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) => msg.includes('Provider sync') && msg.includes('skipped'),
        ),
      ).toBe(true);
    });

    it('skipped steps are reflected in summary', async () => {
      const { command, capture } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        toolPacksResult: [],
        confirmResponses: [
          false, // "Do you have documentation?" — no
          false, // provider sync — skip
        ],
        selectResponses: [[]],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(
        capture.info.some((msg) => msg.includes('Guided setup complete')),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) => msg.includes('Providers') && msg.includes('Claude Code'),
        ),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) => msg.includes('Tool packs') && msg.includes('skipped'),
        ),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) => msg.includes('Local paths') && msg.includes('skipped'),
        ),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) => msg.includes('Provider sync') && msg.includes('skipped'),
        ),
      ).toBe(true);
    });

    it('user can skip local paths without adding any', async () => {
      const { command, addLocalPaths: addLocalPathsMock } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        selectResponses: [[]],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(addLocalPathsMock).not.toHaveBeenCalled();
    });

    it('summary excludes detectable-but-disabled providers', async () => {
      const { command, capture } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        adapters: [
          {
            name: 'claude',
            displayName: 'Claude Code',
            defaultStrategy: 'symlink',
            projectMappings: [],
            userMappings: [],
            detect: async () => true,
          },
          {
            name: 'cursor',
            displayName: 'Cursor',
            defaultStrategy: 'symlink',
            projectMappings: [],
            userMappings: [],
            detect: async () => true,
          },
        ],
        configAwareActiveAdapterNames: ['claude'],
        providerSelectResponses: [['claude']],
        confirmResponses: [
          false, // "Do you have documentation?" — no
          false, // provider sync — skip
        ],
        selectResponses: [[]],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(
        capture.info.some(
          (msg) => msg.includes('Providers') && msg.includes('Claude Code'),
        ),
      ).toBe(true);
      expect(
        capture.info.some(
          (msg) => msg.includes('Providers') && msg.includes('Cursor'),
        ),
      ).toBe(false);
    });

    it('existing count only reflects guided choice paths, not custom paths', async () => {
      const { command, capture } = createHarness({
        interactive: true,
        hookInstalled: true,
        oatDirExists: true,
        useDefaultGuidedSetup: true,
        providerSelectResponses: [['claude']],
        resolvedLocalPaths: [
          '.oat/**/analysis',
          'custom/path1',
          'custom/path2',
        ],
        confirmResponses: [
          false, // "Do you have documentation?" — no
          false, // provider sync — skip
        ],
        selectResponses: [['.oat/**/reviews/archived']],
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup'],
      });

      expect(
        capture.info.some(
          (msg) =>
            msg.includes('Local paths') && msg.includes('1 added, 1 existing'),
        ),
      ).toBe(true);
    });

    it('non-interactive setup skips the gate and applies per-pack defaults', async () => {
      const { command, runToolPacks, selectWithAbort } = createHarness({
        interactive: false,
        hookInstalled: true,
        oatDirExists: false,
        useDefaultGuidedSetup: true,
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'all'],
        commandArgs: ['--setup'],
      });

      expect(selectWithAbort).not.toHaveBeenCalled();
      expect(runToolPacks).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'all',
          scopeSelection: 'defaults',
        }),
      );
    });

    it('non-interactive setup does not invoke the local-path prompt', async () => {
      const {
        command,
        runToolPacks,
        selectManyWithAbort,
        addLocalPaths: addLocalPathsMock,
      } = createHarness({
        interactive: false,
        hookInstalled: true,
        oatDirExists: false,
        useDefaultGuidedSetup: true,
        throwOnNonInteractiveSelectMany: true,
      });

      await runInitCommand(command, {
        globalArgs: ['--scope', 'project'],
        commandArgs: ['--setup', '--no-hook'],
      });

      expect(runToolPacks).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'project',
          scopeSelection: 'defaults',
        }),
      );
      expect(selectManyWithAbort).not.toHaveBeenCalled();
      expect(addLocalPathsMock).not.toHaveBeenCalled();
    });
  });
});
