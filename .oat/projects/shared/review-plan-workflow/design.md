---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-29
oat_generated: false
oat_template: false
---

# Design: review-plan-workflow

## Overview

This project adds an explicit, validated planning boundary to broad project code
reviews. A review invocation coordinator prepares a metadata-only authoritative
context, the reviewer constructs an in-memory ReviewPlan and validates it before
declared evidence work, and the coordinator validates final accounting before
accepting findings. The workflow does not claim to prove provider tool-read
ordering. Its mechanical guarantee is narrower and honest: a complete plan
bound to the authoritative file set existed as a discrete validated step, and
the final output accounts for that same set exactly.

The intended first release includes plan-first intake, selective evidence,
delegation economics, bounded lane dossiers, and risk-based primary replay.
FR5-FR7 are designed as one unit. Budget propagation is independent but uses the
same context. Tier 3 inline review follows the same path; it no longer reads all
changed files unconditionally.

The design introduces no durable ReviewPlan manifest and no actionable partial
review artifact. It does introduce short-TTL, run-scoped validation state under
the operating-system temporary directory. That state binds context, plan
receipt, output validation, progress breadcrumbs, and rejected-output
diagnostics without entering any review resolver or project ledger.

## Architecture

### System Context

The existing project-review rails remain responsible for their current
invocation behavior. They adopt a shared preparation and acceptance lifecycle:

| Coordinator                                 | Sink                          | Migration                                                                                 |
| ------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| `oat-project-review-provide` Tier 1         | Local artifact                | Prepare context, validate artifact, repair accounting                                     |
| `oat-project-review-provide` Tier 3         | Local inline artifact         | Replace read-all reset with prepared/validated review                                     |
| `oat-project-review-provide-remote` Tier 1  | Remote structured code        | Prepare PR context, validate structured output before posting                             |
| `oat-project-review-provide-remote` Tier 3  | Remote inline structured code | Use the same structured validator before posting                                          |
| `oat-project-implement` direct phase review | Local artifact                | Adopt shared preparation and acceptance directly                                          |
| `oat gate review`                           | Indirect artifact             | Child project wrapper validates; gate consumes accepted artifact or typed failure receipt |
| Implement checkpoint/final aliases          | Indirect artifact             | Inherit validation through project review provide                                         |

Structured plan and analysis loops are excluded because they do not review an
authoritative code range. Ad-hoc local and remote review skills remain explicit
legacy rails in this release. The current `reviewer-dispatch.ts` module is an
unwired reference implementation, not an additional coordinator.

**Key Components:**

- **Review Invocation Coordinator:** Owns authoritative scope, accepted reviewer
  continuation, final validation, accounting repair, and cleanup.
- **ChangeMap and Obligation Collector:** Produces metadata-only path and
  requirement inputs.
- **Validation Context Store:** Holds short-TTL run state, receipts, progress,
  and diagnostics outside resolver paths.
- **ReviewPlan Validator:** Checks exact-set accounting and policy invariants
  before declared evidence.
- **Reviewer Contract:** Owns interpretation, strategy, evidence, findings, and
  final accounting.
- **Output Validator:** Checks receipt identity and exact-set output, then
  coordinates bounded same-handle repair.
- **Gate Failure Translator:** Exposes accounting-invalid completion distinctly
  from timeout, launch failure, and reviewer `BLOCKED`.
- **Capability Preflight:** Enforces contract compatibility before expensive
  review work.

### Component Diagram

```text
                           coordinator-owned
┌────────────────────────────────────────────────────────────────────┐
│ scope/range/sink/budget                                            │
│          │                                                         │
│          ▼                                                         │
│ ChangeMap + obligation collector ──► validation context store      │
│          │                                  ▲                      │
│          │ PreparedReviewContextV1          │ receipt/progress     │
└──────────┼──────────────────────────────────┼──────────────────────┘
           ▼                                  │
┌──────────────── reviewer-owned ─────────────┴──────────────────────┐
│ lifecycle artifacts → in-memory ReviewPlanV1                      │
│                          │                                         │
│                          ├─ validate-plan --stdin ─► opaque receipt │
│                          ▼                                         │
│ selective evidence → reconciliation → findings + accounting        │
└──────────────────────────┬─────────────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│ coordinator output validation                                     │
│ receipt + digests + exact path/obligation sets                     │
│          │ invalid: same-handle accounting repair, max 2           │
│          ▼ valid                                                   │
│ accepted artifact/post/bookkeeping or typed gate failure           │
└────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. The coordinator resolves review mode, project, range, sink, invocation, and
   optional outer time/context budgets.
2. Preparation runs bounded Git metadata operations and artifact parsers. A
   capped child process counts diff bytes and discards them; cap or timeout
   produces a lower-bound estimate that forbids whole-diff loading rather than
   failing authoritative path collection.
3. Preparation creates `PreparedReviewContextV1`, writes a private validation
   manifest, and returns its run ID and context digest.
4. Capability preflight verifies the validator CLI, schema version, reviewer
   tools, continuation support, and sink-specific output validator.
5. The reviewer reads required lifecycle/prior-review artifacts and constructs
   `ReviewPlanV1`.
6. The reviewer submits the complete plan through
   `oat review validate-plan --run-id <id> --stdin`.
7. The validator loads the coordinator-owned context, validates the plan, stores
   a receipt record, and returns an opaque token.
8. The reviewer records `evidence_started` and loads evidence according to the
   plan. Inline and delegated paths use the same sequence.
9. The reviewer returns findings plus compact `ReviewAccountingV1`.
10. The coordinator validates the output. On failure, it sends precise errors
    through the same accepted continuation for at most two accounting-only
    repairs.
11. Valid complete output proceeds to the rail's existing artifact, GitHub
    posting, ledger, gate, or receive flow. Valid blocked-incomplete accounting
    proceeds only through the existing non-actionable `BLOCKED` path.
12. The coordinator cleans up accepted and ordinary terminal runs after sink
    translation. Accounting-invalid runs are reduced to a private diagnostic
    receipt retained until TTL. The gate parent and expired-context reaper cover
    killed-child and process-crash paths.

## Component Design

### Review Invocation Coordinator

**Purpose:** Adapt each in-scope code-review rail to one shared lifecycle while
preserving rail-specific output and bookkeeping.

**Responsibilities:**

- Resolve `enforce` or explicit `legacy`.
- Prepare authoritative context before reviewer launch.
- Hold the accepted reviewer continuation needed for repair.
- Validate and repair output before exposing it.
- Preserve existing artifact/GitHub/ledger/gate behavior after acceptance.
- Clean up run state on normal and caught terminal paths.

**Interfaces:**

```typescript
interface ReviewerContinuation {
  kind: 'accepted-child' | 'inline';
  requestAccountingRepair(
    errors: AccountingValidationError[],
  ): Promise<ReviewOutput>;
}

