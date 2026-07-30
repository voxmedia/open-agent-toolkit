---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-07-30
oat_generated: false
oat_template: false
---

# Specification: review-plan-workflow

## Phase Guardrails (Specification)

This specification defines requirements and acceptance criteria. Concrete
modules, function signatures, schemas, and implementation sequencing belong in
`design.md` and `plan.md`.

## Problem Statement

Broad OAT code reviews can load lifecycle artifacts and large content diffs
before choosing an inspection strategy. Optional reconnaissance then risks
duplicating work: the primary reviewer performs broad intake, workers repeat
parts of that intake, and the primary replays every load-bearing claim. The
observed result has included long silent runs, oversized semantic workers, and
outer timeouts without a useful review artifact.

The workflow needs an explicit planning boundary between artifact intake and
content-level evidence loading. That boundary must use a metadata-only change
map, account for every changed file and requirement, choose selective evidence
lanes, and allocate the available review budget before source or diff content is
read. Delegation must be justified by independent substantial work rather than
file count, and primary verification must preserve independent judgment without
replaying all successful positive evidence.

This project delivers that integrated contract-first slice without introducing
a durable runtime state machine or transactional partial review artifacts.
Existing guarded re-review narrowing, timeout diagnostics, gate independence,
and artifact correlation remain prerequisites.

## Goals

### Primary Goals

- Require a ReviewPlan before source or content-level diff intake for broad code
  reviews.
- Build a metadata-only change map with complete file and requirement
  accounting.
- Make evidence loading selective, path-scoped, risk-ordered, and auditable.
- Delegate only when independent substantial lanes justify coordination cost.
- Narrow primary replay while preserving direct verification of consequential
  claims and final reviewer judgment.
- Propagate and allocate an already-resolved outer review budget.
- Preserve equivalent strategy and coverage semantics for artifact and
  structured-output sinks.

### Secondary Goals

- Keep small coherent reviews low-ceremony and inline.
- Reuse existing review-orchestration vocabulary and runtime primitives where
  practical.
- Improve review observability through final strategy, accounting, and
  incomplete-coverage summaries.

## Non-Goals

- A general-purpose or durable runtime review-phase state machine, or a durable
  ReviewPlan manifest. The private short-TTL receipt/breadcrumb lifecycle
  required to enforce FR1's validation boundary is in scope and is not a
  project artifact.
- Transactional in-progress or partial review artifacts.
- Adaptive or work-derived outer timeout calculation.
- Manual prior-verdict reuse or bookkeeping-only review skipping.
- Reimplementation of guarded narrowing, lineage, provenance, timeout activity
  diagnostics, or gate correlation delivered by prerequisite work.
- Weakening review coverage, severity thresholds, gate independence, or primary
  verdict ownership.
- Broad process/prose deduplication beyond changes needed for this slice.

## Requirements

The intended first release includes FR1-FR7 plus FR9 so it closes both measured
failure modes: giant-diff-first intake and non-beneficial delegated replay.
FR5-FR7 ship together because delegation economics are only defensible when
coupled to the dossier and replay boundaries. FR8 is an independent P1 addition
that may ship alongside the release without blocking the two core corrections.

**Minimum shippable subset under explicit descoping:** FR1-FR4 plus FR9 form a
coherent intake-only release if plan pressure requires a deliberate cut. This
is a contingency boundary, not the intended project outcome and not a lower
priority assignment for FR5-FR7. Any such cut must be recorded as an explicit
scope change before implementation.

P0 non-functional requirements remain release guardrails for either shape.

### Functional Requirements

**FR1: Pre-Intake ReviewPlan Boundary**

- **Description:** Broad code reviews must create an internal ReviewPlan after
  required artifact intake and metadata collection but before reading source
  files or content-level diffs.
- **Acceptance Criteria:**
  - The contract defines an ordered artifact → metadata → plan → evidence
    sequence.
  - Canonical instructions and fixtures contain no unconditional broad source
    or content-diff read before ReviewPlan creation.
  - The wrapper passes the authoritative changed-file set, and final ReviewPlan
    accounting is mechanically validated against that exact set.
  - The slice explicitly does **not** claim mechanical proof of provider tool
    read ordering; a post-hoc plan remains possible but must satisfy exact-set
    accounting and auditable strategy output.
  - Artifact and structured-output modes use the same internal planning
    semantics.
  - A compact path remains available for small coherent reviews.
- **Priority:** P0

**FR2: Metadata-Only Change Map**

