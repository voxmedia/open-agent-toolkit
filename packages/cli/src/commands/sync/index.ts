import { join } from 'node:path';
import { buildCommandContext, type CommandContext } from '@app/command-context';
import { PROVIDER_CONFIG_REMEDIATION } from '@commands/shared/messages';
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
import { computeSyncPlan, executeSyncPlan, scanCanonical } from '@engine/index';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { loadManifest } from '@manifest/index';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import {
  applyCodexProjectExtensionPlan,
  computeCodexProjectExtensionPlan,
  toCodexExtensionOperations,
} from '@providers/codex/codec/sync-extension';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { geminiAdapter } from '@providers/gemini';
import {
  getConfigAwareAdapters,
  type ProviderAdapter,
} from '@providers/shared';
import { formatSyncPlan } from '@ui/output';
import { Command } from 'commander';
import { runSyncApply } from './apply';
import { runSyncDryRun } from './dry-run';
import type {
  ScopeSyncPlan,
  SyncCommandDependencies,
  SyncProviderMismatches,
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
    computeCodexProjectExtensionPlan,
    toCodexExtensionOperations,
    applyCodexProjectExtensionPlan,
    formatSyncPlan,
  };
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

async function computePlans(
  context: CommandContext,
  dependencies: SyncCommandDependencies,
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
      canonical,
      adapters: resolved.activeAdapters,
      manifest,
      scope,
      config: resolved.config,
      scopeRoot,
    });

    let codexExtensionPlan: ScopeSyncPlan['codexExtensionPlan'];
    let codexExtension: ScopeSyncPlan['codexExtension'];
    const activeAdapterNames = resolved.activeAdapters.map(
      (adapter) => adapter.name,
    );
    if (scope === 'project' && activeAdapterNames.includes('codex')) {
      codexExtensionPlan = await dependencies.computeCodexProjectExtensionPlan(
        scopeRoot,
        canonical,
      );
      codexExtension = {
        operations: dependencies.toCodexExtensionOperations(codexExtensionPlan),
        managedRoles: codexExtensionPlan.managedRoles,
        aggregateConfigHash: codexExtensionPlan.aggregateConfigHash,
      };
    }

    scopePlans.push({
      scope,
      scopeRoot,
      manifestPath,
      manifest,
      canonical,
      activeAdapterNames,
      plan,
      providerMismatches: resolved.mismatches,
      codexExtensionPlan,
      codexExtension,
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

async function runSyncCommand(
  context: CommandContext,
  dependencies: SyncCommandDependencies,
): Promise<void> {
  const scopePlans = await computePlans(context, dependencies);
  logNonInteractiveMismatchGuidance(context, scopePlans);

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

  return new Command('sync')
    .description('Sync canonical content to provider views')
    .option('--dry-run', 'Preview sync changes without applying')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runSyncCommand(context, dependencies);
    });
}
