import { execFile } from 'node:child_process';
import { join } from 'node:path';

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
import type { PackName, ToolInfo } from '@commands/tools/shared/types';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  type UpdateTarget,
  type UpdateResult,
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

const VALID_PACKS = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
] as const;

export function createToolsUpdateCommand(
  dependencies: UpdateToolsDependencies = defaultDependencies,
  syncDependencies: AutoSyncDependencies = defaultSyncDependencies,
): Command {
  return new Command('update')
    .description('Update installed tools to bundled versions')
    .argument('[name]', 'Tool name to update')
    .option(
      '--pack <pack>',
      'Update all tools in a pack (core|ideas|docs|workflows|utility|project-management|research)',
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

      // Refresh ~/.oat/docs/ when the core pack is explicitly updated or
      // reconciled through --all (D3 requirement).
      if (shouldRefreshCoreDocs(target, result) && !dryRun) {
        const assetsRoot = await dependencies.resolveAssetsRoot();
        const userRoot = await dependencies.resolveScopeRoot(
          'user',
          context.cwd,
          context.home,
        );
        const docsSource = join(assetsRoot, 'docs');
        const docsDestination = join(userRoot, '.oat', 'docs');
        await dependencies.copyDirWithStatus(docsSource, docsDestination, true);
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
        for (const tool of result.updated) {
          logger.success(formatUpdatedToolMessage(tool, dryRun));
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

export function shouldRefreshCoreDocs(
  target: UpdateTarget,
  result: UpdateResult,
): boolean {
  if (target.kind === 'name') return false;
  if (target.kind === 'pack') return target.pack === 'core';

  return [...result.updated, ...result.current, ...result.newer].some(
    (tool) => tool.pack === 'core',
  );
}

export function formatUpdatedToolMessage(
  tool: ToolInfo,
  dryRun: boolean,
): string {
  if (tool.version === null) {
    return `${dryRun ? 'Would install' : 'Installed'}: ${tool.name}`;
  }

  return `${dryRun ? 'Would update' : 'Updated'}: ${tool.name} (${tool.version} -> ${tool.bundledVersion ?? '?'})`;
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