- **Description:** Planning must use range-level change metadata without loading
  diff content.
- **Acceptance Criteria:**
  - The map captures authoritative range provenance, path/status information,
    rename or deletion information, additions/deletions where available, and
    aggregate change size.
  - Metadata collection failures are explicit and cannot silently produce an
    apparently complete plan.
  - Collection remains bounded and substantially cheaper than loading the full
    content diff.
- **Priority:** P0

**FR3: Complete Obligation and File Accounting**

- **Description:** The ReviewPlan must account for every changed file and every
  in-scope requirement or deferred finding.
- **Acceptance Criteria:**
  - Each changed file has exactly one primary lane or an explicit generated,
    bookkeeping, or justified exclusion classification.
  - Each in-scope requirement, accepted deviation, and deferred finding maps to
    one or more inspection obligations.
  - Duplicate, missing, or contradictory assignments invalidate the plan.
  - Cross-lane invariants and integration seams are recorded separately from
    lane-local obligations.
- **Priority:** P0

**FR4: Selective Evidence Loading**

- **Description:** Review evidence must be loaded according to the ReviewPlan
  rather than through unconditional whole-range traversal.
- **Acceptance Criteria:**
  - High-consequence seams are inspected before lower-risk surfaces.
  - Path-scoped diffs and targeted source context are the default evidence
    operations for broad reviews.
  - Whole-range content loading is allowed only when estimated content cost fits
    within the remaining context/evidence budget after artifact intake; file
    count alone cannot authorize it.
  - Missing context-budget evidence or uncertain content-size estimation uses a
    conservative path-scoped strategy.
  - Tier 3 inline reset follows the same ReviewPlan and selective-loading
    contract; it must not retain an unconditional “read every changed file”
    instruction.
  - Generated or bookkeeping classifications affect inspection strategy but do
    not independently authorize skipping a review.
- **Priority:** P0

**FR5: Delegation Economics Coupled to Replay**

- **Description:** Delegation must be selected only when the ReviewPlan
  identifies enough independent substantial work to outweigh launch,
  coordination, and reconciliation cost.
- **Acceptance Criteria:**
  - Delegation requires at least two independent substantial lanes.
  - The plan records why the lanes are independent, why they are substantial,
    and why expected savings exceed coordination cost.
  - At least one delegated lane produces provenance-verifiable output that the
    primary is not required to replay semantically, such as deterministic test,
    lint, type-check, or inventory evidence.
  - Plans composed only of semantic-reading lanes remain inline unless design
    identifies another non-replayed evidence class with equivalent provenance.
  - One broad semantic worker covering most of the review is rejected.
  - Insufficient remaining reconciliation or output time forces inline
    execution.
- **Priority:** P0

**FR6: Bounded Lane Dossiers and Timeout Semantics**

- **Description:** Delegated lanes must return bounded evidence dossiers and
  preserve useful coverage information when incomplete.
- **Acceptance Criteria:**
  - Each lane has an explicit scope, obligations, checks, deadline, and return
    contract.
  - A complete or partial dossier identifies inspected surfaces, commands run,
    evidence, uncovered obligations, and uncertainty.
  - Accepted worker timeout or failure never launches an automatic replacement.
  - The design explicitly distinguishes permitted primary inline completion
    from prohibited worker replacement.
- **Priority:** P0

**FR7: Risk-Based Primary Verification**

- **Description:** The primary reviewer retains judgment while avoiding full
  replay of successful advisory evidence.
- **Acceptance Criteria:**
  - The primary directly verifies every promoted finding, consequential
    negative or absence claim, conflict, and cross-lane gap.
  - Positive coverage is checked through risk-based samples rather than
    mandatory full replay.
  - Deterministic command results are accepted only when command, scope,
    provenance, and result are independently verifiable.
  - Workers never assign severity, decide validity, or own the output.
  - FR5-FR7 cannot ship independently; the delegation decision, dossier
    contract, and replay boundary are one release package.
- **Priority:** P0

**FR8: Review Budget Propagation and Allocation**

- **Description:** When an outer review budget is resolved, the reviewer must
  receive it and allocate time for planning, evidence, reconciliation, and
  output.
- **Acceptance Criteria:**
  - The reviewer receives the resolved budget and its provenance without
    recalculating the outer timeout.
  - The ReviewPlan records phase allocations, lane deadlines, a final lane
    launch cutoff, and reserved reconciliation/output time.
  - Missing or non-applicable outer budgets have an explicit representation.
  - A review that cannot complete coverage within the remaining budget stops new
    evidence work and produces a useful blocked outcome when the host allows the
    reviewer to finish.
  - The requirement does not claim a blocked result can survive an external
    process kill or buffered child output; diagnostic breadcrumbs remain an
    explicit design question.
