export type Phase =
  | 'discovery'
  | 'spec'
  | 'design'
  | 'plan'
  | 'implement'
  | 'decomposition';

export type PhaseStatus = 'in_progress' | 'complete' | 'pr_open';

export type WorkflowMode = 'spec-driven' | 'quick' | 'import';

export type ExecutionMode = 'single-thread' | 'subagent-driven';

export type Lifecycle = 'active' | 'paused' | 'complete';

export interface ExplainerDecisionV1 {
  decision: 'generate' | 'skip';
  source: 'interactive' | 'kickoff_prompt' | 'autonomous_policy';
  decided_at: string;
}

export type ArtifactType =
  | 'discovery'
  | 'spec'
  | 'design'
  | 'plan'
  | 'implementation'
  | 'summary';

export type BoundaryTier = 1 | 2 | 3;

export interface ArtifactStatus {
  type: ArtifactType;
  exists: boolean;
  path: string;
  status: string | null;
  readyFor: string | null;
  isTemplate: boolean;
  boundaryTier: BoundaryTier;
}

export interface PhaseProgress {
  phaseId: string;
  name: string;
  total: number;
  completed: number;
  isRevision: boolean;
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
  blockers: string[];
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