interface ReviewExecutionSession {
  runId: string;
  context: PreparedReviewContextV1;
  continuation: ReviewerContinuation;
  outputDeadlineMs: number | null;
}

interface ReviewCoordinator {
  prepare(input: PrepareReviewContextInput): Promise<PreparedReviewContextV1>;
  launch(context: PreparedReviewContextV1): Promise<ReviewExecutionSession>;
  validateAndRepair(
    session: ReviewExecutionSession,
    output: ReviewOutput,
  ): Promise<ValidatedReviewOutput>;
  cleanup(
    runId: string,
    disposition: 'delete' | 'retain-terminal-diagnostic',
  ): Promise<void>;
}
```

**Dependencies:**

- ChangeMap collector
- Validation context store
- Existing managed reviewer resolver and accepted-handle contract
- Artifact or structured sink adapter

**Design Decisions:**

- The interface has no replacement-launch method. Repair can only use the
  accepted continuation.
- Indirect gates and aliases do not create duplicate authoritative contexts.
- `enforce` remains the default for migrated project code-review coordinators.

### ChangeMap and Obligation Collector

**Purpose:** Produce the coordinator-owned authoritative review surface without
returning content diffs to the reviewer.

**Responsibilities:**

- Collect full base/head SHAs, `name-status`, rename/deletion metadata,
  `numstat`, directory grouping, and aggregate totals.
- Stream the patch to a byte counter with a 64 MiB read cap and a preparation
  deadline of `min(30 seconds, max(5 seconds, 10% of outer budget))`; use
  30 seconds when no outer budget exists.
- Apply deterministic generated/bookkeeping hints without making review-skip
  decisions.
- Parse stable obligations:
  - task IDs and allowed files for task/phase scope;
  - Requirement Index IDs for final spec-driven scope;
  - plan task IDs for quick/import scope;
  - accepted deviations and deferred findings.
- Sort and normalize paths to repository-relative POSIX form.

**Design Decisions:**

- Collection and interpretation remain separate. The collector does not assign
  risk, lanes, or verdicts.
- Collection failure blocks `enforce` before launch; it never silently emits an
  incomplete authoritative set.
- Patch bytes may be counted but never surfaced as content during preparation.
- Reaching the byte or time cap records a lower bound, terminates the counting
  child, and forbids whole-diff loading. It does not weaken the authoritative
  path set collected by bounded metadata commands.

### Validation Context Store and Reaper

**Purpose:** Bind reviewer plans and outputs to authoritative coordinator inputs
across processes.

**Responsibilities:**

- Store context, nonce, schema version, digests, a normalized validated
  assignment projection, receipts, progress phase, validation attempts, and
  optional rejected-output diagnostics.
- Use a private run directory with directory mode `0700` and files `0600`.
- Reject expired contexts.
- Clean up through three mechanisms:
  1. coordinator `finally`;
  2. gate-parent cleanup after child completion/timeout;
  3. bounded expired-context sweep on each prepare.

**TTL Policy:**

- With an outer budget: `max(30 minutes, 2 × budget)`, capped at 4 hours.
- Without an outer budget: 2 hours.
- Rejected-output diagnostics share the context TTL.
- Accepted and ordinary terminal runs are deleted after sink translation.
  Accounting-invalid runs retain only a terminal diagnostic receipt and safe
  pointer until TTL; the full context, plan projection, and rejected output are
  deleted when the diagnostic is materialized.

**Progress Breadcrumbs:**

- `prepared`
- `plan_validated`
- `evidence_started`
- `accounting_repair`
- `accepted`
- `terminal`

Breadcrumbs contain no findings or verdict and are never scanned as reviews.

### ReviewPlan Model and Validator

**Purpose:** Define the reviewer-owned strategy and validate it before declared
evidence work.

**Responsibilities:**

- Check context identity and full authoritative set coverage.
- Require exactly one primary assignment for every path and obligation while
  allowing explicit secondary seam references.
- Validate cross-lane seams and primary verification boundaries.
- Validate whole-diff budget eligibility.
- Require FR5-FR7 fields regardless of inline/delegate outcome.
- Reject semantic-only delegation economics and non-positive operation savings.
- Require inspection strategy and outcome shape for generated/bookkeeping
  classifications.
- Persist the normalized assignment projection used by output validation.
- Validate time allocations and lane cutoffs when a budget exists.

**Plan Validation Repair:**

- The reviewer may correct a rejected plan before evidence.
- At most two plan-validation attempts are allowed.
- Plan correction does not consume the later output-accounting repair budget.
- Evidence must not begin without a valid receipt in `enforce`.

### Reviewer Contract and Evidence Executor

**Purpose:** Own review interpretation, evidence acquisition, reconciliation,
findings, severity, and output.

**Responsibilities:**

- Perform artifact-only intake before plan submission.
- Build and validate the plan.
- Load evidence by risk and lane.
- Keep small coherent reviews inline with compact accounting.
- Delegate only under the validated economics/replay package.
- Accept deterministic evidence only with command/scope/provenance/result.
- Directly verify promoted findings, consequential absence claims, conflicts,
  and risk-based positive samples.
- Return useful uncovered-scope information when incomplete.

**Design Decisions:**

- Tier 3 inline reset is deleted as a separate behavioral contract.
- Reviewer workers remain read-only and advisory.
- The reviewer cannot self-authorize output acceptance.

### Prior Evidence Adapter

**Purpose:** Expose prior review information for navigation and sampling without
transferring verdict authority.

```typescript
interface PriorReviewEvidenceV1 {
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
```

The existing lifecycle/gate coordinator remains the narrowing owner. It may
attach prior evidence only when the source is valid for the current project and
target; gate narrowing additionally requires the same gate lineage. The adapter
omits prior verdict and severity disposition entirely. The reviewer may use the
remaining fields to prioritize navigation, select positive samples, and restore
deferred obligations, but the current plan, claims, findings, severity, and
verdict are independently produced and validated.

### Canonical Review Accounting

**Purpose:** Carry one compact, machine-validatable strategy and coverage result
across both sinks.

**Responsibilities:**

- Include receipt, context/plan/assignment digests, strategy, lane outcomes,
  exact primary path and obligation assignments, verification disposition,
  budget disposition, and uncertainty.
- Store each path exactly once in a sorted lane/classification bucket.
- Exclude verbose ChangeMap metadata from committed output.

**Sink Representation:**

- Artifact: versioned fenced JSON under `## Review Accounting`.
- Structured broad code review: optional `reviewAccounting` field on
  `StructuredFindings`, required when mode is `enforce`.
- Artifact and analysis structured reviews keep their existing schema.

### Output Validator and Repair Coordinator

**Purpose:** Prevent invalid accounting from becoming actionable while
preserving completed review work.

**Responsibilities:**

- Verify receipt lookup, contract version, context/plan/assignment digests,
  accounting assignments against the stored validated projection, exact path
  and obligation sets, claim-addressable verification, and sink schema.
- Enforce completion/coverage/verdict coherence so incomplete coverage can only
  produce a non-actionable reviewer `BLOCKED` result.
- Freeze findings, evidence, severity, and verdict before repair.
- Return path-specific machine-readable errors.
- Permit at most two same-handle accounting repairs before output deadline.
- Retain rejected output only in the private diagnostic store.

**Terminal Result:**

`review_complete_accounting_invalid` means review evidence exists but no valid
accounting was produced. It is not reviewer `BLOCKED`, timeout, launch failure,
or correlation failure.

### Gate Failure Translator

**Purpose:** Preserve useful gate diagnostics when no artifact is accepted.

**Responsibilities:**

- Read terminal validation receipts by gate run ID.
- Emit existing compatible top-level `status: review_failed` with subtype
  `review_complete_accounting_invalid`.
- Materialize a minimal terminal diagnostic receipt, then include its attempt
  count and safe diagnostic pointer.
- Set `artifactPath: null`, `receiveEligible: false`, and `handoff: null`.
- Preserve existing timeout/activity diagnostics when no accounting-invalid
  receipt exists.
- Request `retain-terminal-diagnostic` cleanup only after translation. The
  pointer therefore remains live until TTL without retaining the full review
  output or plan.

### Capability and Compatibility Preflight

**Purpose:** Avoid discovering migration incompatibility after a long review.

**Responsibilities:**

- Verify coordinator adapter, CLI schema version, reviewer shell capability,
  accepted-continuation support, and sink validator.
- Enforce `workflow.reviewPlanMode`.
- Fail before launch in `enforce` when capability is incomplete.
- Permit `legacy` only when explicitly configured or on an enumerated
  out-of-scope rail.
- Mark legacy output `legacy-unvalidated`.
- Contract-test the complete coordinator inventory.

### Production Plumbing

The unwired remote helper is audited, not promoted wholesale. Implementation
first freezes current canonical skill behavior in parity fixtures, then
extracts or rewrites only proven pure validators/builders. Production modules
must add authoritative files, full range, workflow context, accepted-handle
state, and strict schema validation before any caller is wired.

## Data Models

### PreparedReviewContextV1

**Purpose:** Coordinator-owned immutable input for one broad code review.

**Schema:**

```typescript
interface PreparedReviewContextV1 {
  schemaVersion: 1;
  runId: string;
  mode: 'enforce' | 'legacy';
  project: string;
  scope: string;
  invocation: 'manual' | 'auto' | 'gate';
  sink: 'artifact' | 'structured';
  range: {
    baseSha: string;
    headSha: string;
  };
  changeMap: ChangeMapV1;
  obligations: ReviewObligationV1[];
  priorEvidence: PriorReviewEvidenceV1[];
  budget: ReviewBudgetV1 | null;
  contextDigest: string;
  createdAt: string;
  expiresAt: string;
}
```

**Validation Rules:**

- Full 40-character lowercase hexadecimal SHAs.
- Repository-relative normalized paths only.
- Unique obligation IDs and unique changed paths.
- Digest is computed from canonical JSON excluding timestamps and digest field.
- `legacy` contexts do not create receipts.

**Storage:**

- **Location:** OS temporary validation store.
- **Persistence:** Short-TTL, run-scoped, never committed.

### ChangeMapV1

```typescript
type ChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed';

interface ChangeFileV1 {
  path: string;
  previousPath?: string;
  status: ChangeStatus;
  isBinary: boolean;
  additions: number | null;
  deletions: number | null;
  generatedHint: boolean;
  bookkeepingHint: boolean;
}

interface ChangeMapV1 {
  files: ChangeFileV1[];
  totals: {
    files: number;
    additions: number;
    deletions: number;
    binaryFiles: number;
    patchBytes: number | null;
    patchByteLowerBound: number;
    patchEstimateState: 'exact' | 'lower-bound';
    estimatedPatchTokens: number | null;
  };
}
```

For an exact count, `estimatedPatchTokens = ceil(patchBytes / 3)`. The factor is
deliberately conservative for code and is a named policy constant covered by
boundary tests; it is not a claim about provider tokenization. If counting
reaches the 64 MiB or preparation-time cap, `patchBytes` and
`estimatedPatchTokens` are null, `patchByteLowerBound` retains the observed
count, and whole-diff loading is ineligible.

### ReviewObligationV1

```typescript
interface ReviewObligationV1 {
  id: string;
  kind: 'requirement' | 'task' | 'deferred-finding' | 'deviation';
  source: string;
  summary: string;
  expectedPaths: string[];
  expectedChecks: string[];
}
```

Expected paths are hints, not a substitute for reviewer lane assignment.

### ReviewBudgetV1

```typescript
interface ReviewBudgetV1 {
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
```

Context budget is populated only from independently observed host telemetry.
When unavailable, whole-diff loading is not authorized for broad reviews.

### ReviewPlanV1

```typescript
type ReviewStrategy = 'whole-diff-inline' | 'selective-inline' | 'delegated';
type EvidenceStrategy = 'path-diff' | 'full-file' | 'command' | 'inventory';

interface ReviewScopeRefV1 {
  bucket: 'lane' | 'classification';
  bucketId: string;
  pathIndexes: number[];
}

interface ReviewCommandEvidenceV1 {
  id: string;
  command: string;
  cwd: string;
  scopeRefs: ReviewScopeRefV1[];
  provenance: {
    runner: string;
    invocationDigest: string;
    capturedAt: string;
  };
  result:
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
}

interface ReviewEvidenceRefBaseV1 {
  id: string;
  locator: string;
  scopeRefs: ReviewScopeRefV1[];
  provenance: string;
  digest: string;
}

type ReviewEvidenceRefV1 =
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

interface WorkerDossierV1 {
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

interface ReviewLaneV1 {
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
  estimatedEvidenceOperations: number;
  estimatedPrimaryOperationsAvoided: number;
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

interface ReviewClassificationV1 {
  id: string;
  kind: 'generated' | 'bookkeeping' | 'excluded';
  reason: string;
  paths: string[];
  disposition: 'inspect' | 'justified-exclusion';
  strategy: 'path-diff' | 'inventory' | 'manifest-check' | 'none';
  checks: string[];
  exclusionAuthority: string | null;
}

interface ReviewPlanV1 {
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
    expectedPrimaryOperationsAvoided: number;
    launchCoordinationOperations: number;
    reconciliationOperations: number;
    netPrimaryOperationsSaved: number;
    rationale: string;
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
```

Every path has exactly one primary assignment across lanes and classifications.
Every obligation has exactly one `primaryObligationIds` owner; additional lanes
may name it only in `seamObligationIds`. Generated and bookkeeping
classifications require `disposition: inspect`, a non-`none` strategy, and at
least one check. Only `excluded` may use `justified-exclusion`/`none`, and it
must name an `exclusionAuthority`.

Delegated plans require at least two lanes that are both listed in
`independentLaneIds` and marked `substantial`, with non-empty independence and
substantiality rationales. A lane is substantial when it has at least three
planned evidence operations or an isolated consequential obligation. At least
one delegated lane must be deterministic/provenance-accepted. Operation units
are planned primary evidence/tool steps. Each lane's
`estimatedPrimaryOperationsAvoided` must be between zero and its
`estimatedEvidenceOperations`; `direct-verify` requires zero. The economics
aggregate must equal the sum for delegated lanes, so it cannot claim savings
unrelated to lane estimates. The validator recomputes
`netPrimaryOperationsSaved = expectedPrimaryOperationsAvoided -
launchCoordinationOperations - reconciliationOperations` and permits delegation
only when the result is positive. Semantic-only plans remain inline.

For delegated lanes, primary contingency paths and obligations must be subsets
of that lane's validated assignments. `allowed: false` requires empty subsets.
The assignment projection used for final validation includes lane IDs, primary
paths/obligations, seam references, classifications, and contingency subsets.

```typescript
interface ValidatedAssignmentProjectionV1 {
  lanes: Array<{
    id: string;
    paths: string[];
    primaryObligationIds: string[];
    seamObligationIds: string[];
    primaryContingency: ReviewLaneV1['primaryContingency'];
  }>;
  classifications: ReviewClassificationV1[];
}
```

The validator normalizes and stores this projection independently of the
reviewer's final output. `assignmentDigest` is its canonical digest.

### ReviewTimeAllocationV1

```typescript
interface ReviewTimeAllocationV1 {
  planningDeadlineMs: number;
  evidenceDeadlineMs: number;
  reconciliationDeadlineMs: number;
  outputDeadlineMs: number;
  outputReserveMs: number;
  reconciliationReserveMs: number;
}
```

When an outer budget exists:

- Planning receives up to 20% of total time, capped at 5 minutes.
- Reconciliation plus output reserve at least 25% of total time.
- Output reserve is at least 90 seconds.
- Evidence ends before both reserves.
- No lane launches after the evidence deadline.
- A budget too short to preserve minimum output time fails preflight.

With no outer time budget, fields are null and the ordering contract remains,
but deadline guarantees are not claimed.

### PlanValidationReceiptV1

```typescript
interface PlanValidationReceiptV1 {
  token: string;
  runId: string;
  contractVersion: 1;
  contextDigest: string;
  planDigest: string;
  assignmentDigest: string;
  validatedAt: string;
  expiresAt: string;
}
```

The token is opaque random state backed by store lookup. A reviewer cannot
authorize itself by reproducing a digest.

### ReviewAccountingV1

```typescript
interface ReviewClaimVerificationV1 {
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

interface ReviewAccountingV1 {
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
```

Paths are sorted and stored once. Partial lane coverage references indexes into
the lane path array instead of repeating path strings. The validator compares
the complete assignment shape with the stored normalized projection, not only
with the echoed digests. Verbose per-file ChangeMap metadata and full worker
dossiers remain ephemeral; dossier/evidence digests preserve provenance.

Sink adapters assign stable output-local finding IDs before validation. Every
promoted finding must have one `promoted-finding` claim with direct verified
evidence. Consequential absence claims, worker conflicts, and cross-lane gaps
must each have direct claim records even when their disposition is rejected or
unresolved. Positive samples and deterministic results use sample/provenance
records, respectively. Missing required claims invalidate accounting.
For `kind: command`, the evidence record's `commandId` must resolve to a command
record and `commandResultDigest` must equal the canonical digest of that
record's scope, provenance, and terminal result. Every
`deterministic-result` claim must reference at least one such bound command
evidence record.

Valid outcome combinations are a validator-owned discriminated matrix:

| Plan/worker state                    | Required accounting state                                                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inline (`not-delegated`)             | Null dossier digest; primary completion `not-needed`; lane commands/evidence describe primary work; coverage may be all, partial, or none.                           |
| Delegated worker `complete`          | Non-null dossier digest; coverage `all`; no uninspected indexes or uncovered obligations; primary completion `not-needed`.                                           |
| Delegated worker `partial`           | Non-null dossier digest; primary completion is complete, partial, not-attempted, or not-permitted; final coverage is the union of worker and permitted primary work. |
| Delegated worker `uncovered`         | Null dossier digest; primary completion is complete, partial, not-attempted, or not-permitted; final coverage reflects only permitted primary work.                  |
| Generated/bookkeeping classification | Plan disposition `inspect`; strategy is not `none`; outcome/coverage are complete/all, partial/partial, or uncovered/none, never excluded.                           |
| Excluded classification              | Plan disposition `justified-exclusion`; strategy `none`; non-null exclusion authority; outcome/coverage are excluded/excluded; no uninspected indexes or commands.   |
| Coverage `all`                       | No uninspected path indexes or uncovered obligations.                                                                                                                |
| Coverage `partial`                   | Uninspected path indexes are a non-empty strict subset of the bucket paths; lanes also name uncovered obligations.                                                   |
| Coverage `none`                      | Every bucket path index and, for lanes, every primary obligation is uncovered unless the excluded-classification row applies.                                        |

All path indexes must resolve within their named lane/classification bucket.
Every claim, primary-completion entry, and lane evidence ID must resolve to the
top-level evidence registry; every command carries its own scope, provenance,
and terminal result.

`completion: complete` is valid only when every lane and inspected
classification has full coverage, every required claim is verified, and no
obligation remains uncovered. Any partial/none/uncovered state, unresolved
required claim, or uncovered obligation requires
`completion: blocked-incomplete` and the sink's existing reviewer `BLOCKED`
outcome. Output validation rejects a passing/no-findings verdict paired with
blocked-incomplete accounting. The coordinator may surface the validated
accounting as non-actionable diagnostics, but cannot publish an actionable
artifact, post a passing structured review, or allow a gate to pass.

### StructuredFindings Extension

```typescript
interface StructuredFindings {
  summary: string;
  findings: StructuredFinding[];
  verification_commands: string[];
  reviewAccounting?: ReviewAccountingV1;
}
```

The field is optional for backward compatibility and non-code review types. It
is required by coordinators for broad code review in `enforce`.

### AccountingValidationError

```typescript
interface AccountingValidationError {
  code:
    | 'missing-receipt'
    | 'receipt-mismatch'
    | 'digest-mismatch'
    | 'assignment-mismatch'
    | 'missing-path'
    | 'duplicate-path'
    | 'unknown-path'
    | 'missing-obligation'
    | 'missing-verification-claim'
    | 'invalid-classification'
    | 'invalid-outcome'
    | 'schema-error';
  pointer: string;
  message: string;
}
```

Errors are precise enough for accounting-only repair and contain no prompt
injection from untrusted source content.

## API Design

### `oat review prepare-context`

**Method:** Internal JSON CLI command

**Input:**

```text
--project <path>
--scope <token>
--range <base..head>
--sink <artifact|structured>
--invocation <manual|auto|gate>
--mode <enforce|legacy>
--budget-ms <number>             # optional
--budget-source <string>         # required with budget
--context-tokens <number>        # optional observed telemetry
--consumed-context-tokens <number>
--context-source <string>
--json
```

**Output:** `PreparedReviewContextV1`.

**Errors:**

- Exit 1: invalid user/range/project input.
- Exit 2: Git, artifact parsing, or store failure.

This command sweeps expired contexts before creating a new one.
`--budget-ms` and `--budget-source` must appear together. The three context
options must either all be present or all be absent; consumed tokens must be
non-negative and no greater than total tokens. `--context-source` identifies
the independently observed host telemetry source and cannot be reviewer
estimated.

### `oat review validate-plan`

**Method:** JSON-only CLI command with plan on stdin.

```text
oat review validate-plan --run-id <id> --stdin --json
```

**Output:** `PlanValidationReceiptV1`.

**Rules:**

- Maximum stdin size is bounded.
- Input is parsed as strict JSON with schema version 1.
- Validation errors return a structured list and no receipt.
- Expired, missing, or legacy contexts are rejected.

### `oat review validate-output`

**Method:** JSON-only CLI command.

```text
oat review validate-output --run-id <id> --artifact <path> --json
oat review validate-output --run-id <id> --stdin --json
```

Exactly one sink input is required. Artifact mode extracts the versioned
accounting block; structured mode validates the returned object.

**Output:**

```typescript
type OutputValidationResult =
  | { valid: true; outputDigest: string }
  | { valid: false; errors: AccountingValidationError[] };
```

### `workflow.reviewPlanMode`

```yaml
workflow:
  reviewPlanMode: enforce # enforce | legacy
```

- Default: `enforce`.
- Resolution follows normal local > shared > user > default precedence.
- `legacy` is a temporary explicit opt-out.
- Gates refuse silent downgrade.

### Reviewer Dispatch Payload

Broad code-review payloads add:

```typescript
interface ReviewPlanningPayload {
  review_plan_contract: 1;
  prepared_context: PreparedReviewContextV1;
  validate_plan_command: string;
}
```

The command is launcher-owned and points to the correct branch-local CLI when a
gate supplies one.

### Gate Failure Envelope

```typescript
interface ReviewAccountingInvalidFailure {
  status: 'review_failed';
  failure: {
    kind: 'review_complete_accounting_invalid';
    runId: string;
    attempts: number;
    diagnosticPath: string;
  };
  artifactPath: null;
  receiveEligible: false;
  handoff: null;
}
```

Existing envelopes remain unchanged for timeout, launch failure, reviewer
`BLOCKED`, artifact validation, and correlation failure.

## Security Considerations

### Authentication

No new authentication mechanism is introduced. Reviewer subprocesses use the
existing provider authentication and branch-local CLI route.

### Authorization

- Only the invocation coordinator creates validation contexts.
- The reviewer may submit plans and repaired output but cannot mark them valid.
- The output validator and gate parent load contexts by run ID plus opaque
  receipt state.
- Workers never receive validation-store mutation authority.

### Data Protection

- **At rest:** Temporary directories use `0700`; files use `0600`.
- **PII:** No new PII is expected. Rejected output may contain source-derived
  findings and inherits short TTL/private permissions.
- **Input validation:** All plan/output JSON is schema-validated, size-bounded,
  and normalized before hashing.
- **Logging:** Tokens, nonces, full plans, and rejected output are never logged.
  Human diagnostics use run ID and safe error codes.

### Threat Mitigation

- **Receipt fabrication:** Receipt tokens are random store-backed capabilities,
  not reviewer-computable hashes.
- **Path traversal:** Context and artifact paths are repository-relative,
  normalized, and checked against the resolved root.
- **Command injection:** Validator commands are launcher-owned argument arrays,
  not reviewer-constructed shell strings.
- **Symlink attacks:** Temporary store creation rejects pre-existing unsafe
  symlinks and uses exclusive file creation.
- **Prompt injection through filenames/errors:** Machine errors use safe codes
  and JSON pointers; raw path content is encoded, never interpolated into shell
  commands.
- **Stale receipt reuse:** Run ID, context digest, plan digest, assignment
  digest, TTL, invocation, and sink must match.

## Performance Considerations

### Metadata Cost

Preparation uses bounded Git metadata commands. Patch counting stops at 64 MiB
or its preparation deadline and the child is terminated, so model context
receives totals or a lower bound rather than content. The collector performs one
sorted pass over changed paths and obligations: `O(files + obligations)`.

### Whole-Diff Eligibility

Whole-diff loading is not authorized by file count. It requires:

1. observed context telemetry;
2. `patchEstimateState === 'exact'` and a non-null
   `estimatedPatchTokens = ceil(patchBytes / 3)`;
3. an evidence budget computed after artifact input, reconciliation reserve,
   and output reserve;
4. `estimatedPatchTokens <= evidenceBudgetTokens`;
5. one coherent review lane with no unresolved high-consequence cross-lane
   seam.

If context telemetry is absent, the patch estimate is capped/uncertain, or the
evidence budget is insufficient, broad reviews use path-scoped evidence. Small
reviews may still stay inline; inline does not imply whole-diff.

### Time Budget

The reviewer consumes the coordinator-resolved outer budget; it does not
recalculate gate timeout. Planning uses at most 20%/5 minutes. Reconciliation
plus output retain at least 25%, and output retains at least 90 seconds. Lane
deadlines cannot exceed the evidence cutoff.

### Accounting Size

Committed accounting stores each path once in lane/classification-keyed sorted
arrays. A 237-file review adds approximately one durable path entry per file,
not a verbose metadata object per file. Full ChangeMap data expires with the
validation context.

### Reaping

Prepare-time cleanup is bounded by entry count and age. It deletes only expired
run directories and terminal diagnostic receipts and never scans project review
trees.

### Measurement

A fixed large-scope fixture records the current baseline:

- content-diff operations;
- full-file reads;
- semantic replay operations;
- tool steps;
- completion/blocked outcome;
- emitted accounting size.

Post-change tests must reduce broad content/replay operations without claiming
a universal wall-clock improvement.

## Error Handling

### Error Categories

- **Preflight capability failure:** Block before reviewer launch in `enforce`.
- **Context preparation failure:** Block before launch with exact Git/artifact
  diagnostic.
- **Plan validation failure:** Return structured errors to the reviewer; allow
  at most two corrections before evidence.
- **Reviewer `BLOCKED`:** Authoritative, non-actionable review outcome; valid
  incomplete accounting may accompany it, but no fallback launch or gate pass
  is allowed.
- **Accepted lane timeout/failure:** No replacement. Mark lane uncovered or
  complete inline only under the validated primary-continuation rule and
  remaining budget.
- **Output accounting failure:** Freeze findings and allow at most two
  same-handle accounting repairs.
- **Accounting terminal:** Emit
  `review_complete_accounting_invalid`, retain private diagnostics, and expose
  no actionable artifact.
- **Outer timeout/kill:** Gate parent reads progress breadcrumb and cleans up
  context. If the parent also dies, next prepare reaps it after TTL.
- **Legacy mode:** Run current behavior and mark output `legacy-unvalidated`.

### Primary Inline Completion Versus Replacement

The primary may complete an uncovered lane inline only when:

- the ReviewPlan already assigned the obligation to the primary as contingency;
- no new worker is launched;
- remaining evidence and output budgets permit completion;
- the final accounting records the worker outcome and primary completion
  separately.

This is caller-owned completion, not worker replacement. If those conditions
are absent, the lane remains uncovered and the review returns `BLOCKED`.

### Retry Logic

- Plan correction: maximum two attempts, before evidence.
- Output accounting repair: maximum two attempts, same accepted continuation.
- No reviewer relaunch after acceptance.
- No automatic lane replacement after acceptance.
- Existing implementation fix/re-review loops remain separate.

### Logging

- **Info:** run ID, phase transitions, strategy, counts, validation success,
  cleanup.
- **Warn:** legacy mode, partial lanes, accounting repair attempt, delayed
  cleanup.
- **Error:** preflight failure, context corruption, exhausted repair, reaper
  failure.
- JSON logs expose stable error codes and safe diagnostic pointers.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification           | Key Scenarios                                                                                                   |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| FR1  | Integration            | Prepared context, discrete plan receipt, exact-set final validation, no unconditional pre-plan read instruction |
| FR2  | Unit + integration     | Add/modify/delete/rename/binary paths, numstat, exact/capped patch estimate, collection failure                 |
| FR3  | Unit                   | One primary owner, seam references, missing/duplicate/unknown paths and obligations                             |
| FR4  | Integration            | Path-scoped broad review, inspected classifications, uncertain budget/estimate, Tier 3 no read-all reset        |
| FR5  | Unit                   | Two independent substantial lanes, positive operation savings, semantic-only rejection, non-replayed lane       |
| FR6  | Integration            | Typed complete/partial dossier, accepted timeout, no replacement, validated inline contingency                  |
| FR7  | Contract + integration | Claim-addressable direct findings/absence/conflict verification, sampling, provenance acceptance                |
| FR8  | Unit + integration     | Gate budget propagation, absent budget, cutoffs, output reserve                                                 |
| FR9  | Contract + integration | Artifact block, structured field, stored assignment projection, incomplete-blocked coherence, bounded repair    |
| FR10 | Integration            | Prior-evidence adapter, verdict omission, navigation-only use, same-target gate lineage                         |
| FR11 | Unit + integration     | Compact inline plan, no unnecessary delegation, same accounting guarantees                                      |
| NFR1 | Contract + integration | Unchanged severity semantics and reviewer authority                                                             |
| NFR2 | Contract               | Canonical/provider parity, capability preflight, no below-floor fallback                                        |
| NFR3 | Integration            | Existing artifact/ledger/gate/receive fixtures, legacy mode, unknown field compatibility                        |
| NFR4 | Performance fixture    | Recorded baseline versus new evidence/replay operation counts                                                   |
| NFR5 | End-to-end             | Sync, package checks, lockstep versions, release validation                                                     |

### Unit Tests

- **Scope:** ChangeMap normalization, canonical hashing, obligation extraction,
  plan invariants, receipts, TTL/reaper, budget arithmetic, output validation,
  compact accounting, config resolution.
- **Coverage Target:** Every validator branch and error code; no new global
  percentage threshold.
- **Key Test Cases:**
  - Every path and obligation has exactly one primary owner; seam references do
    not create contradictory ownership.
  - Receipt cannot cross run/context/plan/assignment/sink.
  - Output lanes cannot diverge from the stored assignment projection while
    echoing a valid plan digest.
  - Expired and symlinked contexts are rejected.
  - Whole-diff denied without observed context budget or after byte/time cap.
  - Generated/bookkeeping classification cannot select no inspection.
  - Delegation rejects non-positive savings, lane-unbound savings, and
    unsubstantiated substantiality.
  - Dossier partial coverage and primary contingency subsets validate.
  - Required direct verification claims cross-check against output findings.
  - Evidence/command scope indexes resolve and command terminal results include
    provenance.
  - Deterministic claims resolve through command evidence to the exact command
    result digest.
  - Contradictory lane/classification outcome combinations are rejected.
  - Partial classification coverage identifies uninspected path indexes.
  - Incomplete coverage cannot pair with a passing/no-findings verdict.
  - Context telemetry flags require a complete, valid provenance tuple.
  - FR5-FR7 fields required even for inline.
  - Findings are immutable across accounting repair.

### Integration Tests

- **Scope:** JSON CLI commands, local wrapper, remote structured rail, Tier 3,
  direct implementation review, and gate envelopes.
- **Test Environment:** Real temporary Git repositories, fake reviewer
  continuations, branch-local CLI fixtures, and deterministic clocks.
- **Key Test Cases:**
  - Plan receipt issued before evidence sentinel.
  - Artifact and structured outputs validate identically.
  - First malformed accounting repairs successfully without rerunning review.
  - Two failed repairs emit typed terminal failure and no actionable artifact.
  - Gate parent distinguishes accounting invalid from timeout, materializes a
    live terminal diagnostic pointer, and removes the full child context.
  - Valid blocked-incomplete accounting follows reviewer `BLOCKED` handling and
    cannot create an actionable artifact, structured pass, or gate pass.
  - Process-crash fixture leaves state that next prepare reaps.
  - Prior artifacts can change navigation/sample order but cannot supply the
    current verdict or cross gate lineage/target.
  - Coordinator inventory test fails on an undeclared broad code-review rail.
  - Explicit legacy preserves current behavior; gate never downgrades.

### End-to-End Tests

- **Scope:** Bundled canonical assets through provider sync and release
  validation.
- **Test Scenarios:**
  - Large local phase/final review uses selective accounting.
  - Remote structured project review validates before GitHub posting.
  - Tier 3 inline review does not execute read-all behavior.
  - Gate passes accepted output and emits non-receivable accounting-invalid
    envelope on terminal repair failure.

## Deployment Strategy

### Build Process

Use the existing Turborepo and TypeScript build. No new runtime dependency is
required; hashing, random tokens, process execution, and temporary storage use
Node.js standard libraries and current repository utilities.

### Deployment Steps

1. Land production modules and focused tests behind the new config key.
2. Update all enumerated coordinators and canonical reviewer contracts.
3. Update docs and provider-linked views with `oat sync --scope all`.
4. Bump all five public packages in lockstep.
5. Run build, test, lint, type-check, format, and `pnpm release:validate`.
6. Dogfood local artifact, remote structured, Tier 3, implementation-phase, and
   gate paths before merge.

### Rollback Plan

Set `workflow.reviewPlanMode: legacy` as an explicit temporary rollback while
retaining diagnostics. Reverting the release restores the prior contract; no
project artifact migration is required because accepted accounting is additive.

### Configuration

- **Environment Variables:** None added.
- **Workflow setting:** `workflow.reviewPlanMode`, default `enforce`.
- **Gate behavior:** No implicit target or mode injection; configured gate
  independence remains unchanged.

### Monitoring

Local diagnostics record mode, strategy, operation counts, repair counts,
terminal subtype, and cleanup outcome. No external telemetry service is added.

## Migration Plan

No database migration exists. The migration is a coordinated contract and
consumer rollout.

### Migration Steps

1. Add optional structured accounting and additive artifact accounting syntax.
2. Add validation context/receipt commands and production APIs.
3. Add coordinator adapters while preserving current sink behavior.
4. Update reviewer canonical source and all provider views.
5. Update gate envelope parser with additive failure subtype.
6. Default migrated project code-review paths to `enforce`.
7. Leave enumerated ad-hoc and non-code structured rails explicitly outside the
   contract.
8. Document temporary `legacy` opt-out and create a follow-up removal criterion
   after compatibility evidence is collected.

### Rollback Strategy

The optional structured field and artifact section are ignored by old
consumers. Explicit legacy mode bypasses receipt requirements. No accepted
review artifact is rewritten or removed.

### Data Validation

- Existing artifact and widened-ledger fixtures remain readable.
- Review latest, gate correlation, and receive continue to select only accepted
  review artifacts.
- Diagnostics and validation manifests never appear in resolver scans.
- Provider views match canonical sources after sync.

## Open Questions

No blocking design questions remain. The initial token-estimation factor and
time-allocation constants are named policy values and may be tuned during
fixture calibration without changing component boundaries or acceptance
semantics.

## Implementation Phases

### Phase 1: Baseline and Production Contract Foundations

**Goal:** Freeze current behavior and establish honest production ownership.

**Tasks:**

- Record the fixed large-scope evidence-operation baseline.
- Add coordinator inventory/parity fixtures.
- Audit `reviewer-dispatch.ts`; extract proven pure pieces or replace it.
- Define versioned shared types and strict validators.

**Verification:** Existing behavior fixtures pass; reference-helper gaps are
covered by failing production tests before implementation.

### Phase 2: ChangeMap and Validation Runtime

**Goal:** Produce authoritative metadata and short-TTL validation state.

**Tasks:**

- Implement ChangeMap/obligation collection and capped patch-byte estimation.
- Implement context hashing, private store, receipts, breadcrumbs, and reaper.
- Add prepare and validate-plan JSON commands.
- Add budget/context models and whole-diff eligibility.

**Verification:** Unit and temporary-repository integration tests cover metadata,
receipts, TTL, crash reaping, and budget boundaries.

### Phase 3: Reviewer Plan and Evidence Contract

**Goal:** Make validated planning the mandatory reviewer boundary.

**Tasks:**

- Update canonical reviewer intake and ReviewPlan contract.
- Require unconditional FR5-FR7 fields and deterministic lane economics.
- Replace Tier 3 read-all behavior.
- Add plan validation/correction, typed dossier/claim contracts, delegation
  economics, and selective evidence rules.
- Add fixed-fixture operation-count assertions.

**Verification:** Contract tests prove the declared sequence and exact-set plan
validation; large/small fixtures select intended strategies.

### Phase 4: Output Accounting and Coordinator Integration

**Goal:** Enforce sink-independent output acceptance.

**Tasks:**

- Implement compact `ReviewAccountingV1` with stored assignment-projection and
  claim validation.
- Extend structured findings additively.
- Implement output validator and same-handle repair.
- Wire local, remote structured, Tier 3, and direct phase coordinators.
- Preserve indirect gate/checkpoint ownership.

**Verification:** Artifact/structured parity, repair immutability, coordinator
inventory, and no-action-before-validation tests pass.

### Phase 5: Gate Diagnostics and Compatibility

**Goal:** Make terminal failures observable and rollout safe.

**Tasks:**

- Add capability preflight and `workflow.reviewPlanMode`.
- Add gate accounting-invalid failure translation.
- Add parent cleanup and diagnostic pointers.
- Document explicit legacy behavior and removal follow-up.

**Verification:** Gate distinguishes every terminal class, blocks before launch
on capability failure, never silently downgrades, and reaps killed-child state.

### Phase 6: Documentation, Provider Sync, and Release

**Goal:** Ship consistent canonical and provider behavior.

**Tasks:**

- Update workflow, review, gate, configuration, and CLI reference docs.
- Bump changed canonical skill/agent versions once.
- Sync all provider views.
- Bump all five public packages in lockstep.
- Run full validation and dogfood representative rails.

**Verification:** Build, tests, lint, type-check, format, provider parity, docs,
and `pnpm release:validate` pass.

## Dependencies

### External Dependencies

No new third-party library or external service is required.

### Internal Dependencies

- Existing gate timeout resolution and run IDs.
- Existing review lineage, artifact correlation, and immutable snapshot checks.
- Existing managed reviewer target and accepted-handle semantics.
- Existing Git/process, hashing, config, logger, and temporary-file utilities.
- Existing canonical skill/agent sync and release validation.

### Development Dependencies

- Vitest for unit/integration tests.
- Temporary Git repositories and fake provider continuations.
- Existing OAT contract-validation fixtures.

## Risks and Mitigation

- **Provider reads content before plan validation:** Probability Medium | Impact High
  - **Mitigation:** Honest contract boundary, discrete receipt, exact-set output
    validation, and operation-count fixtures.
  - **Contingency:** Promote evidence loading into a mechanically mediated
    runtime boundary in a follow-up project.
- **Accounting repair mutates findings:** Probability Low | Impact High
  - **Mitigation:** Freeze output digest excluding accounting and reject changes
    to findings/severity/verdict during repair.
  - **Contingency:** Retain diagnostic, fail non-actionably, and require a fresh
    review.
- **Validation state leaks after kill:** Probability Medium | Impact Medium
  - **Mitigation:** Gate-parent cleanup, TTL, private permissions, and bounded
    prepare-time reaper.
  - **Contingency:** Manual cleanup command scoped to expired validation roots.
- **Structured coordinator bypasses validation:** Probability Medium | Impact High
  - **Mitigation:** Exhaustive coordinator inventory test and same-release
    migration; enforce preflight.
  - **Contingency:** Explicit legacy marker or block before launch.
- **Delegation economics remain gameable:** Probability Medium | Impact High
  - **Mitigation:** Require a deterministic/provenance-accepted lane and tie the
    decision to replay policy.
  - **Contingency:** Keep review inline.
- **Whole-diff estimate is miscalibrated:** Probability Medium | Impact Medium
  - **Mitigation:** Derive eligibility from observed context budget and
    conservative byte/token estimate, never file count.
  - **Contingency:** Force path-scoped evidence.
- **Committed accounting becomes noisy:** Probability Medium | Impact Medium
  - **Mitigation:** One sorted path occurrence per lane/classification and no
    verbose ChangeMap metadata.
  - **Contingency:** Add equivalent compact encoding without changing exact-set
    semantics.
- **Reference helper hides production gaps:** Probability Medium | Impact High
  - **Mitigation:** Rewrite-first audit and parity fixtures before wiring.
  - **Contingency:** Replace rather than reuse the helper.
- **Compatibility mode becomes permanent:** Probability Medium | Impact Medium
  - **Mitigation:** Enforce default, explicit legacy warnings, and documented
    removal criterion.
  - **Contingency:** Open a tracked follow-up before project closeout.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Current-state handoff: `references/current-state-and-handoff.md`
- Originating proposal: `references/slow-review-feedback.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture Docs: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
