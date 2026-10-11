export type Phase =
  | 'discovery'
  | 'spec'
  | 'design'
  | 'plan'
  | 'implement'
  | 'decomposition';

export type PhaseStatus = 'in_progress' | 'complete' | 'pr_open';

export const WORKFLOW_MODES = [
  'spec-driven',
  'quick',
  'import',
  'lite',
  'brief',
  'goal',
] as const;
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

/**
 * Workflow modes whose plans are Project Briefs: phases carry intent and exit
 * evidence instead of executable tasks, and progress is counted in
 * phase-units.
 */
export const BRIEF_MODES = ['brief', 'goal'] as const;
export type BriefMode = (typeof BRIEF_MODES)[number];

/** True when `mode` belongs to the brief mode family. */
export function isBriefMode(
  mode: WorkflowMode | null | undefined,
): mode is BriefMode {
  return mode != null && (BRIEF_MODES as readonly string[]).includes(mode);
}

export type ExecutionMode = 'single-thread' | 'subagent-driven';

export type Lifecycle = 'active' | 'paused' | 'complete';

export interface ExplainerDecisionV1 {
  decision: 'generate' | 'skip';
  source:
    | 'interactive'
    | 'kickoff_prompt'
    | 'autonomous_policy'
    | 'capability_probe'
    | 'failed_attempt';
  decided_at: string;
  failed_attempt_evidence?: string;
}

export type ArtifactType =
  | 'discovery'
  | 'spec'
  | 'design'
  | 'plan'
  | 'implementation'
  | 'summary';

export type BoundaryTier = 1 | 2 | 3;

/**
 * The first unmet clause of the named **quick plan readiness** predicate, in
 * the predicate's own evaluation order.
 */
export type QuickPlanReadinessFailure =
  | 'plan-missing'
  | 'frontmatter-not-ready'
  | 'review-disposition-missing'
  | 'substantive-task-missing'
  | 'promotion-pending-phases';

export interface QuickPlanReadiness {
  ready: boolean;
  failure: QuickPlanReadinessFailure | null;
}

export interface ArtifactStatus {
  type: ArtifactType;
  exists: boolean;
  path: string;
  status: string | null;
  readyFor: string | null;
  isTemplate: boolean;
  boundaryTier: BoundaryTier;
  /**
   * Quick plan readiness, evaluated for the `plan` artifact only and absent on
   * every other artifact type. The predicate is quick-workflow policy, so only
   * the quick route consults it; it is reported for any workflow mode because
   * the reader has no mode of its own.
   */
  quickPlanReadiness?: QuickPlanReadiness;
}

export interface PhaseProgress {
  phaseId: string;
  name: string;
  total: number;
  completed: number;
  isRevision: boolean;
  /**
   * Present only when the phase-unit contract (brief modes) produced this
   * record: the phase itself is the unit of progress.
   */
  unit?: 'phase';
  /**
   * Brief modes only: the plan marks this phase `**Provisional:** yes`, so it
   * stays incomplete regardless of any journal marker.
   */
  provisional?: boolean;
  /**
   * Goal mode only: the journal marks this phase `**Status:** extracted` with
   * `**Extracted to:** <slug>`, so its obligation moved to the named child
   * project. An extracted unit counts `{ total: 0, completed: 0 }`: it is
   * excluded from aggregate totals and can never be an incomplete unit, while
   * its identity stays visible to the outcome audit.
   */
  extracted?: { to: string };
  /**
   * Brief modes only: execution records (`### Task` headings) under this
   * phase in `implementation.md`. Display metadata; never feeds
   * `total`/`completed`.
   */
  taskRecords?: { total: number; completed: number };
}

export interface TaskProgress {
  total: number;
  completed: number;
  currentTaskId: string | null;
  phases: PhaseProgress[];
}

export interface ReviewStatus {
  scope: string;
  type: string;
  status: string;
  date: string;
  artifact: string;
  /** Full 40-character commit SHA at the head of the reviewed range. */
  reviewedHead?: string;
  /** Review invocation kind used to qualify the review lineage. */
  invocation?: string;
  /** Configured gate target for gate-originated review lineage. */
  gateTarget?: string;
}

export interface ReviewArtifactStatus {
  path: string;
  archived: boolean;
  actionable: boolean;
}

