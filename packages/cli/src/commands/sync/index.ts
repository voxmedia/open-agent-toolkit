import { join, relative } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { PROVIDER_CONFIG_REMEDIATION } from '@commands/shared/messages';
import { withScopeOption } from '@commands/shared/scope-option';
import {
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
  computeSyncPlan,
  executeSyncPlan,
  scanBundledManagedAgents,
  scanCanonical,
} from '@engine/index';
import { CliError } from '@errors/index';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { loadManifest } from '@manifest/index';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { codexMaterializationExtension } from '@providers/codex/codec/sync-extension';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { cursorMaterializationExtension } from '@providers/cursor/codec/sync-extension';
import { geminiAdapter } from '@providers/gemini';
import {
  getConfigAwareAdapters,
  toMaterializationOperations,
  type ProviderAdapter,
} from '@providers/shared';
import { OAT_VERSION } from '@shared/oat-version';
import { formatSyncPlan } from '@ui/output';
import { Command, Option } from 'commander';

import { runSyncApply } from './apply';
import { runSyncDryRun } from './dry-run';
import type {
  ScopeSyncPlan,
  CanonicalSyncFilter,
  SyncCommandDependencies,
  SyncProviderMismatches,
  SyncVersionSkew,
} from './sync.types';

function defaultDependencies(): SyncCommandDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    loadManifest,
    async loadSyncConfig(configPath) {
      const config = await loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
      return config;
    },
    saveSyncConfig,
    scanCanonical,
    scanBundledManagedAgents,
    getAdapters() {
      return [
        claudeAdapter,
        cursorAdapter,
        codexAdapter,
        copilotAdapter,
        geminiAdapter,
      ];
    },
    getConfigAwareAdapters,
    selectProvidersWithAbort: selectManyWithAbort,
    computeSyncPlan,
    executeSyncPlan,
    getMaterializationExtensions() {
      return [
        codexMaterializationExtension,
        cursorMaterializationExtension,
      ] as SyncCommandDependencies['getMaterializationExtensions'] extends () => infer T
        ? T
        : never;
    },
    applyMaterializationExtensionPlan(extension, scopeRoot, plan) {
      return extension.applyPlan(scopeRoot, plan);
    },
    formatSyncPlan,
  };
}

const INSTALL_CANONICAL_PATH_PATTERN =
  /^\.agents\/(skills|agents|rules)\/[^/\\]+$/;

function validateInstallCanonicalPaths(
  paths: string[] | undefined,
): string[] | undefined {
  if (!paths?.length) {
    return undefined;
  }

  for (const path of paths) {
    if (!INSTALL_CANONICAL_PATH_PATTERN.test(path)) {
      throw new CliError(`Invalid --install-canonical path: ${path}`, 1);
    }
  }

  return paths;
}

function validateRemoveCanonicalPaths(
  paths: string[] | undefined,
): string[] | undefined {
  if (!paths?.length) return undefined;
  for (const path of paths) {
    if (!INSTALL_CANONICAL_PATH_PATTERN.test(path)) {
      throw new CliError(`Invalid --remove-canonical path: ${path}`, 1);
    }
  }
  return paths;
}

function hasProviderMismatches(mismatches: SyncProviderMismatches): boolean {
  return (
    mismatches.detectedUnset.length > 0 ||
    mismatches.detectedDisabled.length > 0
  );
}

function buildMismatchChoices(
  adapters: ProviderAdapter[],
  mismatches: SyncProviderMismatches,
): MultiSelectChoice<string>[] {
  const mismatchSet = new Set([
    ...mismatches.detectedUnset,
    ...mismatches.detectedDisabled,
  ]);

  return adapters
    .filter((adapter) => mismatchSet.has(adapter.name))
    .map((adapter) => {
      const isDisabled = mismatches.detectedDisabled.includes(adapter.name);
      return {
        label: adapter.name,
        value: adapter.name,
        description: isDisabled
          ? `${adapter.displayName} (detected, currently disabled)`
          : `${adapter.displayName} (detected, not configured)`,
        checked: true,
      };
    });
}

