import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  type ApplyOatCoreResult,
  applyOatCoreGitignore,
} from '@commands/init/gitignore';
import { applyGitignore } from '@commands/local/apply';
import { addLocalPaths } from '@commands/local/manage';
import {
  adoptStrayToCanonical,
  isAdoptionConflictError,
} from '@commands/shared/adopt-stray';
import {
  detectCodexRoleStrays,
  regenerateCodexAfterAdoption,
} from '@commands/shared/codex-strays';
import { PROVIDER_CONFIG_REMEDIATION } from '@commands/shared/messages';
import {
  confirmAction,
  type MultiSelectChoice,
  type PromptContext,
  selectManyWithAbort,
} from '@commands/shared/shared.prompts';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import {
  DEFAULT_SYNC_CONFIG,
  loadSyncConfig,
  type SyncConfig,
  saveSyncConfig,
} from '@config/index';
import {
  type OatConfig,
  readOatConfig,
  resolveLocalPaths,
} from '@config/oat-config';
import { type DriftReport, detectStrays } from '@drift/index';
import {
  type CanonicalEntry,
  installHook,
  isHookInstalled,
  scanCanonical,
  uninstallHook,
} from '@engine/index';
import { dirExists } from '@fs/io';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import {
  createEmptyManifest,
  loadManifest,
  saveManifest,
} from '@manifest/manager';
import type { Manifest } from '@manifest/manifest.types';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import {
  applyCodexProjectExtensionPlan,
  computeCodexProjectExtensionPlan,
} from '@providers/codex/codec/sync-extension';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { geminiAdapter } from '@providers/gemini';
import {
  type ConfigAwareAdaptersResult,
  getActiveAdapters,
  getConfigAwareAdapters,
  getSyncMappings,
  type PathMapping,
  type ProviderAdapter,
} from '@providers/shared';
import type { ConcreteScope, Scope } from '@shared/types';
import { Command } from 'commander';

import { createInitToolsCommand, runInitToolsWithDefaults } from './tools';

const ADOPT_REMEDIATION =
  'Run "oat init" interactively to adopt stray entries.';
const HOOK_PROMPT = 'Install optional pre-commit hook for drift warnings?';
const HOOK_GUIDANCE =
  'Run "oat init --hook" to install optional pre-commit hook.';

function getDefaultAdapters(): ProviderAdapter[] {
  return [
    claudeAdapter,
    cursorAdapter,
    codexAdapter,
    copilotAdapter,
    geminiAdapter,
  ];
}

interface InitOptions extends GlobalOptions {
  hook?: boolean;
  setup?: boolean;
}

export interface InitStrayCandidate {
  provider: string;
  report: DriftReport;
  mapping: PathMapping;
  adoption?: {
    kind: 'codex_role';
    roleName: string;
    description?: string;
  };
}

interface InitDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  ensureCanonicalDirs: (
    scopeRoot: string,
    scope: ConcreteScope,
  ) => Promise<void>;
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  saveManifest: (manifestPath: string, manifest: Manifest) => Promise<void>;
  scanCanonical: (
    scopeRoot: string,
    scope: ConcreteScope,
  ) => Promise<CanonicalEntry[]>;
  collectStrays: (
    scopeRoot: string,
    scope: ConcreteScope,
    manifest: Manifest,
    canonicalEntries: CanonicalEntry[],
    activeAdapters?: ProviderAdapter[],
  ) => Promise<InitStrayCandidate[]>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
  selectManyWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  selectProvidersWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  adoptStray: (
    scopeRoot: string,
    stray: InitStrayCandidate,
    manifest: Manifest,
    options?: { replaceCanonical?: boolean },
  ) => Promise<Manifest>;
  isHookInstalled: (projectRoot: string) => Promise<boolean>;
  installHook: (projectRoot: string) => Promise<void>;
  uninstallHook: (projectRoot: string) => Promise<void>;
  getAdapters: () => ProviderAdapter[];
  loadSyncConfig: (configPath: string) => Promise<SyncConfig>;
  saveSyncConfig: (
    configPath: string,
    config: SyncConfig,
  ) => Promise<SyncConfig>;
  getConfigAwareAdapters: (
    adapters: ProviderAdapter[],
    scopeRoot: string,
    config: SyncConfig,
  ) => Promise<ConfigAwareAdaptersResult>;
  applyOatCoreGitignore: (repoRoot: string) => Promise<ApplyOatCoreResult>;
  dirExists: (dirPath: string) => Promise<boolean>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  resolveLocalPaths: (config: OatConfig) => string[];
  addLocalPaths: (
    repoRoot: string,
    paths: string[],
  ) => Promise<{ added: string[]; all: string[] }>;
  applyGitignore: (
    repoRoot: string,
    localPaths: string[],
  ) => Promise<{ action: string }>;
  runGuidedSetup: (
    context: CommandContext,
    dependencies: InitDependencies,
  ) => Promise<void>;
  runToolPacks: (context: CommandContext) => Promise<void>;
  runProviderSync: (projectRoot: string) => Promise<void>;
}

