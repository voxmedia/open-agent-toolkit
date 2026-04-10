import type {
  ArtifactStatus,
  BoundaryTier,
  Phase,
  ProjectState,
  ReviewStatus,
  SkillRecommendation,
  WorkflowMode,
} from '../types';

const CURRENT_PHASE_SKILLS: Record<Exclude<Phase, 'implement'>, string> = {
  discovery: 'oat-project-discover',
  spec: 'oat-project-spec',
  design: 'oat-project-design',
  plan: 'oat-project-plan',
};

const CURRENT_ARTIFACT_BY_PHASE: Record<Phase, ArtifactStatus['type']> = {
  discovery: 'discovery',
  spec: 'spec',
  design: 'design',
  plan: 'plan',
  implement: 'implementation',
};

type EarlyPhaseKey =
  | 'discovery:in_progress:3'
  | 'discovery:in_progress:2'
  | 'discovery:complete:1'
  | 'spec:in_progress:3'
  | 'spec:in_progress:2'
  | 'spec:complete:1'
  | 'design:in_progress:3'
  | 'design:in_progress:2'
  | 'design:complete:1'
  | 'plan:in_progress:3'
  | 'plan:in_progress:2'
  | 'plan:complete:1'
  | 'implement:in_progress:any';

const SPEC_DRIVEN_ROUTES: Partial<Record<EarlyPhaseKey, string>> = {
  'discovery:in_progress:3': 'oat-project-discover',
  'discovery:in_progress:2': 'oat-project-spec',
  'discovery:complete:1': 'oat-project-spec',
  'spec:in_progress:3': 'oat-project-spec',
  'spec:in_progress:2': 'oat-project-design',
  'spec:complete:1': 'oat-project-design',
  'design:in_progress:3': 'oat-project-design',
  'design:in_progress:2': 'oat-project-plan',
  'design:complete:1': 'oat-project-plan',
  'plan:in_progress:3': 'oat-project-plan',
  'plan:in_progress:2': 'oat-project-implement',
  'plan:complete:1': 'oat-project-implement',
  'implement:in_progress:any': 'oat-project-implement',
};

const QUICK_ROUTES: Partial<Record<EarlyPhaseKey, string>> = {
  'discovery:in_progress:3': 'oat-project-discover',
  'discovery:in_progress:2': 'oat-project-plan',
  'discovery:complete:1': 'oat-project-plan',
  'plan:in_progress:3': 'oat-project-plan',
  'plan:in_progress:2': 'oat-project-implement',
  'plan:complete:1': 'oat-project-implement',
  'implement:in_progress:any': 'oat-project-implement',
};

const IMPORT_ROUTES: Partial<Record<EarlyPhaseKey, string>> = {
  'plan:in_progress:3': 'oat-project-import-plan',
  'plan:in_progress:2': 'oat-project-implement',
  'plan:complete:1': 'oat-project-implement',
  'implement:in_progress:any': 'oat-project-implement',
};

