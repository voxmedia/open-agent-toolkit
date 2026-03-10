import { join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import type {
  ProviderListItem,
  ProviderListSummary,
  ProvidersListDependencies,
} from '@commands/providers/providers.types';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import { detectDrift } from '@drift/index';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { loadManifest } from '@manifest/index';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { geminiAdapter } from '@providers/gemini';
import { getSyncMappings } from '@providers/shared';
import type { ContentType } from '@shared/types';
import { Command } from 'commander';

function formatSummary(item: ProviderListItem): string {
  const contentTypes =
    item.contentTypes.length > 0 ? item.contentTypes.join('|') : 'none';
  return [
    item.detected ? 'detected' : 'not detected',
    `strategy=${item.defaultStrategy}`,
    `content_types=${contentTypes}`,
    `managed=${item.summary.managed}`,
    `in_sync=${item.summary.inSync}`,
    `drifted=${item.summary.drifted}`,
    `missing=${item.summary.missing}`,
  ].join(', ');
}

function formatList(items: ProviderListItem[]): string {
  if (items.length === 0) {
    return 'No provider adapters registered.';
  }

  const nameWidth = Math.max(
    'Provider'.length,
    ...items.map((item) => item.name.length),
  );
  const statusWidth = Math.max(
    'Status'.length,
    ...items.map(
      (item) => (item.detected ? 'detected' : 'not detected').length,
    ),
  );

  const header = [
    'Provider'.padEnd(nameWidth),
    'Status'.padEnd(statusWidth),
    'Summary',
  ].join('  ');
  const divider = [
    '-'.repeat(nameWidth),
    '-'.repeat(statusWidth),
    '-------',
  ].join('  ');

  const rows = items.map((item) => {
    const status = item.detected ? 'detected' : 'not detected';
    return [
      item.name.padEnd(nameWidth),
      status.padEnd(statusWidth),
      formatSummary(item),
    ].join('  ');
  });

  return [header, divider, ...rows].join('\n');
}

function createDependencies(): ProvidersListDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    getAdapters() {
      return [
        claudeAdapter,
        cursorAdapter,
        codexAdapter,
        copilotAdapter,
        geminiAdapter,
      ];
    },
    getSyncMappings,
    loadManifest,
    detectDrift,
  };
}

function createEmptySummary(): ProviderListSummary {
  return {
    managed: 0,
    inSync: 0,
    drifted: 0,
    missing: 0,
  };
}

async function collectProviderList(
  context: CommandContext,
  dependencies: ProvidersListDependencies,
): Promise<ProviderListItem[]> {
  const scopes = resolveConcreteScopes(context.scope);
  const scopeRoots = await Promise.all(
    scopes.map(async (scope) => ({
      scope,
      root: await dependencies.resolveScopeRoot(scope, context),
    })),
  );
  const manifestsByRoot = new Map<
    string,
    Awaited<ReturnType<typeof loadManifest>>
  >();

  for (const scopeRoot of scopeRoots) {
    const manifestPath = join(scopeRoot.root, '.oat', 'sync', 'manifest.json');
    manifestsByRoot.set(
      scopeRoot.root,
      await dependencies.loadManifest(manifestPath),
    );
  }

  const items: ProviderListItem[] = [];
  for (const adapter of dependencies.getAdapters()) {
    const summary = createEmptySummary();
    const contentTypes = new Set<ContentType>();
    for (const scope of scopes) {
      for (const mapping of dependencies.getSyncMappings(adapter, scope)) {
        contentTypes.add(mapping.contentType);
      }
    }
    let detected = false;

    for (const scopeRoot of scopeRoots) {
      if (await adapter.detect(scopeRoot.root)) {
        detected = true;
      }

      const manifest = manifestsByRoot.get(scopeRoot.root);
      if (!manifest) {
        continue;
      }

      for (const entry of manifest.entries) {
        if (entry.provider !== adapter.name) {
          continue;
        }

        summary.managed += 1;
        const report = await dependencies.detectDrift(entry, scopeRoot.root);
        if (report.state.status === 'in_sync') {
          summary.inSync += 1;
          continue;
        }
        if (report.state.status === 'missing') {
          summary.missing += 1;
          continue;
        }
        if (report.state.status === 'drifted') {
          summary.drifted += 1;
        }
      }
    }

    items.push({
      name: adapter.name,
      displayName: adapter.displayName,
      detected,
      defaultStrategy: adapter.defaultStrategy,
      contentTypes: [...contentTypes].sort(),
      summary,
    });
  }

  return items;
}

async function runListCommand(
  context: CommandContext,
  dependencies: ProvidersListDependencies,
): Promise<void> {
  const items = await collectProviderList(context, dependencies);

  if (context.json) {
    context.logger.json(items);
  } else {
    context.logger.info(formatList(items));
  }

  process.exitCode = 0;
}

export function createProvidersListCommand(
  overrides: Partial<ProvidersListDependencies> = {},
): Command {
  const dependencies: ProvidersListDependencies = {
    ...createDependencies(),
    ...overrides,
  };

  return new Command('list')
    .description('List provider adapters and sync summary')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runListCommand(context, dependencies);
    });
}