interface InitScopeSummary {
  scope: ConcreteScope;
  straysFound: number;
  straysAdopted: number;
}

interface InitJsonPayload {
  scope: Scope;
  directoriesCreated: number;
  straysFound: number;
  straysAdopted: number;
  hookInstalled: boolean | null;
  scopes: InitScopeSummary[];
}

async function ensureCanonicalDirectories(
  scopeRoot: string,
  scope: ConcreteScope,
): Promise<void> {
  await mkdir(join(scopeRoot, '.agents', 'skills'), { recursive: true });
  if (scope === 'project') {
    await mkdir(join(scopeRoot, '.agents', 'agents'), { recursive: true });
  }
}

async function collectStraysDefault(
  scopeRoot: string,
  scope: ConcreteScope,
  manifest: Manifest,
  canonicalEntries: CanonicalEntry[],
  activeAdapters?: ProviderAdapter[],
): Promise<InitStrayCandidate[]> {
  const adaptersToScan =
    activeAdapters ??
    (await getActiveAdapters(getDefaultAdapters(), scopeRoot));
  const candidates: InitStrayCandidate[] = [];

  for (const adapter of adaptersToScan) {
    const mappings = getSyncMappings(adapter, scope);
    for (const mapping of mappings) {
      const providerDir = join(scopeRoot, mapping.providerDir);
      const strays = await detectStrays(
        adapter.name,
        providerDir,
        manifest,
        canonicalEntries,
      );
      for (const report of strays) {
        if (report.state.status !== 'stray') {
          continue;
        }
        candidates.push({
          provider: adapter.name,
          report,
          mapping,
        });
      }
    }
  }

  if (
    scope === 'project' &&
    adaptersToScan.some((adapter) => adapter.name === 'codex')
  ) {
    const codexStrays = await detectCodexRoleStrays(
      scopeRoot,
      canonicalEntries,
    );
    for (const stray of codexStrays) {
      candidates.push({
        provider: 'codex',
        report: {
          canonical: null,
          provider: 'codex',
          providerPath: stray.providerPath,
          state: { status: 'stray' },
        },
        mapping: {
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.codex/agents',
          nativeRead: false,
        },
        adoption: {
          kind: 'codex_role',
          roleName: stray.roleName,
          description: stray.description,
        },
      });
    }
  }

  return candidates;
}

async function adoptStrayDefault(
  scopeRoot: string,
  stray: InitStrayCandidate,
  manifest: Manifest,
  options?: { replaceCanonical?: boolean },
): Promise<Manifest> {
  return adoptStrayToCanonical(scopeRoot, stray, manifest, options);
}

function createDependencies(): InitDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    ensureCanonicalDirs: ensureCanonicalDirectories,
    loadManifest,
    saveManifest,
    scanCanonical,
    collectStrays: collectStraysDefault,
    confirmAction,
    selectManyWithAbort,
    selectProvidersWithAbort: selectManyWithAbort,
    adoptStray: adoptStrayDefault,
    isHookInstalled,
    installHook,
    uninstallHook,
    getAdapters() {
      return getDefaultAdapters();
    },
    async loadSyncConfig(configPath) {
      return loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
    },
    saveSyncConfig,
    getConfigAwareAdapters,
    applyOatCoreGitignore,
    dirExists,
    readOatConfig,
    resolveLocalPaths,
    addLocalPaths,
    applyGitignore,
    runGuidedSetup: runGuidedSetupImpl,
    runToolPacks: runInitToolsWithDefaults,
    async runProviderSync(projectRoot: string) {
      execSync('oat sync --scope project', {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    },
  };
}

function formatPathForScope(
  scope: ConcreteScope,
  providerPath: string,
): string {
  if (scope === 'project') {
    return providerPath;
  }
  if (providerPath.startsWith('./')) {
    return `~/${providerPath.slice(2)}`;
  }
  if (providerPath.startsWith('.')) {
    return `~/${providerPath}`;
  }
  return `~/${providerPath}`;
}