- **Priority:** P1

**FR9: Auditable Strategy and Coverage Output**

- **Description:** Final review output must disclose the strategy and coverage
  needed to audit a plan-first review.
- **Acceptance Criteria:**
  - Artifact mode includes a compact ReviewPlan summary, complete lane/file
    accounting, verification boundary, and unresolved uncertainty.
  - Structured-output mode carries equivalent information through its existing
    compatible output surface unless design proves a schema change necessary.
  - Incomplete coverage identifies completed and uncovered lanes, commands run,
    and uncertainty rather than implying a passing review.
  - Existing gate severity parsing and review bookkeeping remain valid.
- **Priority:** P0

**FR10: Prior Evidence Without Verdict Substitution**

- **Description:** Prior review artifacts may guide navigation and risk
  sampling, but cannot substitute for the current review's independent
  judgment.
- **Acceptance Criteria:**
  - Prior artifacts may identify reviewed ranges, risks, verification history,
    fixes, and deferred findings.
  - A configured gate never inherits a lifecycle verdict as its own result.
  - Gate narrowing remains restricted to the same gate lineage and target.
- **Priority:** P0

**FR11: Small-Scope Fast Path**

- **Description:** Reviews below the validated complexity threshold must avoid
  unnecessary delegation and planning ceremony.
- **Acceptance Criteria:**
  - A compact ReviewPlan can select whole-diff inline review for a small coherent
    scope.
  - The fast path still records scope, obligations, accounting, strategy, and
    budget state.
  - Small-scope classification cannot bypass severity, coverage, or output
    requirements.
- **Priority:** P1

### Non-Functional Requirements

**NFR1: Review Rigor**

- **Description:** Workflow optimization must not weaken defect detection,
  evidence quality, or severity semantics.
- **Acceptance Criteria:**
  - Existing Critical/Important/Medium/Minor semantics remain unchanged.
  - Tests cover findings, consequential absence claims, conflicts, and positive
    sampling boundaries.
- **Priority:** P0

**NFR2: Provider Portability**

- **Description:** The workflow must remain usable across supported review
  runtimes and output modes.
- **Acceptance Criteria:**
  - Canonical contracts do not depend on one provider's private capabilities.
  - Capability fallback preserves class floors, authority, and no-replacement
    behavior.
- **Priority:** P0

**NFR3: Compatibility and Actionability**

- **Description:** Existing completed review artifacts, ledgers, gate parsing,
  correlation, and receive behavior must remain compatible.
- **Acceptance Criteria:**
  - No discoverable incomplete artifact can be treated as actionable.
  - Existing completed artifacts and widened review ledgers continue to parse.
  - New strategy content does not break severity counts or gate handoff.
- **Priority:** P0

**NFR4: Bounded Review Cost**

- **Description:** The broad-review workflow must reduce avoidable content
  loading and duplicated verification.
- **Acceptance Criteria:**
  - Large-scope fixtures prove that planning uses metadata before path-scoped
    evidence and does not select unconditional whole-diff loading.
  - Delegation fixtures reject non-beneficial single-lane and broad-worker
    shapes.
  - A fixed large-scope fixture records a pre-change evidence-operation baseline
    and proves the new workflow reduces broad content reads or semantic replay
    operations against that baseline.
  - Measurement reports context/evidence operations and completion behavior; it
    does not claim a universal wall-clock guarantee.
- **Priority:** P0

**NFR5: Maintainability and Release Integrity**

- **Description:** New contracts and runtime plumbing must remain testable,
  source-owned, synchronized, and releasable.
- **Acceptance Criteria:**
  - Shared concepts have one canonical owner and focused contract tests.
  - Changed canonical skills and agents receive required version increments and
    provider views are synchronized.
  - All five public packages are versioned in lockstep when shipped behavior
    changes.
  - `pnpm release:validate` passes before completion.
- **Priority:** P0

## Constraints

- Preserve artifact and structured-output modes.
- Preserve provider portability, root-owned judgment, and read-only advisory
  workers.
- Preserve accepted-handle semantics: timeout or failure after acceptance
  cannot trigger an automatic replacement.
