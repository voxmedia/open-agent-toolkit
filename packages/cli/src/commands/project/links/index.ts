import { isAbsolute, relative, resolve, sep } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { resolveSyncedTarget } from '@commands/project/sync/resolve-target';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { computeLinksInput } from './compute';
import { renderLinksBlock } from './render';

interface ProjectLinksOptions {
  format: 'markdown' | 'json';
  durableSummary?: string;
}

interface ProjectLinksDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveSyncedTarget: typeof resolveSyncedTarget;
  computeLinksInput: typeof computeLinksInput;
  gitRunner: GitRunner;
  processEnv: NodeJS.ProcessEnv;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: ProjectLinksDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveSyncedTarget,
  computeLinksInput,
  gitRunner: defaultGitRunner,
  processEnv: process.env,
  now: () => new Date(),
};

function normalizeDurableSummaryPath(
  repoRoot: string,
  durableSummaryPath: string | undefined,
): string | undefined {
  if (!durableSummaryPath) return undefined;
  const absolutePath = resolve(repoRoot, durableSummaryPath);
  const repositoryRelative = relative(repoRoot, absolutePath);
  if (
    repositoryRelative === '' ||
    repositoryRelative === '..' ||
    repositoryRelative.startsWith(`..${sep}`) ||
    isAbsolute(repositoryRelative)
  ) {
    throw new CliError(
      `Durable summary path must be a file contained in the repository: ${durableSummaryPath}`,
      1,
    );
  }
  return repositoryRelative.split(sep).join('/');
}

async function runLinks(
  context: CommandContext,
  pathOrSlug: string | undefined,
  options: ProjectLinksOptions,
  dependencies: ProjectLinksDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const target = await dependencies.resolveSyncedTarget(
      { repoRoot, env: dependencies.processEnv },
      pathOrSlug,
      {},
      { allowMissingCheckout: true },
    );
    const input = await dependencies.computeLinksInput(
      target,
      dependencies.gitRunner,
      {
        durableSummaryPath: normalizeDurableSummaryPath(
          repoRoot,
          options.durableSummary,
        ),
        now: dependencies.now(),
      },
    );
    const markdown = renderLinksBlock(input);
    if (context.json || options.format === 'json') {
      context.logger.json({ ...input, markdown });
    } else {
      context.logger.info(markdown);
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json || options.format === 'json') {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 2;
  }
}

export function createProjectLinksCommand(
  overrides: Partial<ProjectLinksDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('links')
    .description('Render pinned reviewer links for a synced OAT project')
    .argument('[project-path|slug]', 'Synced project path or slug')
    .option('--format <format>', 'Output format (markdown or json)', 'markdown')
    .option(
      '--durable-summary <path>',
      'Repository-relative durable summary path',
    )
    .action(
      async (
        pathOrSlug: string | undefined,
        options: ProjectLinksOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runLinks(context, pathOrSlug, options, dependencies);
      },
    );
}
