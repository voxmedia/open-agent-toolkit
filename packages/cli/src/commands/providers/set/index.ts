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
import { resolveProjectRoot } from '@fs/paths';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { cursorAdapter } from '@providers/cursor';
import { Command } from 'commander';

interface ProvidersSetOptions {
  enabled?: string;
  disabled?: string;
}

const PROJECT_SCOPE_ONLY_MESSAGE =
  'oat providers set currently supports only --scope project. Re-run with --scope project.';

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

function createDependencies(): ProvidersSetDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }

      throw new Error(PROJECT_SCOPE_ONLY_MESSAGE);
    },
    getAdapters() {
      return [claudeAdapter, cursorAdapter, codexAdapter];
    },
    async loadSyncConfig(configPath) {
      return loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
    },
    saveSyncConfig,
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
  dependencies: ProvidersSetDependencies,
): Promise<void> {
  try {
    if (context.scope !== 'project') {
      throw new Error(PROJECT_SCOPE_ONLY_MESSAGE);
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

    const knownProviders = dependencies
      .getAdapters()
      .map((adapter) => adapter.name);
    const unknown = [...enabledProviders, ...disabledProviders].filter(
      (provider) => !knownProviders.includes(provider),
    );
    if (unknown.length > 0) {
      throw new Error(
        `Unknown providers: ${[...new Set(unknown)].join(', ')}. Known providers: ${knownProviders.join(', ')}`,
      );
    }

    const scopeRoot = await dependencies.resolveScopeRoot('project', context);
    const configPath = join(scopeRoot, '.oat', 'sync', 'config.json');
    const config = await dependencies.loadSyncConfig(configPath);
    const updated = buildUpdatedConfig(
      config,
      enabledProviders,
      disabledProviders,
    );
    const saved = await dependencies.saveSyncConfig(configPath, updated);

    if (context.json) {
      context.logger.json({
        status: 'ok',
        scope: 'project',
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
  overrides: Partial<ProvidersSetDependencies> = {},
): Command {
  const dependencies: ProvidersSetDependencies = {
    ...createDependencies(),
    ...overrides,
  };

  return new Command('set')
    .description('Enable or disable project providers in sync config')
    .option('--enabled <providers>', 'Comma-separated providers to enable')
    .option('--disabled <providers>', 'Comma-separated providers to disable')
    .action(async (options: ProvidersSetOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runProvidersSetCommand(context, options, dependencies);
    });
}