function formatStrayChoiceLabel(
  scope: ConcreteScope,
  providerPath: string,
  provider: string,
): string {
  return `[${scope}] ${basename(providerPath)} (${provider})`;
}

async function maybeHandleHook(
  context: CommandContext,
  dependencies: InitDependencies,
  projectRoot: string | null,
  hookFlag: boolean | undefined,
): Promise<boolean | null> {
  if (!projectRoot) {
    return null;
  }

  const installed = await dependencies.isHookInstalled(projectRoot);

  if (hookFlag === false) {
    if (installed) {
      await dependencies.uninstallHook(projectRoot);
      context.logger.success('Removed optional pre-commit hook.');
    }
    return false;
  }

  if (installed && hookFlag === undefined) {
    return true;
  }

  let shouldInstall = false;
  if (hookFlag === true) {
    shouldInstall = true;
  } else if (context.interactive) {
    shouldInstall = await dependencies.confirmAction(HOOK_PROMPT, {
      interactive: context.interactive,
    });
  } else {
    context.logger.info(HOOK_GUIDANCE);
    return installed;
  }

  if (shouldInstall && !installed) {
    await dependencies.installHook(projectRoot);
    context.logger.success('Installed optional pre-commit hook.');
    return true;
  }

  return installed || shouldInstall;
}

const LOCAL_PATH_CHOICES: MultiSelectChoice[] = [
  {
    label: '.oat/**/analysis — Analysis artifacts',
    value: '.oat/**/analysis',
    checked: true,
  },
  {
    label: '.oat/**/pr — PR description files',
    value: '.oat/**/pr',
    checked: true,
  },
  {
    label: '.oat/**/reviews — Review artifacts',
    value: '.oat/**/reviews',
    checked: true,
  },
  {
    label: '.oat/ideas — Ideas and brainstorms',
    value: '.oat/ideas',
    checked: true,
  },
];

async function runGuidedSetupImpl(
  context: CommandContext,
  dependencies: InitDependencies,
): Promise<void> {
  const projectRoot = await dependencies.resolveScopeRoot('project', context);
  const adapters = dependencies.getAdapters();
  const configPath = join(projectRoot, '.oat', 'sync', 'config.json');
  const syncConfig = await dependencies.loadSyncConfig(configPath);
  const resolution = await dependencies.getConfigAwareAdapters(
    adapters,
    projectRoot,
    syncConfig,
  );
  const activeProviderNames = resolution.activeAdapters.map(
    (a) => a.displayName,
  );

  context.logger.info('[1/4] Tool packs…');
  const installTools = await dependencies.confirmAction(
    'Install tool packs (skills for workflows, ideas, utilities)?',
    { interactive: context.interactive },
  );
  if (installTools) {
    const guidedContext: CommandContext = { ...context, scope: 'project' };
    await dependencies.runToolPacks(guidedContext);
  }

  context.logger.info('[2/4] Local paths (gitignored artifacts)…');
  const config = await dependencies.readOatConfig(projectRoot);
  const existingPaths = new Set(dependencies.resolveLocalPaths(config));

  const choices = LOCAL_PATH_CHOICES.map((c) => ({
    ...c,
    checked: existingPaths.has(c.value) || c.checked,
  }));

  const selectedPaths =
    (await dependencies.selectManyWithAbort(
      'Select local paths to add',
      choices,
      {
        interactive: context.interactive,
      },
    )) ?? [];

  let addedCount = 0;
  const guidedPathValues = new Set(LOCAL_PATH_CHOICES.map((c) => c.value));
  const existingGuidedCount = [...existingPaths].filter((p) =>
    guidedPathValues.has(p),
  ).length;

  if (selectedPaths.length > 0) {
    const delta = selectedPaths.filter((p) => !existingPaths.has(p));
    if (delta.length > 0) {
      const addResult = await dependencies.addLocalPaths(projectRoot, delta);
      addedCount = addResult.added.length;
      await dependencies.applyGitignore(projectRoot, addResult.all);
      context.logger.info(`Added ${addResult.added.length} local path(s).`);
    } else {
      context.logger.info('All selected paths already configured.');
    }
  }
  context.logger.info(
    'Add custom local paths anytime with `oat local add <path>`',
  );

  context.logger.info('[3/4] Provider sync…');
  const syncProviders = await dependencies.confirmAction(
    'Sync provider project views now?',
    { interactive: context.interactive },
  );
  if (syncProviders) {
    await dependencies.runProviderSync(projectRoot);
  }

  context.logger.info('[4/4] Setup complete');
  context.logger.info('');
  context.logger.info('Guided setup complete.');
  context.logger.info('');
  context.logger.info(
    `  Providers:      ${activeProviderNames.length > 0 ? activeProviderNames.join(', ') : 'none detected'}`,
  );
  context.logger.info(
    `  Tool packs:     ${installTools ? 'installed' : 'skipped'}`,
  );
  context.logger.info(
    `  Local paths:    ${selectedPaths.length > 0 ? `${addedCount} added, ${existingGuidedCount} existing` : 'skipped'}`,
  );
  context.logger.info(
    `  Provider sync:  ${syncProviders ? 'done' : 'skipped'}`,
  );
  context.logger.info('');
  context.logger.info('Next steps:');
  context.logger.info(
    '  - Run `oat init tools` to customize tool pack selection',
  );
  context.logger.info(
    '  - Run `oat local add <path>` to add custom local paths',
  );
  context.logger.info('  - Run `oat local status` to verify gitignore state');
  context.logger.info(
    '  - Start a project: `oat-project-quick-start` or `oat-project-new`',
  );
}

