import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  abortSynced as defaultAbortSynced,
  continueSynced as defaultContinueSynced,
  pullSynced as defaultPullSynced,
  type PullResult,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import { resolveSyncedTarget } from '@commands/project/sync/resolve-target';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface ProjectPullOptions {
  continue?: boolean;
  abort?: boolean;
}

interface ProjectPullDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveSyncedTarget: typeof resolveSyncedTarget;
  pullSynced: (target: SyncTarget, git: GitRunner) => Promise<PullResult>;
  continueSynced: (target: SyncTarget, git: GitRunner) => Promise<PullResult>;
  abortSynced: (target: SyncTarget, git: GitRunner) => Promise<void>;
  gitRunner: GitRunner;
  processEnv: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: ProjectPullDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveSyncedTarget,
  pullSynced: defaultPullSynced,
  continueSynced: defaultContinueSynced,
  abortSynced: defaultAbortSynced,
  gitRunner: defaultGitRunner,
  processEnv: process.env,
};

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function reportPullResult(
  context: CommandContext,
  result: PullResult,
  target: SyncTarget,
  targetArg: string,
): void {
  const payload = { ...result, ref: target.ref };
  if (context.json) {
    context.logger.json(payload);
  } else if (
    result.status === 'created' ||
    result.status === 'updated' ||
    result.status === 'up-to-date'
  ) {
    context.logger.info(
      `Pull ${result.status}: ${target.slug} at ${result.sha}.`,
    );
  } else {
    context.logger.error(
      `Pull ${result.status}${result.conflicts?.length ? ` (${result.conflicts.join(', ')})` : ''}. Resolve the files, then run oat project pull ${shellQuote(targetArg)} --continue; or run oat project pull ${shellQuote(targetArg)} --abort.`,
    );
  }
  process.exitCode =
    result.status === 'created' ||
    result.status === 'updated' ||
    result.status === 'up-to-date'
      ? 0
      : 1;
}

async function runPull(
  context: CommandContext,
  pathOrSlug: string | undefined,
  options: ProjectPullOptions,
  dependencies: ProjectPullDependencies,
): Promise<void> {
  try {
    if (options.continue && options.abort) {
      throw new Error('`--continue` and `--abort` are mutually exclusive.');
    }
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const target = await dependencies.resolveSyncedTarget(
      { repoRoot, env: dependencies.processEnv },
      pathOrSlug,
      {},
      { allowMissingCheckout: !options.continue && !options.abort },
    );
    const targetArg = pathOrSlug ?? target.projectPath;
    if (options.abort) {
      await dependencies.abortSynced(target, dependencies.gitRunner);
      if (context.json) {
        context.logger.json({ status: 'aborted', ref: target.ref });
      } else {
        context.logger.info(`Aborted pull recovery for ${target.slug}.`);
      }
      process.exitCode = 0;
      return;
    }
    const result = options.continue
      ? await dependencies.continueSynced(target, dependencies.gitRunner)
      : await dependencies.pullSynced(target, dependencies.gitRunner);
    reportPullResult(context, result, target, targetArg);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createProjectPullCommand(
  overrides: Partial<ProjectPullDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('pull')
    .description('Materialize or update a synced OAT project')
    .argument('[project-path|slug]', 'Synced project path or slug')
    .option('--continue', 'Continue a resolved sync rebase')
    .option('--abort', 'Abort an in-progress sync rebase')
    .action(
      async (
        pathOrSlug: string | undefined,
        options: ProjectPullOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runPull(context, pathOrSlug, options, dependencies);
      },
    );
}