- Do not launch below-floor workers during capability fallback.
- Preserve same-lineage guarded narrowing and fail-open full-scope behavior.
- Preserve run, scope, invocation, and target correlation for actionable
  artifacts and ledger events.
- Do not write partial artifacts into discoverable active review locations in
  this slice.
- Canonical skill changes require one PR-scoped version increment per changed
  skill and provider-view synchronization.
- Shipped CLI assets require lockstep versioning of all five public packages.
- `pnpm release:validate` is part of the definition of done.

## Dependencies

- Merged PR #185 timeout activity diagnostics.
- Merged PR #186 guarded default-on re-review narrowing and provenance.
- Current reviewer, project-review wrapper, and generic dispatch contracts.
- Existing gate timeout resolution, run correlation, artifact snapshot, and
  review-ledger behavior.
- Existing TypeScript, Vitest, skill-contract validation, and provider-sync
  infrastructure.

## High-Level Design (Proposed)

The project adds a shared in-memory planning vocabulary to the review workflow.
The project-review wrapper resolves scope and an optional outer budget, builds a
metadata-only change map, and passes both to the reviewer. The reviewer combines
that map with lifecycle and prior-review obligations to create a ReviewPlan
before any content-level evidence load.

The ReviewPlan assigns every file and requirement, selects a compact inline path
or multiple bounded lanes, records budget allocations, and defines the primary
verification boundary. Evidence is then loaded selectively. Final artifact and
structured output expose a compact strategy, coverage, and uncertainty summary.
No separate durable plan file or incomplete review artifact is introduced.

**Key Components:**

- Change-map collector — produces bounded, provenance-bearing range metadata.
- ReviewPlan model and validator — owns obligations, accounting, lanes,
  strategy, budget allocation, and validation.
- Reviewer contract — enforces ordered intake, selective evidence,
  delegation economics, primary verification, and output semantics.
- Budget propagation seam — carries an already-resolved outer budget into the
  review context.
- Output accounting contract — renders equivalent strategy and coverage
  information for artifact and structured sinks.
- Contract and fixture verification — pins the declared sequence and proves
  exact-set accounting, fast-path, delegation, timeout, compatibility, and
  release behavior without claiming provider tool-order proof.

**Alternatives Considered:**

- Intake-only contract slice — rejected because it leaves the observed
  mega-worker, replay, and deadline failure modes intact.
- Durable runtime ReviewPlan state machine — deferred because it adds schema,
  migration, and multi-consumer state obligations not needed for the first
  contract-first release.
- Transactional partial artifacts — deferred until every resolver and consumer
  can reject incomplete state mechanically.

