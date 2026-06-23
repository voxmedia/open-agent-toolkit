import { resolve } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot } from '@fs/paths';
import { formatDoctorResults, type DoctorCheck } from '@ui/output';
import { Command } from 'commander';

import { runPjmDoctorChecks } from './doctor';
import { initializeRepoReference } from './init';

interface InitOptions {
  repoRoot?: string;
}

interface DoctorOptions {
  repoRoot?: string;
}

interface PjmCommandDependencies {
  buildCommandContext: typeof buildCommandContext;
  resolveProjectRoot: typeof resolveProjectRoot;
  resolveAssetsRoot: typeof resolveAssetsRoot;
  initializeRepoReference: typeof initializeRepoReference;
  runPjmDoctorChecks: typeof runPjmDoctorChecks;
}

const DEFAULT_DEPENDENCIES: PjmCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveAssetsRoot,
  initializeRepoReference,
  runPjmDoctorChecks,
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
          repoRoot,
          assetsRoot,
          templatesRoot: resolve(projectRoot, '.oat', 'templates'),
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
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  cmd
    .command('doctor')
    .description('Run PJM repo reference diagnostics')
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
        const checks = await dependencies.runPjmDoctorChecks(repoRoot);
        const status = doctorStatus(checks);

        if (context.json) {
          context.logger.json({ status, repoRoot, checks });
        } else {
          context.logger.info(formatDoctorResults(checks));
        }
        setDoctorExitCode(checks);
      } catch (error) {
        reportError(context, error);
      }
    });

  return cmd;
}
