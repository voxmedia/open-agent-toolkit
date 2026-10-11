import { milestonePhaseScope } from '../state/milestones';
import { selectPhaseUnits } from '../state/tasks';
import {
  type ArtifactStatus,
  type BoundaryTier,
  type GoalDelivery,
  type GoalRecovery,
  isBriefMode,
  type Phase,
  type PhaseProgress,
  type ProjectState,
  type QuickPlanReadiness,
  type QuickPlanReadinessFailure,
  type SkillRecommendation,
  type WorkflowMode,
} from '../types';

type PlanningPhase = Exclude<Phase, 'implement' | 'decomposition'>;

const CURRENT_PHASE_SKILLS: Record<PlanningPhase, string> = {
  discovery: 'oat-project-discover',
  spec: 'oat-project-spec',
  design: 'oat-project-design',
  plan: 'oat-project-plan',
};

/**
 * Brief modes own their planning phase through the brief entry skill, so the
 * spec-driven planning skill is never their current-phase default (HiLL
 * override or untiered fallback).
 */
const BRIEF_PHASE_SKILLS: Partial<Record<PlanningPhase, string>> = {
  plan: 'oat-project-brief',
};

/** Goal owns its planning phase (brief, milestones, activation) the same way. */
const GOAL_PHASE_SKILLS: Partial<Record<PlanningPhase, string>> = {
  plan: 'oat-project-goal',
};

function getCurrentPhaseSkill(
  phase: PlanningPhase,
  workflowMode: WorkflowMode,
): string {
  if (workflowMode === 'goal') {
    return GOAL_PHASE_SKILLS[phase] ?? CURRENT_PHASE_SKILLS[phase];
  }
  if (isBriefMode(workflowMode)) {
    return BRIEF_PHASE_SKILLS[phase] ?? CURRENT_PHASE_SKILLS[phase];
  }

  return CURRENT_PHASE_SKILLS[phase];
}

const CURRENT_ARTIFACT_BY_PHASE: Record<
  Exclude<Phase, 'decomposition'>,
  ArtifactStatus['type']
