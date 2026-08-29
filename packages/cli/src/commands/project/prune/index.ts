import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readSyncedRecord } from '@commands/project/sync/record';
import {
  pruneSynced,
  type PruneResult,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import { resolveSyncedTarget } from '@commands/project/sync/resolve-target';
import {
  getFrontmatterBlock,
  parseFrontmatterScalarFields,
} from '@commands/shared/frontmatter';
import { syncedRecordPath } from '@commands/shared/project-scope';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface ProjectPruneOptions {
  force: boolean;
  commit: boolean;
}

interface ProjectPruneDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveSyncedTarget: typeof resolveSyncedTarget;
  pruneSynced: (
    target: SyncTarget,
    git: GitRunner,
    options: { force: boolean; commit: boolean },
  ) => Promise<PruneResult>;
  readProjectState: (
    target: SyncTarget,
    git: GitRunner,
  ) => Promise<string | null>;
  gitRunner: GitRunner;
  processEnv: NodeJS.ProcessEnv;
}

export async function readPruneProjectState(
  target: SyncTarget,
  git: GitRunner,
): Promise<string | null> {
  try {
    return await readFile(join(target.projectPath, 'state.md'), 'utf8');
  } catch {
    // A completed or not-yet-pulled project may have no checkout.
  }

  const fetched = await git.run(
    ['fetch', target.remote, `+${target.ref}:${target.ref}`],
    { cwd: target.repoRoot, allowFailure: true },
  );
  if (fetched.code === 0) {
    const shown = await git.run(['show', `${target.ref}:state.md`], {
      cwd: target.repoRoot,
      allowFailure: true,
    });
    if (shown.code === 0) return shown.stdout;
  }

  const record = await readSyncedRecord(
    syncedRecordPath(target.syncedRoot, target.slug),
  );
  const snapshot = record?.archiveSnapshot ?? target.slug;
  try {
    return await readFile(
      join(target.syncedRoot, '..', 'archived', snapshot, 'state.md'),
      'utf8',
    );
  } catch {
    return null;
  }
}

const DEFAULT_DEPENDENCIES: ProjectPruneDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveSyncedTarget,
  pruneSynced,
  readProjectState: readPruneProjectState,
  gitRunner: defaultGitRunner,
  processEnv: process.env,
};

function hasOpenPr(state: string | null): boolean {
  const frontmatter = state ? getFrontmatterBlock(state) : null;
  if (!frontmatter) return false;
  const parsed = parseFrontmatterScalarFields(frontmatter, ['oat_pr_status']);
  return parsed.valid && parsed.values.oat_pr_status === 'open';
}

async function runPrune(
  context: CommandContext,
  pathOrSlug: string | undefined,
  options: ProjectPruneOptions,
  dependencies: ProjectPruneDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const target = await dependencies.resolveSyncedTarget(
      { repoRoot, env: dependencies.processEnv },
      pathOrSlug,
      { gitRunner: dependencies.gitRunner },
      {
        allowMissingCheckout: true,
        allowStagedPruneDeletion: true,
      },
    );
    const state = await dependencies.readProjectState(
      target,
      dependencies.gitRunner,
    );
    if (!options.force && hasOpenPr(state)) {
      throw new CliError(
        `Refusing to prune ${target.slug} while its PR is open. Pass --force to confirm; pinned links will stop resolving.`,
        1,
      );
    }

    context.logger.warn(
      `Pruning ${target.slug} removes ${target.ref}; pinned links will stop resolving.`,
    );
    const result = await dependencies.pruneSynced(
      target,
      dependencies.gitRunner,
      { force: options.force, commit: options.commit },
    );
    const payload = { ...result, ref: target.ref };
    if (context.json) context.logger.json(payload);
    else context.logger.info(`Pruned synced project ${target.slug}.`);
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) context.logger.json({ status: 'error', message });
    else context.logger.error(message);
    process.exitCode = error instanceof CliError ? error.exitCode : 2;
  }
}

export function createProjectPruneCommand(
  overrides: Partial<ProjectPruneDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('prune')
    .description('Permanently remove a synced project and its ref')
    .argument('[project-path|slug]', 'Synced project path or slug')
    .option('--force', 'Prune despite open PR or unsafe checkout state', false)
    .option('--no-commit', 'Do not commit the discovery record deletion')
    .action(
      async (
        pathOrSlug: string | undefined,
        options: ProjectPruneOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runPrune(context, pathOrSlug, options, dependencies);
      },
    );
}
