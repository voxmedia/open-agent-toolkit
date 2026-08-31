import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, join, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readSyncedRecord } from '@commands/project/sync/record';
import {
  buildSyncTarget,
  classifyRemoteRefLookup,
  deleteCompletedSyncedRefForPrune,
  pruneSynced,
  type PruneResult,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import {
  probeSyncedTerminalRefs,
  resolveSyncedTarget,
  type SyncedTerminalRefProbe,
} from '@commands/project/sync/resolve-target';
import {
  getFrontmatterBlock,
  parseFrontmatterScalarFields,
} from '@commands/shared/frontmatter';
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

interface ProjectPruneOptions {
  force: boolean;
  commit: boolean;
}

interface ProjectPruneDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: typeof resolveProjectsRoot;
  resolveSyncedTarget: typeof resolveSyncedTarget;
  inspectTerminalRefs: typeof inspectTerminalRefs;
  deleteCompletedSyncedRefForPrune: typeof deleteCompletedSyncedRefForPrune;
  pruneSynced: (
    target: SyncTarget,
    git: GitRunner,
    options: { force: boolean; commit: boolean },
  ) => Promise<PruneResult>;
  readProjectState: (
    target: SyncTarget,
    git: GitRunner,
    ref?: string,
  ) => Promise<string | null>;
  gitRunner: GitRunner;
  processEnv: NodeJS.ProcessEnv;
}

export async function readPruneProjectState(
  target: SyncTarget,
  git: GitRunner,
  ref = target.ref,
): Promise<string | null> {
  try {
    return await readFile(join(target.projectPath, 'state.md'), 'utf8');
  } catch {
    // A completed or not-yet-pulled project may have no checkout.
  }

  const fetched = await git.run(['fetch', target.remote, `+${ref}:${ref}`], {
    cwd: target.repoRoot,
    allowFailure: true,
  });
  if (fetched.code === 0) {
    const shown = await git.run(['show', `${ref}:state.md`], {
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
  resolveProjectsRoot,
  resolveSyncedTarget,
  inspectTerminalRefs,
  deleteCompletedSyncedRefForPrune,
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

function pruneSlug(
  repoRoot: string,
  projectsRoot: string,
  pathOrSlug: string,
): string | null {
  if (!pathOrSlug.includes('/') && !pathOrSlug.includes('\\')) {
    return pathOrSlug;
  }
  const absolute = isAbsolute(pathOrSlug)
    ? resolve(pathOrSlug)
    : resolve(repoRoot, pathOrSlug);
  const scope = resolveProjectScope(
    absolute,
    resolveScopeRoot(repoRoot, projectsRoot, 'shared'),
    repoRoot,
  );
  return scope === 'synced' ? basename(absolute) : null;
}

export async function inspectTerminalRefs(
  target: SyncTarget,
  git: GitRunner,
): Promise<SyncedTerminalRefProbe | null> {
  const completedRef = completedSyncedRefName(target.slug);
  const lookup = await git.run(
    ['ls-remote', '--exit-code', target.remote, completedRef],
    { cwd: target.repoRoot, allowFailure: true },
  );
  if (
    classifyRemoteRefLookup(lookup, target.remote, completedRef) === 'absent'
  ) {
    return null;
  }
  const rows = lookup.stdout.split('\n').filter(Boolean);
  const [sha, ref] = rows[0]?.trim().split(/\s+/) ?? [];
  if (
    rows.length !== 1 ||
    ref !== completedRef ||
    !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(sha ?? '')
  ) {
    throw new CliError(
      `Unable to verify terminal refs for ${target.slug}: origin returned a malformed completed-ref advertisement.`,
      2,
    );
  }
  const probe = await probeSyncedTerminalRefs(target, sha!, git);
  if (probe.state === 'wrong-sha') {
    throw new CliError(
      `Refusing destructive prune for ${target.slug}: active ${probe.activeRef} is ${probe.activeSha ?? 'absent'} while completed ${probe.completedRef} is ${probe.completedSha ?? 'absent'}. Repair the terminal ref mismatch before retrying; both refs were retained.`,
      1,
    );
  }
  return probe;
}

async function runPrune(
  context: CommandContext,
  pathOrSlug: string | undefined,
  options: ProjectPruneOptions,
  dependencies: ProjectPruneDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    let target: SyncTarget;
    try {
      target = await dependencies.resolveSyncedTarget(
        { repoRoot, env: dependencies.processEnv },
        pathOrSlug,
        { gitRunner: dependencies.gitRunner },
        {
          allowMissingCheckout: true,
          allowStagedPruneDeletion: true,
        },
      );
    } catch (error) {
      const slug = pathOrSlug
        ? pruneSlug(repoRoot, projectsRoot, pathOrSlug)
        : null;
      if (
        !slug ||
        !(error instanceof CliError) ||
        error.exitCode !== 1 ||
        !error.message.startsWith('No synced project named ')
      ) {
        throw error;
      }
      target = buildSyncTarget(repoRoot, projectsRoot, slug);
    }
    const terminal = await dependencies.inspectTerminalRefs(
      target,
      dependencies.gitRunner,
    );
    const terminalRef = terminal?.completedRef;
    const state = await dependencies.readProjectState(
      target,
      dependencies.gitRunner,
      terminalRef,
    );
    if (!options.force && hasOpenPr(state)) {
      throw new CliError(
        `Refusing to prune ${target.slug} while its PR is open. Pass --force to confirm; pinned links will stop resolving.`,
        1,
      );
    }

    const removedRefs =
      terminal?.state === 'completed-only'
        ? terminal.completedRef
        : terminalRef
          ? `${target.ref} and ${terminalRef}`
          : target.ref;
    context.logger.warn(
      `Pruning ${target.slug} removes ${removedRefs}; pinned links will stop resolving. Durable local/S3 archives are preserved.`,
    );
    const result =
      terminal?.state === 'completed-only'
        ? { status: 'pruned' as const, lifecycleCommit: null }
        : await dependencies.pruneSynced(target, dependencies.gitRunner, {
            force: options.force,
            commit: options.commit,
          });
    const completedDeletion = terminalRef
      ? await dependencies.deleteCompletedSyncedRefForPrune(
          target,
          dependencies.gitRunner,
        )
      : null;
    const payload = {
      ...result,
      ref: target.ref,
      completedRef: completedDeletion?.completedRef ?? null,
    };
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
