import { access, readFile, readdir } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';

import { recommendSkill } from './recommender/router';
import { scanArtifacts } from './state/artifacts';
import { parseStateFrontmatter } from './state/parser';
import { parseReviewTable, scanUnprocessedReviews } from './state/reviews';
import { parseTaskProgress } from './state/tasks';
import type { ProjectState, ProjectSummary, ReviewStatus } from './types';

export async function getProjectState(
  projectPath: string,
): Promise<ProjectState> {
  const displayPath = await resolveProjectDisplayPath(projectPath);
  const [
    stateContent,
    planContent,
    implementationContent,
    artifacts,
    reviewFiles,
  ] = await Promise.all([
    readOptionalFile(join(projectPath, 'state.md')),
    readOptionalFile(join(projectPath, 'plan.md')),
    readOptionalFile(join(projectPath, 'implementation.md')),
    scanArtifacts(projectPath),
    scanUnprocessedReviews(projectPath),
  ]);

  const parsedState = parseStateFrontmatter(stateContent);
  const reviews = mergeReviews(
    parseReviewTable(planContent),
    reviewFiles,
    projectPath,
  );
  const progress = parseTaskProgress(planContent, implementationContent);

  const projectStateWithoutRecommendation: Omit<
    ProjectState,
    'recommendation'
  > = {
    name: basename(projectPath),
    path: displayPath,
    phase: parsedState.phase ?? 'discovery',
    phaseStatus: parsedState.phaseStatus ?? 'in_progress',
    workflowMode: parsedState.workflowMode ?? 'spec-driven',
    executionMode: parsedState.executionMode,
    lifecycle: parsedState.lifecycle ?? 'active',
    pauseTimestamp: parsedState.pauseTimestamp,
    pauseReason: parsedState.pauseReason,
    progress,
    artifacts,
    reviews,
    blockers: parsedState.blockers,
    hillCheckpoints: parsedState.hillCheckpoints,
    hillCompleted: parsedState.hillCompleted,
    prStatus: parsedState.prStatus,
    prUrl: parsedState.prUrl,
    docsUpdated: parsedState.docsUpdated,
    lastCommit: parsedState.lastCommit,
    timestamps: {
      created: parsedState.projectCreated ?? '',
      completed: parsedState.projectCompleted,
      stateUpdated: parsedState.projectStateUpdated ?? '',
    },
  };

  return {
    ...projectStateWithoutRecommendation,
    recommendation: recommendSkill(projectStateWithoutRecommendation),
  };
}

export async function listProjects(
  projectsRoot: string,
): Promise<ProjectSummary[]> {
  const repoRoot = await findRepoRoot(projectsRoot);
  const entries = await readdir(projectsRoot, { withFileTypes: true });
  const projectDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(projectsRoot, entry.name));

  const summaries = await Promise.all(
    projectDirs.map(async (projectDir) => {
      const statePath = join(projectDir, 'state.md');
      const planPath = join(projectDir, 'plan.md');
      const implementationPath = join(projectDir, 'implementation.md');
      const stateContent = await readOptionalFile(statePath);

      if (!stateContent) {
        return null;
      }

      const [planContent, implementationContent, artifacts, reviewFiles] =
        await Promise.all([
          readOptionalFile(planPath),
          readOptionalFile(implementationPath),
          scanArtifacts(projectDir),
          scanUnprocessedReviews(projectDir),
        ]);
      const parsedState = parseStateFrontmatter(stateContent);
      const reviews = mergeReviews(
        parseReviewTable(planContent),
        reviewFiles,
        projectDir,
      );
      const progress = parseTaskProgress(planContent, implementationContent);

      const stateWithoutRecommendation: Omit<ProjectState, 'recommendation'> = {
        name: basename(projectDir),
        path: formatProjectDisplayPath(projectDir, repoRoot),
        phase: parsedState.phase ?? 'discovery',
        phaseStatus: parsedState.phaseStatus ?? 'in_progress',
        workflowMode: parsedState.workflowMode ?? 'spec-driven',
        executionMode: parsedState.executionMode,
        lifecycle: parsedState.lifecycle ?? 'active',
        pauseTimestamp: parsedState.pauseTimestamp,
        pauseReason: parsedState.pauseReason,
        progress,
        artifacts,
        reviews,
        blockers: parsedState.blockers,
        hillCheckpoints: parsedState.hillCheckpoints,
        hillCompleted: parsedState.hillCompleted,
        prStatus: parsedState.prStatus,
        prUrl: parsedState.prUrl,
        docsUpdated: parsedState.docsUpdated,
        lastCommit: parsedState.lastCommit,
        timestamps: {
          created: parsedState.projectCreated ?? '',
          completed: parsedState.projectCompleted,
          stateUpdated: parsedState.projectStateUpdated ?? '',
        },
      };

      return {
        name: stateWithoutRecommendation.name,
        path: stateWithoutRecommendation.path,
        phase: stateWithoutRecommendation.phase,
        phaseStatus: stateWithoutRecommendation.phaseStatus,
        workflowMode: stateWithoutRecommendation.workflowMode,
        lifecycle: stateWithoutRecommendation.lifecycle,
        progress: {
          completed: stateWithoutRecommendation.progress.completed,
          total: stateWithoutRecommendation.progress.total,
        },
        recommendation: recommendSkill(stateWithoutRecommendation),
      } satisfies ProjectSummary;
    }),
  );

  return summaries
    .filter((summary): summary is ProjectSummary => summary !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function resolveProjectDisplayPath(projectPath: string): Promise<string> {
  if (!isAbsolute(projectPath)) {
    return normalizePath(projectPath);
  }

  const repoRoot = await findRepoRoot(projectPath);
  return formatProjectDisplayPath(projectPath, repoRoot);
}

function formatProjectDisplayPath(
  projectPath: string,
  repoRoot: string | null,
): string {
  if (!isAbsolute(projectPath)) {
    return normalizePath(projectPath);
  }

  if (!repoRoot) {
    return projectPath;
  }

  return normalizePath(relative(repoRoot, projectPath));
}

async function findRepoRoot(startPath: string): Promise<string | null> {
  let currentPath = startPath;

  while (true) {
    if (
      (await pathExists(join(currentPath, '.git'))) ||
      (await pathExists(join(currentPath, '.oat', 'config.json')))
    ) {
      return currentPath;
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      return null;
    }

    currentPath = parentPath;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

async function readOptionalFile(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return '';
    }

    throw error;
  }
}

function mergeReviews(
  tableReviews: ReviewStatus[],
  reviewFiles: string[],
  projectPath: string,
): ReviewStatus[] {
  const merged = [...tableReviews];
  const existingArtifacts = new Set(
    tableReviews.map((review) => review.artifact),
  );

  for (const reviewFile of reviewFiles) {
    const relativeArtifact = relative(projectPath, reviewFile).replace(
      /\\/g,
      '/',
    );
    if (existingArtifacts.has(relativeArtifact)) {
      continue;
    }

    merged.push({
      scope: basename(reviewFile, '.md'),
      type: 'code',
      status: 'received',
      date: '-',
      artifact: relativeArtifact,
    });
  }

  return merged;
}
