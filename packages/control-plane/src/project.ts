import { access, readFile, readdir } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';

import { recommendSkill } from './recommender/router';
import { parseFrontmatterRecord } from './shared/utils/frontmatter';
import { scanArtifacts } from './state/artifacts';
import {
  parseBriefOutcomes,
  validateGoalOutcomeAudit,
} from './state/goal-audit';
import { readMilestoneMembership } from './state/milestones';
import {
  type ParsedStateFrontmatter,
  parseStateFrontmatter,
} from './state/parser';
import {
  parseReviewArtifactIdentity,
  parseReviewTable,
  scanUnprocessedReviews,
} from './state/reviews';
import { normalizePhaseId, parseTaskProgress } from './state/tasks';
import {
  isBriefMode,
  type ProjectState,
  type TaskProgress,
  type ProjectSummary,
  type ReviewArtifactStatus,
  type ReviewStatus,
} from './types';

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
  const tableReviews = parseReviewTable(planContent);
  const activeReviewArtifacts = await toActiveReviewArtifacts(
    reviewFiles,
    projectPath,
    tableReviews,
  );
  const reviews = mergeReviews(tableReviews, activeReviewArtifacts);
  const progress = parseProjectProgress(
    parsedState,
    planContent,
    implementationContent,
  );

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
    activeReviewArtifacts,
    blockers: parsedState.blockers,
    hillCheckpoints: parsedState.hillCheckpoints,
    hillCompleted: parsedState.hillCompleted,
    prStatus: parsedState.prStatus,
    prUrl: parsedState.prUrl,
    docsUpdated: parsedState.docsUpdated,
    lastCommit: parsedState.lastCommit,
    projectExplainer: parsedState.projectExplainer,
    projectRecap: parsedState.projectRecap,
    timestamps: {
      created: parsedState.projectCreated ?? '',
      completed: parsedState.projectCompleted,
      stateUpdated: parsedState.projectStateUpdated ?? '',
    },
    ...readGoalState(parsedState, planContent, implementationContent, progress),
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
      const tableReviews = parseReviewTable(planContent);
      const activeReviewArtifacts = await toActiveReviewArtifacts(
        reviewFiles,
        projectDir,
        tableReviews,
      );
      const reviews = mergeReviews(tableReviews, activeReviewArtifacts);
      const progress = parseProjectProgress(
        parsedState,
        planContent,
        implementationContent,
      );

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
        activeReviewArtifacts,
        blockers: parsedState.blockers,
        hillCheckpoints: parsedState.hillCheckpoints,
        hillCompleted: parsedState.hillCompleted,
        prStatus: parsedState.prStatus,
        prUrl: parsedState.prUrl,
        docsUpdated: parsedState.docsUpdated,
        lastCommit: parsedState.lastCommit,
        projectExplainer: parsedState.projectExplainer,
        projectRecap: parsedState.projectRecap,
        timestamps: {
          created: parsedState.projectCreated ?? '',
          completed: parsedState.projectCompleted,
          stateUpdated: parsedState.projectStateUpdated ?? '',
        },
        ...readGoalState(
          parsedState,
          planContent,
          implementationContent,
          progress,
        ),
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

/**
 * Progress for one project. Brief modes count phase-units; goal additionally
 * honors the extraction precedence.
 */
function parseProjectProgress(
  parsedState: ParsedStateFrontmatter,
  planContent: string,
  implementationContent: string,
): TaskProgress {
  return parseTaskProgress(planContent, implementationContent, {
    phaseUnits: isBriefMode(parsedState.workflowMode),
    extractedUnits: parsedState.workflowMode === 'goal',
  });
}

type GoalStateFields = Pick<
  ProjectState,
  | 'milestone'
  | 'milestoneStatus'
  | 'goalStatus'
  | 'goalOutcomeAudit'
  | 'goalOutcomeAuditValidation'
  | 'goalRecovery'
  | 'deliveries'
  | 'milestoneGates'
  | 'milestoneMembership'
  | 'planParallelGroups'
>;

/**
 * Goal state shared by both project readers: the persisted goal fields, the
 * `## Milestones` membership with its errors, and the terminal audit's
 * validation result (computed whenever an audit is recorded or the goal is
 * declared met). Every other mode gets no goal fields.
 */
function readGoalState(
  parsedState: ParsedStateFrontmatter,
  planContent: string,
  implementationContent: string,
  progress: TaskProgress,
): GoalStateFields | Record<string, never> {
  if (parsedState.workflowMode !== 'goal') {
    return {};
  }

  const goalOutcomeAudit = parsedState.goalOutcomeAudit ?? null;
  const goalStatus = parsedState.goalStatus ?? null;
  return {
    milestone: parsedState.milestone ?? null,
    milestoneStatus: parsedState.milestoneStatus ?? null,
    goalStatus,
    goalOutcomeAudit,
    goalOutcomeAuditValidation:
      goalOutcomeAudit !== null || goalStatus === 'declared_met'
        ? validateGoalOutcomeAudit(
            goalOutcomeAudit,
            progress.phases,
            parseBriefOutcomes(planContent),
          )
        : null,
    goalRecovery: parsedState.goalRecovery ?? null,
    deliveries: parsedState.deliveries ?? [],
    milestoneGates: parsedState.milestoneGates ?? {},
    milestoneMembership: readMilestoneMembership(
      planContent,
      implementationContent,
    ),
    planParallelGroups: readPlanParallelGroups(planContent),
  };
}

/**
 * `oat_plan_parallel_groups` from the brief frontmatter with normalized phase
 * ids. A malformed value reads as no groups; plan validation reports it.
 */
function readPlanParallelGroups(planContent: string): string[][] {
  const groups = parseFrontmatterRecord(planContent).oat_plan_parallel_groups;
  if (!Array.isArray(groups)) {
    return [];
  }
  return groups
    .filter(Array.isArray)
    .map((group: unknown[]) =>
      group
        .map((member) =>
          typeof member === 'string' ? normalizePhaseId(member.trim()) : null,
        )
        .filter((member): member is string => member !== null),
    );
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
  activeReviewArtifacts: ReviewArtifactStatus[],
): ReviewStatus[] {
  const merged = [...tableReviews];
  const existingArtifacts = new Set(
    tableReviews.map((review) => review.artifact),
  );

  for (const reviewArtifact of activeReviewArtifacts) {
    if (existingArtifacts.has(reviewArtifact.path)) {
      continue;
    }

    merged.push({
      scope: basename(reviewArtifact.path, '.md'),
      type: 'code',
      status: 'received',
      date: '-',
      artifact: reviewArtifact.path,
    });
  }

  return merged;
}

async function toActiveReviewArtifacts(
  reviewFiles: string[],
  projectPath: string,
  tableReviews: ReviewStatus[],
): Promise<ReviewArtifactStatus[]> {
  return Promise.all(
    reviewFiles.map(async (reviewFile) => {
      const path = relative(projectPath, reviewFile).replace(/\\/g, '/');
      const identity = parseReviewArtifactIdentity(
        await readOptionalFile(reviewFile),
      );
      const actionable =
        identity !== null &&
        tableReviews.some(
          (review) =>
            review.scope.toLowerCase() === identity.scope.toLowerCase() &&
            review.type.toLowerCase() === identity.type.toLowerCase() &&
            review.artifact === path &&
            review.status.toLowerCase() === 'received',
        );

      return {
        path,
        archived: false,
        actionable,
      };
    }),
  );
}
