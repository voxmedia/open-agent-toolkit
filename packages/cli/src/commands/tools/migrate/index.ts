import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { confirmAction } from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { dependencyRetainedAssetIds } from '@commands/tools/shared/pack-dependencies';
import { inventoryScopedPack } from '@commands/tools/shared/pack-inventory';
import { reconcilePackDependencyLifecycles } from '@commands/tools/shared/pack-lifecycle';
import { isPackName, PACK_NAMES } from '@commands/tools/shared/pack-manifest';
import {
  resolveSharedOwnerRetentions,
  type PackReconcileOperation,
  type ResolveSharedOwnerRetentionsInput,
} from '@commands/tools/shared/pack-reconcile';
import {
  hasScopedPackOwnershipEvidence,
  readScopedPackIntent,
  writeScopedPackIntent,
} from '@commands/tools/shared/scoped-pack-intent';
import { readOatConfig, writeOatConfig } from '@config/oat-config';
import { CliError } from '@errors/index';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import type { ConcreteScope } from '@shared/types';
import { Command, Option } from 'commander';

import {
  completeMigrationSourceRemoval,
  executeMigrationDestination,
  planPackMigration,
  type CompleteMigrationSourceRemovalInput,
  type PackMigrationOutcome,
  type PackMigrationPreview,
  type PlanPackMigrationInput,
} from './migrate-pack';

interface MigrationCommandRuntime {
  context: CommandContext;
  assetsRoot: string;
}

export interface MigrationCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: ConcreteScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  inventory: typeof inventoryScopedPack;
  resolveSharedRetentions: (
    input: ResolveSharedOwnerRetentionsInput,
  ) => ReturnType<typeof resolveSharedOwnerRetentions>;
  plan: (input: PlanPackMigrationInput) => PackMigrationPreview;
  executeDestination: (
    preview: PackMigrationPreview,
    destinationRoot: string,
    runtime: MigrationCommandRuntime,
  ) => Promise<PackMigrationOutcome>;
  completeSourceRemoval: (
    destination: PackMigrationOutcome,
    input: CompleteMigrationSourceRemovalInput,
    runtime: MigrationCommandRuntime,
  ) => Promise<PackMigrationOutcome>;
  confirmAction: typeof confirmAction;
}