async function maybeResolveProviderMismatches(
  context: CommandContext,
  scope: ScopeSyncPlan['scope'],
  scopeRoot: string,
  configPath: string,
  config: SyncConfig,
  adapters: ProviderAdapter[],
  mismatches: SyncProviderMismatches,
  dependencies: SyncCommandDependencies,
): Promise<{
  config: SyncConfig;
  mismatches: SyncProviderMismatches;
  activeAdapters: ProviderAdapter[];
}> {
  if (
    scope !== 'project' ||
    !context.interactive ||
    !hasProviderMismatches(mismatches)
  ) {
    return {
      config,
      mismatches,
      activeAdapters: await dependencies
        .getConfigAwareAdapters(adapters, scopeRoot, config)
        .then((resolution) => resolution.activeAdapters),
    };
  }

  const choices = buildMismatchChoices(adapters, mismatches);
  const selected = await dependencies.selectProvidersWithAbort(
    'Detected provider directories are not enabled in config. Select providers to enable for sync.',
    choices,
    { interactive: context.interactive } satisfies PromptContext,
  );

  if (selected === null) {
    const resolution = await dependencies.getConfigAwareAdapters(
      adapters,
      scopeRoot,
      config,
    );
    return {
      config,
      mismatches,
      activeAdapters: resolution.activeAdapters,
    };
  }

  const selectedSet = new Set(selected);
  // `detectedUnset` and `detectedDisabled` are mutually exclusive by contract.
  const mismatchedProviders = new Set([
    ...mismatches.detectedUnset,
    ...mismatches.detectedDisabled,
  ]);
  const providers = { ...config.providers };
  for (const providerName of mismatchedProviders) {
    providers[providerName] = {
      ...(providers[providerName] ?? {}),
      enabled: selectedSet.has(providerName),
    };
  }

  const savedConfig = await dependencies.saveSyncConfig(configPath, {
    ...config,
    providers,
  });

  const resolution = await dependencies.getConfigAwareAdapters(
    adapters,
    scopeRoot,
    savedConfig,
  );

  return {
    config: savedConfig,
    mismatches: {
      detectedUnset: resolution.detectedUnset,
      detectedDisabled: resolution.detectedDisabled,
    },
    activeAdapters: resolution.activeAdapters,
  };
}

/**
 * Derive the advisory version-skew diagnostic for a loaded scope manifest.
 *
 * This is the single source of truth for "this manifest was produced by a
 * different CLI version": `runSyncApply` keys its manifest restamp off the
 * presence of this diagnostic, so a restamp can never destroy the provenance
 * evidence without the advisory having been emitted first.
 *
 * Comparison is plain string inequality on identity, never semantic-version
 * ordering. An absent manifest therefore never reports skew, because
 * `loadManifest` deliberately creates an empty manifest stamped with the
 * invoking version and the two strings match. `ManifestSchema` rejects an
 * *empty* `oatVersion` before sync ever sees it, but it does admit other
 * degenerate strings such as whitespace-only values; those surface here as
 * ordinary skew rather than being reclassified as corruption.
 */
function detectVersionSkew(
  scope: ScopeSyncPlan['scope'],
  manifest: ScopeSyncPlan['manifest'],
): SyncVersionSkew | undefined {
  const producingVersion = manifest.oatVersion;
  const invokingVersion = OAT_VERSION;

  if (producingVersion === invokingVersion) {
    return undefined;
  }

  return { scope, producingVersion, invokingVersion };
}

async function computePlans(
  context: CommandContext,
  dependencies: SyncCommandDependencies,
  canonicalFilter?: CanonicalSyncFilter,
): Promise<ScopeSyncPlan[]> {
  const scopePlans: ScopeSyncPlan[] = [];

  for (const scope of resolveConcreteScopes(context.scope)) {
    const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
    const manifestPath = join(scopeRoot, '.oat', 'sync', 'manifest.json');
    const configPath = join(scopeRoot, '.oat', 'sync', 'config.json');
    const [manifest, config, canonical] = await Promise.all([
      dependencies.loadManifest(manifestPath),
      dependencies.loadSyncConfig(configPath),
      dependencies.scanCanonical(scopeRoot, scope),
    ]);
    const providerCanonical =
      scope === 'user'
        ? [
            ...canonical,
            ...(await dependencies.scanBundledManagedAgents({ scopeRoot })),
          ]
        : canonical;
    if (canonicalFilter?.mode === 'remove') {
      const existing = new Set(
        providerCanonical.map(({ canonicalPath }) =>
          relative(scopeRoot, canonicalPath).replaceAll('\\', '/'),
        ),
      );
      const stillPresent = canonicalFilter.paths.filter((path) =>
        existing.has(path),
      );
      if (stillPresent.length > 0) {
        throw new CliError(
          `Cannot remove canonical provider views while source exists: ${stillPresent.join(', ')}`,
          1,
        );
      }
    }
    const adapters = dependencies.getAdapters();
    const initialResolution = await dependencies.getConfigAwareAdapters(
      adapters,
      scopeRoot,
      config,
    );

    const resolved = await maybeResolveProviderMismatches(
      context,
      scope,
      scopeRoot,
      configPath,
      config,
      adapters,
      {
        detectedUnset: initialResolution.detectedUnset,
        detectedDisabled: initialResolution.detectedDisabled,
      },
      dependencies,
    );

    const plan = await dependencies.computeSyncPlan({
      canonical: providerCanonical,
      adapters: resolved.activeAdapters,
      manifest,
      scope,
      config: resolved.config,
      scopeRoot,
      allowedCanonicalPaths: canonicalFilter?.paths,
    });

    const activeAdapterNames = resolved.activeAdapters.map(
      (adapter) => adapter.name,
    );
    const enabledExtensions = dependencies
      .getMaterializationExtensions()
      .filter((extension) => activeAdapterNames.includes(extension.provider));
    const materializationExtensionPlans = await Promise.all(
      enabledExtensions.map((extension) =>
        extension.computePlan({
          scopeRoot,
          canonicalEntries: providerCanonical,
          allowedCanonicalPaths: canonicalFilter?.paths,
          options: { userConfigDir: join(context.home, '.oat') },
        }),
      ),
    );
    const materializationExtensions = materializationExtensionPlans.map(
      (extensionPlan) => ({
        provider: extensionPlan.provider,
        operations: toMaterializationOperations(extensionPlan),
        managedEntries: extensionPlan.managedEntries,
        aggregateHash: extensionPlan.aggregateHash,
      }),
    );

    scopePlans.push({
      scope,
      scopeRoot,
      manifestPath,
      manifest,
      canonical: providerCanonical,
      activeAdapterNames,
      plan,
      providerMismatches: resolved.mismatches,
      versionSkew: detectVersionSkew(scope, manifest),
      materializationExtensionPlans,
      materializationExtensions,
    });
  }

  return scopePlans;
}