export interface SkillRecommendation {
  skill: string;
  reason: string;
  context?: string;
}

/** A legacy reason string or the blocker record emitted by completion workflows. */
export type ProjectBlocker =
  | string
  | {
      task_id: string;
      reason: string;
      since: string;
    };

/** Goal milestone lifecycle status (`oat_milestone_status`). */
export const MILESTONE_STATUSES = [
  'aligning',
  'implementing',
  'reviewing',
  'delivering',
  'delivered',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

/** Goal status (`oat_goal_status`). `declared_met` opens terminal closeout. */
export const GOAL_STATUSES = ['active', 'declared_met'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** Stage of an interrupted goal recovery (`oat_goal_recovery.stage`). */
export const GOAL_RECOVERY_STAGES = [
  'implementing',
  'exit_gate',
  'reviewing',
  'receiving',
  'delivering',
] as const;
export type GoalRecoveryStage = (typeof GOAL_RECOVERY_STAGES)[number];

/**
 * A persisted interrupted recovery (`oat_goal_recovery`, A1). Recovery of an
 * older delivery names its milestone, delivery and ordered phase set
 * explicitly and never moves the active milestone pointer.
 */
export interface GoalRecovery {
  milestone: string;
  delivery_id: string | null;
  phase_ids: string[];
  stage: GoalRecoveryStage;
  review_artifact: string | null;
}

export type GoalAuditDisposition = 'met' | 'met_with_deferrals';
export type GoalAuditPhaseDisposition =
  | 'accepted'
  | 'extracted'
  | 'deferred'
  | 'retired';
export type GoalAuditOutcomeDisposition =
  | 'met'
  | 'extracted'
  | 'deferred'
  | 'retired';

/** One phase entry of the terminal outcome audit (A3). */
export interface GoalAuditPhaseEntry {
  disposition: GoalAuditPhaseDisposition;
  /** Required non-empty for `deferred` and `retired`. */
  reason: string | null;
  /** Required non-empty for `deferred` and `retired`. */
  scope_decision_ref: string | null;
}

/** One outcome entry of the terminal outcome audit, bound to its text. */
export interface GoalAuditOutcomeEntry {
  disposition: GoalAuditOutcomeDisposition;
  evidence_or_ref: string | null;
  /** The numbered outcome's text as written in the brief. */
  text: string;
}

/**
 * The terminal outcome audit (`oat_goal_outcome_audit`, A3), written only by
 * `oat-project-goal` after the user's explicit declaration.
 */
export interface GoalOutcomeAudit {
  disposition: GoalAuditDisposition;
  decided_at: string;
  declaration_ref: string;
  brief_identity: string;
  phases: Record<string, GoalAuditPhaseEntry>;
  outcomes: Record<string, GoalAuditOutcomeEntry>;
}

export type GoalAuditErrorCode =
  | 'audit-missing'
  | 'audit-malformed'
  | 'audit-disposition-invalid'
  | 'audit-field-missing'
  | 'audit-phase-unknown'
  | 'audit-phase-duplicate'
  | 'audit-phase-omitted'
  | 'audit-phase-disposition-invalid'
  | 'audit-phase-not-accepted'
  | 'audit-phase-not-extracted'
  | 'audit-phase-contradictory'
  | 'audit-deferral-reason-missing'
  | 'audit-outcome-unknown'
  | 'audit-outcome-duplicate'
  | 'audit-outcome-omitted'
  | 'audit-outcome-disposition-invalid'
  | 'audit-outcome-text-changed'
  | 'audit-outcome-evidence-missing'
  | 'audit-met-with-deferrals';

export interface GoalAuditError {
  code: GoalAuditErrorCode;
  message: string;
  /** Phase id or outcome number the error is about, when it has one. */
  subject?: string;
}

/**
 * Result of the single audit predicate `validateGoalOutcomeAudit`. `audit` is
 * the normalized audit when `valid`, otherwise `null`.
 */
export interface GoalOutcomeAuditValidation {
  valid: boolean;
  errors: GoalAuditError[];
  audit: GoalOutcomeAudit | null;
}

/** A numbered outcome read from the brief's `## Outcomes` list. */
export interface BriefOutcome {
  number: string;
  text: string;
}

/** One `## Milestones` row: a milestone and its ordered phase set. */
export interface MilestoneMembershipRow {
  milestoneId: string;
  phaseIds: string[];
}

export type MilestoneMembershipErrorCode =
  | 'milestones-missing'
  | 'milestones-malformed'
  | 'milestone-duplicate'
  | 'milestone-empty'
  | 'milestone-unknown-phase'
  | 'phase-in-multiple-milestones'
  | 'phase-without-milestone';

export interface MilestoneMembershipError {
  code: MilestoneMembershipErrorCode;
  message: string;
  milestoneId?: string;
  phaseId?: string;
}

/**
 * Milestone membership read from the brief's canonical `## Milestones` table
 * (B1). Errors are surfaced, never dropped: a consumer must not select phase
 * units for a scope while `errors` is non-empty.
 */
export interface MilestoneMembership {
  /** The `## Milestones` section and its canonical table header exist. */
  present: boolean;
  milestones: MilestoneMembershipRow[];
  errors: MilestoneMembershipError[];
}

/** Gate-approval-record core plus the milestone carrier fields (A2). */
export interface MilestoneGateCarrier {
  status: string | null;
  resolution: string | null;
  disposition: string | null;
  config_fingerprint: string | null;
  /** The head actually reviewed; null when no review occurred. */
  reviewed_head: string | null;
  /** The approved plan or code scope this resolution applies to. */
  subject: { kind: string; scope: string[]; ref: string | null } | null;
  decided_at: string | null;
  /** Derived freshness written by its producers; never evaluated by the router. */
  freshness: 'fresh' | 'stale' | null;
  freshness_reason: string | null;
}

export interface MilestoneGates {
  plan: MilestoneGateCarrier | null;
  exit: MilestoneGateCarrier | null;
}

export type DeliveryEndpoint = 'open' | 'merged';
export type DeliveryStatus =
  | 'registering'
  | 'open'
  | 'at_endpoint'
  | 'superseded';
export type DeliveryMemberStatus = 'open' | 'merged' | 'closed';

export interface DeliveryMember {
  url: string | null;
  base: string | null;
  reviewed_head: string | null;
  observed_head: string | null;
  observed_base: string | null;
  status: DeliveryMemberStatus | null;
}

export interface DeliveryIntegratedReview {
  artifact: string | null;
  scope: string[];
  bound_revisions: {
    member: number;
    base: string | null;
    head: string | null;
  }[];
  disposition: 'passed' | 'stale' | 'failed' | null;
}

/**
 * First observed attainment of a delivery's agreed endpoint (A4). Preserved as
 * historical evidence; later observations never overwrite it.
 */
export interface DeliveryEndpointAttainment {
  observed_at: string | null;
  members: {
    url: string | null;
    head: string | null;
    base: string | null;
    status: DeliveryMemberStatus | null;
  }[];
}

/** One `oat_deliveries` registry entry. */
export interface GoalDelivery {
  delivery_id: string;
  milestone: string | null;
  /** Frozen on registration. */
  scope: string[];
  endpoint: DeliveryEndpoint | null;
  kind: 'pr' | 'stack' | null;
  status: DeliveryStatus | null;
  /** Replacement link: the delivery that superseded this one. */
  superseded_by: string | null;
  /** Additive correction link; contributes no inherited coverage. */
  corrects_delivery_id: string | null;
  /** Replacement link: the direct predecessor whose scope this inherits. */
  covers_scope_of: string | null;
  lookup: {
    repository: string | null;
    head_branch: string | null;
    head_sha_at_registration: string | null;
  } | null;
  members: DeliveryMember[];
  integrated_review: DeliveryIntegratedReview | null;
  /** The accepted exit-gate binding persisted with the delivery's evidence. */
  exit_gate: MilestoneGateCarrier | null;
  endpoint_attainment: DeliveryEndpointAttainment | null;
}

export interface ProjectState {
  name: string;
  path: string;
  phase: Phase;
  phaseStatus: PhaseStatus;
  workflowMode: WorkflowMode;
  executionMode: ExecutionMode;
  lifecycle: Lifecycle;
  pauseTimestamp: string | null;
  pauseReason: string | null;
  progress: TaskProgress;
  artifacts: ArtifactStatus[];
  reviews: ReviewStatus[];
  activeReviewArtifacts: ReviewArtifactStatus[];
  blockers: ProjectBlocker[];
  hillCheckpoints: string[];
  hillCompleted: string[];
  prStatus: string | null;
  prUrl: string | null;
  docsUpdated: string | null;
  lastCommit: string | null;
  projectExplainer: ExplainerDecisionV1 | null;
  projectRecap: ExplainerDecisionV1 | null;
  timestamps: {
    created: string;
    completed: string | null;
    stateUpdated: string;
  };
  recommendation: SkillRecommendation;
  /**
   * Goal mode only (absent for every other mode): the active milestone
   * (`oat_milestone`), its status, the goal status, the raw terminal audit and
   * its validation result, the pending recovery record, the delivery registry,
   * the milestone gate carriers, the `## Milestones` membership with its
   * errors and the brief's parallel groups.
   */
  milestone?: string | null;
  milestoneStatus?: MilestoneStatus | null;
  goalStatus?: GoalStatus | null;
  goalOutcomeAudit?: Record<string, unknown> | null;
  goalOutcomeAuditValidation?: GoalOutcomeAuditValidation | null;
  goalRecovery?: GoalRecovery | null;
  deliveries?: GoalDelivery[];
  milestoneGates?: Record<string, MilestoneGates>;
  milestoneMembership?: MilestoneMembership;
  /**
   * Goal mode only: the brief's `oat_plan_parallel_groups` with normalized
   * phase ids, so activation can require every member of the next dispatched
   * group to be concrete.
   */
  planParallelGroups?: string[][];
}

export interface ProjectSummary {
  name: string;
  path: string;
  scope?: ProjectScope;
  phase: Phase;
  phaseStatus: PhaseStatus;
  workflowMode: WorkflowMode;
  lifecycle: Lifecycle;
  progress: {
    completed: number;
    total: number;
  };
  recommendation: {
    skill: string;
    reason: string;
  };
}

export type ProjectScope = 'shared' | 'local' | 'synced';

export type ProjectListRow =
  | (ProjectSummary & {
      kind: 'materialized';
      scope: ProjectScope;
      checkout: 'present';
      recordError?: string;
    })
  | {
      kind: 'recorded-absent';
      name: string;
      path: string;
      scope: 'synced';
      checkout: 'absent';
      phase: null;
      phaseStatus: null;
      workflowMode: null;
      lifecycle: null;
      progress: null;
      recommendation: {
        skill: 'oat project pull';
        reason: 'checkout absent';
      };
    }
  | {
      kind: 'recorded-terminal';
      name: string;
      path: string;
      scope: 'synced';
      checkout: 'absent' | 'present';
      terminalState: 'legacy-completion' | 'authoritative-completion';
      archiveSnapshot: string | null;
      phase: null;
      phaseStatus: null;
      workflowMode: null;
      lifecycle: 'complete';
      progress: null;
      recommendation: {
        skill: 'none';
        reason: string;
      };
    }
  | {
      kind: 'terminal-invalid';
      name: string;
      path?: string;
      scope: 'synced';
      checkout: 'invalid';
      terminalState: 'ref-sha-mismatch';
      activeRef: string;
      completedRef: string;
      activeSha: string | null;
      completedSha: string | null;
      expectedSha?: string;
      phase: null;
      phaseStatus: null;
      workflowMode: null;
      lifecycle: 'complete';
      progress: null;
      recommendation: {
        skill: 'none';
        reason: string;
      };
    }
  | {
      kind: 'recorded-invalid';
      name: string;
      path: string;
      scope: 'synced';
      checkout: 'invalid';
      recordError: string;
      phase: null;
      phaseStatus: null;
      workflowMode: null;
      lifecycle: null;
      progress: null;
      recommendation: {
        skill: 'none';
        reason: 'restore invalid record from a trusted Git revision';
      };
    }
  | {
      kind: 'remote';
      name: string;
      scope: 'synced';
      origin: 'remote';
      checkout: 'absent';
      ref: string;
      phase: null;
      phaseStatus: null;
      workflowMode: null;
      lifecycle: null;
      progress: null;
      recommendation: {
        skill: 'oat project pull';
        reason: 'not adopted on this branch';
      };
    };
