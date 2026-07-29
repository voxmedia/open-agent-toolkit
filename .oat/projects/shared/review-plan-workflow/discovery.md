---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-29
oat_generated: false
---

# Discovery: review-plan-workflow

## Initial Request

Create a durable project for the larger reviewer improvement that was proposed
after the slow `multi-provider-support` final reviews but omitted from
`rereview-scope-narrowing`.

The new project should preserve the complete feedback and as much current
context as possible so a fresh worktree and thread can revalidate discovery
without repeating the original forensic work. It should then design and
implement an artifact-first, plan-first review workflow that makes broad
reviews faster, more observable, and more deliberate without weakening
independent review judgment.

This discovery is intentionally **not marked complete**. It records the current
best understanding and decisions already supported by evidence, while leaving
the architecture and policy seams that require fresh-thread validation open.

**Backlog:** `BL-260729-implement-reviewplan-first`

## Problem Statement

The current review contract has artifact-first intent but no enforced planning
boundary. A broad reviewer may read lifecycle artifacts and then load a large
content diff before deciding how to divide or prioritize the review. Optional
reconnaissance can add work instead of reducing it because the primary:

1. performs enough intake to understand the artifacts and diff;
2. launches workers that inspect some of the same surfaces;
3. must directly replay every load-bearing positive and negative worker claim;
4. pays dispatch, classification, reconciliation, and bookkeeping overhead.

The observed failure mode was:

> artifacts → giant diff → one oversized reconnaissance worker → duplicated
> verification → outer timeout without a useful review artifact

The intended workflow is:

> artifacts → metadata-only change map → explicit ReviewPlan → selective
> evidence loading → verification → reconciliation → artifact

The project must improve the serial review floor as well as delegation. Simply
adding more workers or increasing timeout constants would preserve the costly
intake and replay structure.

## Evidence and Incident Context

The originating `multi-provider-support` final scope contained 227 commits, 237
changed files, and roughly 170 code/documentation surfaces.

- Two independent frontier reviewers stayed inline and completed in
  approximately 22 and 18 minutes. They converged on the same carried Medium
  finding.
- A 20-minute gate run spent most of its budget loading lifecycle artifacts and
  a roughly 234-file diff, reached “preparing reconnaissance,” and timed out
  before launching a worker.
- A 40-minute gate run repeated the serial intake, then launched one broad
  reconnaissance worker that performed about 50 tool steps and never returned a
  report before timeout.
- Child output was buffered, so stdout appeared silent despite transcript
  growth.

These observations support four distinct conclusions:

1. The 18–22 minute result is an observed baseline for that scope, not a
   universal lower bound.
2. The 20-minute run combined an undersized budget with giant-diff-first intake.
3. The 40-minute run was a decomposition/orchestration failure: one serial,
   oversized worker with no lane deadline or partial return.
4. Delegation remains potentially valuable for independent deterministic or
   mechanically verifiable lanes, but not under a contract that requires the
   primary to replay all successful evidence.

## Current Baseline

### Already shipped before this project

- The reviewer resolves authoritative scope, reads required lifecycle
  artifacts, and may launch one bounded, read-only, non-recursive round of
  disjoint reconnaissance.
- Workers are advisory and cannot mutate, assign severity, decide pass/fail, or
  own the review output.
- The primary owns source validation, reconciliation, severity, verdict, and
  artifact writing.
- Generic dispatch requires bounded scope, authority, evidence, deadlines, and
  escalation conditions. Accepted worker failure or timeout does not authorize
  automatic replacement.
- Gate timeout precedence, scope defaults, transcript activity probes,
  late-completion handling, and human-readable timeout diagnostics exist.
- Closeout uses effective-delta fingerprints and rolling freshness checkpoints
  for verified bookkeeping descendants.

### Supplied by PR #186 (`rereview-scope-narrowing`)

- Prompt-free, default-on re-review narrowing with explicit opt-out.
- Same-lineage prior-review matching and separate lifecycle/gate lineages.
- Full-SHA, existence, and ancestry guards with fail-open full-scope fallback.
- Durable reviewed-head and narrowed-range provenance.
- Reporting-only `empty`, `bookkeeping-only`, and `substantive` range
  classification.
- Explicit inherited coverage metadata for narrowed reviews.

