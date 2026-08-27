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
import { inventoryScopedPack } from '@commands/tools/shared/pack-inventory';
import type { PackReconcileOperation } from '@commands/tools/shared/pack-reconcile';
import { writeScopedPackIntent } from '@commands/tools/shared/scoped-pack-intent';
import type { PackName } from '@commands/tools/shared/types';
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

const PACK_NAMES = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
] as const satisfies readonly PackName[];

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
        projects: { root: '.oat/projects/shared' },
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
      sync: async ({ scope, changedCanonicalPaths }) =>
        runSync({
          context: runtime.context,
          scope,
          installedCanonicalPaths: changedCanonicalPaths,
        }),
    },
  });
}

async function defaultCompleteSourceRemoval(
  destination: PackMigrationOutcome,
  input: CompleteMigrationSourceRemovalInput,
  runtime: MigrationCommandRuntime,
): Promise<PackMigrationOutcome> {
  const preview = destination.preview;
  return completeMigrationSourceRemoval(destination, input, {
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
      sync: async ({ scope, changedCanonicalPaths }) =>
        runSync({
          context: runtime.context,
          scope,
          removedCanonicalPaths: changedCanonicalPaths,
        }),
    },
  });
}

const defaultDependencies: MigrationCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  inventory: inventoryScopedPack,
  plan: planPackMigration,
  executeDestination: defaultExecuteDestination,
  completeSourceRemoval: defaultCompleteSourceRemoval,
  confirmAction,
};

function isPackName(value: string): value is PackName {
  return PACK_NAMES.includes(value as PackName);
}

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
  context.logger.info(`Additions: ${preview.additions.length}`);
  context.logger.info(`Duplicates: ${preview.duplicates.length}`);
  context.logger.info(`Conflicts: ${preview.conflicts.length}`);
  context.logger.info(`Source removals: ${preview.removals.length}`);
  context.logger.info(`Retained owner data: ${preview.retained.length}`);
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
  } else if (outcome.status === 'source-removal-failed') {
    context.logger.error(
      `Destination is verified, but ${outcome.preview.from} source removal did not complete.`,
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
    .requiredOption('--pack <pack>', 'Pack to migrate')
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
        const [sourceInventory, destinationInventory] = await Promise.all([
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
        });
      } catch (error) {
        emitError(error, context, 1);
        return;
      }

      if (options.dryRun) {
        const outcome: PackMigrationOutcome = {
          preview,
          status: 'previewed',
        };
        if (context.json) emitOutcome(outcome, true, context);
        else renderPreview(preview, context);
        process.exitCode = 0;
        return;
      }

      if (!context.json) renderPreview(preview, context);
      try {
        const runtime = { context, assetsRoot };
        const destination = await dependencies.executeDestination(
          preview,
          destinationRoot,
          runtime,
        );
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
          outcome.status === 'source-removal-failed'
            ? 2
            : confirmation === 'non-interactive'
              ? 1
              : 0;
      } catch (error) {
        emitError(error, context, 2);
      }
    });
}
