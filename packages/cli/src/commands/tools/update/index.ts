import { execFile } from 'node:child_process';
import { chmod } from 'node:fs/promises';
import { join } from 'node:path';

import { buildCommandContext } from '@app/command-context';
import { applyOatCoreGitattributes } from '@commands/init/gitattributes';
import { applyOatCoreGitignore } from '@commands/init/gitignore';
import {
  copyDirWithStatus,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import {
  type AutoSyncResult,
  type AutoSyncDependencies,
  autoSync,
} from '@commands/tools/shared/auto-sync';
import { inventoryScopedPack } from '@commands/tools/shared/pack-inventory';
import { reconcilePackLifecycles } from '@commands/tools/shared/pack-lifecycle';
import {
  evaluatePackLifecycleOutcome,
  type PackLifecycleOutcome,
} from '@commands/tools/shared/pack-lifecycle-outcome';
import { reconcileProjectToolsConfig } from '@commands/tools/shared/project-tools-config';
import { scanTools } from '@commands/tools/shared/scan-tools';
import type { PackName, ToolInfo } from '@commands/tools/shared/types';
import { readOatConfig, writeOatConfig } from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';
import { fileExists } from '@fs/io';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  type UpdateTarget,
  type UpdateResult,
  type UpdateToolsDependencies,
  failedUpdateLifecycleOutcomes,
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
  fileExists,
  chmod,
  applyOatCoreGitignore,
  applyOatCoreGitattributes,
  inventoryScopedPack,
  reconcilePacks: reconcilePackLifecycles,
};

export function buildSyncSubprocessArgs(
  entrypoint: string,
  execArgv: string[],
  options: { cwd: string; scope: 'project' | 'user' },
): string[] {
  // `--scope` is a per-command option on `sync` (not a global flag), so it must
  // come AFTER the `sync` subcommand token. `--cwd` remains a global flag and
  // can precede the subcommand.
  return [
    ...execArgv,
    entrypoint,
    '--cwd',
    options.cwd,
    'sync',
    '--scope',
    options.scope,
  ];
}