PR #186 deliberately does not implement this project's ReviewPlan, selective
intake, delegation economics, replay boundary, timeout calibration, partial
artifacts, or review skipping. Its behavior is a prerequisite and should not be
reimplemented.

### Remaining baseline gaps

- Content-level diff reads are not prohibited before planning.
- No required internal `ReviewPlan` or auditable strategy summary exists.
- The wrapper provides a name-only file inventory rather than a richer
  metadata-only change map.
- Every changed file need not be assigned to a lane or explicit classification.
- Whole-range diff loading has no complexity threshold.
- Delegation eligibility does not require at least two substantial lanes or an
  explicit coordination-cost estimate.
- The primary must directly re-verify every load-bearing positive and negative
  worker claim.
- Reviewer inputs do not carry a usable overall budget with planning, lane,
  reconciliation, and output reserves.
- Workers have no review-specific partial-dossier obligation.
- Review artifacts are written only at completion; a killed run may leave no
  run-attributable progress record.
- Wrapper and reviewer contracts duplicate process and artifact prose.

## Clarifying Questions

### Question 1: Relationship to `rereview-scope-narrowing`

**Q:** Should the broad reviewer redesign be treated as already covered by the
current project?

**A:** No. The user expected it to be included, but the current project focused
only on re-review narrowing and explicitly excluded the broader proposal.

**Decision:** Create a separate durable backlog item and project. Preserve
PR #186 as a prerequisite rather than reopening its intended scope.

### Question 2: Discovery confidence

**Q:** Should this session finalize discovery and proceed to planning?

**A:** No. Populate discovery thoroughly now, then revalidate it in a fresh
thread/worktree before choosing design depth or generating a plan.

**Decision:** Keep discovery `in_progress` and readiness unset. Treat all
provisional policy and architecture choices below as revalidation inputs.

### Question 3: Source preservation

**Q:** Where should the original feedback persist?

**A:** In the new tracked project's references directory, along with an
orientation handoff that distinguishes shipped behavior, remaining gaps,
corrected claims, dependencies, and open decisions.

**Decision:** Preserve the complete proposal as
`references/slow-review-feedback.md` and the current-state synthesis as
`references/current-state-and-handoff.md`.

## Solution Space

### Approach 1: Contract-first reviewer redesign

**Description:** Enforce artifact-only intake, metadata mapping, ReviewPlan
creation, selective evidence loading, delegation economics, and narrower replay
primarily through reviewer/wrapper contracts and contract tests. Defer
transactional partial artifacts and adaptive timeout mechanics.

**When this is the right choice:** When the behavioral sequence can be made
reliable through strong provider-portable instructions and tests, and the first
release should isolate the highest-confidence P0 workflow changes.

**Tradeoffs:** Fastest path to correcting the measured giant-diff and serial
mega-worker shapes, but some ordering and progress claims remain prose-enforced.
It may improve strategy without providing runtime-observable partial progress.

### Approach 2: Integrated ReviewPlan and review-runtime slice _(provisional recommendation)_

**Description:** Ship the P0 reviewer contract together with compact metadata
plumbing, budget propagation, lane deadlines/partial dossiers, and executable
validation of the resulting strategy/accounting. Keep transactional partial
artifact publication as a separately gated design decision.

**When this is the right choice:** When wrapper and gate inputs must change for
the ReviewPlan to be meaningful and the project needs measurable end-to-end
behavior rather than prose alone.

**Tradeoffs:** Wider multi-component change with more migration and release
risk. Requires a lightweight design or promotion to spec-driven mode before a
credible plan.

### Approach 3: Runtime-enforced review state machine

**Description:** Introduce a first-class runtime ReviewPlan/manifest and
transactional in-progress artifact lifecycle. Gate, resolver, receiver, and
control-plane consumers enforce phase and completion state.

**When this is the right choice:** When review ordering, liveness, and partial
artifact safety must be mechanically guaranteed rather than instructed.

**Tradeoffs:** Strongest enforcement and observability, but likely exceeds a
single quick-project slice. It creates schema, migration, compatibility, and
multi-consumer atomicity obligations before the core strategy can ship.

### Chosen Direction

**Approach:** Not yet validated. Approach 2 is the current recommendation for
fresh-thread discussion.

**Rationale:** The ReviewPlan needs real metadata and budget inputs to change
behavior, but transactional artifact publication is sufficiently cross-cutting
to deserve an explicit architecture decision rather than accidental inclusion.

