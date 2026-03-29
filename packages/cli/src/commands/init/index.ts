import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

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
  inputWithDefault,
  type MultiSelectChoice,
  type PromptContext,
  type SelectChoice,
  selectManyWithAbort,
  selectWithAbort,
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
  detectDefaultBranch,
  type OatConfig,
  type OatDocumentationConfig,
  readOatConfig,
  resolveLocalPaths,
  writeOatConfig,
} from '@config/oat-config';
import { type DriftReport, detectStrays } from '@drift/index';
import {
  configureLocalHooksPath,
  type CanonicalEntry,
  getHookInstallInfo,
  type HookInstallInfo,
  installHook,
  isHookInstalled,
  scanCanonical,
  uninstallHook,
} from '@engine/index';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { normalizeToPosixPath } from '@fs/paths';
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

import {
  type DetectedDocs,
  type DetectDocsDependencies,
  detectExistingDocs,
} from './detect-docs';
import {
  type ToolPack,
  createInitToolsCommand,
  runInitToolsWithDefaults,
} from './tools';

const ADOPT_REMEDIATION =
  'Run "oat init" interactively to adopt stray entries.';
const HOOK_PROMPT = 'Install optional pre-commit hook for drift warnings?';
const HOOK_CONFIGURE_PROMPT = (hooksPath: string): string =>
  `Configure Git hooks to use ${hooksPath} before installing the OAT hook?`;
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
  getHookInstallInfo: (projectRoot: string) => Promise<HookInstallInfo>;
  configureLocalHooksPath: (
    projectRoot: string,
    hooksPath: string,
  ) => Promise<void>;
  installHook: (projectRoot: string) => Promise<string>;
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
  writeOatConfig: (repoRoot: string, config: OatConfig) => Promise<void>;
  detectDefaultBranch: (repoRoot: string) => string;
  detectExistingDocs: (
    repoRoot: string,
    deps: DetectDocsDependencies,
  ) => Promise<DetectedDocs | null>;
  fileExists: (path: string) => Promise<boolean>;
  inputWithDefault: (
    message: string,
    defaultValue: string,
    ctx: PromptContext,
  ) => Promise<string | null>;
  selectWithAbort: <T extends string>(
    message: string,
    choices: SelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T | null>;
  runGuidedSetup: (
    context: CommandContext,
    dependencies: InitDependencies,
  ) => Promise<void>;
  runToolPacks: (context: CommandContext) => Promise<ToolPack[]>;
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
    await mkdir(join(scopeRoot, '.agents', 'rules'), { recursive: true });
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
        mapping,
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
    getHookInstallInfo,
    configureLocalHooksPath,
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
    writeOatConfig,
    detectDefaultBranch,
    detectExistingDocs,
    fileExists,
    inputWithDefault,
    selectWithAbort,
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
    const hookInstallInfo = await dependencies.getHookInstallInfo(projectRoot);
    if (hookInstallInfo.suggestedHooksPath) {
      context.logger.warn(
        `Detected existing repo hook file at ${hookInstallInfo.suggestedHookPath}, but Git is not configured to use ${hookInstallInfo.suggestedHooksPath}. OAT will install into ${hookInstallInfo.hookPath} unless you configure Git first.`,
      );

      if (context.interactive) {
        const shouldConfigureHooksPath = await dependencies.confirmAction(
          HOOK_CONFIGURE_PROMPT(hookInstallInfo.suggestedHooksPath),
          {
            interactive: context.interactive,
          },
        );
        if (shouldConfigureHooksPath) {
          await dependencies.configureLocalHooksPath(
            projectRoot,
            hookInstallInfo.suggestedHooksPath,
          );
        }
      }
    }

    const hookPath = await dependencies.installHook(projectRoot);
    context.logger.success(
      `Installed optional pre-commit hook at ${hookPath}.`,
    );
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
    label: '.oat/**/reviews/archived — Archived review artifacts',
    value: '.oat/**/reviews/archived',
    checked: true,
  },
  {
    label: '.oat/ideas — Ideas and brainstorms',
    value: '.oat/ideas',
    checked: true,
  },
];

const DOCS_TOOLING_CHOICES: SelectChoice<string>[] = [
  { label: 'Fumadocs (Next.js + MDX)', value: 'fumadocs' },
  { label: 'MkDocs (Python, Material theme)', value: 'mkdocs' },
  { label: 'Docusaurus', value: 'docusaurus' },
  { label: 'VitePress', value: 'vitepress' },
  { label: 'Nextra', value: 'nextra' },
];

