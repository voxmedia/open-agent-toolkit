export type Phase = 'discovery' | 'spec' | 'design' | 'plan' | 'implement';

export type PhaseStatus = 'in_progress' | 'complete' | 'pr_open';

export type WorkflowMode = 'spec-driven' | 'quick' | 'import';

export type ExecutionMode = 'single-thread' | 'subagent-driven';

export type Lifecycle = 'active' | 'paused';

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
  blockers: string[];
  hillCheckpoints: string[];
  hillCompleted: string[];
  prStatus: string | null;
  prUrl: string | null;
  docsUpdated: string | null;
  lastCommit: string | null;
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