**User validated:** No. Revalidate after PR #186 is merged/rebased and the
current contracts are reread.

## Options Considered

### Option A: Internal-only ReviewPlan versus durable per-review plan

The proposal does not require a separate durable plan file for every review.
The full plan may remain internal, but broad review artifacts should include a
compact strategy summary and complete lane/file accounting so the approach is
auditable.

**Provisional preference:** Internal plan plus compact durable summary. Revisit
if runtime enforcement requires a structured manifest.

### Option B: Staging partial artifacts versus writing in place

Writing parseable in-progress artifacts directly into active `reviews/` is
unsafe until every consumer rejects incomplete status. A run-correlated staging
location followed by atomic publication has the safer migration boundary.

**Provisional preference:** Staging plus atomic publish if incremental
artifacts enter scope. Do not implement in-place partial artifacts as a
reviewer-only prose change.

### Option C: Fixed scope timeout versus work-derived budget

Current 15/30-minute defaults and explicit overrides are simple, but they do not
account for artifact volume, changed lines, verification duration, lane count,
or runtime startup.

**Provisional preference:** Propagate the resolved outer budget immediately;
separately revalidate whether this project should calculate a work-derived
budget or only consume one safely.

### Option D: Manual freshness reuse versus bookkeeping-only skip

Explicit reuse of a prior manual verdict and deterministic skipping after
bookkeeping-only fixes are related but different policy changes. Configured
independent gates must never be satisfied by substituting a lifecycle verdict.

**Provisional preference:** Keep both separable from the core ReviewPlan P0.
`BL-260711-skip-re-review-for-bookkeeping` already owns the stricter skip.

## Key Decisions

1. **Central sequence:** Broad reviews should plan from lifecycle artifacts and
   metadata before loading source or content-level diffs.
2. **Complete accounting:** Every changed file and in-scope requirement must
   have a lane, generated/bookkeeping classification, or justified exclusion.
3. **Selective loading:** Whole-range content traversal is an explicit
   small-scope optimization, not the default for broad reviews.
4. **Delegation is economic, not file-count-driven:** Delegate only when the
   ReviewPlan identifies at least two independent, substantial lanes and enough
   remaining time for reconciliation.
5. **No single broad semantic worker:** The observed serial mega-worker shape
   must be rejected by planning or bounded by a useful lane deadline and
   partial-return contract.
6. **Primary judgment remains:** Workers stay read-only and advisory. The
   primary owns findings, severity, verdict, conflicts, and output.
7. **Replay boundary narrows:** The primary directly verifies promoted
   findings, consequential absence claims, conflicts, and risk-based samples,
   not every successful positive worker claim.
8. **Output time is reserved:** Deadline-bound review must preserve
   reconciliation and artifact-writing time and return useful blocked coverage
   information instead of silently reaching the outer kill.
9. **Transcript activity is diagnostic only:** Ambient or unattributed
   transcript growth cannot justify deadline extension.
10. **Independent gates stay independent:** Prior reviews may guide inspection,
    and a gate may narrow from its own prior lineage, but a lifecycle verdict
    cannot substitute for the configured gate's review.
11. **PR #185 and PR #186 are prerequisites:** Do not duplicate their timeout
    diagnostics or guarded narrowing/provenance work.
12. **Rigor and severity do not weaken:** The project optimizes evidence
    acquisition and verification boundaries, not the standard for findings.

## Constraints

- Preserve artifact mode and structured-output mode; structured output has no
  filesystem artifact and needs an equivalent internal planning contract.
- Preserve provider portability and root-owned review judgment.
- Accepted worker timeout/failure cannot launch an automatic replacement.
- Capability fallback cannot use below-floor workers.
- Any incomplete artifact must fail closed across every actionable resolver and
  receiver before it can be written into a discoverable location.
- Review artifacts and ledger events must remain run-, scope-, and
  invocation-correlated.
- Existing PR #186 narrowing must remain fail-open to full scope on ambiguous
  lineage or provenance.
- Canonical skill changes require one PR-scoped version increment per changed
  skill and provider-view synchronization.
- Canonical agent/skill/docs/template changes count as shipped CLI behavior;
  all five public packages require lockstep version bumps.
