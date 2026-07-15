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
  parseGeneratedTime,
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
  reviewType: string;
  generatedTime: number;
  lifecycleRank: number;
  priority: number;
}

export interface FindLatestReviewOptions {
  repoRoot: string;
  projectPath?: string | null;
  actionableProjectOnly?: boolean;
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

  const generatedTime = parseGeneratedTime(generatedAt);
  if (Number.isNaN(generatedTime)) {
    return null;
  }

  const scope = getFrontmatterField(frontmatter, 'oat_review_scope') ?? '';
  const reviewType =
    getFrontmatterField(frontmatter, 'oat_review_type') ?? 'code';

  return {
    path: relativePath,
    scope,
    reviewType,
    generatedAt,
    kind,
    archived,
    actionable,
    generatedTime,
    lifecycleRank: reviewLifecycleRank(scope),
    priority,
  };
}

interface ReviewLedgerEvent {
  scope: string;
  type: string;
  status: string;
  artifact: string;
}

function parseReviewLedgerEvents(planContent: string): ReviewLedgerEvent[] {
  const heading = /^## Reviews[ \t]*\r?$/m.exec(planContent);
  if (!heading) {
    return [];
  }

  const remaining = planContent.slice(heading.index + heading[0].length);
  const nextHeadingIndex = remaining.search(/^##(?!#)[ \t]+\S.*\r?$/m);
  const section =
    nextHeadingIndex === -1 ? remaining : remaining.slice(0, nextHeadingIndex);

  return section
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .slice(2)
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length === 5)
    .map(([scope = '', type = '', status = '', , artifact = '']) => ({
      scope,
      type,
      status,
      artifact,
    }));
}

async function correlateProjectActionability(
  repoRoot: string,
  projectPath: string,
  candidates: ReviewCandidate[],
): Promise<ReviewCandidate[]> {
  let planContent: string;
  try {
    planContent = await readFile(
      join(repoRoot, projectPath, 'plan.md'),
      'utf8',
    );
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return candidates;
    }
    throw error;
  }

  const events = parseReviewLedgerEvents(planContent);
  if (events.length === 0) {
    return candidates;
  }

  return candidates.map((candidate) => {
    if (candidate.kind !== 'project' || candidate.archived) {
      return candidate;
    }

    const artifact = normalizeToPosixPath(
      relative(projectPath, candidate.path),
    );
    const matchingEvent = events.find(
      (event) =>
        event.scope.toLowerCase() === candidate.scope.toLowerCase() &&
        event.type.toLowerCase() === candidate.reviewType.toLowerCase() &&
        normalizeToPosixPath(event.artifact) === artifact,
    );

    return {
      ...candidate,
      actionable: matchingEvent?.status.toLowerCase() === 'received',
    };
  });
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
  // Same scope, same generated time: fall back to a stable path order. Review
  // artifacts carry a seconds-precision `oat_generated_at`, so distinct re-gate
  // rounds differ on generatedTime above and never reach this branch.
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
    scanTargets.push({
      dir: `${projectPath}/reviews`,
      kind: 'project',
      priority: 0,
      archived: false,
      actionable: true,
    });
    if (!options.actionableProjectOnly) {
      scanTargets.push({
        dir: `${projectPath}/reviews/archived`,
        kind: 'project',
        priority: 1,
        archived: true,
        actionable: false,
      });
    }
  }

  if (!options.actionableProjectOnly) {
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
  }

  let candidates = (
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
    .filter((candidate): candidate is ReviewCandidate => candidate !== null);

  if (projectPath) {
    candidates = await correlateProjectActionability(
      options.repoRoot,
      projectPath,
      candidates,
    );
  }
  if (options.actionableProjectOnly) {
    candidates = candidates.filter((candidate) => candidate.actionable);
  }
  candidates.sort(sortReviewCandidates);

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
  options: { project?: string; actionableProject?: boolean },
  dependencies: ReviewLatestDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectPath = await resolveProjectPath(
      repoRoot,
      options.project,
      dependencies,
    );
    const result = await findLatestReview({
      repoRoot,
      projectPath,
      actionableProjectOnly: options.actionableProject,
    });

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
    .option(
      '--actionable-project',
      'Scan only active project reviews, excluding archived and ad-hoc history',
    )
    .action(
      async (
        options: { project?: string; actionableProject?: boolean },
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runReviewLatest(context, options, dependencies);
      },
    );
}