_Design-related open questions are tracked in the [Open Questions](#open-questions) section below._

## Success Metrics

- Broad-review contract fixtures require ReviewPlan creation before declared
  content-level evidence operations, while exact-set validation detects missing
  or fabricated lane accounting; provider tool read ordering remains explicitly
  unproven.
- Every changed path and in-scope obligation is accounted for exactly once or
  rejected with a precise validation error.
- Large-scope fixtures select path-scoped evidence instead of unconditional
  whole-diff loading.
- Delegation fixtures reject one-lane, tightly coupled, low-savings, or
  insufficient-budget plans.
- Worker timeout fixtures produce no replacement launch and retain useful
  uncovered-scope information.
- Primary-verification fixtures require direct finding/absence/conflict checks
  without requiring replay of every positive claim.
- A fixed large-scope fixture records the pre-change evidence-operation count
  and demonstrates a reduction in broad content reads or semantic replay after
  the change.
- Gate and structured review paths receive equivalent resolved budget context
  where an outer budget exists.
- Existing artifact, ledger, severity, correlation, and receive tests remain
  passing.
- Provider synchronization, package checks, and `pnpm release:validate` pass.

## Requirement Index

| ID   | Description                                      | Priority | Verification                                       | Planned Tasks   |
| ---- | ------------------------------------------------ | -------- | -------------------------------------------------- | --------------- |
| FR1  | Plan before content-level evidence intake        | P0       | integration: ordered review intake fixture         | Pending plan.md |
| FR2  | Build a provenance-bearing metadata change map   | P0       | unit + integration: change-map collection          | Pending plan.md |
| FR3  | Account for every file and review obligation     | P0       | unit: ReviewPlan validation                        | Pending plan.md |
| FR4  | Load evidence selectively by risk and lane       | P0       | integration: evidence strategy selection           | Pending plan.md |
| FR5  | Couple economic delegation to non-replayed lanes | P0       | unit: delegation decision matrix                   | Pending plan.md |
| FR6  | Return bounded complete or partial lane dossiers | P0       | integration: lane timeout and dossier behavior     | Pending plan.md |
| FR7  | Preserve risk-based primary verification         | P0       | contract + integration: verification boundary      | Pending plan.md |
| FR8  | Propagate and allocate resolved review budgets   | P1       | unit + integration: budget context and cutoffs     | Pending plan.md |
| FR9  | Emit auditable strategy and coverage output      | P0       | contract + integration: artifact/structured parity | Pending plan.md |
| FR10 | Use prior evidence without verdict substitution  | P0       | integration: lineage and independence              | Pending plan.md |
| FR11 | Keep small-scope reviews low-ceremony            | P1       | unit + integration: compact inline fast path       | Pending plan.md |
| NFR1 | Preserve review rigor and severity semantics     | P0       | contract + integration: review quality boundaries  | Pending plan.md |
| NFR2 | Remain provider-portable                         | P0       | contract: canonical and provider-view parity       | Pending plan.md |
| NFR3 | Preserve artifact and ledger compatibility       | P0       | integration: actionability and parsing regressions | Pending plan.md |
| NFR4 | Bound broad-review content and replay cost       | P0       | perf: large-scope operation-count fixture          | Pending plan.md |
| NFR5 | Preserve maintainability and release integrity   | P0       | e2e: sync and release validation                   | Pending plan.md |

## Open Questions

- **Change Map:** Which metadata fields and generated-content signals are
  required, and which layer owns collection versus interpretation?
- **Complexity Threshold:** How should estimated whole-diff content cost be
  compared with the remaining context/evidence budget after artifact intake,
  and what conservative fallback applies when either estimate is unavailable?
- **Lane Economics:** What exact evidence defines independent and substantial
  lanes, and how is coordination cost represented?
- **Timeout Semantics:** May the primary finish an accepted timed-out lane
  inline when budget remains, and what evidence distinguishes that from worker
  replacement?
- **Budget Allocation:** Which minimum reserves and launch cutoffs apply, and
  how do they degrade for short or absent budgets?
- **Diagnostic Breadcrumb:** Should the gate/reviewer write a run-correlated,
  non-actionable progress breadcrumb outside every review resolver's scan path
  so buffered or killed runs remain diagnosable without introducing partial
  artifacts?
- **Structured Output:** Can equivalent strategy and coverage fit the existing
  summary without weakening machine consumption, or is a compatible schema
  extension required?
- **Measurement:** Which deterministic fixtures demonstrate reduced evidence
  loading and replay without relying on unstable wall-clock benchmarks?
- **Rollout:** Should the new broad-review behavior replace the existing
  contract directly or use a temporary compatibility setting?

## Assumptions

- Metadata collection is materially cheaper than loading a broad content diff.
- Existing provider agents can follow staged review contracts consistently
  enough for a contract-first release.
- The current review orchestration summary can evolve into the ReviewPlan
  summary without creating two competing accounting formats.
- Existing nested review-directory scanning remains non-recursive, but no
  partial artifacts are introduced in this slice.
- Small scopes can be identified deterministically enough to retain a compact
  whole-diff inline path.

## Risks

- **Prose ordering is not mechanically enforced:** A reviewer may document a
  plan after reading content.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Mechanically validate exact-set lane accounting against the
    wrapper's authoritative file set, pin the declared sequence in contract
    fixtures, and keep a runtime boundary as deferred follow-up if evidence
    shows provider behavior still drifts.
- **Replay reduction weakens confidence:** Positive evidence may be accepted too
  broadly.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Define consequence classes, direct-check obligations, and
    risk-based sampling explicitly.
- **Complexity threshold is poorly calibrated:** Large reviews may still load
  too much, or small reviews may gain unnecessary ceremony.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Use deterministic fixtures at both sides of the boundary and
    keep classification reporting auditable.
- **Budget semantics conflict with host timeout behavior:** The reviewer may not
  receive enough usable time to publish output.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Propagate the resolved outer budget and reserve output time
    conservatively without changing timeout resolution.
- **Cross-contract drift:** Wrapper, reviewer, dispatch, gate, and output
  contracts may disagree.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Assign one owner per concept and add focused cross-surface
    assertions before provider synchronization.

## References

- Discovery: `discovery.md`
- Current-state handoff: `references/current-state-and-handoff.md`
- Originating proposal: `references/slow-review-feedback.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