- `pnpm release:validate` is part of the definition of done.
- Discovery must be revalidated in the fresh worktree before design or plan.

## Success Criteria

- A broad review creates a ReviewPlan before reading source or content-level
  diffs.
- Planning uses required lifecycle/prior-review artifacts and metadata-only
  change information.
- Every changed file and in-scope requirement is accounted for.
- Whole-range diff content is not loaded above the validated complexity
  threshold.
- Evidence loading is lane-scoped, risk-ordered, and traceable to obligations.
- Delegation is skipped unless at least two independent, substantial lanes
  justify its coordination cost.
- Workers return bounded complete or partial evidence dossiers without
  mutation, severity, or verdict authority.
- The primary verifies promoted findings and consequential negative claims
  while avoiding full replay of successful positive evidence.
- Deterministic command output may be accepted only when command, scope,
  provenance, and result are verifiable.
- Review budgets expose planning/evidence/reconciliation/output constraints and
  reserve enough time to publish a useful result.
- Incomplete coverage yields a diagnosable `BLOCKED` result identifying
  completed lanes, uncovered lanes, commands run, and uncertainty.
- A timeout or failed worker never triggers automatic replacement.
- If partial artifacts are included, incomplete state can never be selected,
  parsed as a verdict, received, or recorded as actionable, and final
  publication is atomic.
- Independent configured gates never reuse a lifecycle verdict as a substitute.
- Prior reviews can still act as non-authoritative navigation and risk indexes.
- Small coherent reviews stay simple and inline; the workflow does not impose
  more coordination than direct review.
- Final findings retain exact evidence, unchanged severity semantics, and
  independent primary judgment.
- Tests exercise large and small scopes, beneficial and non-beneficial
  delegation, timeout/partial return, every-file accounting, artifact safety,
  and independent-gate behavior.
- Release validation and provider synchronization pass.

## Out of Scope

- Reimplementing PR #186 guarded range narrowing, provenance, lineage, or
  reporting-only classification.
- Reimplementing PR #185 transcript activity diagnostics.
- Treating larger timeout constants as the primary fix for unbounded review
  behavior.
- Allowing transcript growth alone to renew a deadline.
- Weakening review coverage, severity thresholds, or primary verdict ownership.
- Letting a configured independent gate inherit a lifecycle final-review
  verdict.
- Automatically skipping review based only on path classification.
- Implementing code before fresh-thread discovery revalidation and design-depth
  selection.

## Deferred Ideas

- Explicit manual same-scope prior-verdict reuse may be a later slice if it
  remains valuable after PR #186 narrowing.
- Deterministic bookkeeping-only review skipping remains tracked by
  `BL-260711-skip-re-review-for-bookkeeping`.
- Adaptive idle-kill and hard-cap/idle outcome distinctions remain related gate
  reliability work unless selected into this project during revalidation.
- Prompt and template deduplication should follow behavioral stabilization so
  ownership cleanup does not obscure the functional change.

## Open Questions

- **Workflow depth:** Does this remain quick mode with a lightweight design, or
  should it promote to spec-driven because it spans reviewer, wrapper,
  dispatch, gate, artifact, and consumer contracts?
- **First atomic slice:** Should the first release contain ReviewPlan/selective
  intake only, or include delegation eligibility and replay changes as one
  package?
- **Enforcement:** Can contract tests reliably enforce pre-plan read ordering,
  or is a structured runtime manifest required?
- **Plan schema:** Is the internal ReviewPlan prose/YAML-shaped guidance, a
  typed runtime object, or both?
- **Metadata manifest:** Which change statistics and generated-content signals
  are required, and who owns collection?
- **Whole-diff threshold:** Which combination of files, changed lines,
  artifact volume, generated proportion, and risk permits whole-range loading?
- **Lane economics:** What evidence proves lanes are independent and
  substantial enough to outweigh launch/reconciliation cost?
- **Replay:** Which classes of positive evidence can be accepted without direct
  source replay?
- **Advisory timeout:** May the primary complete a timed-out accepted lane
  inline when budget remains, and how is that distinguished from prohibited
  fallback/replacement?
- **Budget ownership:** Does the gate compute work-derived budgets, or does the
  reviewer only allocate a resolved outer budget?
- **Budget formula:** How should changed lines, lifecycle artifact size,
  mappings, verification duration, lane count, startup, and synthesis reserve
  contribute, and what is the hard cap?
