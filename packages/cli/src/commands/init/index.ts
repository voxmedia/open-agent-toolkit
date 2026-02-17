import { mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { adoptStrayToCanonical } from '@commands/shared/adopt-stray';
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
import { type DriftReport, detectStrays } from '@drift/index';
import {
  type CanonicalEntry,
  installHook,
  isHookInstalled,
  scanCanonical,
  uninstallHook,
} from '@engine/index';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import {
  createEmptyManifest,
  loadManifest,
  saveManifest,
} from '@manifest/manager';
import type { Manifest } from '@manifest/manifest.types';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { cursorAdapter } from '@providers/cursor';
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

const ADOPT_REMEDIATION =
  'Run "oat init" interactively to adopt stray entries.';
const PROVIDER_CONFIG_REMEDIATION =
  'Run "oat providers set --scope project --enabled <providers> --disabled <providers>" to configure supported providers.';
const HOOK_PROMPT = 'Install optional pre-commit hook for drift warnings?';
const HOOK_GUIDANCE =
  'Run "oat init --hook" to install optional pre-commit hook.';

interface InitOptions extends GlobalOptions {
  hook?: boolean;
}

export interface InitStrayCandidate {
  provider: string;
  report: DriftReport;
  mapping: PathMapping;
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
    (await getActiveAdapters(
      [claudeAdapter, cursorAdapter, codexAdapter],
      scopeRoot,
    ));
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

  return candidates;
}

async function adoptStrayDefault(
  scopeRoot: string,
  stray: InitStrayCandidate,
  manifest: Manifest,
): Promise<Manifest> {
  return adoptStrayToCanonical(scopeRoot, stray, manifest);
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
      return [claudeAdapter, cursorAdapter, codexAdapter];
    },
    async loadSyncConfig(configPath) {
      return loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
    },
    saveSyncConfig,
    getConfigAwareAdapters,
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

async function runInitCommand(
  context: CommandContext,
  dependencies: InitDependencies,
  hookFlag: boolean | undefined,
): Promise<void> {
  const scopes = resolveConcreteScopes(context.scope);
  let projectRoot: string | null = null;
  const scopeSummaries: InitScopeSummary[] = [];

  for (const scope of scopes) {
    const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
    let activeAdaptersForStrays: ProviderAdapter[] | undefined;
    if (scope === 'project') {
      projectRoot = scopeRoot;
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
      for (const [index, stray] of strays.entries()) {
        if (!selectedIndices.has(index)) {
          continue;
        }

        manifest = await dependencies.adoptStray(scopeRoot, stray, manifest);
        straysAdopted += 1;
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
}

export function createInitCommand(
  overrides: Partial<InitDependencies> = {},
): Command {
  const dependencies: InitDependencies = {
    ...createDependencies(),
    ...overrides,
  };

  return new Command('init')
    .description('Initialize canonical directories and manifest')
    .option('--hook', 'Install optional pre-commit hook')
    .option('--no-hook', 'Skip optional pre-commit hook install')
    .action(async (_options, command: Command) => {
      const options = readGlobalOptions(command) as InitOptions;
      const context = dependencies.buildCommandContext(options);
      await runInitCommand(context, dependencies, options.hook);
    });
}