async function runInitCommand(
  context: CommandContext,
  dependencies: InitDependencies,
  hookFlag: boolean | undefined,
  setupFlag: boolean | undefined,
): Promise<void> {
  const scopes = resolveConcreteScopes(context.scope);
  let projectRoot: string | null = null;
  let oatDirExistedBefore = true;
  const scopeSummaries: InitScopeSummary[] = [];

  for (const scope of scopes) {
    const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
    let activeAdaptersForStrays: ProviderAdapter[] | undefined;
    if (scope === 'project') {
      projectRoot = scopeRoot;
      oatDirExistedBefore = await dependencies.dirExists(
        join(scopeRoot, '.oat'),
      );
      const configPath = join(scopeRoot, '.oat', 'sync', 'config.json');
      const adapters = dependencies.getAdapters();
      let config = await dependencies.loadSyncConfig(configPath);
      let resolution = await dependencies.getConfigAwareAdapters(
        adapters,
        scopeRoot,
        config,
      );

      if (!context.interactive && !context.json) {
        context.logger.info(PROVIDER_CONFIG_REMEDIATION);
      }

      if (context.interactive) {
        const providerChoices = adapters.map((adapter) => ({
          label: adapter.name,
          value: adapter.name,
          description: adapter.displayName,
          checked:
            config.providers[adapter.name]?.enabled === true ||
            resolution.activeAdapters.some(
              (active) => active.name === adapter.name,
            ),
        }));

        const selectedProviders = await dependencies.selectProvidersWithAbort(
          'Select supported project providers',
          providerChoices,
          { interactive: context.interactive },
        );

        if (selectedProviders !== null) {
          const selectedProviderNames = new Set(selectedProviders);
          const providers = { ...config.providers };
          for (const adapter of adapters) {
            providers[adapter.name] = {
              ...(providers[adapter.name] ?? {}),
              enabled: selectedProviderNames.has(adapter.name),
            };
          }

          config = await dependencies.saveSyncConfig(configPath, {
            ...config,
            providers,
          });
        }

        resolution = await dependencies.getConfigAwareAdapters(
          adapters,
          scopeRoot,
          config,
        );
      }

      activeAdaptersForStrays = resolution.activeAdapters;
    }

    await dependencies.ensureCanonicalDirs(scopeRoot, scope);

    if (scope === 'project') {
      await dependencies.applyOatCoreGitignore(scopeRoot);
    }

    const manifestPath = join(scopeRoot, '.oat', 'sync', 'manifest.json');
    let manifest = await dependencies.loadManifest(manifestPath);
    if (!manifest.entries) {
      manifest = createEmptyManifest();
    }

    const canonicalEntries = await dependencies.scanCanonical(scopeRoot, scope);
    const strays = await dependencies.collectStrays(
      scopeRoot,
      scope,
      manifest,
      canonicalEntries,
      activeAdaptersForStrays,
    );
    let straysAdopted = 0;

    if (!context.interactive && strays.length > 0) {
      context.logger.warn(ADOPT_REMEDIATION);
    }

    if (context.interactive && strays.length > 0) {
      const choices = strays.map((stray, index) => ({
        label: formatStrayChoiceLabel(
          scope,
          stray.report.providerPath,
          stray.provider,
        ),
        value: String(index),
        description: formatPathForScope(scope, stray.report.providerPath),
      }));
      const selectedValues = await dependencies.selectManyWithAbort(
        `Select stray entries to adopt [${scope}]`,
        choices,
        { interactive: context.interactive },
      );

      const selectedIndices = new Set(
        (selectedValues ?? []).map((value) => Number.parseInt(value, 10)),
      );
      let codexStrayAdopted = false;
      for (const [index, stray] of strays.entries()) {
        if (!selectedIndices.has(index)) {
          continue;
        }

        try {
          manifest = await dependencies.adoptStray(scopeRoot, stray, manifest);
          straysAdopted += 1;
          codexStrayAdopted = codexStrayAdopted || stray.provider === 'codex';
        } catch (error) {
          if (!isAdoptionConflictError(error)) {
            throw error;
          }

          const shouldReplace = await dependencies.confirmAction(
            `Conflict detected for ${formatPathForScope(scope, stray.report.providerPath)}. Replace canonical content with stray content?`,
            { interactive: context.interactive },
          );
          if (!shouldReplace) {
            context.logger.warn(
              `Skipped conflicting stray entry [${scope}]: ${formatPathForScope(scope, stray.report.providerPath)}`,
            );
            continue;
          }

          manifest = await dependencies.adoptStray(scopeRoot, stray, manifest, {
            replaceCanonical: true,
          });
          straysAdopted += 1;
          codexStrayAdopted = codexStrayAdopted || stray.provider === 'codex';
        }
      }

      if (codexStrayAdopted && scope === 'project') {
        await regenerateCodexAfterAdoption({
          scopeRoot,
          scanCanonical: async () =>
            dependencies.scanCanonical(scopeRoot, scope),
          computeExtensionPlan: computeCodexProjectExtensionPlan,
          applyExtensionPlan: applyCodexProjectExtensionPlan,
        });
      }

      if (straysAdopted > 0) {
        context.logger.success(
          `Adopted ${straysAdopted} stray entr${
            straysAdopted === 1 ? 'y' : 'ies'
          } [${scope}].`,
        );
      } else {
        context.logger.info(`No stray entries adopted [${scope}].`);
      }
    }

    await dependencies.saveManifest(manifestPath, manifest);
    scopeSummaries.push({
      scope,
      straysFound: strays.length,
      straysAdopted,
    });
  }

  const hookInstalled = await maybeHandleHook(
    context,
    dependencies,
    projectRoot,
    hookFlag,
  );
  if (context.json) {
    const payload: InitJsonPayload = {
      scope: context.scope,
      directoriesCreated: scopeSummaries.length,
      straysFound: scopeSummaries.reduce(
        (total, summary) => total + summary.straysFound,
        0,
      ),
      straysAdopted: scopeSummaries.reduce(
        (total, summary) => total + summary.straysAdopted,
        0,
      ),
      hookInstalled,
      scopes: scopeSummaries,
    };
    context.logger.json(payload);
  }

  process.exitCode = 0;

  const freshInit = projectRoot !== null && !oatDirExistedBefore;
  if (context.interactive && (setupFlag || freshInit)) {
    let shouldRunSetup = !!setupFlag;
    if (!shouldRunSetup && freshInit) {
      shouldRunSetup = await dependencies.confirmAction(
        'Would you like to run guided setup?',
        { interactive: context.interactive },
      );
    }
    if (shouldRunSetup) {
      await dependencies.runGuidedSetup(context, dependencies);
    }
  }
}

export function createInitCommand(
  overrides: Partial<InitDependencies> = {},
): Command {
  const dependencies: InitDependencies = {
    ...createDependencies(),
    ...overrides,
  };

  return new Command('init')
    .description('Initialize canonical directories, manifest, and tool packs')
    .option('--hook', 'Install optional pre-commit hook')
    .option('--no-hook', 'Skip optional pre-commit hook install')
    .option('--setup', 'Run guided setup after initialization')
    .addCommand(createInitToolsCommand())
    .action(async (_options, command: Command) => {
      const options = readGlobalOptions(command) as InitOptions;
      const context = dependencies.buildCommandContext(options);
      await runInitCommand(context, dependencies, options.hook, options.setup);
    });
}