async function runSync(input: {
  context: CommandContext;
  scope: ConcreteScope;
  installedCanonicalPaths?: readonly string[];
  removedCanonicalPaths?: readonly string[];
}): Promise<void> {
  const args = [
    ...process.execArgv,
    process.argv[1]!,
    '--cwd',
    input.context.cwd,
    'sync',
    '--scope',
    input.scope,
  ];
  for (const path of input.installedCanonicalPaths ?? []) {
    args.push('--install-canonical', path);
  }
  for (const path of input.removedCanonicalPaths ?? []) {
    args.push('--remove-canonical', path);
  }
  await new Promise<void>((resolve, reject) => {
    execFile(process.execPath, args, { cwd: input.context.cwd }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function writeGenerated(
  scopeRoot: string,
  operation: Extract<PackReconcileOperation, { kind: 'write-generated' }>,
): Promise<void> {
  await mkdir(dirname(operation.destination), { recursive: true });
  switch (operation.generation) {
    case 'projects-root-default':
      await writeFile(operation.destination, '.oat/projects/shared\n', 'utf8');
      return;
    case 'projects-config-default': {
      const config = await readOatConfig(scopeRoot);
      if (config.projects?.root?.trim()) return;
      await writeOatConfig(scopeRoot, {
        ...config,
        projects: { ...config.projects, root: '.oat/projects/shared' },
      });
      return;
    }
    case 'empty-file':
      await writeFile(operation.destination, '', 'utf8');
  }
}

async function defaultExecuteDestination(
  preview: PackMigrationPreview,
  destinationRoot: string,
  runtime: MigrationCommandRuntime,
): Promise<PackMigrationOutcome> {
  return executeMigrationDestination(preview, destinationRoot, {
    acquireDependencies: async () =>
      reconcilePackDependencyLifecycles({
        pack: preview.pack,
        scope: preview.to,
        scopeRoot: destinationRoot,
        assetsRoot: runtime.assetsRoot,
        action: 'migrate-destination',
      }),
    applyDependencies: {
      writeGenerated: async (operation) =>
        writeGenerated(destinationRoot, operation),
      writeIntent: async (operation) =>
        writeScopedPackIntent({
          pack: operation.pack,
          scope: operation.scope,
          scopeRoot: destinationRoot,
          enabled: operation.enabled,
        }),
      inventory: async () =>
        inventoryScopedPack({
          pack: preview.pack,
          scope: preview.to,
          scopeRoot: destinationRoot,
          assetsRoot: runtime.assetsRoot,
        }),
    },
    sync: async ({ scope, canonicalPaths }) =>
      runSync({
        context: runtime.context,
        scope,
        installedCanonicalPaths: canonicalPaths,
      }),
  });
}

async function defaultCompleteSourceRemoval(
  destination: PackMigrationOutcome,
  input: CompleteMigrationSourceRemovalInput,
  runtime: MigrationCommandRuntime,
): Promise<PackMigrationOutcome> {
  const preview = destination.preview;
  return completeMigrationSourceRemoval(destination, input, {
    releaseDependencies: async () =>
      reconcilePackDependencyLifecycles({
        pack: preview.pack,
        scope: preview.from,
        scopeRoot: input.sourceRoot,
        assetsRoot: runtime.assetsRoot,
        action: 'remove',
      }),
    inventory: async () =>
      inventoryScopedPack({
        pack: preview.pack,
        scope: preview.from,
        scopeRoot: input.sourceRoot,
        assetsRoot: runtime.assetsRoot,
      }),
    applyDependencies: {
      writeGenerated: async (operation) =>
        writeGenerated(input.sourceRoot, operation),
      writeIntent: async (operation) =>
        writeScopedPackIntent({
          pack: operation.pack,
          scope: operation.scope,
          scopeRoot: input.sourceRoot,
          enabled: operation.enabled,
        }),
    },
    resolveSourceRetentions: async () =>
      resolveSharedOwnerRetentions({
        packs: [preview.pack],
        scope: preview.from,
        scopeRoot: input.sourceRoot,
        hasOwnershipEvidence: async (pack, scope, scopeRoot) =>
          hasScopedPackOwnershipEvidence({ pack, scope, scopeRoot }),
      }),
    resolveRetainedDependencyAssetIds: async () => {
      const intent = await readScopedPackIntent({
        pack: preview.pack,
        scope: preview.from,
        scopeRoot: input.sourceRoot,
      });
      return dependencyRetainedAssetIds(preview.pack, intent.requiredBy);
    },
    sync: async ({ scope, canonicalPaths }) =>
      runSync({
        context: runtime.context,
        scope,
        removedCanonicalPaths: canonicalPaths,
      }),
  });
}

const defaultDependencies: MigrationCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  inventory: inventoryScopedPack,
  resolveSharedRetentions: resolveSharedOwnerRetentions,
  plan: planPackMigration,
  executeDestination: defaultExecuteDestination,
  completeSourceRemoval: defaultCompleteSourceRemoval,
  confirmAction,
};

async function resolveMigrationScopeRoot(
  scope: ConcreteScope,
  context: CommandContext,
  dependencies: MigrationCommandDependencies,
): Promise<string> {
  return scope === 'project'
    ? dependencies.resolveProjectRoot(context.cwd)
    : dependencies.resolveScopeRoot(scope, context.cwd, context.home);
}

function renderPreview(
  preview: PackMigrationPreview,
  context: CommandContext,
): void {
  context.logger.info(
    `Migration preview: ${preview.pack} (${preview.from} -> ${preview.to})`,
  );
  const groups = [
    ['Additions', preview.additions],
    ['Duplicates', preview.duplicates],
    ['Conflicts', preview.conflicts],
    ['Source removals', preview.removals],
    ['Retained owner data', preview.retained],
  ] as const;
  for (const [label, entries] of groups) {
    context.logger.info(`${label}: ${entries.length}`);
    for (const entry of entries) {
      context.logger.info(
        `  - ${entry.assetId} [${entry.kind}] ${entry.scope} ${entry.status}: ${entry.path}${entry.reason ? ` (${entry.reason})` : ''}`,
      );
    }
  }
  for (const diagnostic of preview.diagnostics) {
    context.logger.info(
      `Diagnostic ${diagnostic.code}: ${diagnostic.message} (${diagnostic.paths.join(', ')})`,
    );
  }
}

function emitOutcome(
  outcome: PackMigrationOutcome,
  dryRun: boolean,
  context: CommandContext,
): void {
  if (context.json) {
    context.logger.json({
      operation: 'migrate',
      dryRun,
      ...outcome,
    });
    return;
  }
  if (outcome.status === 'migrated') {
    context.logger.success(
      `Migrated ${outcome.preview.pack} from ${outcome.preview.from} to ${outcome.preview.to}.`,
    );
  } else if (outcome.status === 'retained-both') {
    context.logger.warn(
      `Destination is verified; ${outcome.preview.pack} remains installed at both scopes.`,
    );
  } else if (outcome.status === 'blocked') {
    context.logger.error('Migration is blocked by destination conflicts.');
  } else if (
    outcome.status === 'source-removal-failed' ||
    outcome.status === 'source-sync-failed'
  ) {
    context.logger.error(
      `Destination is verified, but ${outcome.preview.from} source removal did not complete.`,
    );
  } else if (outcome.status === 'destination-sync-failed') {
    context.logger.error(
      `Destination canonical files are verified, but provider sync did not complete; source was retained.`,
    );
  }
  for (const recovery of outcome.recovery ?? []) {
    context.logger.info(recovery);
  }
}

function emitError(error: unknown, context: CommandContext, exitCode: 1 | 2) {
  const message = error instanceof Error ? error.message : String(error);
  if (context.json) {
    context.logger.json({ status: 'error', operation: 'migrate', message });
  } else {
    context.logger.error(message);
  }
  process.exitCode = error instanceof CliError ? error.exitCode : exitCode;
}

export function createToolsMigrateCommand(
  dependencies: MigrationCommandDependencies = defaultDependencies,
): Command {
  return new Command('migrate')
    .description('Move an installed tool pack between scopes safely')
    .addOption(
      new Option('--pack <pack>', 'Pack to migrate')
        .choices([...PACK_NAMES])
        .makeOptionMandatory(),
    )
    .addOption(
      new Option('--from <scope>', 'Source scope')
        .choices(['project', 'user'])
        .makeOptionMandatory(),
    )
    .addOption(
      new Option('--to <scope>', 'Destination scope')
        .choices(['project', 'user'])
        .makeOptionMandatory(),
    )
    .option('--dry-run', 'Preview migration without applying')
    .action(async (options, command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const packValue = String(options.pack);
      if (!isPackName(packValue)) {
        emitError(new Error(`Unknown tool pack: ${packValue}`), context, 1);
        return;
      }
      const pack = packValue;
      const from = options.from as ConcreteScope;
      const to = options.to as ConcreteScope;
      let sourceRoot: string;
      let destinationRoot: string;
      let assetsRoot: string;
      let preview: PackMigrationPreview;
      try {
        [sourceRoot, destinationRoot, assetsRoot] = await Promise.all([
          resolveMigrationScopeRoot(from, context, dependencies),
          resolveMigrationScopeRoot(to, context, dependencies),
          dependencies.resolveAssetsRoot(),
        ]);
        const [sourceInventory, destinationInventory, sourceRetentions] =
          await Promise.all([
            dependencies.inventory({
              pack,
              scope: from,
              scopeRoot: sourceRoot,
              assetsRoot,
            }),
            dependencies.inventory({
              pack,
              scope: to,
              scopeRoot: destinationRoot,
              assetsRoot,
            }),
            dependencies.resolveSharedRetentions({
              packs: [pack],
              scope: from,
              scopeRoot: sourceRoot,
              hasOwnershipEvidence: async (owner, scope, root) =>
                hasScopedPackOwnershipEvidence({
                  pack: owner,
                  scope,
                  scopeRoot: root,
                }),
            }),
          ]);
        preview = dependencies.plan({
          pack,
          from,
          to,
          sourceRoot,
          destinationRoot,
          assetsRoot,
          sourceInventory,
          destinationInventory,
          sourceRetentions,
        });
      } catch (error) {
        emitError(error, context, 1);
        return;
      }

      if (options.dryRun) {
        const outcome: PackMigrationOutcome = {
          preview,
          status: preview.status === 'blocked' ? 'blocked' : 'previewed',
        };
        if (context.json) emitOutcome(outcome, true, context);
        else renderPreview(preview, context);
        process.exitCode = preview.status === 'blocked' ? 1 : 0;
        return;
      }

      if (!context.json) renderPreview(preview, context);
      if (preview.status === 'blocked') {
        const outcome: PackMigrationOutcome = { preview, status: 'blocked' };
        emitOutcome(outcome, false, context);
        process.exitCode = 1;
        return;
      }
      try {
        const runtime = { context, assetsRoot };
        const destination = await dependencies.executeDestination(
          preview,
          destinationRoot,
          runtime,
        );
        if (destination.status === 'destination-sync-failed') {
          emitOutcome(destination, false, context);
          process.exitCode = 2;
          return;
        }
        const confirmation = context.interactive
          ? (await dependencies.confirmAction(
              `Destination verified. Remove ${pack} from ${from} scope?`,
              context,
            ))
            ? 'confirmed'
            : 'declined'
          : 'non-interactive';
        const outcome = await dependencies.completeSourceRemoval(
          destination,
          { confirmation, sourceRoot, assetsRoot },
          runtime,
        );
        emitOutcome(outcome, false, context);
        process.exitCode =
          outcome.status === 'source-removal-failed' ||
          outcome.status === 'source-sync-failed'
            ? 2
            : confirmation === 'non-interactive'
              ? 1
              : 0;
      } catch (error) {
        emitError(error, context, 2);
      }
    });
}
