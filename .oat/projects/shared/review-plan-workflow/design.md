---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-07-30
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
- **Post-Artifact Budget Refresher:** Seals independently observed context
  telemetry after artifact intake; preparation telemetry can deny but never
  authorize whole-diff loading.
- **Validation Context Store:** Holds short-TTL run state, receipts, progress,
  and diagnostics outside resolver paths.
- **ReviewPlan Validator:** Checks exact-set accounting and policy invariants
  before declared evidence.
- **Reviewer Contract:** Owns interpretation, strategy, evidence, findings, and
  final accounting.
- **Prior Evidence Adapter:** Applies project/target/gate-lineage filtering and
  removes prior verdict/severity authority before prior evidence reaches the
  reviewer.
- **Output Validator:** Checks receipt identity and exact-set output, then
  coordinates bounded same-handle repair.
- **Gate Failure Translator:** Exposes accounting-invalid completion distinctly
  from timeout, launch failure, and reviewer `BLOCKED`.
- **Capability Preflight:** Enforces contract compatibility before expensive
  review work.

### Component Diagram

```text
┌────────────────────────────────────────────────────────────────────┐
│ coordinator-owned                                                  │
│ resolve mode ── legacy ──► current unvalidated review path         │
│          │ enforce                                                 │
│          ▼                                                         │
│ ChangeMap collector + Prior Evidence Adapter                       │
│          │ ReviewPreparationV1 ──► validation context store        │
└──────────┼─────────────────────────────────────────────────────────┘
           ▼
┌────────────────────────────────────────────────────────────────────┐
│ reviewer-owned                                                     │
│ current lifecycle artifacts + normalized prior evidence            │
│          │ artifact-checkpoint request                             │
└──────────┼─────────────────────────────────────────────────────────┘
           ▼
┌────────────────────────────────────────────────────────────────────┐
│ coordinator-owned                                                  │
│ Post-Artifact Budget Refresher ──► sealed context/store             │
│          │ PreparedReviewContextV1                                 │
└──────────┼─────────────────────────────────────────────────────────┘
           ▼
┌────────────────────────────────────────────────────────────────────┐
│ reviewer-owned                                                     │
│ in-memory ReviewPlanV1 ── validate-plan ──► opaque receipt          │
│                          │                                         │
│                          ▼                                         │
│ selective evidence → reconciliation → findings + accounting        │
└──────────────────────────┬─────────────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│ coordinator-owned output validation                               │
│ receipt + digests + exact path/obligation sets                     │
│          │ invalid: same-handle accounting repair, max 2           │
│          ▼ valid                                                   │
│ accepted artifact/post/bookkeeping or typed gate failure           │
└────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. The coordinator resolves review mode, project, range, sink, invocation, and
   optional outer time/context budgets. Gate invocations also bind the gate run
   ID and launch-attempt ID before preparation.
2. If mode is `legacy`, the coordinator runs the pre-project contract, marks
   output `legacy-unvalidated`, and exits this lifecycle. It creates no
   validation context or receipt and performs no accounting validation.
3. Capability preflight verifies the validator CLI, schema version, reviewer
   tools, accepted-continuation support, host telemetry ownership, and
   sink-specific output validator.
4. In `enforce`, preparation runs bounded Git metadata operations and artifact
   parsers. The Prior Evidence Adapter enforces project/target/gate lineage and
   removes prior verdict/severity disposition.
   Missing telemetry or an obviously oversized numstat estimate denies
   whole-diff without starting a diff child. Otherwise a capped child counts
   and discards diff bytes; cap or timeout produces a lower-bound estimate.
5. Preparation creates `ReviewPreparationV1`, writes private run state, and
   returns launcher-owned checkpoint/validation command strings. Opaque
   checkpoint state is not embedded in reviewer-readable context.
6. The provider/skill runtime launches the reviewer. On acceptance, it binds
   the opaque handle ID to the run before any mutation command is accepted and
   retains that continuation for checkpoint and repair.
7. The reviewer reads required current lifecycle artifacts, consumes normalized
   prior evidence from preparation, then records the artifact checkpoint. The
   coordinator queries host telemetry and returns immutable
   `PreparedReviewContextV1`; absent post-artifact telemetry leaves context
   budget null.
8. The reviewer constructs `ReviewPlanV1`.
9. The reviewer submits the complete plan through
   `oat review validate-plan --run-id <id> --stdin`.
10. The validator loads the coordinator-owned context, validates the plan, stores
    a receipt record, and returns an opaque token.
11. The reviewer invokes the launcher-owned begin-evidence command with that
    receipt. The coordinator atomically records `evidence_started`; only then
    may the reviewer load evidence according to the plan. Inline and delegated
    paths use the same sequence.
12. The reviewer returns findings plus compact `ReviewAccountingV1`.
13. The coordinator validates the output. On failure, it sends precise errors
    through the same accepted continuation for at most two accounting-only
    repairs.
14. Valid complete output proceeds to the rail's existing artifact, GitHub
    posting, ledger, gate, or receive flow. Valid blocked-incomplete accounting
    proceeds only through the existing non-actionable `BLOCKED` path.
15. The coordinator cleans up accepted and ordinary terminal runs after sink
    translation. Accounting-invalid runs are reduced to a private diagnostic
    receipt retained until TTL. The gate parent and expired-context reaper cover
    killed-child and process-crash paths.

## Component Design

### Review Invocation Coordinator

**Purpose:** Adapt each in-scope code-review rail to one shared lifecycle while
preserving rail-specific output and bookkeeping.

**Responsibilities:**

- Resolve `enforce` or `legacy`, including the current rollout-stage default.
- Prepare authoritative context before reviewer launch.
- Hold the accepted reviewer continuation needed for repair.
- Validate and repair output before exposing it.
- Preserve existing artifact/GitHub/ledger/gate behavior after acceptance.
- Clean up run state on normal and caught terminal paths.

**Interfaces:**

```typescript
interface ReviewerContinuation {
  kind: 'accepted-child' | 'inline';
  handleId: string;
  checkpointArtifactsLoaded(): Promise<PreparedReviewContextV1>;
  beginEvidence(receipt: string): Promise<void>;
  requestAccountingRepair(
    errors: AccountingValidationError[],
  ): Promise<ReviewOutput>;
}

interface ReviewExecutionSession {
  runId: string;
  preparation: ReviewPreparationV1;
  continuation: ReviewerContinuation;
  outputDeadlineMs: number | null;
}

