import { readdir } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';

import { recommendSkill } from './recommender/router';
import { scanArtifacts } from './state/artifacts';
import { parseStateFrontmatter } from './state/parser';
import { parseReviewTable, scanUnprocessedReviews } from './state/reviews';
import { parseTaskProgress } from './state/tasks';
import type { ProjectState, ProjectSummary, ReviewStatus } from './types';

export async function getProjectState(
  projectPath: string,
): Promise<ProjectState> {
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
    path: projectPath,
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

      const parsedState = parseStateFrontmatter(stateContent);
      const artifacts = await scanArtifacts(projectDir);
      const reviews = mergeReviews(
        parseReviewTable(await readOptionalFile(planPath)),
        await scanUnprocessedReviews(projectDir),
        projectDir,
      );
      const progress = parseTaskProgress(
        await readOptionalFile(planPath),
        await readOptionalFile(implementationPath),
      );

      const stateWithoutRecommendation: Omit<ProjectState, 'recommendation'> = {
        name: basename(projectDir),
        path: projectDir,
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

async function readOptionalFile(path: string): Promise<string> {
  try {
    const { readFile } = await import('node:fs/promises');
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
