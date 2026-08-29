import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  abortSynced as defaultAbortSynced,
  commitRecordChange as defaultCommitRecordChange,
  continueSynced as defaultContinueSynced,
  pullChildren as defaultPullChildren,
  pullSynced as defaultPullSynced,
  type PullChildResult,
  type PullResult,
  type AdoptionRecordState,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import {
  resolveSyncedTarget,
  type ResolvedSyncTarget,
} from '@commands/project/sync/resolve-target';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface ProjectPullOptions {
  continue?: boolean;
  abort?: boolean;
  children: boolean;
  commit: boolean;
}

interface ProjectPullDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveSyncedTarget: typeof resolveSyncedTarget;
  pullSynced: (
    target: SyncTarget,
    git: GitRunner,
    options?: {
      adopt?: boolean;
      adoptionRecord?: AdoptionRecordState;
      now?: Date;
    },
  ) => Promise<PullResult>;
  pullChildren: (
    target: SyncTarget,
    git: GitRunner,
  ) => Promise<PullChildResult[]>;
  commitRecordChange: typeof defaultCommitRecordChange;
  continueSynced: (
    target: SyncTarget,
    git: GitRunner,
    options?: {
      adopt?: boolean;
      adoptionRecord?: AdoptionRecordState;
      now?: Date;
    },
  ) => Promise<PullResult>;
  abortSynced: (target: SyncTarget, git: GitRunner) => Promise<void>;
  gitRunner: GitRunner;
  processEnv: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: ProjectPullDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveSyncedTarget,
  pullSynced: defaultPullSynced,
  pullChildren: defaultPullChildren,
  commitRecordChange: defaultCommitRecordChange,
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
  children: PullChildResult[] = [],
): void {
  const payload = {
    ...result,
    adopted: result.adopted ?? false,
    ref: target.ref,
    children,
  };
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
  } else if (result.status === 'conflict') {
    context.logger.error(
      `Pull ${result.status}${result.conflicts?.length ? ` (${result.conflicts.join(', ')})` : ''}. Resolve the files, then run oat project pull ${shellQuote(targetArg)} --continue; or run oat project pull ${shellQuote(targetArg)} --abort.`,
    );
  } else {
    context.logger.error(
      `Pull dirty. Commit and publish with oat project push ${shellQuote(targetArg)}, or explicitly stash/clean the synced checkout before retrying oat project pull ${shellQuote(targetArg)}.`,
    );
  }
  if (!context.json) {
    for (const child of children) {
      if (
        child.status !== 'missing' &&
        child.status !== 'error' &&
        child.status !== 'conflict' &&
        child.status !== 'dirty'
      ) {
        continue;
      }
      const childArg = shellQuote(child.slug);
      const diagnostic =
        child.message ??
        (child.conflicts?.length
          ? `conflicts: ${child.conflicts.join(', ')}`
          : 'no diagnostic provided');
      const retry =
        child.status === 'conflict'
          ? `Resolve its files, then run oat project pull ${childArg} --continue; or oat project pull ${childArg} --abort.`
          : child.status === 'dirty'
            ? `Run oat project push ${childArg}, or explicitly stash/clean it before retrying oat project pull ${childArg}.`
            : child.status === 'error'
              ? `Repair the reported Git/system failure, then retry oat project pull ${childArg}.`
              : `Retry with oat project pull ${childArg}.`;
      context.logger.error(
        `Child ${child.slug} ${child.status}: ${diagnostic}. ${retry}`,
      );
    }
  }
  const childExitCode = children.reduce<0 | 1 | 2>((highest, child) => {
    const current =
      child.exitCode ??
      (child.status === 'error'
        ? 2
        : child.status === 'missing' ||
            child.status === 'conflict' ||
            child.status === 'dirty'
          ? 1
          : 0);
    return current > highest ? current : highest;
  }, 0);
  process.exitCode =
    result.status === 'created' ||
    result.status === 'updated' ||
    result.status === 'up-to-date'
      ? childExitCode
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
      throw new CliError(
        '`--continue` and `--abort` are mutually exclusive.',
        1,
      );
    }
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const target: ResolvedSyncTarget = await dependencies.resolveSyncedTarget(
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
      ? await dependencies.continueSynced(target, dependencies.gitRunner, {
          adopt: target.adoptionRecord !== 'durable',
          adoptionRecord: target.adoptionRecord,
        })
      : await dependencies.pullSynced(target, dependencies.gitRunner, {
          adopt: target.adopt,
          adoptionRecord: target.adoptionRecord,
        });
    const successful =
      result.status === 'created' ||
      result.status === 'updated' ||
      result.status === 'up-to-date';
    const children =
      successful && options.children !== false
        ? await dependencies.pullChildren(target, dependencies.gitRunner)
        : [];
    const pendingRecordPaths = [
      ...(result.pendingRecordPaths ?? []),
      ...children.flatMap((child) => child.pendingRecordPaths ?? []),
    ];
    if (options.commit !== false && pendingRecordPaths.length > 0) {
      const slugs = [
        ...(result.adopted ? [target.slug] : []),
        ...children.filter((child) => child.adopted).map((child) => child.slug),
      ];
      await dependencies.commitRecordChange(
        repoRoot,
        pendingRecordPaths,
        `chore(oat): adopt synced project${slugs.length === 1 ? '' : 's'} ${slugs.join(', ')}`,
        dependencies.gitRunner,
        { projectRoots: target },
      );
    }
    reportPullResult(context, result, target, targetArg, children);
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

export function createProjectPullCommand(
  overrides: Partial<ProjectPullDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('pull')
    .description('Materialize or update a synced OAT project')
    .argument('[project-path|slug]', 'Synced project path or slug')
    .option('--continue', 'Continue a resolved sync rebase')
    .option('--abort', 'Abort an in-progress sync rebase')
    .option('--no-children', 'Do not pull coordination child projects')
    .option('--no-commit', 'Leave adopted discovery records uncommitted')
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