- **Incremental artifacts:** Are transactional partial artifacts required for
  the first release?
- **Consumer migration:** If partial artifacts ship, what is the exhaustive
  consumer set and compatibility strategy?
- **Structured output:** How is ReviewPlan/accounting surfaced without adding
  an incompatible structured findings schema?
- **Freshness policy:** Is manual reuse included, deferred, or represented only
  by the existing bookkeeping-skip backlog item?
- **Measurement:** What fixtures or telemetry demonstrate wall-clock and
  context improvements without reducing defect detection?
- **Rollout:** Should broad-review behavior be introduced behind a compatibility
  setting or replace the current contract directly?

## Assumptions

- PR #186 will merge before this project begins implementation.
- Current gate activity and timeout diagnostics remain available after rebase.
- Provider agents can follow explicit staged review phases consistently enough
  to prototype contract-first behavior.
- Metadata collection is substantially cheaper than loading a broad content
  diff.
- Deterministic command results with exact provenance can be trusted without
  semantic replay.
- Existing artifact consumers do not understand an in-progress status today.
- Small review scopes should retain a low-ceremony inline path.

## Risks

- **Prose-only enforcement drifts:** Reviewers may still load content before
  planning while satisfying the output shape after the fact.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Add executable contract/fixture checks or promote the
    plan boundary into runtime-owned metadata.
- **Replay reduction weakens confidence:** Positive worker evidence may be
  accepted too broadly.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Define consequence/evidence classes and require
    risk-based sampling plus direct verification of findings and consequential
    absence claims.
- **Partial artifact becomes actionable:** A timeout leaves a parseable artifact
  that a resolver or receiver treats as complete.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Prefer staging and atomic publication; migrate all
    consumers together and fail closed.
- **Planning overhead dominates small reviews:** Mandatory structure makes
  narrow tasks slower.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep a compact small-scope ReviewPlan and permit
    whole-diff inline review below a validated threshold.
- **Economic threshold is subjective:** Reviewers continue launching workers
  where context sharing makes delegation slower.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Require explicit lane independence, expected work,
    deadlines, and coordination-cost rationale; test rejected shapes.
- **Timeout tuning masks bad decomposition:** Larger budgets make the
  mega-worker eventually finish without correcting the workflow.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Land plan/lane bounds before or with calibration and
    keep hard maximums.
- **Cross-contract migration is incomplete:** Reviewer, wrapper, gate, latest
  resolver, receiver, and control plane disagree on artifact state or schema.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Inventory consumers during design and require
    cross-surface fixtures before rollout.
- **Scope expands beyond quick mode:** Combining planning, delegation,
  transactional artifacts, adaptive budgets, freshness, and deduplication
  becomes an initiative rather than one feature.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** Revalidate the first atomic slice and promote to
    spec-driven if architecture decisions remain coupled.

## Dependencies and Related Work

- `BL-260729-implement-reviewplan-first` — owning backlog item.
- PR #185 — timeout activity diagnostics baseline.
- PR #186 / `rereview-scope-narrowing` — guarded range/provenance prerequisite.
- `BL-260711-skip-re-review-for-bookkeeping` — separate deterministic skip.
- `BL-260711-add-activity-aware-gate` — related remaining timeout/liveness work.
- `BL-260718-harden-full-surface-gate` — related scope/budget/recursion work;
  revalidate overlap before planning.

## References

- `references/slow-review-feedback.md` — complete originating proposal,
  transcript forensics, source corrections, acceptance criteria, and final
  technical feedback.
- `references/current-state-and-handoff.md` — concise current implementation
  map, shipped-versus-missing matrix, fresh-thread orientation, likely change
  surfaces, and revalidation questions.
- `.oat/projects/shared/rereview-scope-narrowing/` — prerequisite project
  discovery, implementation record, summary, decisions, and review history.

## Next Steps

In a fresh worktree and thread:

1. Read both reference documents.
2. Rebase or refresh against merged PR #186 and verify all “current baseline”
   claims.
3. Revalidate the problem statement, central sequence, success criteria, and
   open questions with the user.
4. Select the first atomic implementation slice.
5. Decide whether to remain quick with a lightweight design or promote to
   spec-driven workflow.
6. Only then complete discovery and produce design/plan artifacts.