function logNonInteractiveMismatchGuidance(
  context: CommandContext,
  scopePlans: ScopeSyncPlan[],
): void {
  if (context.interactive) {
    return;
  }

  for (const scopePlan of scopePlans) {
    if (scopePlan.scope !== 'project' || !scopePlan.providerMismatches) {
      continue;
    }

    const { detectedUnset, detectedDisabled } = scopePlan.providerMismatches;
    if (detectedUnset.length === 0 && detectedDisabled.length === 0) {
      continue;
    }

    const parts: string[] = [];
    if (detectedUnset.length > 0) {
      parts.push(`unset: ${detectedUnset.join(', ')}`);
    }
    if (detectedDisabled.length > 0) {
      parts.push(`disabled: ${detectedDisabled.join(', ')}`);
    }

    context.logger.warn(
      `Provider config mismatch detected [project] (${parts.join('; ')}).`,
    );
    if (!context.json) {
      context.logger.info(PROVIDER_CONFIG_REMEDIATION);
    }
  }
}

function logVersionSkewWarnings(
  context: CommandContext,
  scopePlans: ScopeSyncPlan[],
): void {
  if (context.json) {
    return;
  }

  for (const scopePlan of scopePlans) {
    const skew = scopePlan.versionSkew;
    if (!skew) {
      continue;
    }

    context.logger.warn(
      `Sync manifest version skew [${skew.scope}]: manifest produced by oat "${skew.producingVersion}" but invoked by oat "${skew.invokingVersion}".`,
    );
  }
}

async function runSyncCommand(
  context: CommandContext,
  dependencies: SyncCommandDependencies,
  canonicalFilter?: CanonicalSyncFilter,
): Promise<void> {
  const scopePlans = await computePlans(context, dependencies, canonicalFilter);
  logNonInteractiveMismatchGuidance(context, scopePlans);
  logVersionSkewWarnings(context, scopePlans);

  if (context.dryRun) {
    runSyncDryRun(context, scopePlans, dependencies);
    return;
  }

  await runSyncApply(context, scopePlans, dependencies);
}

export function createSyncCommand(
  overrides: Partial<SyncCommandDependencies> = {},
): Command {
  const dependencies: SyncCommandDependencies = {
    ...defaultDependencies(),
    ...overrides,
  };

  return withScopeOption(new Command('sync'))
    .description('Sync canonical content to provider views')
    .option('--dry-run', 'Preview sync changes without applying')
    .addOption(
      new Option('--install-canonical <path>', 'Internal install sync filter')
        .hideHelp()
        .default([])
        .argParser((value, previous?: string[]) => [
          ...(previous ?? []),
          value,
        ]),
    )
    .addOption(
      new Option('--remove-canonical <path>', 'Internal removal sync filter')
        .hideHelp()
        .default([])
        .argParser((value, previous?: string[]) => [
          ...(previous ?? []),
          value,
        ]),
    )
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const options = command.opts<{
        installCanonical?: string[];
        removeCanonical?: string[];
      }>();
      const installPaths = validateInstallCanonicalPaths(
        options.installCanonical,
      );
      const removePaths = validateRemoveCanonicalPaths(options.removeCanonical);
      if (installPaths?.length && removePaths?.length) {
        throw new CliError(
          '--install-canonical and --remove-canonical cannot be combined',
          1,
        );
      }
      await runSyncCommand(
        context,
        dependencies,
        installPaths?.length
          ? { mode: 'install', paths: installPaths }
          : removePaths?.length
            ? { mode: 'remove', paths: removePaths }
            : undefined,
      );
    });
}
