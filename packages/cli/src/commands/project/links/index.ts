import { isAbsolute, relative, resolve, sep } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  classifyRemoteRefLookup,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import {
  probeSyncedTerminalRefs,
  resolveSyncedTarget,
} from '@commands/project/sync/resolve-target';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  completedSyncedRefName,
  resolveProjectScope,
  resolveScopeRoot,
} from '@commands/shared/project-scope';
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
  resolveProjectsRoot: typeof resolveProjectsRoot;
  resolveSyncedTarget: typeof resolveSyncedTarget;
  resolveLinksTarget: typeof resolveLinksTarget;
  computeLinksInput: typeof computeLinksInput;
  gitRunner: GitRunner;
  processEnv: NodeJS.ProcessEnv;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: ProjectLinksDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot,
  resolveSyncedTarget,
  resolveLinksTarget,
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

interface ResolvedLinksTarget {
  target: SyncTarget;
  ref: string;
}

function linksSlug(
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
  const sharedRoot = resolveScopeRoot(repoRoot, projectsRoot, 'shared');
  if (resolveProjectScope(absolute, sharedRoot, repoRoot) !== 'synced') {
    return null;
  }
  const child = relative(
    resolveScopeRoot(repoRoot, projectsRoot, 'synced'),
    absolute,
  );
  return child && !child.includes(sep) ? child : null;
}

export async function resolveLinksTarget(
  repoRoot: string,
  projectsRoot: string,
  pathOrSlug: string | undefined,
  env: NodeJS.ProcessEnv,
  git: GitRunner,
  resolveTarget: typeof resolveSyncedTarget,
): Promise<ResolvedLinksTarget> {
  let resolved: SyncTarget | null = null;
  let resolutionError: unknown;
  try {
    resolved = await resolveTarget(
      { repoRoot, env },
      pathOrSlug,
      { gitRunner: git },
      { allowMissingCheckout: true },
    );
  } catch (error) {
    resolutionError = error;
    if (
      !(error instanceof CliError) ||
      error.exitCode !== 1 ||
      !error.message.startsWith('No synced project named ')
    ) {
      throw error;
    }
  }

  const slug = pathOrSlug
    ? linksSlug(repoRoot, projectsRoot, pathOrSlug)
    : resolved?.slug;
  if (!slug) {
    if (resolutionError) throw resolutionError;
    throw new CliError('No synced project is available for link rendering.', 1);
  }
  const target = resolved ?? buildSyncTarget(repoRoot, projectsRoot, slug);
  const completedRef = completedSyncedRefName(slug);
  const lookup = await git.run(
    ['ls-remote', '--exit-code', target.remote, completedRef],
    { cwd: repoRoot, allowFailure: true },
  );
  if (
    classifyRemoteRefLookup(lookup, target.remote, completedRef) === 'absent'
  ) {
    if (resolutionError) throw resolutionError;
    return { target, ref: target.ref };
  }
  const rows = lookup.stdout.split('\n').filter(Boolean);
  const [sha, ref] = rows[0]?.trim().split(/\s+/) ?? [];
  if (
    rows.length !== 1 ||
    ref !== completedRef ||
    !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(sha ?? '')
  ) {
    throw new CliError(
      `Unable to verify terminal links for ${slug}: origin returned a malformed completed-ref advertisement.`,
      2,
    );
  }
  const probe = await probeSyncedTerminalRefs(target, sha!, git);
  if (probe.state === 'wrong-sha') {
    throw new CliError(
      `Cannot refresh links for ${slug}: active ${probe.activeRef} is ${probe.activeSha ?? 'absent'} while completed ${probe.completedRef} is ${probe.completedSha ?? 'absent'}. Repair the terminal ref mismatch first.`,
      1,
    );
  }
  if (probe.state === 'completed-only' || probe.state === 'both') {
    return { target, ref: completedRef };
  }
  if (resolutionError) throw resolutionError;
  return { target, ref: target.ref };
}

async function runLinks(
  context: CommandContext,
  pathOrSlug: string | undefined,
  options: ProjectLinksOptions,
  dependencies: ProjectLinksDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    const { target, ref } = await dependencies.resolveLinksTarget(
      repoRoot,
      projectsRoot,
      pathOrSlug,
      dependencies.processEnv,
      dependencies.gitRunner,
      dependencies.resolveSyncedTarget,
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
        ref,
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