const defaultSyncDependencies: AutoSyncDependencies = {
  runSync: async ({ scope, cwd }) => {
    await new Promise<void>((resolve, reject) => {
      execFile(
        process.execPath,
        buildSyncSubprocessArgs(process.argv[1]!, process.execArgv, {
          cwd,
          scope,
        }),
        { cwd: process.cwd() },
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
  'brainstorm',
] as const;

export function createToolsUpdateCommand(
  dependencies: UpdateToolsDependencies = defaultDependencies,
  syncDependencies: AutoSyncDependencies = defaultSyncDependencies,
): Command {
  return withScopeOption(new Command('update'))
    .description('Update installed tools to bundled versions')
    .argument('[name]', 'Tool name to update')
    .option(
      '--pack <pack>',
      'Update all tools in a pack (core|ideas|docs|workflows|utility|project-management|research|brainstorm)',
    )
    .option('--all', 'Update all outdated tools')
    .option('--dry-run', 'Preview updates without applying')
    .option('--no-sync', 'Skip auto-sync after update')
    .action(async (name: string | undefined, opts, command) => {
      const globalOptions = readGlobalOptions(command);
      const context = buildCommandContext(globalOptions);
      const { logger } = context;

      const targetResolution = resolveTarget(name, opts.pack, opts.all);
      if ('error' in targetResolution) {
        logger.error(targetResolution.error);
        process.exitCode = 1;
        return;
      }
      const target = targetResolution.target;

      const scopes = resolveConcreteScopes(context.scope);
      const dryRun = opts.dryRun ?? false;
      let result: UpdateResult;
      try {
        result = await updateTools(
          target,
          scopes,
          context.cwd,
          context.home,
          dryRun,
          dependencies,
        );
      } catch (error) {
        if (target.kind === 'name') throw error;
        const lifecycle = failedUpdateLifecycleOutcomes(target, scopes, error);
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) {
          logger.json({
            target: describeTarget(target),
            dryRun,
            result: createEmptyUpdateResult(),
            lifecycle,
          });
        } else {
          logger.error(`Pack update failed: ${message}`);
        }
        process.exitCode = 1;
        return;
      }
      const assetsRoot = dryRun ? null : await dependencies.resolveAssetsRoot();

      if (!dryRun && shouldBackfillWorkflowGitignore(result)) {
        const repoRoot = await resolveProjectRoot(context.cwd);
        if (dependencies.applyOatCoreGitignore) {
          const gitignoreResult =
            await dependencies.applyOatCoreGitignore(repoRoot);
          if (gitignoreResult.action !== 'no-change') {
            const verb =
              gitignoreResult.action === 'created' ? 'Created' : 'Updated';
            logger.info(
              `${verb} .gitignore OAT core section (${gitignoreResult.entries.length} entries).`,
            );
          }
          if (gitignoreResult.stateDashboardIndexAction === 'untracked') {
            logger.info(
              'Untracked generated dashboard from git index: .oat/state.md.',
            );
          }
        }
        if (dependencies.applyOatCoreGitattributes) {
          const gitattributesResult =
            await dependencies.applyOatCoreGitattributes(repoRoot);
          if (gitattributesResult.action !== 'no-change') {
            const verb =
              gitattributesResult.action === 'created' ? 'Created' : 'Updated';
            logger.info(
              `${verb} .gitattributes OAT core section (${gitattributesResult.entries.length} entries).`,
            );
          }
        }
      }

      // Refresh ~/.oat/docs/ when the core pack is explicitly updated or
      // reconciled through --all (D3 requirement).
      if (
        !dependencies.reconcilePacks &&
        shouldRefreshCoreDocs(target, result) &&
        assetsRoot
      ) {
        const userRoot = await dependencies.resolveScopeRoot(
          'user',
          context.cwd,
          context.home,
        );
        const docsSource = join(assetsRoot, 'docs');
        const docsDestination = join(userRoot, '.oat', 'docs');
        await dependencies.copyDirWithStatus(docsSource, docsDestination, true);
      }

      const changedProjectScope =
        [...result.updated, ...result.current, ...result.newer].some(
          ({ scope }) => scope === 'project',
        ) ||
        result.assetRefreshes.some(({ scope }) => scope === 'project') ||
        result.plans.some(({ scope }) => scope === 'project');
      let adoptedPacks: PackName[] = [];
      if (
        assetsRoot &&
        result.notInstalled.length === 0 &&
        changedProjectScope
      ) {
        const repoRoot = await resolveProjectRoot(context.cwd);
        adoptedPacks = (
          await reconcileProjectToolsConfig(
            {
              repoRoot,
              cwd: context.cwd,
              home: context.home,
            },
            {
              resolveAssetsRoot: dependencies.resolveAssetsRoot,
              scanTools: dependencies.scanTools,
              readOatConfig,
              writeOatConfig,
            },
          )
        ).adoptedPacks;
      }

      if (result.notInstalled.length > 0) {
        if (context.json) {
          logger.json({
            target: describeTarget(target),
            dryRun,
            result,
            ...(adoptedPacks.length > 0 ? { adoptedPacks } : {}),
          });
        } else {
          logger.error(`Tool '${result.notInstalled[0]}' not found.`);
        }
        process.exitCode = 1;
        return;
      }

      // Auto-sync after mutations (before output so sync errors are captured)
      const syncResults: AutoSyncResult[] = [];
      if (!dryRun && opts.sync !== false) {
        for (const scope of scopes) {
          const installedCanonicalPaths = [
            ...new Set(
              result.plans
                .filter((plan) => plan.scope === scope)
                .flatMap((plan) => plan.changedCanonicalPaths),
            ),
          ];
          const updatedAtScope = result.updated.some(
            (tool) => tool.scope === scope,
          );
          if (!updatedAtScope && installedCanonicalPaths.length === 0) continue;
          syncResults.push(
            await autoSync(
              [scope],
              context.cwd,
              context.home,
              logger,
              syncDependencies,
              { installedCanonicalPaths },
            ),
          );
        }
      }
      const lifecycle = finalizeUpdateLifecycle(result.lifecycle, syncResults);
      const legacyResult = { ...result };
      delete legacyResult.lifecycle;

      if (context.json) {
        logger.json({
          target: describeTarget(target),
          dryRun,
          result: legacyResult,
          ...(adoptedPacks.length > 0 ? { adoptedPacks } : {}),
          ...(lifecycle ? { lifecycle } : {}),
        });
        if (lifecycle?.some(({ status }) => status !== 'complete')) {
          process.exitCode = 1;
        }
        return;
      }

      for (const pack of adoptedPacks) {
        logger.info(`Adopted project tool pack: ${pack}`);
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

      for (const asset of result.assetRefreshes) {
        const action =
          asset.status === 'planned' ? 'Would refresh' : 'Refreshed';
        logger.info(
          `${action} ${asset.type}: ${asset.name} (${asset.scope} ${asset.pack} pack)`,
        );
      }

      if (dryRun) {
        for (const plan of result.plans) {
          logger.info(JSON.stringify(plan, null, 2));
        }
      }

      if (result.updated.length === 0 && result.assetRefreshes.length === 0) {
        logger.info('No tools to update.');
      }
      for (const outcome of lifecycle ?? []) {
        if (outcome.status === 'complete') continue;
        logger.warn(
          `Pack ${outcome.selection.pack} update ${outcome.status}: ${outcome.recovery.map(({ message }) => message).join('; ')}`,
        );
        process.exitCode = 1;
      }
    });
}

function createEmptyUpdateResult(): UpdateResult {
  return {
    updated: [],
    current: [],
    newer: [],
    notInstalled: [],
    notBundled: [],
    assetRefreshes: [],
    plans: [],
  };
}

function finalizeUpdateLifecycle(
  lifecycle: PackLifecycleOutcome[] | undefined,
  syncResults: readonly AutoSyncResult[],
): PackLifecycleOutcome[] | undefined {
  if (!lifecycle || syncResults.length === 0) return lifecycle;
  return lifecycle.map((outcome) => {
    const relevant = syncResults.filter(({ scopes }) =>
      scopes.some((scope) => outcome.selection.targetScopes.includes(scope)),
    );
    if (relevant.length === 0) return outcome;
    return evaluatePackLifecycleOutcome({
      selection: outcome.selection,
      lifecycle: outcome.canonical.results,
      sync: {
        scopes: [...new Set(relevant.flatMap(({ scopes }) => scopes))],
        status: relevant.every(({ synced }) => synced) ? 'complete' : 'failed',
        providers: [],
        ...(relevant.find(({ error }) => error)?.error
          ? { error: relevant.find(({ error }) => error)!.error! }
          : {}),
      },
      finalEvidence: outcome.finalEvidence,
    });
  });
}

/**
 * @internal Exported for focused unit coverage. Current/newer workflow tools
 * intentionally trigger this path so older installs can repair a missing OAT
 * core .gitignore section even when their workflow pack is already current.
 */
export function shouldBackfillWorkflowGitignore(result: UpdateResult): boolean {
  return (
    [...result.updated, ...result.current, ...result.newer].some(
      (tool) => tool.scope === 'project' && tool.pack === 'workflows',
    ) ||
    result.plans?.some(
      (plan) => plan.scope === 'project' && plan.pack === 'workflows',
    ) === true
  );
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

type TargetResolution = { target: UpdateTarget } | { error: string };

function resolveTarget(
  name: string | undefined,
  pack: string | undefined,
  all: boolean | undefined,
): TargetResolution {
  const specified = [name, pack, all].filter(Boolean).length;
  if (specified === 0) {
    return {
      error:
        'Specify a tool name, --pack <pack>, or --all. To update all tools, run: oat tools update --all',
    };
  }
  if (specified > 1) {
    return {
      error:
        'Specify exactly one update target: a tool name, --pack <pack>, or --all.',
    };
  }

  if (name) return { target: { kind: 'name', name } };
  if (pack) {
    if (!VALID_PACKS.includes(pack as PackName)) {
      return {
        error: `Invalid pack '${pack}'. Expected one of: ${VALID_PACKS.join(', ')}.`,
      };
    }
    return { target: { kind: 'pack', pack: pack as PackName } };
  }
  return { target: { kind: 'all' } };
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
