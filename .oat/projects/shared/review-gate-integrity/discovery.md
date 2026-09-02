---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-29
oat_generated: false
---

# Discovery: Review and Gate Integrity

> Discovery status: initial, non-exhaustive starting point. This artifact is
> intentionally not a complete specification. Revalidate it in a fresh thread
> and worktree after ReviewPlan QA and PR #190 are reconciled, before approving
> design or generating a plan.

## Phase Guardrails (Discovery)

Discovery records evidence, requirements, decisions, boundaries, and open
questions. It does not authorize implementation or replace the independent
review judgment that this project is intended to protect.

## Initial Request

Create the review/gate integrity project discussed during backlog triage. It
groups the highest-priority bookkeeping/re-review rule with exact gate-event
binding, source-qualified provenance, PR-closeout freshness, configured
closeout fail-closed behavior, full-surface gate safety, activity-aware gate
timeouts, autonomous closeout, and the supporting structured-output boundary.

The linked backlog items are:

- [`BL-260711-skip-re-review-for-bookkeeping` — Skip re-review for
  bookkeeping-only review findings](../../../repo/pjm/backlog/items/BL-260711-skip-re-review-for-bookkeeping.md)
- [`BL-260829-order-phase-bookkeeping-before` — Order phase bookkeeping before
  per-phase review dispatch](../../../repo/pjm/backlog/items/BL-260829-order-phase-bookkeeping-before.md)
- [`BL-260820-bind-each-gate-review` — Bind each gate review disposition to its
  exact received ledger event](../../../repo/pjm/backlog/items/BL-260820-bind-each-gate-review.md)
- [`BL-260820-emit-source-qualified` — Emit source-qualified provenance
  envelopes for review and gate receipts](../../../repo/pjm/backlog/items/BL-260820-emit-source-qualified.md)
- [`BL-260820-track-pr-closeout-evidence` — Track PR-closeout evidence
  freshness against the current head](../../../repo/pjm/backlog/items/BL-260820-track-pr-closeout-evidence.md)
- [`BL-260806-fail-closed-when-configured` — Fail closed when configured
  closeout snapshot is absent](../../../repo/pjm/backlog/items/BL-260806-fail-closed-when-configured.md)
- [`BL-260718-harden-full-surface-gate` — Harden full-surface gate reviews
  against budget and recursive dispatch](../../../repo/pjm/backlog/items/BL-260718-harden-full-surface-gate.md)
- [`BL-260711-add-activity-aware-gate` — Add activity-aware gate
  timeouts](../../../repo/pjm/backlog/items/BL-260711-add-activity-aware-gate.md)
- [`BL-260720-add-oat-project-complete-auto` — Add oat-project-complete-auto
  companion skill for autonomous closeouts](../../../repo/pjm/backlog/items/BL-260720-add-oat-project-complete-auto.md)

The bounded structured-output and headless no-yield items were delivered by
the completed combined project `gate-execution-contract-hardening`:
[`BL-260726-validate-structured-output` — Validate structured-output contract
in gate skill commands](../../../repo/pjm/backlog/archived/BL-260726-validate-structured-output.md)
and [`BL-260826-gate-targets-must-not-yield` — Gate targets must not yield on
background work in headless mode](../../../repo/pjm/backlog/archived/BL-260826-gate-targets-must-not-yield.md).
PR #190 was reconciled as compatibility input there; this project retains only
the broader review/gate integrity scope.

## Problem Statement

The current review lifecycle has several trustworthy pieces, but its events
can still be interpreted through ambient context or stale bookkeeping. A gate
can be associated with the wrong review row, a receipt can omit the exact
source head or producer, a configured closeout can complete without a durable
sequence snapshot, and a fixed or poorly classified gate failure can consume a
review cycle without improving confidence.

The most urgent efficiency/integrity rule is absolute: findings about ledger
bookkeeping or review-row status are repaired in the artifact, but they do not
trigger another review cycle by themselves. A gate that reports only a ledger
or bookkeeping defect should be fixed and then proceed according to the
existing review result; it must not burn a re-review attempt. This is the
highest-priority backlog classification because the opposite behavior creates
cycles that produce paperwork rather than quality.

The project must also preserve independent gate judgment. A configured gate
cannot inherit a lifecycle verdict merely because the ledger has a matching
row; it needs a source-qualified, receive-eligible event bound to its own
invocation and reviewed head.

## Evidence and Current Baseline

