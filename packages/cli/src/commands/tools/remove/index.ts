import { execFile } from 'node:child_process';
import { rm, unlink } from 'node:fs/promises';
import { buildCommandContext } from '@app/command-context';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import {
  type AutoSyncDependencies,
  autoSync,
} from '@commands/tools/shared/auto-sync';
import { scanTools } from '@commands/tools/shared/scan-tools';
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
    await unlink(path);
  },
};

const defaultSyncDependencies: AutoSyncDependencies = {
  runSync: async ({ scope, cwd }) => {
    await new Promise<void>((resolve, reject) => {
      execFile(
        process.execPath,
        [
          ...process.execArgv,
          process.argv[1]!,
          'sync',
          '--apply',
          '--scope',
          scope,
        ],
        { cwd },
        (error) => {
          if (error) reject(error);
          else resolve();
        },
      );
    });
  },
};

const VALID_PACKS = ['ideas', 'workflows', 'utility'] as const;

export function createToolsRemoveCommand(
  dependencies: RemoveToolsDependencies = defaultDependencies,
  syncDependencies: AutoSyncDependencies = defaultSyncDependencies,
): Command {
  return new Command('remove')
    .description('Remove installed tools')
    .argument('[name]', 'Tool name to remove')
    .option(
      '--pack <pack>',
      'Remove all tools in a pack (ideas|workflows|utility)',
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
      if (result.removed.length > 0 && !dryRun && opts.sync !== false) {
        const affectedScopes = [...new Set(result.removed.map((t) => t.scope))];
        await autoSync(
          affectedScopes,
          context.cwd,
          context.home,
          logger,
          syncDependencies,
        );
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
