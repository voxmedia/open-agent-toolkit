import { execFile } from 'node:child_process';
import { buildCommandContext } from '@app/command-context';
import {
  copyDirWithStatus,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
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
  type UpdateTarget,
  type UpdateToolsDependencies,
  updateTools,
} from './update-tools';

const defaultDependencies: UpdateToolsDependencies = {
  scanTools,
  resolveScopeRoot: async (scope, cwd, home) => {
    if (scope === 'project') return resolveProjectRoot(cwd);
    return resolveScopeRoot(scope, cwd, home);
  },
  resolveAssetsRoot,
  copyDirWithStatus,
  copyFileWithStatus,
};

const defaultSyncDependencies: AutoSyncDependencies = {
  runSync: async ({ scope, cwd }) => {
    await new Promise<void>((resolve, reject) => {
      execFile(
        process.execPath,
        [...process.execArgv, process.argv[1]!, 'sync', '--scope', scope],
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

export function createToolsUpdateCommand(
  dependencies: UpdateToolsDependencies = defaultDependencies,
  syncDependencies: AutoSyncDependencies = defaultSyncDependencies,
): Command {
  return new Command('update')
    .description('Update installed tools to bundled versions')
    .argument('[name]', 'Tool name to update')
    .option(
      '--pack <pack>',
      'Update all tools in a pack (ideas|workflows|utility)',
    )
    .option('--all', 'Update all outdated tools')
    .option('--dry-run', 'Preview updates without applying')
    .option('--no-sync', 'Skip auto-sync after update')
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
      const result = await updateTools(
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
      if (result.updated.length > 0 && !dryRun && opts.sync !== false) {
        const affectedScopes = [...new Set(result.updated.map((t) => t.scope))];
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

      if (result.updated.length > 0) {
        const verb = dryRun ? 'Would update' : 'Updated';
        for (const tool of result.updated) {
          logger.success(
            `${verb}: ${tool.name} (${tool.version ?? '?'} -> ${tool.bundledVersion ?? '?'})`,
          );
        }
      }

      for (const tool of result.current) {
        logger.info(`Already current: ${tool.name} (${tool.version ?? '?'})`);
      }

      for (const tool of result.newer) {
        logger.info(
          `Newer than bundled: ${tool.name} (${tool.version ?? '?'} > ${tool.bundledVersion ?? '?'})`,
        );
      }

      for (const tool of result.notBundled) {
        logger.info(`Not bundled (custom): ${tool.name}`);
      }

      if (result.updated.length === 0) {
        logger.info('No tools to update.');
      }
    });
}

function resolveTarget(
  name: string | undefined,
  pack: string | undefined,
  all: boolean | undefined,
): UpdateTarget | null {
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

function describeTarget(target: UpdateTarget): string {
  switch (target.kind) {
    case 'name':
      return target.name;
    case 'pack':
      return `pack:${target.pack}`;
    case 'all':
      return 'all';
  }
}
