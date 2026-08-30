import { resolve } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { resolvePjmAdoption } from '@commands/pjm/adoption';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/index';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { initializeDecisionAgentsGuidance } from './agents-guidance';
import { initializeDecisionRecords } from './init';
import { migrateDecisionRecords } from './migrate';
import { createDecisionRecord } from './new';
import { regenerateDecisionIndex } from './regenerate-index';

interface InitOptions {
  decisionsRoot?: string;
}

interface RegenerateOptions {
  decisionsRoot?: string;
}

interface NewOptions {
  decisionsRoot?: string;
  status?: string;
  context?: string;
  decision?: string;
  consequences?: string;
  createdAt?: string;
}

interface MigrateOptions {
  referenceRoot?: string;
  dryRun?: boolean;
  deleteLegacy?: boolean;
}

interface DecisionCommandDependencies {
  buildCommandContext: typeof buildCommandContext;
  resolveProjectRoot: typeof resolveProjectRoot;
  resolveAssetsRoot: typeof resolveAssetsRoot;
  resolvePjmAdoption: typeof resolvePjmAdoption;
  initializeDecisionAgentsGuidance: typeof initializeDecisionAgentsGuidance;
  initializeDecisionRecords: typeof initializeDecisionRecords;
  regenerateDecisionIndex: typeof regenerateDecisionIndex;
  createDecisionRecord: typeof createDecisionRecord;
  migrateDecisionRecords: typeof migrateDecisionRecords;
}

const DEFAULT_DEPENDENCIES: DecisionCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveAssetsRoot,
  resolvePjmAdoption,
  initializeDecisionAgentsGuidance,
  initializeDecisionRecords,
  regenerateDecisionIndex,
  createDecisionRecord,
  migrateDecisionRecords,
};

async function resolveDecisionsRoot(
  context: CommandContext,
  projectRoot: string,
  configuredRoot?: string,
): Promise<string> {
  if (configuredRoot) {
    return resolve(context.cwd, configuredRoot);
  }

  return resolve(projectRoot, '.oat', 'repo', 'reference', 'decisions');
}

async function resolveReferenceRoot(
  context: CommandContext,
  projectRoot: string,
  configuredRoot?: string,
): Promise<string> {
  if (configuredRoot) {
    return resolve(context.cwd, configuredRoot);
  }

  return resolve(projectRoot, '.oat', 'repo', 'reference');
}

function reportError(context: CommandContext, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (context.json) {
    context.logger.json({ status: 'error', message });
  } else {
    context.logger.error(message);
  }
  process.exitCode = 1;
}

async function requireRepositoryPjm(
  context: CommandContext,
  dependencies: DecisionCommandDependencies,
): Promise<string> {
  const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
  const repoRoot = resolve(projectRoot, '.oat', 'repo');
  const adoption = await dependencies.resolvePjmAdoption({
    projectRoot,
    repoRoot,
  });
  if (adoption.state !== 'declared' && adoption.state !== 'inferred-legacy') {
    throw new CliError(
      `PJM is not initialized for repository ${repoRoot}. Run \`oat pjm init\` before writing PJM state.`,
      1,
    );
  }
  return projectRoot;
}