This is a verified starting map from the current checkout and previous PR
recon, not an exhaustive implementation inventory:

- `.oat/projects/shared/review-plan-workflow/` is an existing quick-mode
  project with substantial discovery describing ReviewPlan-first selective
  intake. Its discovery intentionally remains in progress and says fresh
  revalidation is required; this project depends on that QA baseline but does
  not duplicate it.
- `packages/cli/src/commands/gate/` contains the gate command, child-process
  execution, activity probes, route handling, and review-verdict translation.
  These are the primary runtime surfaces for no-yield classification,
  timeout/liveness, structured envelopes, and independent gate routing.
- `packages/cli/src/providers/identity/provenance.ts` and
  `dispatch-validation.ts` contain provider identity/provenance validation.
  They are relevant to source-qualified receipts and native-role versus
  fallback records.
- `.agents/agents/oat-reviewer.md` distinguishes artifact mode from structured
  output mode and states that delegated workers cannot own severity, verdict,
  or review artifacts. It is a contract source, not proof that every consumer
  validates the same envelope.
- `.agents/skills/oat-project-review-provide/` and
  `.agents/skills/oat-project-review-receive/` define project-review
  invocation/receipt routing, while the review-provide and receive skills own
  ad-hoc review behavior. Their event identities, artifact paths, source heads,
  and invocation types need a single cross-rail comparison.
- Existing remote-review code under `packages/cli/src/review-remote/` has
  tested marker parsing, line mapping, body/verdict construction, narrowing,
  and project/ad-hoc rails. It is a compatibility boundary for provenance and
  bookkeeping classification, not automatically part of every gate fix.
- Existing gate tests cover child process behavior, activity probes, route,
  verdict, and hardening integration. Existing skill/validation tests cover
  gateable skills, structured review output, review invocation metadata, and
  completion ordering. The remaining risk is cross-command round-trip
  agreement, especially after a gate is received and a ledger row is updated.

### PR #190 compatibility baseline

PR #190, [ReviewPlan Stage A compatibility release](https://github.com/voxmedia/open-agent-toolkit/pull/190),
is a direct-impact, unmerged/draft/conflicting PR from the current recon. Its
changed surfaces include ReviewPlan artifacts, gate commands, review skills,
validation and correlation indexes, structured JSON envelopes,
`accounting_invalid` handling, and gate/launch/validation correlation. Its
stated scope does not reimplement manual prior-verdict reuse or
bookkeeping-only review skipping, so the urgent bookkeeping rule remains
independently owned. Nevertheless, PR #190 overlaps the structured-output and
gate surfaces enough that its landed behavior must be dogfooded and compared
before new implementation is authorized.

The current local checkout makes the remaining boundaries concrete:

- There is no `packages/cli/src/review/` tree at the current head; the current
  review-provide flow still collects changed files directly. ReviewPlan is
  therefore not current-main behavior and must not be treated as already
  shipped merely because PR #190 is present in local refs.
- `packages/cli/src/commands/gate/route.ts:61-117` chooses inline,
  synchronous delegation, or refusal from provider markers and `canAwait`.
  `packages/cli/src/commands/gate/index.ts:3380-3415` currently routes a
  zero-exit child with no artifact into a targeting/correlation failure rather
  than a distinct “child exited without artifact” cause.
- `packages/cli/src/commands/gate/index.ts:962-990` accepts gate configuration
  without validating the global `--json` contract; the current test at
  `index.test.ts:850-869` deliberately accepts the missing flag without a
  warning.
- `packages/cli/src/commands/review/latest.ts:168-219` parses ledger events
  and `:250-268` matches scope/type/status/artifact fields. Control-plane review
  rows add reviewed head, invocation, and gate target, but the current row
  shape does not provide a unique lifecycle-event identity. This is why exact
  received-event binding remains open even though receive prose requires exact
  artifact binding.
- Gate invocation provenance is already strong within the gate rail:
  `packages/cli/src/commands/gate/index.ts:296-303` records run/target/runtime/
  model/effort/source, `:564-579` copies it into artifact frontmatter, and
  `:582-616` corroborates expected versus actual values. The missing piece is
  a source-qualified envelope shared by direct review, project review, gate,
  receive, and closeout.
