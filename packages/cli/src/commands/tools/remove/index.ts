import { execFile } from 'node:child_process';
import { lstat, rm } from 'node:fs/promises';
import { relative } from 'node:path';

import { buildCommandContext } from '@app/command-context';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import {
  type AutoSyncDependencies,
  autoSync,
} from '@commands/tools/shared/auto-sync';
import { reconcilePackLifecycles } from '@commands/tools/shared/pack-lifecycle';
import { scanTools } from '@commands/tools/shared/scan-tools';
import {
  hasScopedPackOwnershipEvidence,
  writeScopedPackIntent,
} from '@commands/tools/shared/scoped-pack-intent';
import type { PackName } from '@commands/tools/shared/types';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  type RemoveTarget,
  type RemoveToolsDependencies,
  removeTools,
} from './remove-tools';

const defaultDependencies: RemoveToolsDependencies = {
  scanTools,
  resolveScopeRoot: async (scope, cwd, home) => {
    if (scope === 'project') return resolveProjectRoot(cwd);
    return resolveScopeRoot(scope, cwd, home);
  },
  resolveAssetsRoot,
  removeDirectory: async (path) => {
    await rm(path, { recursive: true, force: true });
  },
  removeFile: async (path) => {
    await rm(path, { force: true });
  },
  pathExists: async (path) => {
    try {
      await lstat(path);
      return true;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return false;
      }
      throw error;
    }
  },
  hasPackOwnershipEvidence: async (pack, scope, scopeRoot) =>
    hasScopedPackOwnershipEvidence({ pack, scope, scopeRoot }),
  reconcilePacks: reconcilePackLifecycles,
};

const defaultSyncDependencies: AutoSyncDependencies = {
  runSync: async ({ scope, cwd, removedCanonicalPaths }) => {
    const args = [
      ...process.execArgv,
      process.argv[1]!,
      'sync',
      '--scope',
      scope,
    ];
    for (const canonicalPath of removedCanonicalPaths ?? []) {
      args.push('--remove-canonical', canonicalPath);
    }
    await new Promise<void>((resolve, reject) => {
      execFile(process.execPath, args, { cwd }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  },
};

const VALID_PACKS = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
] as const;

export function createToolsRemoveCommand(
  dependencies: RemoveToolsDependencies = defaultDependencies,
  syncDependencies: AutoSyncDependencies = defaultSyncDependencies,
): Command {
  return withScopeOption(new Command('remove'))
    .description('Remove installed tools')
    .argument('[name]', 'Tool name to remove')
    .option(
      '--pack <pack>',
      'Remove all tools in a pack (core|ideas|docs|workflows|utility|project-management|research|brainstorm)',
    )
    .option('--all', 'Remove all installed tools')
    .option('--dry-run', 'Preview removals without applying')
    .option('--no-sync', 'Skip auto-sync after removal')
    .action(async (name: string | undefined, opts, command) => {
      const globalOptions = readGlobalOptions(command);
      const context = buildCommandContext(globalOptions);
      const { logger } = context;

      const target = resolveTarget(name, opts.pack, opts.all);
      if (!target) {
        logger.error('Specify a tool name, --pack <pack>, or --all.');
        process.exitCode = 1;
        return;
      }

      const scopes = resolveConcreteScopes(context.scope);
      const dryRun = opts.dryRun ?? false;
      const result = await removeTools(
        target,
        scopes,
        context.cwd,
        context.home,
        dryRun,
        dependencies,
      );

      if (!dryRun && target.kind !== 'name' && !dependencies.reconcilePacks) {
        const packs = target.kind === 'pack' ? [target.pack] : [...VALID_PACKS];
        for (const scope of scopes) {
          const scopeRoot = await dependencies.resolveScopeRoot(
            scope,
            context.cwd,
            context.home,
          );
          for (const pack of packs) {
            // Durable scoped intent is what lets `oat tools update` restore a
            // pack whose files are all missing, so it may only be cleared for a
            // pack this run actually removed something for. A removal that
            // removed nothing reports nothing and must leave intent alone.
            const removedForPack = result.packOutcomes.some(
              (outcome) =>
                outcome.pack === pack &&
                outcome.scope === scope &&
                outcome.removed,
            );
            if (!removedForPack) continue;
            await writeScopedPackIntent({
              pack,
              scope,
              scopeRoot,
              enabled: false,
            });
          }
        }
      }

      if (result.notInstalled.length > 0) {
        if (context.json) {
          logger.json({ target: describeTarget(target), dryRun, result });
        } else {
          logger.error(`Tool '${result.notInstalled[0]}' not found.`);
        }
        process.exitCode = 1;
        return;
      }

      // Auto-sync after mutations (before output so sync errors are captured)
      if (!dryRun && opts.sync !== false) {
        for (const scope of scopes) {
          const scopeRoot = await dependencies.resolveScopeRoot(
            scope,
            context.cwd,
            context.home,
          );
          const removedCanonicalPaths = canonicalRemovalPaths(
            result,
            scope,
            scopeRoot,
          );
          if (removedCanonicalPaths.length === 0) continue;
          await autoSync(
            [scope],
            context.cwd,
            context.home,
            logger,
            syncDependencies,
            { removedCanonicalPaths },
          );
        }
      }

      if (context.json) {
        logger.json({ target: describeTarget(target), dryRun, result });
        return;
      }

      if (result.removed.length > 0) {
        const verb = dryRun ? 'Would remove' : 'Removed';
        for (const tool of result.removed) {
          logger.success(`${verb}: ${tool.name} (${tool.scope})`);
        }
      } else {
        logger.info('No tools to remove.');
      }
    });
}

function canonicalRemovalPaths(
  result: Awaited<ReturnType<typeof removeTools>>,
  scope: (typeof result.removedAssets)[number]['scope'],
  scopeRoot: string,
): string[] {
  const paths = result.removedAssets
    .filter((asset) => asset.scope === scope)
    .map((asset) => relative(scopeRoot, asset.path).replaceAll('\\', '/'))
    .filter((path) =>
      /^\.agents\/(?:skills\/[^/]+|agents\/[^/]+\.md)$/.test(path),
    );
  paths.push(
    ...result.removed
      .filter((tool) => tool.scope === scope)
      .map((tool) =>
        tool.type === 'skill'
          ? `.agents/skills/${tool.name}`
          : `.agents/agents/${tool.name}.md`,
      ),
  );
  return [...new Set(paths)];
}

function resolveTarget(
  name: string | undefined,
  pack: string | undefined,
  all: boolean | undefined,
): RemoveTarget | null {
  const specified = [name, pack, all].filter(Boolean).length;
  if (specified !== 1) return null;

  if (name) return { kind: 'name', name };
  if (pack) {
    if (!VALID_PACKS.includes(pack as PackName)) return null;
    return { kind: 'pack', pack: pack as PackName };
  }
  if (all) return { kind: 'all' };
  return null;
}

function describeTarget(target: RemoveTarget): string {
  switch (target.kind) {
    case 'name':
      return target.name;
    case 'pack':
      return `pack:${target.pack}`;
    case 'all':
      return 'all';
  }
}
