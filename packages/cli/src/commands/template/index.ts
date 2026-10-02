import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { TemplateNotFoundError } from '@commands/shared/template-source';
import { CliError } from '@errors/index';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { runTemplateResolve, type TemplateResolveResult } from './resolve';

interface ResolveOptions {
  output?: string;
}

interface TemplateCommandDependencies {
  buildCommandContext: typeof buildCommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
}

const DEFAULT_DEPENDENCIES: TemplateCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveAssetsRoot: () => resolveAssetsRoot(),
};

function reportResult(
  context: CommandContext,
  result: TemplateResolveResult,
): void {
  if (!result.found) {
    const message = new TemplateNotFoundError(result.name).message;
    if (context.json) {
      context.logger.json({ status: 'error', ...result, message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
    return;
  }

  if (context.json) {
    context.logger.json({ status: 'ok', ...result });
  } else {
    context.logger.info(`Template: ${result.name}`);
    context.logger.info('Found: yes');
    context.logger.info(`Tier: ${result.tier}`);
    context.logger.info(
      `Path: ${result.path ?? 'none (bundled with the CLI)'}`,
    );
    if (result.output) {
      context.logger.info(`Wrote: ${result.output}`);
    }
  }
  process.exitCode = 0;
}

function reportError(
  context: CommandContext,
  name: string,
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error);
  if (context.json) {
    context.logger.json({
      status: 'error',
      name,
      found: false,
      tier: null,
      path: null,
      output: null,
      message,
    });
  } else {
    context.logger.error(message);
  }
  process.exitCode = error instanceof CliError ? error.exitCode : 1;
}

export function createTemplateCommand(
  overrides: Partial<TemplateCommandDependencies> = {},
): Command {
  const dependencies: TemplateCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const cmd = new Command('template').description(
    'Resolve OAT templates (repository, user, bundle)',
  );

  cmd
    .command('resolve')
    .description('Report which tier supplies a template and optionally copy it')
    .argument('<name>', 'Template name, such as plan or plan.md')
    .option(
      '--output <path>',
      'Copy the resolved template to this file, replacing it',
    )
    .action(async (name: string, options: ResolveOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const result = await runTemplateResolve({
          name,
          cwd: context.cwd,
          home: context.home,
          output: options.output,
          resolveProjectRoot: dependencies.resolveProjectRoot,
          resolveAssetsRoot: dependencies.resolveAssetsRoot,
        });
        reportResult(context, result);
      } catch (error) {
        reportError(context, name, error);
      }
    });

  return cmd;
}
