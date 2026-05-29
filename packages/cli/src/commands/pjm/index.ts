import { resolve } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { initializeRepoReference } from './init';

interface InitOptions {
  referenceRoot?: string;
}

interface PjmCommandDependencies {
  buildCommandContext: typeof buildCommandContext;
  resolveProjectRoot: typeof resolveProjectRoot;
  resolveAssetsRoot: typeof resolveAssetsRoot;
  initializeRepoReference: typeof initializeRepoReference;
}

const DEFAULT_DEPENDENCIES: PjmCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveAssetsRoot,
  initializeRepoReference,
};

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
      '--reference-root <path>',
      'Reference root directory (defaults to .oat/repo/reference)',
    )
    .action(async (options: InitOptions, command: Command) => {
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
        const assetsRoot = await dependencies.resolveAssetsRoot();
        const result = await dependencies.initializeRepoReference({
          referenceRoot,
          assetsRoot,
          templatesRoot: resolve(projectRoot, '.oat', 'templates'),
        });

        if (context.json) {
          context.logger.json({ status: 'ok', ...result });
        } else {
          context.logger.info(
            `Initialized PJM repo reference scaffold at ${result.referenceRoot}`,
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
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) {
          context.logger.json({ status: 'error', message });
        } else {
          context.logger.error(message);
        }
        process.exitCode = 1;
      }
    });

  return cmd;
}
