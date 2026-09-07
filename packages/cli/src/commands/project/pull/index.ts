import { isAbsolute, relative, resolve, sep } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readSyncedRecord } from '@commands/project/sync/record';
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
  buildSyncTarget,
  classifyRemoteRefLookup,
} from '@commands/project/sync/ref-sync';
import {
  probeSyncedTerminalRefs,
  resolveSyncedTarget,
  type ResolvedSyncTarget,
} from '@commands/project/sync/resolve-target';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  completedSyncedRefName,
  resolveProjectScope,
  resolveScopeRoot,
  syncedRecordPath,
} from '@commands/shared/project-scope';
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
  resolveProjectsRoot: typeof resolveProjectsRoot;
  guardSyncedTerminalTarget: typeof guardSyncedTerminalTarget;
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
  resolveProjectsRoot,
  guardSyncedTerminalTarget,
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

function slugForTerminalGuard(
  repoRoot: string,
  projectsRoot: string,
  pathOrSlug: string | undefined,
): string | null {
  if (!pathOrSlug) return null;
  if (!pathOrSlug.includes('/') && !pathOrSlug.includes('\\')) {
    return pathOrSlug;
  }
  const absolute = isAbsolute(pathOrSlug)
    ? resolve(pathOrSlug)
    : resolve(repoRoot, pathOrSlug);
  const syncedRoot = resolveScopeRoot(repoRoot, projectsRoot, 'synced');
  if (
    resolveProjectScope(
      absolute,
      resolveScopeRoot(repoRoot, projectsRoot, 'shared'),
      repoRoot,
    ) !== 'synced'
  ) {
    return null;
  }
  const child = relative(syncedRoot, absolute);
  return child && !child.includes(sep) ? child : null;
}

function terminalActionError(
  slug: string,
  action: 'pull' | 'open',
  state: 'completed-only' | 'both',
  completedRef: string,
  sha: string,
): CliError {
  const alias =
    state === 'both'
      ? ' The matching active ref is only a stale terminal alias and is ignored.'
      : '';
  return new CliError(
    `Synced project ${slug} is already archived at ${completedRef}@${sha} and cannot be ${action === 'pull' ? 'pulled' : 'opened'}.${alias} Inspect the durable archive, or use oat project prune ${shellQuote(slug)} only to intentionally remove retained terminal ref reachability.`,
    1,
  );
}

export async function guardSyncedTerminalTarget(
  repoRoot: string,
  projectsRoot: string,
  pathOrSlug: string | undefined,
  action: 'pull' | 'open',
  git: GitRunner,
): Promise<void> {
  const slug = slugForTerminalGuard(repoRoot, projectsRoot, pathOrSlug);
  if (!slug) return;
  const target = buildSyncTarget(repoRoot, projectsRoot, slug);
  const record = await readSyncedRecord(
    syncedRecordPath(target.syncedRoot, slug),
  );
  if (record?.status === 'complete') {
    if (record.archiveSourceRefSha) {
      const probe = await probeSyncedTerminalRefs(
        target,
        record.archiveSourceRefSha,
        git,
      );
      if (probe.state === 'wrong-sha') {
        throw new CliError(
          `Invalid terminal refs for ${slug}: active ${probe.activeRef} is ${probe.activeSha ?? 'absent'}, completed ${probe.completedRef} is ${probe.completedSha ?? 'absent'}, expected archived source ${record.archiveSourceRefSha}. Repair the ref mismatch before retrying completion or prune; the project was not ${action === 'pull' ? 'pulled' : 'opened'}.`,
          1,
        );
      }
    }
    const detail = record.archiveSnapshot
      ? 'Its durable archive exists, but legacy terminal cleanup is still pending.'
      : 'Its archive snapshot metadata is incomplete.';
    throw new CliError(
      `Synced project ${slug} has a legacy complete record and cannot be ${action === 'pull' ? 'pulled' : 'opened'}. ${detail} Retry oat-project-complete to finish archive retirement; do not rematerialize the checkout.`,
      1,
    );
  }

  const completedRef = completedSyncedRefName(slug);
  const lookup = await git.run(
    ['ls-remote', '--exit-code', target.remote, completedRef],
    { cwd: repoRoot, allowFailure: true },
  );
  if (
    classifyRemoteRefLookup(lookup, target.remote, completedRef) === 'absent'
  ) {
    return;
  }
  const rows = lookup.stdout.split('\n').filter(Boolean);
  const [sha, advertisedRef] = rows[0]?.trim().split(/\s+/) ?? [];
  if (
    rows.length !== 1 ||
    advertisedRef !== completedRef ||
    !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(sha ?? '')
  ) {
    throw new CliError(
      `Unable to verify terminal identity for ${slug}: origin returned a malformed completed-ref advertisement.`,
      2,
    );
  }
  const probe = await probeSyncedTerminalRefs(target, sha!, git);
  if (probe.state === 'wrong-sha') {
    throw new CliError(
      `Invalid terminal refs for ${slug}: active ${probe.activeRef} is ${probe.activeSha ?? 'absent'}, completed ${probe.completedRef} is ${probe.completedSha ?? 'absent'}, expected ${sha}. Repair the ref mismatch before retrying completion or prune; the project was not ${action === 'pull' ? 'pulled' : 'opened'}.`,
      1,
    );
  }
  if (probe.state === 'completed-only' || probe.state === 'both') {
    throw terminalActionError(slug, action, probe.state, completedRef, sha!);
  }
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
    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    let target: ResolvedSyncTarget;
    try {
      target = await dependencies.resolveSyncedTarget(
        { repoRoot, env: dependencies.processEnv },
        pathOrSlug,
        {},
        { allowMissingCheckout: !options.continue && !options.abort },
      );
    } catch (error) {
      if (
        error instanceof CliError &&
        error.exitCode === 1 &&
        error.message.startsWith('No synced project named ')
      ) {
        await dependencies.guardSyncedTerminalTarget(
          repoRoot,
          projectsRoot,
          pathOrSlug,
          'pull',
          dependencies.gitRunner,
        );
      }
      throw error;
    }
    await dependencies.guardSyncedTerminalTarget(
      repoRoot,
      projectsRoot,
      pathOrSlug ?? target.projectPath,
      'pull',
      dependencies.gitRunner,
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