export function createDecisionCommand(
  overrides: Partial<DecisionCommandDependencies> = {},
): Command {
  const dependencies: DecisionCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const cmd = new Command('decision').description(
    'Manage file-backed decision records and indexes',
  );

  cmd
    .command('init')
    .description('Scaffold the canonical decision directory and index')
    .option(
      '--decisions-root <path>',
      'Decisions root directory (defaults to .oat/repo/reference/decisions)',
    )
    .action(async (options: InitOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await requireRepositoryPjm(context, dependencies);
        const decisionsRoot = await resolveDecisionsRoot(
          context,
          projectRoot,
          options.decisionsRoot,
        );
        const result =
          await dependencies.initializeDecisionRecords(decisionsRoot);
        let guidance;
        try {
          guidance = await dependencies.initializeDecisionAgentsGuidance({
            projectRoot,
            decisionsRoot,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `Decision index initialized at ${result.decisionsRoot}, but AGENTS.md guidance could not be written: ${message}. Fix the guidance write error and rerun \`oat decision init\`.`,
            { cause: error },
          );
        }

        if (context.json) {
          context.logger.json({ status: 'ok', ...result, guidance });
        } else {
          context.logger.info(
            `Initialized decision scaffold at ${result.decisionsRoot}`,
          );
          if (result.created.length > 0) {
            context.logger.info(`Created: ${result.created.join(', ')}`);
          }
          if (result.skipped.length > 0) {
            context.logger.info(
              `Skipped existing: ${result.skipped.join(', ')}`,
            );
          }
          context.logger.info(
            `AGENTS.md guidance: root=${guidance.root}, decisions=${guidance.scoped}`,
          );
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  cmd
    .command('regenerate-index')
    .description('Regenerate the managed decision index table')
    .option(
      '--decisions-root <path>',
      'Decisions root directory (defaults to .oat/repo/reference/decisions)',
    )
    .action(async (options: RegenerateOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await requireRepositoryPjm(context, dependencies);
        const decisionsRoot = await resolveDecisionsRoot(
          context,
          projectRoot,
          options.decisionsRoot,
        );
        await dependencies.regenerateDecisionIndex(decisionsRoot);

        if (context.json) {
          context.logger.json({ status: 'ok', decisionsRoot });
        } else {
          context.logger.info(`Regenerated decision index at ${decisionsRoot}`);
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  cmd
    .command('new')
    .description('Create a new file-backed decision record')
    .argument('<title>', 'Decision title')
    .option(
      '--decisions-root <path>',
      'Decisions root directory (defaults to .oat/repo/reference/decisions)',
    )
    .option('--status <status>', 'Decision status', 'proposed')
    .option('--context <text>', 'Initial context body text')
    .option('--decision <text>', 'Initial decision body text')
    .option('--consequences <text>', 'Initial consequences body text')
    .option(
      '--created-at <timestamp>',
      'Creation timestamp seed for reproducible ID generation',
    )
    .action(async (title: string, options: NewOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await requireRepositoryPjm(context, dependencies);
        const decisionsRoot = await resolveDecisionsRoot(
          context,
          projectRoot,
          options.decisionsRoot,
        );
        const assetsRoot = await dependencies.resolveAssetsRoot();
        const result = await dependencies.createDecisionRecord({
          decisionsRoot,
          assetsRoot,
          templatesRoot: resolve(projectRoot, '.oat', 'templates'),
          home: context.home,
          title,
          status: options.status,
          context: options.context,
          decision: options.decision,
          consequences: options.consequences,
          createdAt: options.createdAt,
        });

        if (context.json) {
          context.logger.json({ status: 'ok', ...result });
        } else {
          context.logger.info(`Created decision record ${result.id}`);
          context.logger.info(`Wrote ${result.filePath}`);
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  cmd
    .command('migrate')
    .description('Migrate legacy decision-record.md into decision records')
    .option(
      '--reference-root <path>',
      'Reference root directory (defaults to .oat/repo/reference)',
    )
    .option('--dry-run', 'Print legacy-to-new mappings without writing files')
    .option(
      '--delete-legacy',
      'Delete decision-record.md after a verified migration',
    )
    .action(async (options: MigrateOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
        const referenceRoot = await resolveReferenceRoot(
          context,
          projectRoot,
          options.referenceRoot,
        );
        const result = await dependencies.migrateDecisionRecords({
          referenceRoot,
          dryRun: options.dryRun ?? false,
          deleteLegacy: options.deleteLegacy ?? false,
        });

        if (context.json) {
          context.logger.json({ status: 'ok', ...result });
        } else if (!result.legacyPresent) {
          // Absent-file no-op (F4): a prior `pjm migrate` already migrated and
          // removed decision-record.md. Report a friendly no-op, not a throw.
          context.logger.info(
            result.message ??
              'Nothing to migrate; no legacy decision-record.md found.',
          );
        } else {
          context.logger.info(
            result.dryRun
              ? `Decision migration dry run for ${result.referenceRoot}`
              : `Migrated decisions into ${result.decisionsRoot}`,
          );
          for (const mapping of result.mappings) {
            context.logger.info(
              `${mapping.legacyId} -> ${mapping.id} (${mapping.filePath})`,
            );
          }
          if (result.deletedLegacy) {
            context.logger.info('Deleted legacy decision-record.md');
          }
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  return cmd;
}
