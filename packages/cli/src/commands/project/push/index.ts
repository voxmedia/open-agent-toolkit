import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { refreshPrLinks } from '@commands/project/links/refresh';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  pushSynced as defaultPushSynced,
  type PushResult,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import { resolveSyncedTarget } from '@commands/project/sync/resolve-target';
import {
  getFrontmatterBlock,
  parseFrontmatterScalarFields,
} from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface ProjectPushOptions {
  message?: string;
  refreshPr: boolean;
}

interface ProjectPushDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveSyncedTarget: typeof resolveSyncedTarget;
  pushSynced: (
    target: SyncTarget,
    git: GitRunner,
    options: { message?: string },
  ) => Promise<PushResult>;
  gitRunner: GitRunner;
  processEnv: NodeJS.ProcessEnv;
  refreshPrLinks: typeof refreshPrLinks;
  readFile: typeof readFile;
}

const DEFAULT_DEPENDENCIES: ProjectPushDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveSyncedTarget,
  pushSynced: defaultPushSynced,
  gitRunner: defaultGitRunner,
  processEnv: process.env,
  refreshPrLinks,
  readFile,
};

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function runPush(
  context: CommandContext,
  pathOrSlug: string | undefined,
  options: ProjectPushOptions,
  dependencies: ProjectPushDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const target = await dependencies.resolveSyncedTarget(
      { repoRoot, env: dependencies.processEnv },
      pathOrSlug,
    );
    const result = await dependencies.pushSynced(
      target,
      dependencies.gitRunner,
      { message: options.message },
    );
    let prRefresh: 'refreshed' | 'skipped' | 'failed' | undefined;
    if (
      options.refreshPr &&
      (result.status === 'pushed' || result.status === 'up-to-date')
    ) {
      const state = await dependencies
        .readFile(join(target.projectPath, 'state.md'), 'utf8')
        .catch(() => null);
      const frontmatter = state ? getFrontmatterBlock(state) : null;
      if (frontmatter) {
        const parsed = parseFrontmatterScalarFields(frontmatter, [
          'oat_pr_status',
          'oat_pr_url',
        ]);
        if (
          parsed.valid &&
          parsed.values.oat_pr_status === 'open' &&
          parsed.values.oat_pr_url
        ) {
          try {
            prRefresh = await dependencies.refreshPrLinks(
              target,
              parsed.values.oat_pr_url,
              { warn: (message) => context.logger.warn(message) },
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            context.logger.warn(
              `Could not refresh PR links after successfully pushing ${target.slug}: ${message}`,
            );
            prRefresh = 'failed';
          }
        }
      }
    }
    const payload = { ...result, ref: target.ref, prRefresh };
    if (context.json) {
      context.logger.json(payload);
    } else if (result.status === 'pushed') {
      context.logger.info(`Pushed ${target.slug} at ${result.sha}.`);
    } else if (result.status === 'up-to-date') {
      context.logger.info(`${target.slug} is up to date at ${result.sha}.`);
    } else if (result.status === 'conflict') {
      const targetArg = pathOrSlug ?? target.projectPath;
      context.logger.error(
        `Push conflict${result.conflicts?.length ? ` (${result.conflicts.join(', ')})` : ''}. Resolve the files, then run oat project pull ${shellQuote(targetArg)} --continue; or run oat project pull ${shellQuote(targetArg)} --abort.`,
      );
    } else {
      const targetArg = pathOrSlug ?? target.projectPath;
      context.logger.error(
        `Push rejected. Run oat project pull ${shellQuote(targetArg)}, then run oat project push ${shellQuote(targetArg)}.`,
      );
    }
    process.exitCode =
      result.status === 'pushed' || result.status === 'up-to-date' ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 2;
  }
}

export function createProjectPushCommand(
  overrides: Partial<ProjectPushDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('push')
    .description('Commit and publish a synced OAT project')
    .argument('[project-path|slug]', 'Synced project path or slug')
    .option('--message <message>', 'Artifact commit message')
    .option('--no-refresh-pr', 'Do not refresh PR artifact links')
    .action(
      async (
        pathOrSlug: string | undefined,
        options: ProjectPushOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runPush(context, pathOrSlug, options, dependencies);
      },
    );
}
