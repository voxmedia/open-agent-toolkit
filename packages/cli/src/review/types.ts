export type ReviewInvocation = 'manual' | 'auto' | 'gate';
export type ReviewSink = 'artifact' | 'structured';
export type ReviewProgress =
  | 'prepared'
  | 'artifacts_loaded'
  | 'plan_validated'
  | 'evidence_started'
  | 'accounting_repair'
  | 'accepted'
  | 'terminal';
export type ReviewErrorCategory =
  | 'input'
  | 'contract'
  | 'validation'
  | 'system';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ReviewCliError {
  category: ReviewErrorCategory;
  code: string;
  message: string;
  details: JsonValue;
}

export type ReviewCliEnvelope<T> =
  | {
      ok: true;
      result: T;
    }
  | {
      ok: false;
      error: ReviewCliError;
      result?: T;
    };

export interface ContextBudgetTelemetry {
  observedAt: string;
  contextWindowTokens: number;
  consumedTokens: number;
  remainingTokens: number;
  adapterId: string;
  source: string;
}

export interface ReviewBudgetV1 {
  time: {
    totalMs: number;
    source: string;
    deadlineMs: number;
  } | null;
  context: {
    totalTokens: number;
    consumedAtPlanTokens: number;
    outputReserveTokens: number;
    reconciliationReserveTokens: number;
    evidenceBudgetTokens: number;
    source: string;
  } | null;
}

export type ChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export interface ChangeFileV1 {
  path: string;
  previousPath?: string;
  status: ChangeStatus;
  isBinary: boolean;
  additions: number | null;
  deletions: number | null;
  generatedHint: boolean;
  bookkeepingHint: boolean;
}

export interface ChangeMapV1 {
  files: ChangeFileV1[];
  totals: {
    files: number;
    additions: number;
    deletions: number;
    binaryFiles: number;
    numstatChangedLines: number;
    numstatTokenDenialEstimate: number;
    patchBytes: number | null;
    patchByteLowerBound: number | null;
    patchEstimateState: 'exact' | 'coarse-denied' | 'lower-bound';
    patchCountingSkippedReason:
      | 'missing-context-telemetry'
      | 'numstat-denial'
      | null;
    estimatedPatchTokens: number | null;
  };
}

export interface ReviewObligationV1 {
  id: string;
  kind: 'requirement' | 'task' | 'deferred-finding' | 'deviation';
  source: string;
  summary: string;
  expectedPaths: string[];
  expectedChecks: string[];
}

export interface PriorReviewEvidenceV1 {
  artifactRef: string;
  lineage: {
    project: string;
    gateId: string | null;
    target: string;
  };
  reviewedRange: {
    baseSha: string;
    headSha: string;
  };
  riskHints: string[];
  verificationHistory: Array<{
    check: string;
    scopePaths: string[];
    result: string;
    provenance: string;
  }>;
  deferredFindingIds: string[];
}

export interface HostTelemetryEvidenceV1 {
  schemaVersion: 1;
  validationRunId: string;
  phase: 'pre_artifact' | 'post_artifact';
  adapterId: string | null;
  requestStartedAt: string;
  requestCompletedAt: string;
  observation: ContextBudgetTelemetry | null;
  disposition: 'accepted' | 'missing' | 'invalid';
  rejectionReason: string | null;
}

export interface ReviewPreparationV1 {
  schemaVersion: 1;
  runId: string;
  mode: 'enforce';
  project: string;
  scope: string;
  invocation: ReviewInvocation;
  sink: ReviewSink;
  correlation: {
    gateRunId: string | null;
    launchAttemptId: string;
  };
  range: {
    baseSha: string;
    headSha: string;
  };
  changeMap: ChangeMapV1;
  obligations: ReviewObligationV1[];
  priorEvidence: PriorReviewEvidenceV1[];
  timeBudget: ReviewBudgetV1['time'];
  prepareContextTelemetry: ContextBudgetTelemetry | null;
  prepareTelemetryEvidenceDigest: string;
  preparationDigest: string;
  createdAt: string;
  expiresAt: string;
}

export type PreparedReviewContextV1 = Omit<
  ReviewPreparationV1,
  'timeBudget'
> & {
  budget: ReviewBudgetV1;
  postArtifactTelemetryEvidenceDigest: string;
  artifactCheckpointAt: string;
  contextDigest: string;
};

export interface PrepareReviewContextResultV1 {
  preparation: ReviewPreparationV1;
  artifactDraftPath: string | null;
  commands: {
    checkpointArtifacts: string;
    validatePlan: string;
    beginEvidence: string;
  };
}