export function recommendSkill(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation {
  const hillOverride = getHillOverride(state);
  if (hillOverride) {
    return hillOverride;
  }

  if (
    state.phase === 'implement' &&
    (state.phaseStatus === 'complete' || state.phaseStatus === 'pr_open')
  ) {
    return getPostImplementationRecommendation(state);
  }

  const currentArtifact = getCurrentArtifact(state);
  if (currentArtifact?.readyFor && currentArtifact.status === 'complete') {
    return {
      skill: normalizeImplementationSkill(currentArtifact.readyFor, state),
      reason:
        'Current artifact is complete and explicitly points to the next skill',
    };
  }

  const earlyRoute = getEarlyPhaseRoute(
    state,
    currentArtifact?.boundaryTier ?? 3,
  );
  return {
    skill: normalizeImplementationSkill(earlyRoute, state),
    reason: `Route ${state.workflowMode} ${state.phase} work based on boundary tier`,
  };
}

function getHillOverride(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation | null {
  if (state.phase === 'implement') {
    return null;
  }

  if (
    state.hillCheckpoints.includes(state.phase) &&
    !state.hillCompleted.includes(state.phase)
  ) {
    return {
      skill: CURRENT_PHASE_SKILLS[state.phase],
      reason: 'HiLL gate is pending for the current phase',
    };
  }

  return null;
}

function getPostImplementationRecommendation(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation {
  if (hasIncompleteRevisionPhase(state)) {
    return {
      skill: normalizeImplementationSkill('oat-project-implement', state),
      reason: 'Revision work remains incomplete',
    };
  }

  if (hasUnprocessedReviewFeedback(state)) {
    return {
      skill: 'oat-project-review-receive',
      reason: 'Unprocessed review feedback exists',
    };
  }

  const finalReview = state.reviews.find(
    (review) => review.scope === 'final' && review.type === 'code',
  );

  if (!finalReview || finalReview.status === 'pending') {
    return {
      skill: 'oat-project-review-provide',
      reason: 'Final code review is required',
      context: 'code final',
    };
  }

  if (finalReview.status === 'fixes_completed') {
    return {
      skill: 'oat-project-review-provide',
      reason: 'Review fixes are complete and need re-review',
      context: 'code final',
    };
  }

  if (finalReview.status !== 'passed') {
    return {
      skill: 'oat-project-review-receive',
      reason: 'Final review findings still need processing',
    };
  }

  const summaryArtifact = state.artifacts.find(
    (artifact) => artifact.type === 'summary',
  );
  if (!summaryArtifact || summaryArtifact.status !== 'complete') {
    return {
      skill: 'oat-project-summary',
      reason: 'Final review passed but summary is not complete',
    };
  }

  if (state.phaseStatus !== 'pr_open') {
    return {
      skill: 'oat-project-pr-final',
      reason: 'Summary is complete and the final PR has not been opened',
    };
  }

  return {
    skill: 'oat-project-complete',
    reason: 'PR is open and the project is ready for completion',
  };
}

function hasIncompleteRevisionPhase(
  state: Omit<ProjectState, 'recommendation'>,
): boolean {
  return state.progress.phases.some(
    (phase) => phase.isRevision && phase.completed < phase.total,
  );
}

function hasUnprocessedReviewFeedback(
  state: Omit<ProjectState, 'recommendation'>,
): boolean {
  return state.reviews.some((review) => {
    if (review.scope === 'final' && review.type === 'code') {
      return false;
    }

    return !isProcessedReviewStatus(review);
  });
}

function isProcessedReviewStatus(review: ReviewStatus): boolean {
  return (
    review.status === 'passed' ||
    review.status === 'fixes_added' ||
    review.status === 'fixes_completed'
  );
}

function getCurrentArtifact(
  state: Omit<ProjectState, 'recommendation'>,
): ArtifactStatus | undefined {
  return state.artifacts.find(
    (artifact) => artifact.type === CURRENT_ARTIFACT_BY_PHASE[state.phase],
  );
}

function getEarlyPhaseRoute(
  state: Omit<ProjectState, 'recommendation'>,
  boundaryTier: BoundaryTier,
): string {
  if (state.phase === 'implement' && state.phaseStatus === 'in_progress') {
    return normalizeImplementationSkill('oat-project-implement', state);
  }

  const routes = getWorkflowRoutes(state.workflowMode);
  const key =
    `${state.phase}:${state.phaseStatus}:${boundaryTier}` as EarlyPhaseKey;
  const route = routes[key];

  if (route) {
    return route;
  }

  if (state.phase === 'implement') {
    return 'oat-project-implement';
  }

  return CURRENT_PHASE_SKILLS[state.phase];
}

function getWorkflowRoutes(
  workflowMode: WorkflowMode,
): Partial<Record<EarlyPhaseKey, string>> {
  switch (workflowMode) {
    case 'quick':
      return QUICK_ROUTES;
    case 'import':
      return IMPORT_ROUTES;
    case 'spec-driven':
    default:
      return SPEC_DRIVEN_ROUTES;
  }
}

function normalizeImplementationSkill(
  skill: string,
  state: Omit<ProjectState, 'recommendation'>,
): string {
  if (
    skill === 'oat-project-implement' &&
    state.executionMode === 'subagent-driven'
  ) {
    return 'oat-project-subagent-implement';
  }

  return skill;
}
