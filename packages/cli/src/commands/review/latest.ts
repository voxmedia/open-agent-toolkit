import { readdir, readFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  getFrontmatterBlock,
  getFrontmatterField,
} from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { readOatLocalConfig, type OatLocalConfig } from '@config/oat-config';
import { normalizeToPosixPath, resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

export type ReviewLatestKind = 'project' | 'adhoc';

export interface LatestReview {
  path: string;
  scope: string;
  generatedAt: string;
  kind: ReviewLatestKind;
  archived: boolean;
  actionable: boolean;
}

interface ReviewCandidate extends LatestReview {
  generatedTime: number;
  lifecycleRank: number;
  priority: number;
}

export interface FindLatestReviewOptions {
  repoRoot: string;
  projectPath?: string | null;
}

interface ReviewLatestDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
}

const DEFAULT_DEPENDENCIES: ReviewLatestDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readOatLocalConfig,
};

const EMPTY_RESULT = {
  path: null,
  scope: null,
  generatedAt: null,
  kind: null,
  archived: null,
  actionable: null,
} as const;

function normalizeRepoRelativePath(
  repoRoot: string,
  pathValue: string,
): string {
  const rawPath = pathValue.trim();
  if (!rawPath) {
    return rawPath;
  }

  if (!isAbsolute(rawPath)) {
    return normalizeToPosixPath(rawPath).replace(/^\.\//, '');
  }

  return normalizeToPosixPath(relative(repoRoot, rawPath));
}

function reviewLifecycleRank(scope: string): number {
  const normalizedScope = scope.trim().toLowerCase();
  if (normalizedScope === 'final') {
    return Number.MAX_SAFE_INTEGER;
  }

  const phases = [...normalizedScope.matchAll(/p(\d+)/g)].map((match) =>
    Number.parseInt(match[1] ?? '0', 10),
  );
  if (phases.length === 0) {
    return 0;
  }

  const tasks = [...normalizedScope.matchAll(/(?:^|[-_])t(\d+)/g)].map(
    (match) => Number.parseInt(match[1] ?? '0', 10),
  );
  const latestPhase = Math.max(...phases);
  const latestTask = tasks.length > 0 ? Math.max(...tasks) : 9999;

  return latestPhase * 10_000 + latestTask;
}

async function listMarkdownFiles(
  repoRoot: string,
  relativeDir: string,
): Promise<string[]> {
  try {
    const entries = await readdir(join(repoRoot, relativeDir), {
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => normalizeToPosixPath(join(relativeDir, entry.name)));
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return [];
    }
    throw error;
  }
}

async function readReviewCandidate(
  repoRoot: string,
  relativePath: string,
  kind: ReviewLatestKind,
  priority: number,
  archived: boolean,
  actionable: boolean,
): Promise<ReviewCandidate | null> {
  const content = await readFile(join(repoRoot, relativePath), 'utf8');
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    return null;
  }

  const generatedAt = getFrontmatterField(frontmatter, 'oat_generated_at');
  if (!generatedAt) {
    return null;
  }

  const generatedTime = Date.parse(generatedAt);
  if (Number.isNaN(generatedTime)) {
    return null;
  }

  const scope = getFrontmatterField(frontmatter, 'oat_review_scope') ?? '';

  return {
    path: relativePath,
    scope,
    generatedAt,
    kind,
    archived,
    actionable,
    generatedTime,
    lifecycleRank: reviewLifecycleRank(scope),
    priority,
  };
}

function sortReviewCandidates(a: ReviewCandidate, b: ReviewCandidate): number {
  if (a.generatedTime !== b.generatedTime) {
    return b.generatedTime - a.generatedTime;
  }
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }
  if (a.lifecycleRank !== b.lifecycleRank) {
    return b.lifecycleRank - a.lifecycleRank;
  }
  return a.path.localeCompare(b.path);
}

export async function findLatestReview(
  options: FindLatestReviewOptions,
): Promise<LatestReview | null> {
  const projectPath = options.projectPath
    ? normalizeRepoRelativePath(options.repoRoot, options.projectPath)
    : null;

  const scanTargets: Array<{
    dir: string;
    kind: ReviewLatestKind;
    priority: number;
    archived: boolean;
    actionable: boolean;
  }> = [];

  if (projectPath) {
    scanTargets.push(
      {
        dir: `${projectPath}/reviews`,
        kind: 'project',
        priority: 0,
        archived: false,
        actionable: true,
      },
      {
        dir: `${projectPath}/reviews/archived`,
        kind: 'project',
        priority: 1,
        archived: true,
        actionable: false,
      },
    );
  }

  scanTargets.push(
    {
      dir: '.oat/repo/reviews',
      kind: 'adhoc',
      priority: 2,
      archived: false,
      actionable: true,
    },
    {
      dir: '.oat/projects/local/orphan-reviews',
      kind: 'adhoc',
      priority: 3,
      archived: false,
      actionable: true,
    },
  );

  const candidates = (
    await Promise.all(
      scanTargets.map(async (target) => {
        const files = await listMarkdownFiles(options.repoRoot, target.dir);
        return Promise.all(
          files.map((file) =>
            readReviewCandidate(
              options.repoRoot,
              file,
              target.kind,
              target.priority,
              target.archived,
              target.actionable,
            ),
          ),
        );
      }),
    )
  )
    .flat()
    .filter((candidate): candidate is ReviewCandidate => candidate !== null)
    .sort(sortReviewCandidates);

  const latest = candidates[0];
  if (!latest) {
    return null;
  }

  return {
    path: latest.path,
    scope: latest.scope,
    generatedAt: latest.generatedAt,
    kind: latest.kind,
    archived: latest.archived,
    actionable: latest.actionable,
  };
}

async function resolveProjectPath(
  repoRoot: string,
  explicitProject: string | undefined,
  dependencies: ReviewLatestDependencies,
): Promise<string | null> {
  if (explicitProject) {
    return explicitProject;
  }

  const localConfig = await dependencies.readOatLocalConfig(repoRoot);
  return localConfig.activeProject ?? null;
}

async function runReviewLatest(
  context: CommandContext,
  options: { project?: string },
  dependencies: ReviewLatestDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectPath = await resolveProjectPath(
      repoRoot,
      options.project,
      dependencies,
    );
    const result = await findLatestReview({ repoRoot, projectPath });

    if (context.json) {
      context.logger.json(result ?? EMPTY_RESULT);
    } else if (result) {
      context.logger.info(result.path);
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
}

export function createReviewLatestCommand(
  overrides: Partial<ReviewLatestDependencies> = {},
): Command {
  const dependencies: ReviewLatestDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('latest')
    .description('Find the most recent OAT review artifact')
    .option(
      '--project <path>',
      'Project path to scan in addition to ad-hoc review locations',
    )
    .action(async (options: { project?: string }, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runReviewLatest(context, options, dependencies);
    });
}
