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

export type ReviewStrategy =
  | 'whole-diff-inline'
  | 'selective-inline'
  | 'delegated';
export type EvidenceStrategy =
  | 'path-diff'
  | 'full-file'
  | 'command'
  | 'inventory';

export interface ReviewLaneV1 {
  id: string;
  paths: string[];
  primaryObligationIds: string[];
  seamObligationIds: string[];
  risk: 'low' | 'medium' | 'high' | 'consequential';
  evidenceClass: 'deterministic' | 'semantic' | 'mixed';
  strategy: EvidenceStrategy;
  checks: string[];
  delegated: boolean;
  independenceRationale: string | null;
  substantial: boolean;
  substantialityRationale: string | null;
  deadlineMs: number | null;
  dossier: {
    contractVersion: 1;
    partialAllowed: true;
  };
  replay: 'accept-provenance' | 'sample' | 'direct-verify';
  primaryContingency: {
    allowed: boolean;
    paths: string[];
    obligationIds: string[];
  };
}

export interface ReviewClassificationV1 {
  id: string;
  kind: 'generated' | 'bookkeeping' | 'excluded';
  reason: string;
  paths: string[];
  disposition: 'inspect' | 'justified-exclusion';
  strategy: 'path-diff' | 'inventory' | 'manifest-check' | 'none';
  checks: string[];
  exclusionAuthority: string | null;
}

export interface ReviewTimeAllocationV1 {
  planningDeadlineMs: number;
  evidenceDeadlineMs: number;
  reconciliationDeadlineMs: number;
  outputDeadlineMs: number;
  outputReserveMs: number;
  reconciliationReserveMs: number;
}

export interface ReviewPlanV1 {
  schemaVersion: 1;
  runId: string;
  contextDigest: string;
  strategy: ReviewStrategy;
  lanes: ReviewLaneV1[];
  classifications: ReviewClassificationV1[];
  crossLaneInvariants: string[];
  delegationEconomics: {
    independentLaneIds: string[];
    nonReplayedLaneIds: string[];
    expectedSavings: string[];
    coordinationCosts: string[];
    decisionRationale: string;
    decision: 'inline' | 'delegate';
  };
  verificationBoundary: {
    requiredClaims: Array<{
      kind:
        | 'promoted-finding'
        | 'consequential-absence'
        | 'worker-conflict'
        | 'cross-lane-gap';
      mode: 'direct';
    }>;
    positiveCoverage: {
      mode: 'sample';
      laneIds: string[];
      rationale: string;
    };
    deterministicAcceptance: {
      mode: 'provenance';
      requiredFields: Array<
        'command' | 'cwd' | 'scopeRefs' | 'provenance' | 'result'
      >;
    };
  };
  wholeDiff: {
    allowed: boolean;
    estimatedTokens: number | null;
    evidenceBudgetTokens: number | null;
    reason: string;
  };
  timeAllocation: ReviewTimeAllocationV1 | null;
}

export interface ValidatedAssignmentProjectionV1 {
  lanes: Array<{
    id: string;
    paths: string[];
    primaryObligationIds: string[];
    seamObligationIds: string[];
    primaryContingency: ReviewLaneV1['primaryContingency'];
  }>;
  classifications: ReviewClassificationV1[];
}

export interface PlanValidationReceiptV1 {
  token: string;
  validationRunId: string;
  gateRunId: string | null;
  launchAttemptId: string;
  acceptedHandleDigest: string;
  contractVersion: 1;
  contextDigest: string;
  planDigest: string;
  assignmentDigest: string;
  validatedAt: string;
  expiresAt: string;
}
