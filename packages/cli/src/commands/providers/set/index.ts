import { join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import type { ProvidersSetDependencies } from '@commands/providers/providers.types';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  DEFAULT_SYNC_CONFIG,
  loadSyncConfig,
  type SyncConfig,
  saveSyncConfig,
} from '@config/index';
import {
  getUserSyncConfigPath,
  resolveUserSyncConfig,
  updateUserSyncConfig,
} from '@config/user-sync-config';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import {
  getProviderRegistrations,
  resolveProviderScopeContext,
} from '@providers/shared';
import { Command, Option } from 'commander';

interface ProvidersSetOptions {
  enabled?: string;
  disabled?: string;
}

type ContextualSetDependencies = ProvidersSetDependencies & {
  resolveProviderScopeContext?: typeof resolveProviderScopeContext;
  resolveUserSyncConfig?: typeof resolveUserSyncConfig;
  updateUserSyncConfig?: typeof updateUserSyncConfig;
};

function parseCsvList(raw?: string): string[] {
  if (!raw) {
    return [];
  }

  const parsed = raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return [...new Set(parsed)];
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '(none)';
}

function createDependencies(): ContextualSetDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }

      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    getAdapters() {
      return getProviderRegistrations().map(({ adapter }) => adapter);
    },
    async loadSyncConfig(configPath) {
      return loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
    },
    saveSyncConfig,
    resolveProviderScopeContext,
    resolveUserSyncConfig,
    updateUserSyncConfig,
  };
}

function buildUpdatedConfig(
  config: SyncConfig,
  enabledProviders: string[],
  disabledProviders: string[],
): SyncConfig {
  const providers = {
    ...config.providers,
  };

  for (const provider of enabledProviders) {
    providers[provider] = {
      ...(providers[provider] ?? {}),
      enabled: true,
    };
  }

  for (const provider of disabledProviders) {
    providers[provider] = {
      ...(providers[provider] ?? {}),
      enabled: false,
    };
  }

  return {
    ...config,
    providers,
  };
}

async function runProvidersSetCommand(
  context: CommandContext,
  options: ProvidersSetOptions,
  dependencies: ContextualSetDependencies,
): Promise<void> {
  try {
    if (context.scope === 'all') {
      throw new Error(
        'oat providers set requires one concrete scope. Pass --scope project or --scope user.',
      );
    }

    const enabledProviders = parseCsvList(options.enabled);
    const disabledProviders = parseCsvList(options.disabled);

    if (enabledProviders.length === 0 && disabledProviders.length === 0) {
      throw new Error(
        'No provider updates requested. Pass --enabled <providers> and/or --disabled <providers>.',
      );
    }

    const overlap = enabledProviders.filter((provider) =>
      disabledProviders.includes(provider),
    );
    if (overlap.length > 0) {
      throw new Error(
        `Providers cannot be both enabled and disabled: ${overlap.join(', ')}`,
      );
    }

    const scope = context.scope;
    const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
    const userConfigDir = join(scopeRoot, '.oat');
    const configPath =
      scope === 'user'
        ? getUserSyncConfigPath(userConfigDir)
        : join(scopeRoot, '.oat', 'sync', 'config.json');
    const config =
      scope === 'user' && dependencies.resolveUserSyncConfig
        ? await dependencies.resolveUserSyncConfig(userConfigDir)
        : await dependencies.loadSyncConfig(configPath);
    const providerContext = dependencies.resolveProviderScopeContext
      ? await dependencies.resolveProviderScopeContext({
          scope,
          scopeRoot,
          config,
        })
      : undefined;
    const knownProviders = providerContext
      ? providerContext.registrations.map(({ adapter }) => adapter.name)
      : dependencies.getAdapters().map((adapter) => adapter.name);
    const unknown = [...enabledProviders, ...disabledProviders].filter(
      (provider) => !knownProviders.includes(provider),
    );
    if (unknown.length > 0) {
      throw new Error(
        `Unknown providers: ${[...new Set(unknown)].join(', ')}. Known providers: ${knownProviders.join(', ')}`,
      );
    }

    const saved =
      scope === 'user' && dependencies.updateUserSyncConfig
        ? await dependencies.updateUserSyncConfig(userConfigDir, (current) =>
            buildUpdatedConfig(current, enabledProviders, disabledProviders),
          )
        : await dependencies.saveSyncConfig(
            configPath,
            buildUpdatedConfig(config, enabledProviders, disabledProviders),
          );

    if (context.json) {
      context.logger.json({
        status: 'ok',
        scope,
        configPath,
        enabled: enabledProviders,
        disabled: disabledProviders,
        providers: saved.providers,
      });
    } else {
      context.logger.info(`Updated provider configuration: ${configPath}`);
      context.logger.info(`Enabled: ${formatList(enabledProviders)}`);
      context.logger.info(`Disabled: ${formatList(disabledProviders)}`);
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createProvidersSetCommand(
  overrides: Partial<ContextualSetDependencies> = {},
): Command {
  const dependencies: ContextualSetDependencies = {
    ...createDependencies(),
    ...overrides,
  };
  if (
    overrides.resolveProviderScopeContext === undefined &&
    overrides.getAdapters !== undefined
  ) {
    dependencies.resolveProviderScopeContext = undefined;
  }

  return new Command('set')
    .description(
      "Enable or disable providers in the selected scope's sync config (project by default)",
    )
    .addOption(
      new Option(
        '--scope <scope>',
        'Sync config scope: project or user',
      ).default('project'),
    )
    .option('--enabled <providers>', 'Comma-separated providers to enable')
    .option('--disabled <providers>', 'Comma-separated providers to disable')
    .action(async (options: ProvidersSetOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runProvidersSetCommand(context, options, dependencies);
    });
}