- Closeout references in
  `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
  specify reviewed heads, effective-delta fingerprints, rolling freshness, and
  receive identity, but the current source search did not establish a single
  executable validator for those rules. Fresh discovery must distinguish
  skill-enforced contract from CLI-enforced behavior.

## Clarifying Questions

### Question 1: What is a blocking finding?

**Q:** Should bookkeeping/ledger-only findings be a distinct non-blocking
classification across direct reviews, project reviews, and gates?

**A:** Yes. Fix the bookkeeping in the artifact, but do not trigger a re-review
or consume an attempt when no substantive finding remains.

**Decision:** The semantic classification is the highest-priority invariant;
exact names and receipt fields remain open for design.

### Question 2: How independent are gates?

**Q:** May a gate use a lifecycle review verdict or row as its own result when
the content has not changed?

**A:** No. A configured independent gate must be bound to its own invocation,
target, artifact, source head, and received event. Ledger state is evidence of
bookkeeping, not a substitute for the gate’s review.

**Decision:** Preserve rail-specific judgment while sharing provenance and
validation primitives.

### Question 3: What does PR #190 own?

**Q:** Should the structured-output and correlation work be treated as landed
baseline, new work, or a conditional follow-up?

**A:** The completed combined gate-execution project reconciled PR #190 as
compatibility input rather than assuming its branch was part of main.

**Decision:** PR #190 remains a historical compatibility boundary; the
structured-output slice was delivered by `gate-execution-contract-hardening`
and requires no separate future disposition.

### Question 4: Is no-yield a standalone defect?

**Q:** Should the headless gate child’s background/waiter behavior remain a
quick-start project even though it changes gate surfaces used here?

**A:** It was independently testable and shipped as the runtime phase of the
combined `gate-execution-contract-hardening` project after PR #190
reconciliation.

**Decision:** Treat the delivered no-yield slice as part of the sole combined
owner, not as an independently tracked duplicate.

## Solution Space

### Approach 1: Canonical receipt/event contract with thin rail adapters _(Recommended)_

Define one versioned source-qualified event envelope and validation/eligibility
rules. Direct review, project review, gate execution, receive, closeout, and
dispatch each adapt local records to the shared contract. Bookkeeping-only
classification is a non-blocking disposition over the event, not a new review
verdict.

This is the right choice when multiple commands carry similar but non-identical
identities, artifact paths, source heads, and outcomes. It requires migration
and compatibility work, but reduces ambient inference while keeping review
rails independent.

### Approach 2: Patch each lifecycle rail independently

Add event binding, source heads, closeout checks, no-yield diagnostics, and
bookkeeping classification separately in gate, project review, remote review,
and completion commands. This is appropriate only if PR #190 or existing
schema constraints make a shared envelope unsafe immediately. It lowers first
slice coupling but makes semantic drift likely.

### Approach 3: Ledger-first state machine

Make the project review ledger the sole state machine and derive gate/closeout
eligibility from its event rows, adding gate identity only as metadata. This
could fit a deliberately ledger-centric lifecycle, but is provisionally
rejected because it risks treating bookkeeping or a lifecycle verdict as
independent gate evidence.

### Chosen Direction

**Approach:** Approach 1, subject to fresh revalidation and PR #190 comparison.

**Rationale:** A shared receipt/event contract can express independence,
freshness, structured eligibility, and bookkeeping-only non-blocking outcomes
without collapsing separate review rails into one verdict.

**User validated:** Directionally yes through the grouping and priority
discussion; formal discovery approval is intentionally not recorded.

## Options Considered

### Option A: Classify bookkeeping at finding level versus review-event level

Support finding-level evidence plus a derived event-level disposition when all
findings are bookkeeping-only. Reviewers need exact evidence, while gates need
a simple non-blocking decision. The derived event must never rewrite the
original review as “passed” without a clean review event.

### Option B: Freshness by exact source head versus effective-delta fingerprint

Exact source-head identity is the default. An immutable effective-delta
fingerprint may preserve valid bookkeeping descendants only when its ownership
and semantics are explicit, deterministic, and verified; broad freshness
exemptions are not acceptable.

### Option C: No-yield enforcement in prompt versus runtime

Use a two-layer defense provisionally: a clear headless contract plus runner
classification, without authorizing replacement after child acceptance.
Prompt-only enforcement is easy to bypass; runtime-only rejection can be
opaque. The completed combined project validated the smallest safe slice.

## Key Decisions

1. Bookkeeping-only findings are the highest-priority integrity rule: repair
   them, never spend a re-review cycle on them alone.
2. Configured gates retain independent judgment and cannot reuse lifecycle
   verdicts as a substitute.
3. Every gate disposition identifies its exact received event, invocation/run,
   target, artifact, and reviewed source head.
4. Receipts are source-qualified and machine-readable, with legacy compatibility
   explicit rather than inferred.
5. Closeout evidence is current for the exact head or a narrowly defined,
   verifiable effective delta.
6. Headless gate targets must not finish their turn while work is hidden behind
   a background task, monitor, or waiter; child exit without an artifact is
   distinct from an artifact correlation mismatch.
7. PR #190 is compatibility input, not current main; reconcile before
   overlapping implementation.
8. Treat the completed combined `gate-execution-contract-hardening` project as
   the sole owner of `BL-260726` and `BL-260826`; retain PR #190 only as
   compatibility input and do not recreate the superseded quick scaffolds.
9. This discovery is non-exhaustive and must be revalidated before design.

## Constraints

- Do not mark an original review `passed` merely because bookkeeping was fixed
  after a review that still had substantive findings.
- Do not trigger a new review solely because a ledger row, status, or link was
  incorrect.
- Do not accept a gate receipt without a valid structured envelope,
  receive-eligible handoff, exact source identity, and independent invocation
  binding.
- Do not treat timeout, interruption, `BLOCKED`, or accepted child failure as a
  pre-start role rejection or automatic fallback authorization.
- Preserve small, low-ceremony reviews and keep final judgment/write authority
  in the root caller.
- Shipped CLI/skill/docs changes require lockstep public package versions and
  complete release validation.

## Success Criteria

- A bookkeeping-only finding is repaired and recorded as non-blocking without
  triggering a re-review or consuming an attempt; substantive findings retain
  normal re-review behavior.
- Direct, project, gate, and closeout receipts have a source-qualified,
  versioned envelope with producer, invocation, target, artifact, source head,
  outcome, and compatibility fields.
- Gate disposition updates exactly the event it received and rejects
  contradictory producer/target/artifact/head claims.
- Closeout fails closed when required evidence is absent or stale and reports
  the exact missing/stale receipt.
- Headless gate children cannot hide incomplete work behind background/waiter
  execution, and diagnostics distinguish child exit without artifact from
  artifact-correlation mismatch.
- Full-surface gates expose budget, recursion, liveness, and recovery outcomes
  without silently increasing scope or creating duplicate runs.
- Configured closeout cannot complete without a durable ordered sequence
  snapshot; autonomous completion remains explicitly authorized and
  preconditioned.
- PR #190’s landed behavior is adopted or its residual gaps are narrowed into
  these items without duplicate ownership.
- Tests cover clean, substantive, bookkeeping-only, stale, mismatched,
  malformed, no-yield, timeout, independent-gate, and closeout scenarios.

## Out of Scope

- Reimplementing the entire ReviewPlan/selective-intake project; use the
  existing `review-plan-workflow` project as the QA/baseline dependency.
- Treating a larger timeout constant as the sole fix for decomposition or
  hidden background work.
- Reusing a prior lifecycle verdict as an independent gate result.
- Automatically replacing an accepted worker or route after timeout/failure.
- Provider-specific tool-pack scope/provider visibility work; that belongs to
  `tool-pack-scope-provider-truthfulness`.
- Reopening the delivered structured-output or no-yield slices, or recreating
  their superseded scaffolds; the completed combined project owns them.
- Finalizing design or starting implementation from this unvalidated dossier.

## Deferred Ideas

- Manual same-scope prior-verdict reuse after the bookkeeping rule is stable.
- Transactional partial review artifacts if a separate design proves necessary.
- Telemetry for review economics beyond evidence needed to validate ReviewPlan
  and gate budgets.
- A universal cross-provider role catalog; this project owns receipts, not
  provider materialization.

## Open Questions

- **PR #190 disposition:** Which exact files/behaviors land, and what remains
  after dogfood? Does it provide a stable envelope or only a Stage-A shape?
- **Envelope versioning:** What is the canonical event/receipt schema, version
  negotiation rule, and legacy consumer compatibility path?
- **Event identity:** Is one immutable event ID sufficient, or must gate run,
  launch attempt, validation run, invocation, and receive event all be linked?
- **Binding:** What exact fields must match before a gate may update a ledger
  row, and what diagnostic is emitted for each mismatch?
- **Bookkeeping taxonomy:** What qualifies as ledger-only versus artifact drift,
  and who owns classification for mixed findings?
- **Re-review policy:** After bookkeeping repair, how is the original outcome
  preserved while lifecycle progress continues?
- **Gate independence:** Which artifacts/heads are mandatory for each gate
  family, and which legacy Reviews rows remain compatible?
- **Freshness:** Where is effective-delta fingerprinting safe, and how is it
  authorized without a broad exemption?
- **No-yield cause:** How does the runner distinguish no artifact, wrong
  artifact, malformed envelope, and wrong run identity?
- **Background policy:** Which headless operations may stream or synchronously
  await, and how are provider-native asynchronous tools handled?
- **Timeout policy:** How do idle kill, hard cap, and recovered-after-timeout
  map to receipt status after existing liveness diagnostics?
- **ReviewPlan boundary:** Which selective intake/accounting controls belong in
  the existing project versus this integrity project?
- **Structured output:** Does config validation remain warning-only, and does it
  validate only `oat gate review` without touching provider flags?
- **Closeout snapshot:** What makes a normalized post-implement sequence
  complete, and which paths can legally omit it?
- **Autonomous completion:** What activation provenance distinguishes workflow
  invocation from unapproved self-invocation?
- **Rollout:** Should event validation warn first or fail closed immediately on
  malformed/contradictory receipts?
- **Fixtures:** Which existing fixtures prove provider separation and no
  accidental re-review without relying on elapsed time?

## Assumptions

- PR #190 will be reconciled before overlapping implementation, but is not
  treated as merged in the current checkout.
- Existing artifacts remain the source of truth for historical outcomes; new
  envelopes preserve rather than rewrite those outcomes.
- The user’s ledger-only direction is a standing product rule.
- The existing ReviewPlan project remains the QA baseline and may narrow this
  project.

## Risks

- **False non-blocking classification:** A substantive finding is hidden under
  bookkeeping language.
  - **Likelihood:** Medium
  - **Impact:** Critical
  - **Mitigation Ideas:** Require evidence, mixed-event rules, and root
    judgment; only pure bookkeeping events get the no-re-review disposition.
- **Receipt migration drift:** Rails adopt different required fields or
  compatibility behavior.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** One versioned schema, producer/consumer matrix, and
    round-trip fixtures before fail-closed validation.
- **PR overlap:** Early implementation duplicates PR #190 correlation/envelope
  work.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Keep discovery open, compare landed diffs, and narrow
    ownership before design approval.
- **No-yield overcorrection:** Legitimate provider behavior is rejected without
  an actionable diagnosis.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Separate cause diagnostics from fallback authority and
    test foreground, synchronous, and accepted-artifact routes.

## Dependencies and Related Work

- [`review-plan-workflow` — ReviewPlan-first reviewer workflow](../review-plan-workflow/)
  is the baseline and is not duplicated here.
- [PR #190 — ReviewPlan Stage A compatibility release](https://github.com/voxmedia/open-agent-toolkit/pull/190)
  is the direct compatibility boundary.
- `gate-execution-contract-hardening` is the combined bounded quick follow-up
  for configured structured output and headless no-yield execution. It owns
  only the configuration/runtime/integration seam and remains outside this
  project's broader integrity model.
- The scope/provider project owns provider role visibility, not review receipts;
  coordination is needed only at the dispatch-provenance seam.

## References

- [`BL-260711-skip-re-review-for-bookkeeping` — Skip re-review for
  bookkeeping-only review findings](../../../repo/pjm/backlog/items/BL-260711-skip-re-review-for-bookkeeping.md)
- [PR #190 — ReviewPlan Stage A compatibility release](https://github.com/voxmedia/open-agent-toolkit/pull/190)
- `packages/cli/src/commands/gate/`
- `packages/cli/src/providers/identity/`
- `packages/cli/src/review-remote/`
- `.agents/agents/oat-reviewer.md`
- `.agents/skills/oat-project-review-provide/`
- `.agents/skills/oat-project-review-receive/`
- `.oat/projects/shared/review-plan-workflow/`

## Next Steps

1. Revalidate this dossier after the existing ReviewPlan QA pass and PR #190
   merge/dogfood; record exact overlaps and residual ownership.
2. Confirm the event/receipt vocabulary and the non-blocking bookkeeping rule
   with the user before design.
3. Inventory every producer and consumer of review/gate/closeout receipts.
4. Complete discovery only after revalidation; then use `oat-project-design`
   for the formal specification and design.
