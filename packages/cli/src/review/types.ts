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

export interface PrepareReviewContextInputV1 {
  schemaVersion: 1;
  repoRoot: string;
  project: string;
  scope: string;
  throughTaskId?: string | null;
  workflowMode: 'spec-driven' | 'quick' | 'import';
  range: { baseSha: string; headSha: string };
  sink: ReviewSink;
  invocation: ReviewInvocation;
  budget: { totalMs: number; source: string } | null;
  gateRunId: string | null;
  launchAttemptId: string | null;
  obligationSources: {
    plan: { source: string; path: string };
    spec: { source: string; path: string } | null;
    implementation: { source: string; path: string } | null;
  };
  priorEvidenceCandidates: PriorReviewEvidenceV1[];
  target: string;
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
  throughTaskId?: string | null;
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

export interface ReviewPlanningProjectionV1 {
  schemaVersion: 1;
  contextDigest: string;
  changeMap: ChangeMapV1;
  obligations: ReviewObligationV1[];
  priorEvidence: PriorReviewEvidenceV1[];
  budget: ReviewBudgetV1;
  derivedPolicy: {
    wholeDiff: {
      singleLane: ReviewPlanV1['wholeDiff'];
      multipleLanes: ReviewPlanV1['wholeDiff'];
    };
    timeAllocation: ReviewPlanV1['timeAllocation'];
  };
}

export interface PrepareReviewContextResultV1 {
  preparation: ReviewPreparationV1;
  artifactDraftPath: string | null;
  commands: {
    checkpointArtifacts: ReviewCommandInvocationV1;
    validatePlan: ReviewCommandInvocationV1;
    beginEvidence: ReviewCommandInvocationV1;
    bindWorkerDossier: ReviewCommandInvocationV1;
  };
}

export interface ReviewCommandInvocationV1 {
  executable: string;
  argv: string[];
  cwd: string;
  stdin: 'none' | 'review-plan-json' | 'worker-dossier-json';
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
export const PROVENANCE_EVIDENCE_STRATEGIES = [
  'command',
  'inventory',
] as const satisfies readonly EvidenceStrategy[];
export const DIRECT_REVIEW_CLAIM_KINDS = [
  'promoted-finding',
  'consequential-absence',
  'worker-conflict',
  'cross-lane-gap',
] as const;
export type DirectReviewClaimKind = (typeof DIRECT_REVIEW_CLAIM_KINDS)[number];

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
      kind: DirectReviewClaimKind;
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

export interface ValidatedWorkerCoverageProjectionV1 {
  validationRunId: string;
  planDigest: string;
  laneId: string;
  dossierDigest: string;
  outcome: 'complete' | 'partial';
  inspectedPathIndexes: number[];
  uncoveredPathIndexes: number[];
  inspectedObligationIds: string[];
  uncoveredObligationIds: string[];
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

export interface ReviewAccountingSeedV1 {
  schemaVersion: 1;
  receipt: string;
  contextDigest: string;
  planDigest: string;
  assignmentDigest: string;
  strategy: ReviewStrategy;
  lanes: Array<{
    id: string;
    paths: string[];
    primaryObligationIds: string[];
    seamObligationIds: string[];
  }>;
  classifications: Array<{
    id: string;
    kind: ReviewClassificationV1['kind'];
    reason: string;
    paths: string[];
    planDisposition: ReviewClassificationV1['disposition'];
    strategy: ReviewClassificationV1['strategy'];
    plannedChecks: string[];
    exclusionAuthority: string | null;
  }>;
  verificationBoundary: ReviewPlanV1['verificationBoundary'];
}

export interface ReviewScopeRefV1 {
  bucket: 'lane' | 'classification';
  bucketId: string;
  pathIndexes: number[];
}

export interface ReviewCommandEvidenceV1 {
  id: string;
  command: string;
  cwd: string;
  scopeRefs: ReviewScopeRefV1[];
  provenance: {
    runner: string;
    invocationDigest: string;
    capturedAt: string;
  };
  result: ReviewCommandResultV1;
}

export type ReviewCommandResultV1 =
  | {
      status: 'completed';
      exitCode: number;
      outputDigest: string;
    }
  | {
      status: 'interrupted';
      signal: string;
      outputDigest: string;
    };

export interface ReviewEvidenceRefBaseV1 {
  id: string;
  locator: string;
  scopeRefs: ReviewScopeRefV1[];
  provenance: string;
  digest: string;
}

export type ReviewEvidenceRefV1 =
  | (ReviewEvidenceRefBaseV1 & {
      kind: 'command';
      commandId: string;
      commandResultDigest: string;
    })
  | (ReviewEvidenceRefBaseV1 & {
      kind: 'source' | 'diff' | 'artifact' | 'inventory';
      commandId: null;
      commandResultDigest: null;
    });

export interface WorkerDossierV1 {
  schemaVersion: 1;
  runId: string;
  planDigest: string;
  laneId: string;
  outcome: 'complete' | 'partial';
  inspectedPaths: string[];
  inspectedObligationIds: string[];
  commands: ReviewCommandEvidenceV1[];
  evidence: ReviewEvidenceRefV1[];
  candidateFindings: Array<{
    id: string;
    summary: string;
    locations: string[];
    evidenceRefIds: string[];
  }>;
  uncoveredObligationIds: string[];
  uncertainty: string[];
}

export interface ReviewClaimVerificationV1 {
  claimId: string;
  kind:
    | 'promoted-finding'
    | 'consequential-absence'
    | 'worker-conflict'
    | 'cross-lane-gap'
    | 'positive-coverage-sample'
    | 'deterministic-result';
  findingId: string | null;
  laneIds: string[];
  mode: 'direct' | 'sample' | 'provenance';
  disposition: 'verified' | 'rejected' | 'unresolved';
  evidenceRefIds: string[];
}

export interface ReviewAccountingV1 {
  schemaVersion: 1;
  receipt: string;
  contextDigest: string;
  planDigest: string;
  assignmentDigest: string;
  strategy: ReviewStrategy;
  completion: 'complete' | 'blocked-incomplete';
  evidence: ReviewEvidenceRefV1[];
  lanes: Array<{
    id: string;
    paths: string[];
    primaryObligationIds: string[];
    seamObligationIds: string[];
    workerOutcome: 'not-delegated' | 'complete' | 'partial' | 'uncovered';
    dossierDigest: string | null;
    inspectionCoverage: 'all' | 'partial' | 'none';
    uninspectedPathIndexes: number[];
    uncoveredObligationIds: string[];
    commands: ReviewCommandEvidenceV1[];
    evidenceRefIds: string[];
    uncertainty: string[];
    primaryCompletion: {
      outcome:
        | 'not-needed'
        | 'not-attempted'
        | 'complete'
        | 'partial'
        | 'not-permitted';
      completedPathIndexes: number[];
      completedObligationIds: string[];
      commands: ReviewCommandEvidenceV1[];
      evidenceRefIds: string[];
    };
  }>;
  classifications: Array<{
    id: string;
    kind: 'generated' | 'bookkeeping' | 'excluded';
    reason: string;
    paths: string[];
    planDisposition: 'inspect' | 'justified-exclusion';
    strategy: 'path-diff' | 'inventory' | 'manifest-check' | 'none';
    plannedChecks: string[];
    exclusionAuthority: string | null;
    outcome: 'complete' | 'partial' | 'uncovered' | 'excluded';
    inspectionCoverage: 'all' | 'partial' | 'none' | 'excluded';
    uninspectedPathIndexes: number[];
    commands: ReviewCommandEvidenceV1[];
    uncertainty: string[];
  }>;
  verification: ReviewClaimVerificationV1[];
  budget: {
    evidenceStoppedAt: string | null;
    outputReservePreserved: boolean | null;
  };
}

export interface StructuredFinding {
  id: string;
  severity: 'critical' | 'important' | 'medium' | 'minor';
  title: string;
  file: string | null;
  line: number | null;
  body: string;
  fix_guidance: string | null;
}

export interface StructuredFindings {
  summary: string;
  findings: StructuredFinding[];
  verification_commands: string[];
}

export interface ArtifactFindingProjectionV1 {
  schemaVersion: 1;
  snapshotDigest: string;
  accountingDigest: string;
  findingIds: string[];
}

export type ReviewCandidateV1 =
  | {
      kind: 'artifact-draft';
      privateDraftPath: string;
    }
  | {
      kind: 'structured';
      review: StructuredFindings;
    };

export type ReviewerTerminalV1 =
  | {
      schemaVersion: 1;
      status: 'complete';
      candidate: ReviewCandidateV1;
      reviewAccounting: ReviewAccountingV1 & { completion: 'complete' };
    }
  | {
      schemaVersion: 1;
      status: 'blocked';
      reason: string;
      diagnostics: string[];
      reviewAccounting: ReviewAccountingV1 & {
        completion: 'blocked-incomplete';
      };
    };

export type ReviewOutput = ReviewerTerminalV1;

export interface ReviewPlanCapabilities {
  schemaVersion: 1;
  provider: string;
  supportsAcceptedContinuation: boolean;
  supportsArtifactCheckpoint: boolean;
  supportsSameHandleRepair: boolean;
  supportsReviewerTerminalV1: boolean;
  supportsStructuredBlockedStatus: boolean;
  supportsPrivateArtifactStaging: boolean;
  contextTelemetry: 'host-observed' | 'unavailable';
  telemetryAdapterId: string | null;
}

export interface ReviewPlanPreflightInput {
  invocation: ReviewInvocation;
  sink: ReviewSink;
  mode: 'legacy' | 'enforce';
}

export interface ReviewPlanPreflightResult {
  ok: boolean;
  capabilities: ReviewPlanCapabilities;
  errors: Array<{
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
}
