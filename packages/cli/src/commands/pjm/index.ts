import { resolve } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot } from '@fs/paths';
import { formatDoctorResults, type DoctorCheck } from '@ui/output';
import { Command } from 'commander';

import { resolvePjmAdoption } from './adoption';
import { runPjmDoctorChecks } from './doctor';
import { initializeRepoReference, INSTRUCTIONS_SYNC_HINT } from './init';
import { migratePjmRepo, readPjmMigrationPrompt } from './migrate';

interface InitOptions {
  repoRoot?: string;
}

interface DoctorOptions {
  repoRoot?: string;
}

interface MigrateOptions {
  repoRoot?: string;
  apply?: boolean;
  dryRun?: boolean;
  printPrompt?: boolean;
}

interface PjmCommandDependencies {
  buildCommandContext: typeof buildCommandContext;
  resolveProjectRoot: typeof resolveProjectRoot;
  resolveAssetsRoot: typeof resolveAssetsRoot;
  resolvePjmAdoption: typeof resolvePjmAdoption;
  initializeRepoReference: typeof initializeRepoReference;
  runPjmDoctorChecks: typeof runPjmDoctorChecks;
  migratePjmRepo: typeof migratePjmRepo;
  readPjmMigrationPrompt: typeof readPjmMigrationPrompt;
}

const DEFAULT_DEPENDENCIES: PjmCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveAssetsRoot,
  resolvePjmAdoption,
  initializeRepoReference,
  runPjmDoctorChecks,
  migratePjmRepo,
  readPjmMigrationPrompt,
};

async function resolveRepoRoot(
  context: CommandContext,
  projectRoot: string,
  configuredRoot?: string,
): Promise<string> {
  if (configuredRoot) {
    return resolve(context.cwd, configuredRoot);
  }

  return resolve(projectRoot, '.oat', 'repo');
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

function doctorStatus(checks: DoctorCheck[]): 'ok' | 'warn' | 'fail' {
  if (checks.some((check) => check.status === 'fail')) {
    return 'fail';
  }

  if (checks.some((check) => check.status === 'warn')) {
    return 'warn';
  }

  return 'ok';
}

function setDoctorExitCode(checks: DoctorCheck[]): void {
  const status = doctorStatus(checks);
  process.exitCode = status === 'fail' ? 2 : status === 'warn' ? 1 : 0;
}

function formatMigrationResult(
  result: Awaited<ReturnType<typeof migratePjmRepo>>,
): string {
  const lines = [
    `PJM migration ${result.dryRun ? 'dry run' : 'apply'} for ${result.repoRoot}`,
    `status: ${result.status}`,
  ];
  if (result.reason) {
    lines.push(`reason: ${result.reason}`);
  }

  if (result.actions.length > 0) {
    lines.push('actions:');
    for (const action of result.actions) {
      const pathSummary =
        action.source && action.target
          ? `${action.source} -> ${action.target}`
          : (action.source ?? action.target ?? '');
      lines.push(
        `- ${action.type} ${pathSummary} (${action.result}${action.reason ? `: ${action.reason}` : ''})`,
      );
    }
  }

  if (result.backlogMappings.length > 0) {
    lines.push('backlog mappings:');
    for (const mapping of result.backlogMappings) {
      lines.push(`- ${mapping.legacyId} -> ${mapping.id}`);
    }
  }

  if (result.decisionMappings.length > 0) {
    lines.push('decision mappings:');
    for (const mapping of result.decisionMappings) {
      lines.push(`- ${mapping.legacyId} -> ${mapping.id}`);
    }
  }

  return lines.join('\n');
}

export function createPjmCommand(
  overrides: Partial<PjmCommandDependencies> = {},
): Command {
  const dependencies: PjmCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const cmd = new Command('pjm').description(
    'Manage project-management repo reference docs',
  );

  cmd
    .command('init')
    .description('Scaffold the canonical PJM repo reference surface')
    .option(
      '--repo-root <path>',
      'PJM repo reference root directory (defaults to .oat/repo)',
    )
    .action(async (options: InitOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
        const repoRoot = await resolveRepoRoot(
          context,
          projectRoot,
          options.repoRoot,
        );
        const assetsRoot = await dependencies.resolveAssetsRoot();
        const result = await dependencies.initializeRepoReference({
          projectRoot,
          repoRoot,
          assetsRoot,
          templatesRoot: resolve(projectRoot, '.oat', 'templates'),
          home: context.home,
        });

        if (context.json) {
          context.logger.json({ status: 'ok', ...result });
        } else {
          context.logger.info(
            `Initialized PJM repo reference scaffold at ${result.repoRoot}`,
          );
          if (result.created.length > 0) {
            context.logger.info(`Created: ${result.created.join(', ')}`);
          }
          if (result.skipped.length > 0) {
            context.logger.info(
              `Skipped existing: ${result.skipped.join(', ')}`,
            );
          }
          context.logger.info(INSTRUCTIONS_SYNC_HINT);
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  cmd
    .command('doctor')
    .description('Run PJM repo reference diagnostics when enabled')
    .option(
      '--repo-root <path>',
      'PJM repo reference root directory (defaults to .oat/repo)',
    )
    .action(async (options: DoctorOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
        const repoRoot = await resolveRepoRoot(
          context,
          projectRoot,
          options.repoRoot,
        );
        const adoption = await dependencies.resolvePjmAdoption({
          projectRoot,
          repoRoot,
        });
        const checks = await dependencies.runPjmDoctorChecks(repoRoot, {
          adoption,
        });
        const status = doctorStatus(checks);

        if (context.json) {
          context.logger.json({ status, repoRoot, adoption, checks });
        } else {
          context.logger.info(formatDoctorResults(checks));
        }
        setDoctorExitCode(checks);
      } catch (error) {
        reportError(context, error);
      }
    });

  cmd
    .command('migrate')
    .description(
      'Migrate legacy PJM repo reference docs to the two-layer layout',
    )
    .option(
      '--repo-root <path>',
      'PJM repo reference root directory (defaults to .oat/repo)',
    )
    .option('--apply', 'Apply mechanical migration steps')
    .option('--dry-run', 'Preview migration without applying (default)')
    .option('--print-prompt', 'Print the bundled agent migration prompt')
    .action(async (options: MigrateOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
        const repoRoot = await resolveRepoRoot(
          context,
          projectRoot,
          options.repoRoot,
        );
        const assetsRoot = await dependencies.resolveAssetsRoot();

        if (options.printPrompt) {
          const prompt = await dependencies.readPjmMigrationPrompt(assetsRoot);
          if (context.json) {
            context.logger.json({ status: 'ok', prompt });
          } else {
            context.logger.info(prompt.trimEnd());
          }
          process.exitCode = 0;
          return;
        }

        const adoption = await dependencies.resolvePjmAdoption({
          projectRoot,
          repoRoot,
        });
        const result = await dependencies.migratePjmRepo({
          repoRoot,
          assetsRoot,
          templatesRoot: resolve(projectRoot, '.oat', 'templates'),
          home: context.home,
          adoption,
          apply: options.dryRun ? false : (options.apply ?? false),
        });

        if (context.json) {
          context.logger.json(result);
        } else {
          context.logger.info(formatMigrationResult(result));
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  return cmd;
}