> = {
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

// Quick discovery hands off to quick-start, matching the oat-project-next and
// oat-project-progress tables; the spec-driven planning skill is a two-hop
// route for a quick project.
const QUICK_ROUTES: Partial<Record<EarlyPhaseKey, string>> = {
  'discovery:in_progress:3': 'oat-project-discover',
  'discovery:in_progress:2': 'oat-project-quick-start',
  'discovery:complete:1': 'oat-project-quick-start',
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

const LITE_ROUTES: Partial<Record<EarlyPhaseKey, string>> = {
  'plan:in_progress:3': 'oat-project-lite',
  'plan:in_progress:2': 'oat-project-implement',
  'plan:complete:1': 'oat-project-implement',
  'implement:in_progress:any': 'oat-project-implement',
};

// Unlike lite, tier 2 stays with the entry skill: a brief is
// implementation-ready only through its recorded review disposition and
// approval, which `oat-project-brief` owns.
const BRIEF_ROUTES: Partial<Record<EarlyPhaseKey, string>> = {
  'plan:in_progress:3': 'oat-project-brief',
  'plan:in_progress:2': 'oat-project-brief',
  'plan:complete:1': 'oat-project-implement',
  'implement:in_progress:any': 'oat-project-implement',
};

// Goal plan rows belong to the goal entry skill, which also owns milestone
// activation, so an approved brief does not hand off to implementation from
// the plan phase; the goal priority block routes milestone work.
const GOAL_ROUTES: Partial<Record<EarlyPhaseKey, string>> = {
  'plan:in_progress:3': 'oat-project-goal',
  'plan:in_progress:2': 'oat-project-goal',
  'plan:complete:1': 'oat-project-goal',
  'implement:in_progress:any': 'oat-project-implement',
};

export function recommendSkill(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation {
  if (state.phase === 'decomposition') {
    return getDecompositionRecommendation(state);
  }

  const hillOverride = getHillOverride(state);
  if (hillOverride) {
    return hillOverride;
  }

  // Goal milestones route before the brief-unit guard: under goal that guard
  // applies only inside the status table at `implementing`, scoped to the
  // active milestone's ordered phase set.
  const goalRoute = getGoalRecommendation(state);
  if (goalRoute) {
    return goalRoute;
  }

  const briefUnitGuard = getBriefUnitGuard(state);
  if (briefUnitGuard) {
    return briefUnitGuard;
  }

  if (
    state.phase === 'implement' &&
    (state.phaseStatus === 'complete' || state.phaseStatus === 'pr_open')
  ) {
    return getPostImplementationRecommendation(state);
  }

  const currentArtifact = getCurrentArtifact(state);
  if (
    state.workflowMode === 'quick' &&
    currentArtifact?.readyFor === 'oat-project-quick-start'
  ) {
    return {
      skill: 'oat-project-quick-start',
      reason: 'Promoted quick project is explicitly ready for quick-start',
    };
  }

  const quickPlanGate = getQuickPlanGate(state, currentArtifact);
  if (quickPlanGate) {
    return quickPlanGate;
  }

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

/**
 * Quick mode's `plan` phase is decided by the named **quick plan readiness**
 * predicate, exactly as `oat-project-quick-start`, `oat-project-plan`,
 * `oat-project-progress`, and `oat-project-next` decide it. A ready plan keeps
 * the ordinary route — its own `oat_ready_for` or the quick routing table — and
 * a plan that is not ready resumes the quick workflow in place instead of being
 * handed to implementation or to spec-driven planning.
 *
 * The gate applies to the `plan` phase only, after the boundary tier has
 * already been classified, so tier semantics are unchanged: it discriminates
 * the `plan` outcomes that would otherwise share one tier. Readiness the reader
 * did not evaluate is not readiness, so an unevaluated plan artifact is not
 * ready.
 */
function getQuickPlanGate(
  state: Omit<ProjectState, 'recommendation'>,
  currentArtifact: ArtifactStatus | undefined,
): SkillRecommendation | null {
  if (state.workflowMode !== 'quick' || state.phase !== 'plan') {
    return null;
  }

  const readiness = currentArtifact?.quickPlanReadiness;
  if (readiness?.ready) {
    return null;
  }

  return {
    skill: 'oat-project-quick-start',
    reason: quickPlanNotReadyReason(readiness),
  };
}

/**
 * The reason a quick plan that is not ready resumes quick-start in place. The
 * CLI dashboard reports the same wording, so the router and the dashboard
 * cannot disagree about why.
 */
export function quickPlanNotReadyReason(
  readiness: QuickPlanReadiness | undefined,
): string {
  return `Quick plan is not implementation-ready (${describeQuickPlanFailure(readiness)}); resume the quick workflow in place`;
}

const QUICK_PLAN_FAILURE_REASONS: Record<QuickPlanReadinessFailure, string> = {
  'plan-missing': 'plan.md is missing',
  'frontmatter-not-ready':
    'frontmatter is not the recorded plan-complete state',
  'review-disposition-missing':
    'the Reviews section records no plan review disposition',
  'substantive-task-missing': 'no phase carries a substantive task',
  'promotion-pending-phases':
    'promoted brief phases still need executable tasks',
};

function describeQuickPlanFailure(
  readiness: QuickPlanReadiness | undefined,
): string {
  if (!readiness?.failure) {
    return 'plan readiness was not evaluated';
  }

  return QUICK_PLAN_FAILURE_REASONS[readiness.failure];
}

function getDecompositionRecommendation(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation {
  if (state.phaseStatus === 'complete') {
    return {
      skill: 'none',
      reason:
        'Coordination decomposition is complete; continue one of the child implementation projects',
    };
  }

  return {
    skill: 'oat-project-split',
    reason: 'Continue decomposing this coordination project',
  };
}

function getHillOverride(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation | null {
  if (state.phase === 'implement' || state.phase === 'decomposition') {
    return null;
  }

  if (
    state.hillCheckpoints.includes(state.phase) &&
    !state.hillCompleted.includes(state.phase)
  ) {
    return {
      skill: getCurrentPhaseSkill(state.phase, state.workflowMode),
      reason: 'HiLL gate is pending for the current phase',
    };
  }

  return null;
}

/**
 * Brief modes count progress in phase-units, so a brief project whose
 * implement phase reads `complete` or `pr_open` while a unit in its active
 * scope is still unaccepted resumes implementation before any finalization
 * route. The guard is conditioned on the implement phase so planning routes
 * stay reachable, and `lifecycle: complete` stays terminal exactly as it does
 * for the task-mode revision reopen. The active scope is the whole plan for
 * brief (`null`).
 */
function getBriefUnitGuard(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation | null {
  if (
    state.phase === 'implement' &&
    isBriefMode(state.workflowMode) &&
    state.lifecycle !== 'complete' &&
    hasIncompletePhaseUnit(selectPhaseUnits(state.progress, null))
  ) {
    return {
      skill: normalizeImplementationSkill('oat-project-implement', state),
      reason: 'Incomplete phase-units remain in the active scope',
    };
  }

  return null;
}

/**
 * Ordinary and revision phases count alike; a provisional unit is incomplete
 * regardless of its counts.
 */
function hasIncompletePhaseUnit(units: readonly PhaseProgress[]): boolean {
  return units.some(
    (unit) => unit.provisional === true || unit.completed < unit.total,
  );
}

type RouterState = Omit<ProjectState, 'recommendation'>;

/**
 * The goal priority block (design "Goal transition contract"). It reads only
 * persisted state — milestone and goal status, the recovery record, gate
 * carriers with their derived freshness, the delivery registry, review rows
 * and the shared Milestones reader — and never evaluates Git.
 *
 * 1. `declared_met` → terminal recovery, after validating the A3 audit.
 * 2. Actionable review artifacts → review-receive; then a pending
 *    `oat_goal_recovery` → its stage owner (A1).
 * 3. Invalid active milestone membership (B1) → `oat-project-goal`.
 * 4. The milestone status table.
 *
 * Returns `null` for every other mode, a completed lifecycle, and a goal
 * still authoring its brief before milestone state exists (the planning
 * routes then apply).
 */
function getGoalRecommendation(state: RouterState): SkillRecommendation | null {
  if (
    state.workflowMode !== 'goal' ||
    state.lifecycle === 'complete' ||
    state.phase === 'decomposition'
  ) {
    return null;
  }

  const milestoneStatus = state.milestoneStatus ?? null;
  const declared = state.goalStatus === 'declared_met';
  if (!declared && milestoneStatus === null && state.phase !== 'implement') {
    return null;
  }

  if (declared) {
    return getGoalTerminalRecommendation(state);
  }

  if (hasActionableReviewArtifacts(state)) {
    return {
      skill: 'oat-project-review-receive',
      reason: 'Unprocessed review feedback exists',
    };
  }

  if (state.goalRecovery) {
    return getGoalRecoveryRecommendation(state, state.goalRecovery);
  }

  const membershipProblem = describeMembershipProblem(state);
  if (membershipProblem) {
    return {
      skill: 'oat-project-goal',
      reason: `Active milestone membership invalid: ${membershipProblem}`,
    };
  }

  // Membership is valid, so the active milestone has a non-empty scope.
  const milestoneId = state.milestone as string;
  const scope = milestonePhaseScope(
    state.milestoneMembership as NonNullable<
      RouterState['milestoneMembership']
    >,
    milestoneId,
  ) as string[];
  const label = scopeLabel(milestoneId, null, scope);

  switch (milestoneStatus) {
    case 'aligning': {
      const blocker = getGoalActivationBlocker(state, milestoneId, scope, {
        activation: true,
      });
      return {
        skill: 'oat-project-goal',
        reason: blocker
          ? `Milestone ${milestoneId} cannot activate yet: ${blocker}`
          : `Milestone ${milestoneId} is ready to activate`,
        context: `align ${milestoneId}`,
      };
    }
    case 'implementing': {
      const blocker = getGoalActivationBlocker(state, milestoneId, scope, {
        activation: false,
      });
      if (blocker) {
        return {
          skill: 'oat-project-goal',
          reason: `Milestone ${milestoneId} is implementing without its activation prerequisites: ${blocker}`,
          context: `align ${milestoneId}`,
        };
      }
      if (hasIncompletePhaseUnit(selectPhaseUnits(state.progress, scope))) {
        return {
          skill: 'oat-project-implement',
          reason: 'Incomplete phase-units remain in the active milestone',
          context: `scope ${label}`,
        };
      }
      return {
        skill: 'oat-project-implement',
        reason:
          'Every phase-unit in the active milestone is accepted; implement milestone closeout runs the exit gate',
        context: `closeout ${label}`,
      };
    }
    case 'reviewing':
    case 'delivering': {
      const delivery = latestDelivery(state, milestoneId);
      return routeByDeliveryEvidence(state, {
        milestoneId,
        deliveryId: delivery?.delivery_id ?? null,
        phaseIds: scope,
        artifact: null,
        label,
        deliverContext: `deliver ${milestoneId}`,
        completeReview: milestoneStatus === 'reviewing',
      });
    }
    case 'delivered': {
      const delivery = latestDelivery(state, milestoneId);
      const atEndpoint = delivery !== null && isAtAgreedEndpoint(delivery);
      return {
        skill: 'oat-project-goal',
        reason: atEndpoint
          ? `Delivery ${delivery.delivery_id} reached its agreed endpoint; re-align and activate the next milestone`
          : `Milestone ${milestoneId} is delivered (registered, open, review-ready); re-alignment may plan the next milestone, but activation waits for ${delivery ? `${delivery.delivery_id} to reach its agreed endpoint (${delivery.endpoint ?? 'unrecorded'})` : 'a registered delivery'}`,
        context: `realign ${milestoneId}`,
      };
    }
    default:
      return {
        skill: 'oat-project-goal',
        reason: 'Goal milestone status is not recorded',
      };
  }
}

/**
 * Terminal recovery under `oat_goal_status: declared_met`: the A3 audit is
 * validated first, received feedback and pending recovery are never
 * bypassed, and audited `deferred`/`retired` phases leave the terminal
 * execution scope without changing ordinary phase-unit counts. Declaration
 * prevents activation of any further milestone.
 */
function getGoalTerminalRecommendation(
  state: RouterState,
): SkillRecommendation {
  const validation = state.goalOutcomeAuditValidation ?? null;
  if (!validation?.valid) {
    const codes = validation?.errors.map((error) => error.code) ?? [
      'audit-missing',
    ];
    return {
      skill: 'oat-project-goal',
      reason: `Goal is declared met but its outcome audit is invalid (${codes.join(', ')}); oat-project-goal repairs the declaration and audit`,
      context: 'audit',
    };
  }

  if (hasActionableReviewArtifacts(state)) {
    return {
      skill: 'oat-project-review-receive',
      reason: 'Unprocessed review feedback exists',
    };
  }

  if (state.goalRecovery) {
    return getGoalRecoveryRecommendation(state, state.goalRecovery);
  }

  const leftScope = new Set(
    Object.entries(validation.audit?.phases ?? {})
      .filter(
        ([, entry]) =>
          entry.disposition === 'deferred' || entry.disposition === 'retired',
      )
      .map(([phaseId]) => phaseId),
  );
  const terminalPhases = state.progress.phases.filter(
    (phase) => !leftScope.has(phase.phaseId),
  );
  if (hasIncompletePhaseUnit(terminalPhases)) {
    return {
      skill: 'oat-project-implement',
      reason: 'Phase-units in the terminal execution scope remain incomplete',
      context: `scope terminal: ${terminalPhases.map((phase) => phase.phaseId).join(', ')}`,
    };
  }

  return getPostImplementationRecommendation({
    ...state,
    progress: { ...state.progress, phases: terminalPhases },
  });
}

/**
 * A pending recovery routes to its stage owner with the recovery's explicit
 * milestone, delivery and ordered phase set; the active milestone, its status
 * and its pointer are never part of the route. Review stages still route by
 * missing evidence (A1).
 */
function getGoalRecoveryRecommendation(
  state: RouterState,
  recovery: GoalRecovery,
): SkillRecommendation {
  const label = scopeLabel(
    recovery.milestone,
    recovery.delivery_id,
    recovery.phase_ids,
  );
  const subject = recovery.delivery_id
    ? `${recovery.milestone}/${recovery.delivery_id}`
    : recovery.milestone;

  switch (recovery.stage) {
    case 'implementing':
      return {
        skill: 'oat-project-implement',
        reason: `Goal recovery for ${subject} is implementing queued fixes`,
        context: `scope ${label}`,
      };
    case 'exit_gate':
      return {
        skill: 'oat-project-implement',
        reason: `Goal recovery for ${subject} needs its milestone exit gate`,
        context: `closeout ${label}`,
      };
    default:
      return routeByDeliveryEvidence(state, {
        milestoneId: recovery.milestone,
        deliveryId: recovery.delivery_id,
        phaseIds: recovery.phase_ids,
        artifact: recovery.review_artifact,
        label,
        deliverContext: `deliver ${subject}`,
        completeReview: recovery.stage !== 'delivering',
      });
  }
}

interface DeliveryEvidenceTarget {
  milestoneId: string;
  deliveryId: string | null;
  phaseIds: readonly string[];
  artifact: string | null;
  label: string;
  deliverContext: string;
  /** Before `delivering`, a passed review still needs review-receive's transition. */
  completeReview: boolean;
}

/**
 * The A1 missing-evidence rule shared by `reviewing`, `delivering` and the
 * recovery review stages: queued fixes → implement; a missing, blocked, stale
 * or subject-mismatched exit carrier → implement scoped closeout; a missing,
 * stale or `fixes_completed` integrated review → review-provide; a produced,
 * unreceived review → review-receive; only a passed review of the exact
 * artifact with a fresh allowed carrier reaches delivery.
 */
function routeByDeliveryEvidence(
  state: RouterState,
  target: DeliveryEvidenceTarget,
): SkillRecommendation {
  const review = readIntegratedReview(state, target);
  if (review.status === 'fixes_queued') {
    return {
      skill: 'oat-project-implement',
      reason:
        'Queued review fixes invalidate the integrated review and exit-gate evidence',
      context: `scope ${target.label}`,
    };
  }

  const exitProblem = describeExitCarrierProblem(state, target);
  if (exitProblem) {
    return {
      skill: 'oat-project-implement',
      reason: `Milestone exit carrier for ${target.milestoneId} is ${exitProblem}; implement's scoped closeout reruns the exit gate`,
      context: `closeout ${target.label}`,
    };
  }

  switch (review.status) {
    case 'missing':
    case 'stale':
      return {
        skill: 'oat-project-review-provide',
        reason:
          review.status === 'stale'
            ? 'The integrated delivery review is stale'
            : 'The integrated delivery review is missing or not passed',
        context: `code ${target.label}`,
      };
    case 'received':
      return {
        skill: 'oat-project-review-receive',
        reason: 'The integrated delivery review has not been received',
        context: `receive ${review.artifact}`,
      };
    default:
      return target.completeReview
        ? {
            skill: 'oat-project-review-receive',
            reason:
              'The integrated delivery review passed; review-receive owns the transition to delivering',
            context: `receive ${review.artifact}`,
          }
        : {
            skill: 'oat-project-pr-progress',
            reason:
              'Integrated review passed and the exit carrier is allowed and fresh',
            context: target.deliverContext,
          };
  }
}

function describeExitCarrierProblem(
  state: RouterState,
  target: DeliveryEvidenceTarget,
): string | null {
  const exit = state.milestoneGates?.[target.milestoneId]?.exit ?? null;
  if (exit === null) {
    return 'missing';
  }
  if (exit.status !== 'allowed') {
    return `not allowed (${exit.status ?? 'unresolved'})`;
  }
  if (exit.freshness !== 'fresh') {
    return exit.freshness === 'stale'
      ? `stale${exit.freshness_reason ? ` (${exit.freshness_reason})` : ''}`
      : 'without recorded freshness';
  }
  const bound = new Set(exit.subject?.scope ?? []);
  const unbound = target.phaseIds.filter((phaseId) => !bound.has(phaseId));
  if (exit.subject === null || unbound.length > 0) {
    return `not bound to ${unbound.length > 0 ? unbound.join(', ') : 'a subject'}`;
  }
  return null;
}

type IntegratedReviewStatus =
  | 'passed'
  | 'received'
  | 'fixes_queued'
  | 'missing'
  | 'stale';

/**
 * Integrated review evidence for a milestone or delivery, read from the
 * registry's persisted disposition and the `## Reviews` rows. A recovery that
 * names its review artifact is satisfied only by that exact artifact; the
 * registry's recorded review counts only for its own artifact and only when
 * its frozen scope covers every target phase, so a review that predates an
 * appended correction phase is never reused.
 */
function readIntegratedReview(
  state: RouterState,
  target: DeliveryEvidenceTarget,
): { status: IntegratedReviewStatus; artifact: string | null } {
  const delivery =
    target.deliveryId === null
      ? null
      : (state.deliveries ?? []).find(
          (entry) => entry.delivery_id === target.deliveryId,
        );
  const recorded = delivery?.integrated_review ?? null;
  const registered =
    recorded !== null &&
    (target.artifact === null || target.artifact === recorded.artifact)
      ? recorded
      : null;
  const registeredCovers =
    registered !== null &&
    target.phaseIds.every((phaseId) => registered.scope.includes(phaseId));
  const artifact = target.artifact ?? registered?.artifact ?? null;
  const labels = new Set(
    [target.milestoneId, target.deliveryId]
      .filter((value): value is string => value !== null)
      .map((value) => value.toLowerCase()),
  );
  const row = [...state.reviews]
    .reverse()
    .find((review) =>
      artifact !== null
        ? review.artifact === artifact
        : review.type === 'code' && labels.has(review.scope.toLowerCase()),
    );

  if (
    registered?.disposition === 'stale' ||
    registered?.disposition === 'failed'
  ) {
    return { status: 'stale', artifact };
  }

  const rowStatus = row?.status.toLowerCase() ?? null;
  const rowArtifact = row?.artifact ?? artifact;
  const uncoveredRegistryReview =
    registered !== null &&
    rowArtifact === registered.artifact &&
    !registeredCovers;
  switch (rowStatus) {
    case 'passed':
      return uncoveredRegistryReview
        ? { status: 'missing', artifact: rowArtifact }
        : { status: 'passed', artifact: rowArtifact };
    case 'received':
      return { status: 'received', artifact: rowArtifact };
    case 'fixes_added':
      return { status: 'fixes_queued', artifact: rowArtifact };
    case null:
      return registered?.disposition === 'passed' && registeredCovers
        ? { status: 'passed', artifact: registered.artifact }
        : { status: 'missing', artifact };
    default:
      return { status: 'missing', artifact: rowArtifact };
  }
}

/**
 * Why the active milestone's membership cannot scope work, or `null` when it
 * can: membership errors from the shared reader, no active milestone, no row
 * for it, or a row with no phases.
 */
function describeMembershipProblem(state: RouterState): string | null {
  const membership = state.milestoneMembership;
  if (!membership) {
    return 'milestone membership was not read';
  }
  const [firstError] = membership.errors;
  if (firstError) {
    return `${firstError.code}: ${firstError.message}`;
  }
  if (!state.milestone) {
    return 'no active milestone is recorded (oat_milestone)';
  }
  const row = membership.milestones.find(
    (entry) => entry.milestoneId === state.milestone,
  );
  if (!row) {
    return `no ## Milestones row for ${state.milestone}`;
  }
  if (row.phaseIds.length === 0) {
    return `${state.milestone} lists no phases`;
  }
  return null;
}

/**
 * The first unmet activation prerequisite for a milestone, or `null`. Every
 * check reads persisted state: approval is the brief's completed plan
 * frontmatter (written only after the single approval), the plan carrier must
 * be allowed, not stale and bound to the milestone's membership, and — at
 * activation only — the previous deliveries must be at their agreed endpoint
 * and the next dispatch (the next incomplete phase and every member of its
 * parallel group) must be concrete. Later provisional phases are permitted.
 */
function getGoalActivationBlocker(
  state: RouterState,
  milestoneId: string,
  scope: readonly string[],
  options: { activation: boolean },
): string | null {
  const plan = state.artifacts.find((artifact) => artifact.type === 'plan');
  if (!plan?.exists || plan.status !== 'complete') {
    return 'the brief is not approved (plan.md is not complete)';
  }

  const carrier = state.milestoneGates?.[milestoneId]?.plan ?? null;
  if (carrier === null) {
    return `no plan carrier is recorded for ${milestoneId}`;
  }
  if (carrier.status !== 'allowed') {
    return `the ${milestoneId} plan carrier is ${carrier.status ?? 'unresolved'}`;
  }
  if (carrier.freshness === 'stale') {
    return `the ${milestoneId} plan carrier is stale${carrier.freshness_reason ? ` (${carrier.freshness_reason})` : ''}`;
  }
  const bound = carrier.subject?.kind === 'plan' ? carrier.subject.scope : null;
  if (bound === null) {
    return `the ${milestoneId} plan carrier has no plan subject binding`;
  }
  const removed = bound.filter((phaseId) => !scope.includes(phaseId));
  const unapproved = options.activation
    ? scope.filter((phaseId) => !bound.includes(phaseId))
    : [];
  if (removed.length > 0 || unapproved.length > 0) {
    return `the ${milestoneId} plan carrier binds [${bound.join(', ')}], not the milestone's phases [${scope.join(', ')}]`;
  }

  if (!options.activation) {
    return null;
  }

  const pending = (state.deliveries ?? []).find(
    (delivery) =>
      delivery.milestone !== milestoneId &&
      delivery.status !== 'superseded' &&
      !isAtAgreedEndpoint(delivery),
  );
  if (pending) {
    return `delivery ${pending.delivery_id} has not reached its agreed endpoint (${pending.endpoint ?? 'unrecorded'})`;
  }

  const units = selectPhaseUnits(state.progress, scope);
  const next = units.find(
    (unit) => unit.provisional === true || unit.completed < unit.total,
  );
  if (next?.provisional === true) {
    return `the next phase ${next.phaseId} is provisional`;
  }
  const group = (state.planParallelGroups ?? []).find((members) =>
    next ? members.includes(next.phaseId) : false,
  );
  const provisionalMember = (group ?? [])
    .map((phaseId) => units.find((unit) => unit.phaseId === phaseId))
    .find((unit) => unit?.provisional === true);
  if (provisionalMember) {
    return `next dispatched group member ${provisionalMember.phaseId} is provisional`;
  }

  return null;
}

/**
 * Endpoint satisfaction on persisted observations: `open` holds when every
 * member is open or merged, `merged` when every member is merged. A recorded
 * `at_endpoint` status or first endpoint attainment also holds.
 */
function isAtAgreedEndpoint(delivery: GoalDelivery): boolean {
  if (delivery.status === 'at_endpoint' || delivery.endpoint_attainment) {
    return true;
  }
  if (delivery.endpoint === null || delivery.members.length === 0) {
    return false;
  }
  return delivery.members.every((member) =>
    delivery.endpoint === 'merged'
      ? member.status === 'merged'
      : member.status === 'open' || member.status === 'merged',
  );
}

function latestDelivery(
  state: RouterState,
  milestoneId: string,
): GoalDelivery | null {
  return (
    [...(state.deliveries ?? [])]
      .reverse()
      .find(
        (delivery) =>
          delivery.milestone === milestoneId &&
          delivery.status !== 'superseded',
      ) ?? null
  );
}

/**
 * Explicit review/execution scope (B2): the milestone (and delivery) identity
 * plus its ordered phase set, never a first–last range.
 */
function scopeLabel(
  milestoneId: string,
  deliveryId: string | null,
  phaseIds: readonly string[],
): string {
  const identity = deliveryId ? `${milestoneId}/${deliveryId}` : milestoneId;
  return `${identity}: ${phaseIds.join(', ')}`;
}

function getPostImplementationRecommendation(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation {
  // Terminal guard. `state.lifecycle === 'complete'` is the only terminal
  // signal, and it applies in every workflow mode. Neither a null current task
  // nor a `complete`/`pr_open` phase status is terminal: an active project
  // legitimately reaches both while it still owns pending revision tasks, so
  // keying the guard on either would swallow a genuine revision resume. For a
  // completed project the revision phases are historical, and a stale or
  // incomplete revision count must not reopen implementation.
  if (state.lifecycle !== 'complete' && hasIncompleteRevisionPhase(state)) {
    return {
      skill: normalizeImplementationSkill('oat-project-implement', state),
      reason: 'Revision work remains incomplete',
    };
  }

  if (hasActionableReviewArtifacts(state)) {
    return {
      skill: 'oat-project-review-receive',
      reason: 'Unprocessed review feedback exists',
    };
  }

  const finalReview = [...state.reviews]
    .reverse()
    .find((review) => review.scope === 'final' && review.type === 'code');

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
      skill: 'oat-project-review-provide',
      reason: 'Final review is not passed and no active review artifact exists',
      context: 'code final',
    };
  }

  const summaryArtifact = state.artifacts.find(
    (artifact) => artifact.type === 'summary',
  );
  if (
    state.workflowMode !== 'lite' &&
    (!summaryArtifact || summaryArtifact.status !== 'complete')
  ) {
    return {
      skill: 'oat-project-summary',
      reason: 'Final review passed but summary is not complete',
    };
  }

  if (state.phaseStatus !== 'pr_open') {
    return {
      skill: 'oat-project-pr-final',
      reason:
        state.workflowMode === 'lite'
          ? 'Final review passed; lite mode synthesizes the PR from plan and implementation'
          : 'Summary is complete and the final PR has not been opened',
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

function hasActionableReviewArtifacts(
  state: Omit<ProjectState, 'recommendation'>,
): boolean {
  return state.activeReviewArtifacts.some(
    (reviewArtifact) =>
      reviewArtifact.actionable &&
      !reviewArtifact.archived &&
      state.reviews.some(
        (review) =>
          review.artifact === reviewArtifact.path &&
          review.status.toLowerCase() === 'received',
      ),
  );
}

function getCurrentArtifact(
  state: Omit<ProjectState, 'recommendation'>,
): ArtifactStatus | undefined {
  if (state.phase === 'decomposition') {
    return undefined;
  }
  const phase = state.phase;

  return state.artifacts.find(
    (artifact) => artifact.type === CURRENT_ARTIFACT_BY_PHASE[phase],
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
  if (state.phase === 'decomposition') {
    return getDecompositionRecommendation(state).skill;
  }

  return getCurrentPhaseSkill(state.phase, state.workflowMode);
}

function getWorkflowRoutes(
  workflowMode: WorkflowMode,
): Partial<Record<EarlyPhaseKey, string>> {
  switch (workflowMode) {
    case 'quick':
      return QUICK_ROUTES;
    case 'import':
      return IMPORT_ROUTES;
    case 'lite':
      return LITE_ROUTES;
    case 'brief':
      return BRIEF_ROUTES;
    case 'goal':
      return GOAL_ROUTES;
    case 'spec-driven':
    default:
      return SPEC_DRIVEN_ROUTES;
  }
}

function normalizeImplementationSkill(
  skill: string,
  _state: Omit<ProjectState, 'recommendation'>,
): string {
  return skill;
}