interface ReviewCoordinator {
  preflight(
    input: ReviewPlanPreflightInput,
  ): Promise<ReviewPlanPreflightResult>;
  prepare(
    input: PrepareReviewContextInput,
  ): Promise<PrepareReviewContextResultV1>;
  launch(
    prepared: PrepareReviewContextResultV1,
  ): Promise<ReviewExecutionSession>;
  bindAcceptedContinuation(session: ReviewExecutionSession): Promise<void>;
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
  accepted continuation object whose opaque `handleId` was recorded at launch.
- `bindAcceptedContinuation` hashes and stores that handle ID before any
  checkpoint command is accepted. Inline adapters create a random
  invocation-local handle ID and bind it before model execution.
- `checkpointArtifactsLoaded` is launcher-owned and accepts no reviewer-supplied
  token counts. It queries independently observed host telemetry and seals the
  planning context once.
- `beginEvidence` validates the plan receipt and advances the breadcrumb; it
  rejects evidence start before a valid plan or after terminal state.
- Indirect gates and aliases do not create duplicate authoritative contexts.
- `enforce` remains the target default for migrated project code-review
  coordinators after the bounded compatibility rollout.

The TypeScript interface is a shared facade, not the owner of provider process
handles. Skill/provider runtimes adapt their already-accepted child/session or
inline continuation into `ReviewerContinuation`; validators return repair
errors to that same adapter. The current `reviewer-dispatch.ts` remains an
unwired dispatch reference that calls `dispatcher.spawn`; it must not become
the production accepted-continuation owner. Only payload builders and validators
proven pure by parity tests may move into the shared runtime. Gate parents
consume terminal receipts from the child coordinator rather than attempting to
continue the reviewer themselves.

CLI authorization uses opaque launch-attempt capabilities, not a false claim of
process identity: each generated command token is bound to the run and launch
attempt, supplied only in the accepted reviewer's payload, and invalidated on
cleanup. The skill/provider runtime separately guarantees same-handle
checkpoint and repair by retaining the `ReviewerContinuation` object. Calls
without the capability, from a sibling attempt, or after cleanup are rejected;
token exfiltration is outside the same-handle proof boundary and is mitigated
by private state, redaction, short TTL, and one-shot use.

### ChangeMap and Obligation Collector

**Purpose:** Produce the coordinator-owned authoritative review surface without
returning content diffs to the reviewer.

**Responsibilities:**

- Collect full base/head SHAs, `name-status`, rename/deletion metadata,
  `numstat`, directory grouping, and aggregate totals.
- Before patch counting, deny whole-diff eligibility without starting a diff
  child when context telemetry is absent or when the denial-only numstat
  estimate already exceeds preparation telemetry's `remainingTokens`.
- Otherwise stream the patch to a byte counter with a 64 MiB read cap and a
  preparation deadline of
  `min(30 seconds, max(5 seconds, 10% of outer budget))`; use 30 seconds when
  no outer time budget exists.
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
- The denial-only estimate is
  `ceil((additions + deletions) / NUMSTAT_LINES_PER_TOKEN_DENIAL_FACTOR)`, with
  `NUMSTAT_LINES_PER_TOKEN_DENIAL_FACTOR = 4`. It is intentionally
  conservative and may choose path-scoped review early; it can never authorize
  whole-diff loading.
- A skipped counter records `coarse-denied` plus its reason. This avoids
  content-diff I/O in the common obviously-large or no-context-telemetry case.
- Reaching the byte or time cap records a lower bound, terminates the counting
  child, and forbids whole-diff loading. It does not weaken the authoritative
  path set collected by bounded metadata commands.

#### Obligation Source Grammar

Obligation parsing is versioned as `obligation-grammar/v1` and fail-closed for
the selected scope.

**Common lexical rules:**

- Read the canonical project artifact as strict UTF-8, reject NUL bytes, and
  normalize CRLF/CR to LF before parsing.
- Recognize structural headings and labels only outside fenced code blocks.
- Structural lines are byte-exact after newline normalization; trailing
  whitespace is not trimmed. Table cells alone trim surrounding ASCII spaces.
- Markdown table rows begin and end with `|`; split on unescaped `|`, treat
  `\|` as a literal pipe, and require every row to have the header's cell count.
- Duplicate headings, requirement/task IDs, selected tasks, paths within a
  task, or malformed selected structures fail preparation rather than being
  skipped. Deferred IDs are the sole exception: they may repeat across distinct
  deferred blocks for latest-entry supersession, but not within one block.

**Source and selection rules:**

- Task scope reads canonical `plan.md` and selects exactly the named task.
- Phase scope reads canonical `plan.md` and selects every task whose ID has the
  selected `pNN-` prefix.
- Final spec-driven scope reads every `FR`/`NFR` row from canonical `spec.md`.
- Final quick/import scope reads every task heading from canonical `plan.md`,
  including review-added tasks. There is no inferred superseded state: a task
  remains current until removed from the canonical plan.
- When `implementation.md` exists, accepted deviations and current deferred
  findings are additive obligations for every implementation-stage scope.

**Requirement Index:**

- Require exactly one line `## Requirement Index`.
- The next non-empty line is the table header and its first cell is exactly
  `ID`; the following line is a valid Markdown separator row.
- Data rows continue until the first empty line; only empty lines may then
  appear before the next level-two heading or EOF. Non-table, wrong-width, or
  malformed rows in that interval fail.
- Every first cell matches `^(FR|NFR)\d+$`; header/separator rows are not data.

**Plan tasks and allowed files:**

- A task heading matches `^### Task (p\d{2}-t\d{2}): ([^\r\n]+)$`.
- Before the next level-two or level-three heading, require exactly one
  `**Files:**` line. After optional blank lines, consume one or more exact file
  lines. The block ends at a heading or at one or more empty lines followed by
  a line matching `^\*\*Step \d+: [^*]+\*\*(?: [^\r\n]+)?$`. This accepts both
  standalone fully-bold Step lines and canonical inline-prose Step lines whose
  fully-bold label is followed by prose. Any other non-empty line in the block
  is malformed.
- Paths must pass repository-relative POSIX normalization and remain inside the
  resolved repository root.

**Accepted deviations:**

- Require at most one `## Deviations from Plan / Design` table in
  `implementation.md`, with the canonical seven header cells from the
  implementation template.
- Ignore the one all-`-` placeholder row. A row becomes an obligation only when
  `Task / Review`, `Actual / Accepted`, and `Source of Truth` are all populated
  and not `-`. Every other non-placeholder row is malformed and fails; it is
  never silently ignored.
- Its stable ID is
  `deviation:<task-or-review>:<one-based-nonheader-row>`.

**Deferred findings:**

- Each exact `**Deferred Findings:**` label starts a block ending at the next
  heading, exact `---` horizontal-rule line, or other bold label.
- Every top-level bullet in the block must contain one backtick-delimited ID
  and non-empty summary. Before the next top-level bullet, require exactly one
  two-space-indented disposition bullet whose value is `deferred`, `resolved`,
  or `dismissed`, with optional trailing rationale text; other nested rationale
  bullets are ignored.
- Process entries in file order. Repeated IDs in one block fail. Across blocks,
  the latest entry supersedes earlier entries: `deferred` creates the one
  current obligation, while `resolved` or `dismissed` removes it. Its stable
  obligation ID is `deferred-finding:<id>`.

The v1 line productions are:

```text
backtick         = U+0060
file-line        = "- " ("Create" | "Modify" | "Delete") ": " backtick path backtick
deferred-line    = "- " backtick id backtick " " non-empty-summary
disposition-line = "  - Disposition: " ("deferred" | "resolved" | "dismissed") [" " non-empty-text]
```

`path` and `id` are non-empty and may not contain a backtick or newline.

Parser tests use the canonical templates plus archived real-project fixtures.
All implementations consume the same byte-for-byte fixture corpus and expected
normalized JSON. No parser infers obligations from free prose outside these
shapes.

### Post-Artifact Budget Refresher

**Purpose:** Prevent preparation-time telemetry from authorizing evidence after
artifact intake has consumed additional context.

**Responsibilities:**

- Accept a one-shot `artifacts_loaded` checkpoint through the accepted reviewer
  continuation.
- Query `HostContextTelemetryAdapter.observe(runId, 'post_artifact')`; never
  accept reviewer-estimated token counts.
- Seal `PreparedReviewContextV1` with post-artifact `ReviewBudgetV1` and a new
  context digest before plan validation.
- Return null context budget when telemetry is unavailable or stale, thereby
  denying whole-diff eligibility.
- Reject repeated checkpoints, checkpoints after plan validation, and plans
  submitted before the checkpoint.

Preparation calls `observe(runId, 'pre_artifact')`. That telemetry is
denial-only: it may skip patch counting when whole-diff cannot plausibly fit,
but it cannot authorize whole-diff. Only the sealed post-artifact snapshot can
authorize it.

### Validation Context Store and Reaper

**Purpose:** Bind reviewer plans and outputs to authoritative coordinator inputs
across processes.

**Responsibilities:**

- Store context, nonce, schema version, digests, a normalized validated
  assignment projection, accepted-handle digest, launch command capabilities,
  receipts, progress phase, validation attempts, and optional rejected-output
  diagnostics.
- Store the `(gateRunId, launchAttemptId) → validationRunId` correlation index
  separately from random validation run directories and update/delete both
  under the same store lock.
- Validate the opaque plan receipt and atomically transition
  `plan_validated → evidence_started`; the reviewer never writes breadcrumbs
  directly.
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
- `artifacts_loaded`
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
- Require complete delegation reasoning and reject plans that miss any
  structural delegation gate.
- Require inspection strategy and outcome shape for generated/bookkeeping
  classifications.
- Persist the normalized assignment projection used by output validation.
- Validate time allocations and lane cutoffs when a budget exists.

**Plan Validation Repair:**

- The reviewer may correct a rejected plan before evidence.
- Plan validation allows two submissions total: the initial submission plus one
  corrected resubmission.
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

`deferredFindingIds` are a deliberate narrow exception to verdict-free prior
intake: they carry forward the historical judgment that a surface still needs
attention, but only by creating a current `deferred-finding` obligation. They
do not preserve prior validity, severity, or disposition; the current reviewer
must independently inspect and resolve each obligation.

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

- Artifact: apply `accounting-grammar/v1`. Decode strict UTF-8, reject NUL, and
  normalize CRLF/CR to LF. While tracking Markdown fence state, require exactly
  one exact `## Review Accounting` line outside other fences. Its next line is
  exactly three backticks plus `json`; the first following line of exactly
  three backticks closes it. The UTF-8 block is at most
  `MAX_REVIEW_ACCOUNTING_BYTES = 1_048_576`. Between the closing fence and the
  next level-two heading or EOF, only empty lines are allowed. Duplicate
  headings, alternate fence characters/lengths, indentation, intervening
  lines, extra blocks, or an unclosed fence invalidate the output. Heading-like
  text inside unrelated fences is ignored.
- The block parser rejects duplicate JSON object keys and trailing JSON values,
  then applies a strict `ReviewAccountingV1` schema requiring
  `schemaVersion: 1`.
- Structured broad code review: `reviewAccounting` is required on both
  `ReviewerTerminalV1` variants in `enforce`.
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
- Freeze the complete review-substance digest and permit changes only at the
  closed accounting-encoding pointer allowlist.
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

- Receive the expected gate run ID and launch-attempt ID from the gate parent
  and read the terminal validation receipt through that exact pair.
- Resolve only the private
  `(gateRunId, launchAttemptId) → validationRunId` entry; reject missing,
  duplicate, or mismatched correlation instead of scanning artifacts or run
  directories.
- Emit existing compatible top-level `status: review_failed` with subtype
  `review_complete_accounting_invalid`.
- Materialize a minimal terminal diagnostic receipt, then include separate
  validation/repair attempt counts, all three correlation IDs, and a safe
  diagnostic pointer.
- Set `artifactPath: null`, `receiveEligible: false`, and `handoff: null`.
- Preserve existing timeout/activity diagnostics when no accounting-invalid
  receipt exists.
- Request `retain-terminal-diagnostic` cleanup only after translation. The
  pointer therefore remains live until TTL without retaining the full review
  output or plan.

The gate parent retains its existing gate run ID. Before each provider launch,
it creates a cryptographically random launch-attempt ID and passes both IDs to
the child coordinator. A pre-start role/launch rejection terminalizes and
deletes that pair before a fresh attempt receives a new launch-attempt ID. Once
a reviewer is accepted, replacement is prohibited and the pair remains fixed
through translation.

### Capability and Compatibility Preflight

**Purpose:** Avoid discovering migration incompatibility after a long review.

**Responsibilities:**

- Verify coordinator adapter, CLI schema version, reviewer shell capability,
  accepted-continuation support, and sink validator.
- Enforce `workflow.reviewPlanMode`.
- Fail before launch in `enforce` when capability is incomplete.
- Permit `legacy` as the initial rollout default, when explicitly configured,
  or on an enumerated out-of-scope rail.
- Mark legacy output `legacy-unvalidated`.
- Contract-test the complete coordinator inventory.

### Production Plumbing

The unwired remote helper is audited, not promoted wholesale. Implementation
first freezes current canonical skill behavior in parity fixtures, then
extracts or rewrites only proven pure validators/builders. Production modules
must add authoritative files, full range, workflow context, accepted-handle
state, and strict schema validation before any caller is wired.

## Data Models

### ReviewPreparationV1 and PreparedReviewContextV1

**Purpose:** Separate denial-only pre-launch metadata from the immutable
post-artifact planning context.

**Schema:**

```typescript
interface HostTelemetryEvidenceV1 {
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

interface ReviewPreparationV1 {
  schemaVersion: 1;
  runId: string;
  mode: 'enforce';
  project: string;
  scope: string;
  invocation: 'manual' | 'auto' | 'gate';
  sink: 'artifact' | 'structured';
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

type PreparedReviewContextV1 = Omit<ReviewPreparationV1, 'timeBudget'> & {
  budget: ReviewBudgetV1;
  postArtifactTelemetryEvidenceDigest: string;
  artifactCheckpointAt: string;
  contextDigest: string;
};

interface PrepareReviewContextResultV1 {
  preparation: ReviewPreparationV1;
  artifactDraftPath: string | null;
  commands: {
    checkpointArtifacts: string;
    validatePlan: string;
    beginEvidence: string;
  };
}
```

**Validation Rules:**

- `ReviewPreparationV1.runId` and every review CLI `--run-id` denote the random
  validation run ID, never the outer gate run ID.
- `artifactDraftPath` is a private-store path for artifact sink and null for
  structured sink.
- Full 40-character lowercase hexadecimal SHAs.
- Repository-relative normalized paths only.
- Unique obligation IDs and unique changed paths.
- Preparation and context digests are computed from canonical JSON excluding
  their top-level lifecycle timestamps and own digest field, but including the
  telemetry-evidence digests.
- Final `budget.time` must exactly equal the stored preparation `timeBudget`;
  post-artifact refresh may replace only context-budget telemetry.
- `invocation: gate` requires a caller-supplied gate run ID and launch-attempt
  ID. For non-gate invocation, gate run ID is null and preparation generates a
  random launch-attempt ID. The private store maintains a
  `(gateRunId, launchAttemptId) → validationRunId` index, rejects a duplicate
  live pair, and deletes the index with run state.
- Preparation creates distinct checkpoint and plan-validation command
  capabilities bound to validation run and launch-attempt IDs; begin-evidence
  later uses the one-shot plan receipt as its capability. These secrets appear
  only inside launcher-owned command strings, are enabled only after
  accepted-handle binding, and are excluded from preparation/context digests,
  logs, and reviewer-authored JSON.
- `PreparedReviewContextV1` is created exactly once after artifact intake;
  plan validation requires it.
- Legacy runs do not create preparation/context records or receipts.
- The private store retains one `HostTelemetryEvidenceV1` per phase. Its
  canonical digest covers the adapter identity, request interval, observation,
  disposition, and rejection reason. Preparation and sealed context expose only
  the corresponding digest plus accepted numeric observation; missing/invalid
  evidence exposes no numeric budget.

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
```

For an exact count, `estimatedPatchTokens = ceil(patchBytes / 3)`. The factor is
deliberately conservative for code and is a named policy constant covered by
boundary tests; it is not a claim about provider tokenization. If the pre-check
denies counting, byte fields are null and `patchEstimateState` is
`coarse-denied`. If counting reaches the 64 MiB or preparation-time cap,
`patchBytes` and `estimatedPatchTokens` are null, `patchByteLowerBound` retains
the observed count, and state is `lower-bound`. Only `exact` can authorize
whole-diff loading.

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
interface ContextBudgetTelemetry {
  observedAt: string;
  contextWindowTokens: number;
  consumedTokens: number;
  remainingTokens: number;
  adapterId: string;
  source: string;
}

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

### Evidence and Worker Dossier Types

```typescript
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
```

These types belong to worker return and final-accounting contracts; they are
not fields on `ReviewPlanV1`.

Within final accounting, command IDs are globally unique across lane,
primary-completion, and classification command arrays. Top-level evidence IDs,
verification claim IDs, and assigned output finding IDs are each globally
unique in their namespace. Each ephemeral worker dossier separately requires
unique candidate-finding IDs within that dossier; those IDs are not a final
accounting namespace. Final validation first walks arrays in schema order,
builds one map per final namespace, and rejects any duplicate; only then may
`commandId`, `evidenceRefIds`, `claimId`, or final `findingId` resolve through
those maps. No nearest-scope or first-match lookup is permitted.

### ReviewPlanV1

```typescript
type ReviewStrategy = 'whole-diff-inline' | 'selective-inline' | 'delegated';
type EvidenceStrategy = 'path-diff' | 'full-file' | 'command' | 'inventory';

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
```

Every path has exactly one primary assignment across lanes and classifications.
Every obligation has exactly one `primaryObligationIds` owner; additional lanes
may name it only in `seamObligationIds`. Generated and bookkeeping
classifications require `disposition: inspect`, a non-`none` strategy, and at
least one check. Only `excluded` may use `justified-exclusion`/`none`, and it
must name an `exclusionAuthority`.

Delegated plans require at least two lanes that are both listed in
`independentLaneIds` and marked `substantial`, with non-empty independence and
substantiality rationales. The reviewer must record expected savings,
coordination costs, and why savings outweigh costs, but substantiality and the
economic comparison are explicitly reviewer judgments rather than
mechanically-proven quantities. The validator checks completeness and
cross-field consistency, not truth by self-certified arithmetic. The binding
delegation gates are structural: at least two independent substantial lanes,
enough reconciliation/output budget, and at least one delegated
deterministic/provenance-accepted lane that the primary is not required to
replay semantically. Semantic-only plans remain inline.

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
const MIN_ENFORCED_REVIEW_BUDGET_MS = 120_000;
const MIN_PLANNING_MS = 5_000;
const MIN_EVIDENCE_MS = 15_000;
const MIN_RECONCILIATION_MS = 10_000;
const MIN_OUTPUT_RESERVE_MS = 90_000;

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

- `enforce` requires at least `MIN_ENFORCED_REVIEW_BUDGET_MS` (120 seconds).
- Planning receives at least 5 seconds and up to 20% of total time, capped at
  5 minutes.
- Evidence receives at least 15 seconds and reconciliation at least 10 seconds.
- Reconciliation plus output reserve at least 25% of total time.
- Output reserve is at least 90 seconds.
- Evidence ends before both reserves.
- No lane launches after the evidence deadline.
- A shorter resolved budget fails before reviewer launch with
  `review-budget-below-minimum`, reporting the configured/resolved value,
  120-second minimum, and the two remedies: raise the timeout or select
  temporary `legacy` mode explicitly. There is no silent downgrade.

This is an intentional enforce-mode compatibility boundary:
`packages/cli/src/config/oat-config.ts` currently accepts gate timeouts down to
`MIN_GATE_TIMEOUT_MS = 1_000`. The general config minimum remains unchanged;
only the enforced review contract adds the 120-second preflight.

The 120-second value is a safety floor, not a claim that every review is useful
within that budget. A broad review with only 15 seconds of evidence time is
expected to return non-actionable `BLOCKED` when it cannot establish coverage.
Keeping the floor low minimizes newly invalid existing configs. The built-in
artifact-review default increases from 15 to 20 minutes across all artifact
scopes and providers because transcript liveness can show useful work continuing
at the former hard boundary. Task-scoped code reviews remain at 15 minutes, and
phase, phase-range, and final code reviews remain at 30 minutes. CLI, target,
review-type config, and environment overrides retain their existing precedence;
the timeout remains a hard ceiling rather than an activity-aware extension.

With no outer time budget, `ReviewBudgetV1.time` and
`ReviewPlanV1.timeAllocation` are null. The ordering contract remains, but
deadline guarantees are not claimed.

### PlanValidationReceiptV1

```typescript
interface PlanValidationReceiptV1 {
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
```

The token is opaque random state backed by store lookup. A reviewer cannot
authorize itself by reproducing a digest. `acceptedHandleDigest` is the
canonical SHA-256 digest of the provider adapter's opaque accepted handle ID;
the raw ID is retained only by the adapter and never logged or passed in
reviewer-authored JSON. Receipt issuance requires that binding to exist.

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

Before offering repair, the coordinator computes
`immutableReviewSubstanceDigest` over the normalized review summary/verdict,
all finding IDs/content/severity/locations, terminal status/reason, and every
`ReviewAccountingV1` field except this closed repair allowlist:

- receipt/context/plan/assignment digest fields;
- lane path and obligation assignment arrays and uncovered/index arrays;
- primary-completion path and obligation arrays; and
- classification path and uninspected-index arrays.

Strategy, completion, evidence records, command/provenance/results, dossier
digests, lane/classification/primary outcomes, uncertainty, classification
reasons and checks, verification claim identity/kind/mode/disposition, budget
disposition, every evidence-reference relationship, findings, severity, and
verdict are immutable. The coordinator
offers repair only when the initial output is parseable enough to compute this
digest and every validation error points into the allowlist. Each repair must
preserve the digest byte-for-byte; otherwise it terminalizes immediately as
accounting invalid.

Paths are sorted and stored once. Partial lane coverage references indexes into
the lane path array instead of repeating path strings. The validator compares
the complete assignment shape with the stored normalized projection, not only
with the echoed digests. Verbose per-file ChangeMap metadata and full worker
dossiers remain ephemeral; dossier/evidence digests preserve provenance.

Sink adapters assign stable output-local finding IDs before validation. Every
promoted finding must have one `promoted-finding` claim with direct verified
evidence. Consequential absence claims, worker conflicts, and cross-lane gaps
must each have direct claim records even when their disposition is `rejected`
or `unresolved`. `rejected` means direct verification disproved the candidate
claim; it is a resolved and completion-compatible result for those three claim
kinds. A promoted finding, positive sample, or deterministic result must be
`verified`; `rejected` is invalid for those kinds. `unresolved` always requires
blocked-incomplete completion. Positive samples and deterministic results use
sample/provenance records, respectively. Missing required claims invalidate
accounting.
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
classification has full coverage, every required claim is resolved under the
kind-specific rules above, and no obligation remains uncovered. Any
partial/none/uncovered state, unresolved required claim, or uncovered obligation
requires
`completion: blocked-incomplete` and the sink's existing reviewer `BLOCKED`
outcome. Output validation rejects a passing/no-findings verdict paired with
blocked-incomplete accounting. The coordinator may surface the validated
accounting as non-actionable diagnostics, but cannot publish an actionable
artifact, post a passing structured review, or allow a gate to pass.

### Provider-Neutral Reviewer Terminal

```typescript
interface StructuredFindings {
  summary: string;
  findings: StructuredFinding[];
  verification_commands: string[];
}

type ReviewCandidateV1 =
  | {
      kind: 'artifact-draft';
      privateDraftPath: string;
    }
  | {
      kind: 'structured';
      review: StructuredFindings;
    };

type ReviewerTerminalV1 =
  | {
      schemaVersion: 1;
      status: 'complete';
      candidate: ReviewCandidateV1;
      reviewAccounting: ReviewAccountingV1;
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

type ReviewOutput = ReviewerTerminalV1;
```

Every accepted child and inline adapter returns `ReviewerTerminalV1` in
`enforce` before sink translation; legacy mode and non-code review types keep
their existing schemas. The structured sink projects a complete candidate to
its existing `StructuredFindings` flow only after validation. The artifact sink
writes complete candidates under the private validation-run staging directory,
validates the embedded accounting against the envelope copy, and atomically
publishes to the project review tree only after acceptance.

A blocked variant contains no candidate, actionable findings, or verdict. Any
provider-created draft associated with it is deleted after private diagnostics
are recorded, so the result exposes no discoverable review artifact path,
GitHub post, passing ledger entry, or receive-eligible handoff.

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
--mode <enforce>
--budget-ms <number>             # optional
--budget-source <string>         # required with budget
--gate-run-id <id>               # required only for gate invocation
--launch-attempt-id <id>         # required only for gate invocation
--json
```

**Output:** `PrepareReviewContextResultV1`.

**Errors:**

- Exit 1: invalid user/range/project input.
- Exit 2: Git, artifact parsing, or store failure.

This command sweeps expired contexts before creating a new one.
`--budget-ms` and `--budget-source` must appear together. Numeric context
telemetry is never CLI input. `--gate-run-id` and
`--launch-attempt-id` are required when `--invocation gate` and prohibited for
manual/auto invocation. The store creates a random validation run ID distinct
from the gate run ID and writes the private correlation index atomically.

Preparation-time context telemetry supplies only
`remainingTokens` as an upper bound for early denial. It cannot populate the
final evidence budget or authorize whole-diff.

### `oat review checkpoint-artifacts`

**Method:** Launcher-owned JSON CLI command invoked once after required artifact
intake.

```text
oat review checkpoint-artifacts \
  --run-id <id> \
  --checkpoint-token <opaque> \
  --json
```

**Output:** `PreparedReviewContextV1`.

The command queries the configured host telemetry adapter after artifact intake;
it accepts no token-count arguments. Missing or stale telemetry produces
`budget.context: null`. It atomically seals the context digest and rejects
replay, post-plan invocation, or an invalid checkpoint token.

### `oat review validate-plan`

**Method:** JSON-only CLI command with plan on stdin.

```text
oat review validate-plan \
  --run-id <id> \
  --command-token <opaque> \
  --stdin \
  --json
```

**Output:** `PlanValidationReceiptV1`.

**Rules:**

- Maximum stdin size is bounded.
- Input is parsed as strict JSON with schema version 1.
- Validation errors return a structured list and no receipt.
- Expired, missing, unsealed, or already-terminal contexts are rejected.

### `oat review begin-evidence`

**Method:** Launcher-owned JSON CLI command invoked after successful plan
validation and before any content evidence is loaded.

```text
oat review begin-evidence \
  --run-id <id> \
  --receipt <opaque> \
  --json
```

The command resolves the private receipt, verifies its
validation-run/gate/launch-attempt/context/plan tuple and stored
accepted-handle digest, and atomically moves the breadcrumb from
`plan_validated` to `evidence_started`. Receipt possession is the CLI
capability; provider same-handle ownership is enforced separately by the
retained continuation. Replays, mismatched receipts, and calls before
checkpoint/validation or after terminal state are rejected.

### `oat review validate-output`

**Method:** JSON-only CLI command.

```text
oat review validate-output --run-id <id> --stdin --json
```

Stdin is the complete `ReviewerTerminalV1`. For an artifact candidate, the
validator requires `privateDraftPath` to equal the stored draft path, extracts
the versioned accounting block from its immutable snapshot, and requires
canonical equality with `reviewAccounting` in the terminal. For a structured
candidate or blocked terminal, it validates the in-band object directly.
Input size is bounded before strict JSON parsing.

**Output:**

```typescript
type OutputValidationResult =
  | { valid: true; outputDigest: string }
  | { valid: false; errors: AccountingValidationError[] };
```

### Review CLI Exit Semantics

Every output type above is carried in `result` by this common envelope:

```typescript
type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type ReviewCliEnvelope<T> =
  | {
      ok: true;
      result: T;
    }
  | {
      ok: false;
      error: {
        category: 'input' | 'contract' | 'validation' | 'system';
        code: string;
        message: string;
        details: JsonValue;
      };
      result?: T;
    };
```

`begin-evidence` success returns
`{ validationRunId, phase: 'evidence_started' }`. Validation rejection carries
the typed `{ valid: false }` value in `result` where that command defines one.
Every invocation with `--json` writes exactly one JSON document plus one final
newline to stdout; no progress or human prose appears there. Stable safe error
codes and details carry machine diagnostics. Human-readable diagnostics may
also go to stderr.

- Exit `0`: command completed and the contract result is valid/successful.
- Exit `1`: user input, lifecycle contract, or validation rejection, including
  every `{ valid: false }` result.
- Exit `2`: Git, filesystem/I/O, private-store corruption, or other system
  failure.

Exit `1` and exit `2` both emit the `ok: false` envelope; serialization failure
is the only case where the process may be unable to honor that guarantee.

### `workflow.reviewPlanMode`

```yaml
workflow:
  reviewPlanMode: legacy # enforce | legacy; initial rollout default
```

- Initial compatibility release default: `legacy`.
- Target default after the rollout exit gate: `enforce`.
- Resolution follows normal local > shared > user > default precedence.
- Explicit `enforce` is never downgraded after resolution, including for gates.
- After the default flips, `legacy` becomes a temporary explicit opt-out.

### Capability Preflight and Telemetry Ownership

Before preparation, the provider/skill coordinator runs the shared TypeScript
preflight. Capability evidence comes from the adapter that will own the
accepted continuation, not from reviewer self-report:

```typescript
interface ReviewPlanCapabilities {
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

interface ReviewPlanPreflightInput {
  invocation: 'manual' | 'auto' | 'gate';
  sink: 'artifact' | 'structured';
  mode: 'legacy' | 'enforce';
}

interface ReviewPlanPreflightResult {
  ok: boolean;
  capabilities: ReviewPlanCapabilities;
  errors: Array<{ code: string; message: string }>;
}

interface HostContextTelemetryAdapter {
  observe(
    runId: string,
    phase: 'pre_artifact' | 'post_artifact',
  ): Promise<ContextBudgetTelemetry | null>;
}
```

All enforce-mode rows require accepted continuation, artifact checkpoint,
same-handle repair, and `ReviewerTerminalV1`. Additional requirements are
sink-aware:

| Sink         | Additional required capability    |
| ------------ | --------------------------------- |
| `artifact`   | `supportsPrivateArtifactStaging`  |
| `structured` | `supportsStructuredBlockedStatus` |

Manual, auto, and gate invocation use the same row for a given sink; invocation
changes correlation/timeout ownership, not sink capability. Extra capabilities
do not compensate for a missing required cell. `contextTelemetry: unavailable`
is allowed but can never authorize whole-diff loading. Reviewer-authored
payloads have no numeric telemetry fields; observations are read directly by
the coordinator and stored as launcher evidence.

Each `observe` call is synchronous with its checkpoint: the coordinator records
request start/end timestamps, and accepts telemetry only when `observedAt`
falls within that interval, is not future-dated, and is not older than the
prior accepted observation for the run. Token fields are safe integers,
`contextWindowTokens > 0`, `0 <= consumedTokens <= contextWindowTokens`, and
`remainingTokens === contextWindowTokens - consumedTokens`. `adapterId` must
equal the non-null preflight-selected `telemetryAdapterId`; `source` is a
non-empty diagnostic label. Missing telemetry returns null. Stale,
future-dated, arithmetically inconsistent, or wrong-adapter telemetry is
recorded as `invalid-host-telemetry`, treated as null for budgeting, and can
never authorize whole-diff.

### Reviewer Dispatch Payload

Broad code-review payloads add:

```typescript
interface ReviewPlanningPayload {
  review_plan_contract: 1;
  review_preparation: ReviewPreparationV1;
  artifact_draft_path: string | null;
  artifact_checkpoint_command: string;
  validate_plan_command: string;
  begin_evidence_command: string;
}
```

All commands come from `PrepareReviewContextResultV1.commands`, are
launcher-owned, and point to the correct branch-local CLI when a gate supplies
one. The checkpoint command contains the opaque preparation token. The
validation command contains the run ID and a distinct opaque command token; it
loads the sealed context digest from private state. The begin-evidence command
contains a receipt placeholder; the reviewer may substitute only the opaque
receipt returned by successful validation. Exact argv fixtures verify all three
commands.

The trusted `prepare-context` JSON result and accepted-reviewer planning payload
necessarily carry the generated command strings and their tokens. The launcher
captures that stdout without logging it. Tokens are prohibited from
`ReviewPreparationV1`, reviewer-authored plan/output JSON, canonical digests,
diagnostics, and logs.

`artifactDraftPath` is non-null only for the artifact sink, resolves under the
private run directory, and is the only permitted reviewer write target before
acceptance. It is not returned by review resolvers or gate envelopes.

The provider adapter binds the accepted handle before enabling the command
capabilities. If its runtime cannot guarantee that acceptance callback ordering,
preflight reports accepted-continuation support as false and `enforce` blocks
before launch. A pre-start rejection destroys the unbound capabilities.

### Gate Failure Envelope

```typescript
interface ReviewAccountingInvalidFailure {
  status: 'review_failed';
  failure: {
    kind: 'review_complete_accounting_invalid';
    gateRunId: string;
    launchAttemptId: string;
    validationRunId: string;
    validationAttempts: number;
    repairAttempts: number;
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
- The reviewer may invoke the one-shot launcher-owned artifact checkpoint,
  submit plans, invoke the launcher-owned begin-evidence command with a valid
  receipt, and submit repaired output, but cannot supply host telemetry or mark
  any state valid directly.
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
- **Path traversal:** Source/context paths are repository-relative, normalized,
  and checked against the resolved repository root. `artifactDraftPath` is a
  distinct absolute path checked under the private validation root and must
  equal the path stored for the run.
- **Command injection:** Validator commands are rendered from launcher-owned
  argument arrays with platform-safe quoting; reviewer substitutions are
  restricted to validated opaque placeholders, never arbitrary shell text.
- **Symlink attacks:** Temporary store creation rejects pre-existing unsafe
  symlinks and uses exclusive file creation. The launcher pre-creates the draft
  as a regular `0600` file with no-follow/exclusive flags and stores its
  device/inode. Validation reopens with no-follow, requires matching
  device/inode and link count one, then validates bytes read from that file
  descriptor. Publication copies those validated bytes into an exclusive
  project-local temporary file, rechecks its digest, and atomically renames
  within the destination directory; it never renames or rereads the
  reviewer-controlled private path.
- **Prompt injection through filenames/errors:** Machine errors use safe codes
  and JSON pointers; raw path content is encoded, never interpolated into shell
  commands.
- **Stale receipt reuse:** Run ID, context digest, plan digest, assignment
  digest, TTL, invocation, and sink must match.
- **Telemetry self-report:** Artifact checkpoint accepts no numeric telemetry;
  only the host adapter may populate the sealed budget snapshot.

## Performance Considerations

### Metadata Cost

Preparation uses bounded Git metadata commands. Missing context telemetry or a
denial-only numstat estimate above preparation telemetry's `remainingTokens`
skips patch counting entirely. The final post-artifact evidence budget does not
exist yet and is never consulted by this pre-check. Otherwise counting stops at
64 MiB or its preparation deadline and the child is terminated, so model
context receives totals or a lower bound rather than content. The collector
performs one sorted pass over changed paths and obligations:
`O(files + obligations)`.

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

If context telemetry is absent, the numstat pre-check denies, the patch estimate
is capped/uncertain, or the evidence budget is insufficient, broad reviews use
path-scoped evidence. Small reviews may still stay inline; inline does not imply
whole-diff.

### Time Budget

The reviewer consumes the coordinator-resolved outer budget; it does not
recalculate gate timeout. Enforced review requires 120 seconds. Planning retains
at least 5 seconds and uses at most 20%/5 minutes; evidence retains at least
15 seconds; reconciliation retains at least 10 seconds; and output retains at
least 90 seconds. Reconciliation plus output retain at least 25%. Lane deadlines
cannot exceed the evidence cutoff.

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
- **Review budget below minimum:** Block before launch with
  `review-budget-below-minimum`, resolved/configured milliseconds, required
  120,000 milliseconds, and migration remedies.
- **Context preparation failure:** Block before launch with exact Git/artifact
  diagnostic.
- **Plan validation failure:** Return structured errors to the reviewer; allow
  one corrected resubmission after the initial submission.
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

- Plan validation: maximum two submissions total, before evidence (initial plus
  one correction).
- Output accounting: maximum three validation submissions total (initial output
  plus at most two same-continuation repair submissions).
- Accounting-invalid gate diagnostics report both
  `validationAttempts` (1–3) and `repairAttempts` (0–2).
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

| ID   | Verification           | Key Scenarios                                                                                                    |
| ---- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| FR1  | Integration            | Post-artifact sealed context, discrete plan receipt, exact-set validation, no unconditional pre-plan source read |
| FR2  | Unit + integration     | Add/modify/delete/rename/binary paths, numstat early denial, exact/capped estimate, collection failure           |
| FR3  | Unit                   | One primary owner, seam references, missing/duplicate/unknown paths and obligations                              |
| FR4  | Integration            | Path-scoped broad review, inspected classifications, uncertain budget/estimate, Tier 3 no read-all reset         |
| FR5  | Unit                   | Two independent substantial lanes, recorded cost/benefit judgment, semantic-only rejection, non-replayed lane    |
| FR6  | Integration            | Typed complete/partial dossier, accepted timeout, no replacement, validated inline contingency                   |
| FR7  | Contract + integration | Claim-addressable direct verification, kind-specific rejected semantics, sampling, provenance acceptance         |
| FR8  | Unit + integration     | Gate budget propagation, 120-second minimum, absent budget, cutoffs, output reserve                              |
| FR9  | Contract + integration | Artifact block, structured terminal, stored assignment projection, incomplete-blocked coherence, bounded repair  |
| FR10 | Integration            | Prior-evidence adapter, verdict omission, navigation-only use, same-target gate lineage                          |
| FR11 | Unit + integration     | Compact inline plan, no unnecessary delegation, same accounting guarantees                                       |
| NFR1 | Contract + integration | Unchanged severity semantics and reviewer authority                                                              |
| NFR2 | Contract               | Canonical/provider parity, capability preflight, no below-floor fallback                                         |
| NFR3 | Integration            | Existing artifact/ledger/gate/receive fixtures, legacy mode, unknown field compatibility                         |
| NFR4 | Performance fixture    | Recorded baseline versus new evidence/replay operation counts                                                    |
| NFR5 | End-to-end             | Sync, package checks, lockstep versions, release validation                                                      |

### Unit Tests

- **Scope:** ChangeMap normalization, canonical hashing, obligation extraction,
  plan invariants, receipts, TTL/reaper, budget arithmetic, output validation,
  compact accounting, config resolution.
- **Coverage Target:** Every validator branch and error code; no new global
  percentage threshold.
- **Key Test Cases:**
  - Canonical spec, plan, deviation, and deferred-finding fixtures produce the
    exact obligation set; final quick/import unions every current task; CRLF,
    duplicate, escaped-pipe, termination, and malformed grammar cases fail or
    normalize exactly as specified. Later resolved/dismissed deferred entries
    remove earlier obligations.
  - Every path and obligation has exactly one primary owner; seam references do
    not create contradictory ownership.
  - Receipt cannot cross run/context/plan/assignment/sink.
  - Output lanes cannot diverge from the stored assignment projection while
    echoing a valid plan digest.
  - Expired and symlinked contexts are rejected.
  - Missing telemetry and obviously oversized numstat skip the patch counter;
    whole-diff is also denied after byte/time cap.
  - Generated/bookkeeping classification cannot select no inspection.
  - Delegation rejects missing cost/benefit rationale, fewer than two
    independent substantial lanes, and absent non-replayed deterministic
    evidence.
  - Dossier partial coverage and primary contingency subsets validate.
  - Required direct verification claims cross-check against output findings.
  - Rejected absence/conflict/gap claims count as resolved; rejected promoted
    findings, samples, and deterministic results are invalid.
  - Evidence/command scope indexes resolve and command terminal results include
    provenance.
  - Duplicate command, evidence, claim, and finding IDs reject before reference
    lookup.
  - Deterministic claims resolve through command evidence to the exact command
    result digest.
  - Contradictory lane/classification outcome combinations are rejected.
  - Partial classification coverage identifies uninspected path indexes.
  - Incomplete coverage cannot pair with a passing/no-findings verdict.
  - Context telemetry flags require a complete, valid provenance tuple.
  - Preflight capability evidence comes from the accepted-continuation adapter;
    reviewer JSON cannot provide capabilities or numeric telemetry.
  - Sink/capability matrix rejects only the missing capability required by that
    sink.
  - Host telemetry rejects stale, future, non-monotonic, wrong-adapter, and
    arithmetically inconsistent observations without authorizing whole-diff;
    private evidence and exposed digests bind the full request interval.
  - 119,999 ms fails with `review-budget-below-minimum`; 120,000 ms preserves
    every named floor.
  - FR5-FR7 fields required even for inline.
  - Findings are immutable across accounting repair.

### Integration Tests

- **Scope:** JSON CLI commands, local wrapper, remote structured rail, Tier 3,
  direct implementation review, and gate envelopes.
- **Test Environment:** Real temporary Git repositories, fake reviewer
  continuations, branch-local CLI fixtures, and deterministic clocks.
- **Key Test Cases:**
  - Plan receipt issued before evidence sentinel; direct breadcrumb mutation,
    receipt replay, and evidence start before validation are rejected.
  - Mutation commands reject before accepted-handle binding and on a sibling
    run/launch-attempt capability; repair reaches only the recorded continuation.
  - Plan submission before the one-shot artifact checkpoint is rejected;
    post-artifact telemetry alone supplies whole-diff budget.
  - Gate preparation creates a distinct validation run ID, requires gate and
    launch-attempt correlation, and cannot resolve a sibling attempt.
  - Every review CLI emits JSON and uses exit 0/1/2 for success, contract
    rejection, and system failure respectively; stdout contains exactly one
    schema-valid envelope in each case.
  - Trusted preparation JSON/payload contains usable command tokens while
    preparation objects, reviewer JSON, diagnostics, digests, and logs do not.
  - Artifact accounting accepts exactly one immediately-following fenced JSON
    block and rejects duplicate headings/keys/blocks, alternate fences,
    trailing section content, oversize blocks, or malformed JSON.
  - Artifact terminal accounting must canonically equal the embedded block;
    draft path/inode replacement and symlink attempts reject before publication.
  - Artifact and structured outputs validate identically.
  - One rejected plan may be corrected once; a second rejection blocks before
    evidence.
  - First malformed accounting repairs successfully without rerunning review.
  - Two failed repair submissions after the initial output emit typed terminal
    failure with `validationAttempts: 3`, `repairAttempts: 2`, and no actionable
    artifact.
  - Gate parent distinguishes accounting invalid from timeout, materializes a
    live terminal diagnostic pointer, and removes the full child context.
  - Valid blocked-incomplete accounting follows reviewer `BLOCKED` handling and
    returns explicit structured `status: blocked` without creating a
    discoverable artifact, structured pass, or gate pass.
  - Accounting repair uses the already-accepted provider handle; the TypeScript
    validator and reference dispatcher cannot spawn a replacement.
  - Repair accepts allowlisted identity/assignment corrections and rejects
    every mutation to findings, verdict, evidence, evidence references,
    commands, verification disposition, outcomes, or budget.
  - Complete and blocked `ReviewerTerminalV1` values project correctly for both
    sinks; blocked artifact staging never reaches a discoverable path.
  - Process-crash fixture leaves state that next prepare reaps.
  - Prior artifacts can change navigation/sample order but cannot supply the
    current verdict or cross gate lineage/target.
  - Coordinator inventory test fails on an undeclared broad code-review rail.
  - Initial legacy default preserves current behavior without creating
    preparation/receipt/accounting state; explicit enforce never downgrades.

### End-to-End Tests

- **Scope:** Bundled canonical assets through provider sync and release
  validation.
- **Test Scenarios:**
  - Large local phase/final review uses selective accounting.
  - Remote structured project review validates before GitHub posting.
  - Tier 3 inline review does not execute read-all behavior.
  - Gate passes accepted output and emits non-receivable accounting-invalid
    envelope on terminal repair failure.
  - Compatibility release dogfood runs every in-scope rail under explicit
    enforce before the default-flip release.

## Deployment Strategy

### Build Process

Use the existing Turborepo and TypeScript build. No new runtime dependency is
required; hashing, random tokens, process execution, and temporary storage use
Node.js standard libraries and current repository utilities.

### Deployment Steps

1. Land production modules and focused tests behind the new config key with
   initial default `legacy`.
2. Update all enumerated coordinators and canonical reviewer contracts.
3. Update docs and provider-linked views with `oat sync --scope all`.
4. Bump all five public packages in lockstep.
5. Run build, test, lint, type-check, format, and `pnpm release:validate`.
6. Dogfood explicit `enforce` across local artifact, remote structured, Tier 3,
   implementation-phase, and gate paths.
7. Publish the compatibility release and soak for at least seven calendar days.
8. In the next release, flip the default to `enforce` only after the exit
   criteria below pass; repeat lockstep versioning and release validation.

### Rollout Decision and Exit Criteria

The project uses a two-stage rollout that targets two consecutive releases.
This deliberately accepts one release in which new validation is available but
not default, because a same-release seven-coordinator cutover has higher
compatibility and unwind risk. Failed exit criteria may extend Stage A; the
design does not mislabel that case as a two-release bound. The target behavior
remains enforce-by-default.

The default-flip release is blocked until:

1. the exhaustive coordinator inventory/parity suite covers every direct and
   indirect in-scope rail;
2. the explicit-enforce dogfood matrix passes for both sinks, Tier 1/Tier 3,
   direct implementation review, and gate aliases;
3. no unresolved P0/P1 compatibility regression remains after the minimum
   seven-day soak;
4. accounting-invalid, `BLOCKED`, timeout, and correlation failure envelopes
   are distinguished in fixtures; and
5. full release validation passes again.

Stage A must create a tracked default-flip item with these criteria and the
target next release. Fourteen calendar days after the compatibility release is
the escalation deadline. If criteria still fail, maintainers must record one
explicit disposition on the item: a dated fix plan, rollback of the new
contract, or a time-bounded extension with owner and next review date. The
default does not silently remain legacy without an owner, and the project
cannot close before the flip or an explicit rollback decision.

Legacy-mode removal is a separate post-flip criterion. Removal is eligible only
after enforce has been the default for at least two published releases and
30 calendar days, no unresolved P0/P1 compatibility issue requires legacy, and
the removal has been announced in configuration docs and release notes.

### Rollback Plan

Before the flip, rollback requires no setting change because `legacy` is the
default. After the flip, set `workflow.reviewPlanMode: legacy` explicitly while
retaining diagnostics. Reverting the release restores the prior contract; no
project artifact migration is required because accepted accounting is additive.

### Configuration

- **Environment Variables:** None added.
- **Workflow setting:** `workflow.reviewPlanMode`; initial default `legacy`,
  target default `enforce` after the rollout exit gate.
- **Gate behavior:** No implicit target or mode injection; configured gate
  independence remains unchanged.

### Monitoring

Local diagnostics record mode, strategy, operation counts, repair counts,
terminal subtype, and cleanup outcome. No external telemetry service is added.

## Migration Plan

No database migration exists. The migration is a coordinated contract and
consumer rollout.

### Migration Steps

1. Add the internal provider-neutral terminal envelope and additive artifact
   accounting syntax while preserving accepted external sink schemas.
2. Add validation context/receipt commands and production APIs.
3. Add coordinator adapters while preserving current sink behavior.
4. Update reviewer canonical source and all provider views.
5. Update gate envelope parser with additive failure subtype.
6. Inventory resolved gate budgets below 120 seconds and document that
   `enforce` will return `review-budget-below-minimum`; users must raise the
   timeout or retain explicit `legacy`.
7. Ship all migrated project code-review paths with initial default `legacy`
   while dogfooding explicit `enforce`.
8. Flip the default to `enforce` in the next release only after the rollout exit
   criteria pass.
9. Leave enumerated ad-hoc and non-code structured rails explicitly outside the
   contract.
10. After the flip, document temporary `legacy` opt-out and its removal
    criterion.

### Rollback Strategy

The terminal envelope is internal to enforce-mode adapters, and the artifact
section is ignored by old consumers. Explicit legacy mode bypasses receipt
requirements. No accepted review artifact is rewritten or removed.

### Data Validation

- Existing artifact and widened-ledger fixtures remain readable.
- Review latest, gate correlation, and receive continue to select only accepted
  review artifacts.
- Gate fixtures resolve only the expected
  `(gateRunId, launchAttemptId) → validationRunId` terminal receipt.
- Diagnostics and validation manifests never appear in resolver scans.
- Provider views match canonical sources after sync.

## Open Questions

No blocking design questions remain. The byte/token and denial-only numstat
factors are named policy values and may be tuned during fixture calibration.
The 120-second minimum is a compatibility contract and cannot change without
updating config migration guidance and boundary tests.

## Implementation Phases

### Phase 1: Baseline and Production Contract Foundations

**Goal:** Freeze current behavior and establish honest production ownership.

**Tasks:**

- Record the fixed large-scope evidence-operation baseline.
- Add coordinator inventory/parity fixtures.
- Audit `reviewer-dispatch.ts`; extract proven pure pieces or replace it.
- Define versioned shared types, capability preflight/telemetry interfaces, and
  strict validators without transferring accepted-handle ownership.

**Verification:** Existing behavior fixtures pass; reference-helper gaps are
covered by failing production tests before implementation.

### Phase 2: ChangeMap and Validation Runtime

**Goal:** Produce authoritative metadata and short-TTL validation state.

**Tasks:**

- Implement ChangeMap and exact-grammar obligation collection, denial-only
  numstat pre-check, and capped patch-byte estimation.
- Implement context hashing, private store, gate/run correlation index,
  launch-attempt command capabilities, accepted-handle binding, receipts,
  atomic breadcrumbs, and reaper.
- Add prepare, one-shot post-artifact checkpoint, validate-plan, and
  begin-evidence JSON commands with common 0/1/2 exit semantics.
- Add the launcher/host telemetry adapter; preparation telemetry remains
  denial-only and both observations produce private digested evidence records.
- Add budget/context models and whole-diff eligibility.

**Verification:** Unit and temporary-repository integration tests cover metadata,
receipts, TTL, crash reaping, and budget boundaries.

### Phase 3: Reviewer Plan and Evidence Contract

**Goal:** Make validated planning the mandatory reviewer boundary.

**Tasks:**

- Update canonical reviewer intake and ReviewPlan contract.
- Require the receipt-bound begin-evidence transition before content reads.
- Require unconditional FR5-FR7 fields and structural delegation gates.
- Replace Tier 3 read-all behavior.
- Add plan validation/correction, typed dossier/claim contracts, delegation
  economics, and selective evidence rules.
- Add fixed-fixture operation-count assertions.

**Verification:** Contract tests prove the declared sequence and exact-set plan
validation; large/small fixtures select intended strategies.

### Phase 4: Output Accounting and Coordinator Integration

**Goal:** Enforce sink-independent output acceptance.

**Tasks:**

- Implement compact `ReviewAccountingV1`, exact artifact block grammar, stored
  assignment-projection, globally unique reference registries, and claim
  validation.
- Add provider-neutral `ReviewerTerminalV1`, private artifact staging, and
  symlink-safe complete/blocked sink projections.
- Implement output validator and same-handle repair.
- Wire local, remote structured, Tier 3, and direct phase coordinators.
- Preserve indirect gate/checkpoint ownership.

**Verification:** Artifact/structured parity, repair immutability, coordinator
inventory, and no-action-before-validation tests pass.

### Phase 5: Gate Diagnostics and Compatibility

**Goal:** Make terminal failures observable and rollout safe.

**Tasks:**

- Wire capability preflight and `workflow.reviewPlanMode` at every coordinator.
- Add the 120-second enforced-review budget preflight and migration diagnostic.
- Add gate/validation run correlation and accounting-invalid failure
  translation.
- Add parent cleanup and diagnostic pointers.
- Raise only the built-in artifact-review timeout to 20 minutes while
  preserving code-review defaults and timeout override precedence.
- Implement initial legacy-default rollout behavior and create the tracked
  default-flip item.

**Verification:** Gate distinguishes every terminal class, blocks before launch
on capability failure, never silently downgrades, reaps killed-child state, and
resolves the new artifact default without changing code defaults or overrides.

### Phase 6: Documentation, Provider Sync, and Compatibility Release

**Goal:** Ship consistent canonical/provider behavior with legacy as the bounded
initial default.

**Tasks:**

- Update workflow, review, gate, configuration, and CLI reference docs.
- Bump changed canonical skill/agent versions once.
- Sync all provider views.
- Bump all five public packages in lockstep.
- Run full validation and the complete explicit-enforce dogfood matrix.
- Publish the compatibility release and begin the seven-day minimum soak.

**Verification:** Build, tests, lint, type-check, format, provider parity, docs,
and `pnpm release:validate` pass.

### Phase 7: Enforce-Default Flip

**Goal:** Make validated plan-first review the default after compatibility
evidence satisfies the rollout gate.

**Tasks:**

- Verify every rollout exit criterion and record evidence on the tracked item.
- Change the default to `enforce`; retain explicit `legacy` as the temporary
  opt-out.
- Repeat docs/config updates, lockstep package versioning, full validation, and
  representative dogfood.

**Verification:** The default-flip release passes every exit criterion and
`pnpm release:validate`; unresolved P0/P1 compatibility regressions block the
flip.

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
  - **Mitigation:** Freeze the normalized immutable-review-substance digest and
    reject changes outside the closed repair-field allowlist.
  - **Contingency:** Retain diagnostic, fail non-actionably, and require a fresh
    review.
- **Validation state leaks after kill:** Probability Medium | Impact Medium
  - **Mitigation:** Gate-parent cleanup, TTL, private permissions, and bounded
    prepare-time reaper.
  - **Contingency:** Manual cleanup command scoped to expired validation roots.
- **Structured coordinator bypasses validation:** Probability Medium | Impact High
  - **Mitigation:** Exhaustive coordinator inventory test, explicit-enforce
    dogfood, and bounded legacy-default compatibility release before the default
    flip.
  - **Contingency:** Hold the default flip and keep the tracked blocker open.
- **Delegation economics remain gameable:** Probability Medium | Impact High
  - **Mitigation:** Treat substantiality/cost-benefit as reviewer judgment rather
    than numeric proof; mechanically require a deterministic/provenance-accepted
    lane and bind it to replay policy.
  - **Contingency:** Keep review inline.
- **Short existing gate timeout fails enforced preflight:** Probability Medium | Impact High
  - **Mitigation:** Named 120-second minimum, exact error/remedies, config
    inventory, migration note, and legacy-default compatibility release.
  - **Contingency:** Raise the configured timeout or retain explicit legacy for
    that gate until it can satisfy the enforced contract.
- **Whole-diff estimate is miscalibrated:** Probability Medium | Impact Medium
  - **Mitigation:** Derive eligibility from observed context budget and
    conservative byte/token estimate, never file count.
  - **Contingency:** Force path-scoped evidence.
- **Patch counting wastes I/O on obviously broad reviews:** Probability Medium | Impact Medium
  - **Mitigation:** Skip the counter when telemetry is absent or the denial-only
    numstat estimate already exceeds preparation's available-token upper bound.
  - **Contingency:** Force `coarse-denied` and path-scoped evidence.
- **Committed accounting becomes noisy:** Probability Medium | Impact Medium
  - **Mitigation:** One sorted path occurrence per lane/classification and no
    verbose ChangeMap metadata.
  - **Contingency:** Add equivalent compact encoding without changing exact-set
    semantics.
- **Reference helper hides production gaps:** Probability Medium | Impact High
  - **Mitigation:** Rewrite-first audit and parity fixtures before wiring.
  - **Contingency:** Replace rather than reuse the helper.
- **Gate and validation runs cross-correlate:** Probability Low | Impact High
  - **Mitigation:** Separate random IDs, required gate/attempt inputs, private
    one-to-one index, and terminal lookup tests.
  - **Contingency:** Return correlation failure with no receive-eligible
    artifact.
- **Markdown obligation/accounting grammar drifts:** Probability Medium | Impact High
  - **Mitigation:** Versioned exact grammar, canonical and archived fixtures,
    duplicate detection, and fail-closed parsing.
  - **Contingency:** Update grammar and fixtures in the same compatibility
    release; retain explicit legacy while producers migrate.
- **Compatibility mode becomes permanent:** Probability Medium | Impact Medium
  - **Mitigation:** Two-stage rollout targeting consecutive releases, mandatory
    tracked default-flip item, seven-day minimum soak, 14-day escalation
    deadline, explicit exit/removal criteria, and legacy warnings.
  - **Contingency:** Record a dated fix, rollback, or time-bounded extension; do
    not close the project with an unowned default flip.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Current-state handoff: `references/current-state-and-handoff.md`
- Originating proposal: `references/slow-review-feedback.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture Docs: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