function trimDocsRoot(pathValue: string): string {
  return pathValue.replace(/\/+$/, '').replace(/^\.\//, '').trim();
}

function normalizeDocumentationRoot(
  repoRoot: string,
  pathValue: string,
): string | null {
  const trimmed = pathValue.trim();
  if (!trimmed) {
    return null;
  }

  if (!isAbsolute(trimmed)) {
    const normalizedRelative = trimDocsRoot(normalizeToPosixPath(trimmed));
    if (!normalizedRelative || normalizedRelative === '.') {
      return '.';
    }
    if (normalizedRelative === '..' || normalizedRelative.startsWith('../')) {
      return null;
    }
  }

  const repoRootResolved = resolve(repoRoot);
  const absoluteResolved = isAbsolute(trimmed)
    ? resolve(trimmed)
    : resolve(repoRoot, trimmed);
  const isInsideRepo =
    absoluteResolved === repoRootResolved ||
    absoluteResolved.startsWith(`${repoRootResolved}${sep}`);

  if (!isInsideRepo) {
    return null;
  }

  const relativePath = normalizeToPosixPath(
    relative(repoRootResolved, absoluteResolved),
  );
  const normalizedRelative = trimDocsRoot(relativePath);
  return !normalizedRelative || normalizedRelative === '.'
    ? '.'
    : normalizedRelative;
}

async function promptForManualDocsConfig(
  projectRoot: string,
  context: CommandContext,
  dependencies: InitDependencies,
  promptMessage: string,
  defaultRoot = 'docs',
): Promise<OatDocumentationConfig | null> {
  const hasDocs = await dependencies.confirmAction(promptMessage, {
    interactive: context.interactive,
  });

  if (!hasDocs) {
    return null;
  }

  const tooling = await dependencies.selectWithAbort(
    'Documentation framework',
    DOCS_TOOLING_CHOICES,
    { interactive: context.interactive },
  );
  if (!tooling) {
    return null;
  }

  while (true) {
    const rootInput = await dependencies.inputWithDefault(
      'Docs root path (relative to repo root)',
      defaultRoot,
      { interactive: context.interactive },
    );
    if (rootInput === null) {
      return null;
    }

    const root = normalizeDocumentationRoot(projectRoot, rootInput);
    if (root) {
      return { tooling, root };
    }

    context.logger.info(
      'Docs root must be repo-relative or inside the repository.',
    );
  }
}

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

  context.logger.info('[1/5] Tool packs…');
  const guidedContext: CommandContext = { ...context, scope: 'project' };
  const installedPacks = await dependencies.runToolPacks(guidedContext);
  const installedPackSet = new Set(installedPacks);

  context.logger.info('[2/5] Local paths (gitignored artifacts)…');
  const config = await dependencies.readOatConfig(projectRoot);
  const existingPaths = new Set(dependencies.resolveLocalPaths(config));

  const applicableChoices = LOCAL_PATH_CHOICES.filter(
    (c) => c.value !== '.oat/ideas' || installedPackSet.has('ideas'),
  );

  const choices = applicableChoices.map((c) => ({
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
  const guidedPathValues = new Set(applicableChoices.map((c) => c.value));
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

  // Detect and store default branch if not already configured
  {
    const currentConfig = await dependencies.readOatConfig(projectRoot);
    if (!currentConfig.git?.defaultBranch) {
      const detected = dependencies.detectDefaultBranch(projectRoot);
      currentConfig.git = { ...currentConfig.git, defaultBranch: detected };
      await dependencies.writeOatConfig(projectRoot, currentConfig);
      context.logger.info(`Default branch: ${detected}`);
    } else {
      context.logger.info(
        `Default branch: ${currentConfig.git.defaultBranch} (already configured)`,
      );
    }
  }

  context.logger.info('[3/5] Documentation…');
  let docsSummary = 'skipped';
  const existingDocsConfig = config.documentation;

  if (existingDocsConfig?.tooling) {
    context.logger.info(
      `Documentation already configured: ${existingDocsConfig.tooling} at ${existingDocsConfig.root ?? '.'}`,
    );
    docsSummary = `${existingDocsConfig.tooling} (already configured)`;
  } else {
    const detected = await dependencies.detectExistingDocs(projectRoot, {
      fileExists: dependencies.fileExists,
      dirExists: dependencies.dirExists,
    });

    let docsConfig: OatDocumentationConfig | null = null;

    if (detected) {
      const confirmDetected = await dependencies.confirmAction(
        `Detected ${detected.tooling} docs at ${detected.root === '.' ? 'repo root' : detected.root}. Store in config?`,
        { interactive: context.interactive },
      );
      if (confirmDetected) {
        docsConfig = {
          tooling: detected.tooling,
          root: detected.root,
          ...(detected.config ? { config: detected.config } : {}),
        };
      } else {
        docsConfig = await promptForManualDocsConfig(
          projectRoot,
          context,
          dependencies,
          'Would you like to enter docs config manually instead?',
          detected.root,
        );
      }
    } else {
      docsConfig = await promptForManualDocsConfig(
        projectRoot,
        context,
        dependencies,
        'Do you have documentation in this repo?',
      );
    }

    if (docsConfig) {
      const updatedConfig = await dependencies.readOatConfig(projectRoot);
      updatedConfig.documentation = {
        ...updatedConfig.documentation,
        ...docsConfig,
      };
      await dependencies.writeOatConfig(projectRoot, updatedConfig);
      context.logger.info(
        `Stored docs config: ${docsConfig.tooling} at ${docsConfig.root}`,
      );
      docsSummary = `${docsConfig.tooling} at ${docsConfig.root}`;
    }
  }

  context.logger.info('[4/5] Provider sync…');
  const syncProviders = await dependencies.confirmAction(
    'Sync provider project views now?',
    { interactive: context.interactive },
  );
  if (syncProviders) {
    await dependencies.runProviderSync(projectRoot);
  }

  context.logger.info('[5/5] Setup complete');
  context.logger.info('');
  context.logger.info('Guided setup complete.');
  context.logger.info('');
  context.logger.info(
    `  Providers:      ${activeProviderNames.length > 0 ? activeProviderNames.join(', ') : 'none detected'}`,
  );
  context.logger.info(
    `  Tool packs:     ${installedPacks.length > 0 ? 'installed' : 'skipped'}`,
  );
  context.logger.info(
    `  Local paths:    ${selectedPaths.length > 0 ? `${addedCount} added, ${existingGuidedCount} existing` : 'skipped'}`,
  );
  context.logger.info(`  Documentation:  ${docsSummary}`);
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
