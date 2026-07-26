---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-25
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: false
oat_generated: false
---

# Implementation Plan: opus-5-model-guidance

> Execute with `oat-project-implement`.

**Goal:** Integrate the accepted Opus 5 post-release synthesis into the
canonical subagent-orchestration guidance and package it under the repository's
release contract. Cursor pin work was deferred through Phase 6 pending live
probe evidence, then admitted in Phase 7 once that evidence existed.

**Plan lineage:** The pre-synthesis plan is preserved at
`references/pre-synthesis-plan.md`. Its `p01-*` through `p03-*` tasks were
retired before implementation and are never reused. This reconciled plan begins
at `p04`.

**Scope expansion:** Phases 4 through 6 were planned and executed on the premise
that no Cursor Opus 5 selector had been verified, so they deliberately shipped no
pin. That premise held at the time and their deferral language is left intact as
the accurate historical record. Phase 7 was added after a successful G01 probe
run supplied the missing evidence; it is the only phase authorized to change pin
mappings, catalog entries, generated roles, or recommendation tiers.

**Architecture:** Durable cross-provider rules live in
`model-selection-principles.md`; dated, harness-specific examples live in the
three provider references; evidence, speed measurement, and refresh mechanics
live in `evidence-and-refresh.md`. The skill entrypoint links these layers.
Generated provider views and public package versions are updated only after the
canonical source is coherent.

**Commit convention:** `{type}({task-id}): {description}`.

## Phase 4: Integrate the Accepted Selection Policy

**Implementation status:** complete (5/5 tasks)

### Task p04-t01: Expand durable selection principles

**Files:**

- Modify: `.agents/skills/subagent-orchestration/references/model-selection-principles.md`

**Changes:**

- Separate task class, effort, consequence, reviewer role, and eligibility.
- Define reviewer selection by anticipated failure mode while keeping named
  reviewer instantiations provisional.
- Define the multi-measure speed contract: TTFT, active runtime, elapsed time,
  tokens, steps/tool calls, completion rate, and variance.
- Preserve the prohibition on cross-provider effort normalization.

**Verify:** Run the focused subagent-orchestration skill tests and format check.

### Task p04-t02: Refresh Claude routing

**Files:**

- Modify: `.agents/skills/subagent-orchestration/references/provider-claude.md`

**Changes:**

- Add Opus 5 medium/high/xhigh/max routing by work shape.
- Make consequence add independent review rather than automatically raising
  effort.
- Keep Sonnet as a conditional measured latency/throughput/access route.
- Keep Fable as an eligibility-gated specialist and label the exact reviewer
  instantiation provisional.
- Replace the Opus 4.8 cyber-primary rule with Opus 5 plus documented fallback
  handling where safeguards block a valid workflow.

**Verify:** Focused tests, terminology searches, and format check.

### Task p04-t03: Refresh Codex economics

**Files:**

- Modify: `.agents/skills/subagent-orchestration/references/provider-codex.md`

**Changes:**

- Preserve the existing task-class ladder.
- Add the >272K Sol long-context price step.
- Distinguish token price from total trajectory cost and wall-clock efficiency.
- Clarify that consequence requires independent review without automatically
  forcing max effort.

**Verify:** Focused tests and format check.

### Task p04-t04: Refresh Cursor guidance without speculative pins

**Files:**

- Modify: `.agents/skills/subagent-orchestration/references/provider-cursor.md`

**Changes:**

- Keep current live-catalog examples only.
- State that Opus 5 is a candidate pending live alias, thinking, and effort
  probes; do not edit the pin catalog or bundled recommendation.
- Carry the multi-measure latency rule into service-tier guidance.
- Keep exact model routes dated and provisional.

**Verify:** Confirm no Opus 5 pin/catalog source changes exist and format check.

### Task p04-t05: Expand evidence and refresh protocol

**Files:**

- Modify: `.agents/skills/subagent-orchestration/references/evidence-and-refresh.md`

**Changes:**

- Reconcile the current evidence summary with the accepted synthesis.
- Require comparable-rung analysis without cross-provider equivalence claims.
- Add the speed/wall-clock measurement contract and source locator rules.
- Add author/reviewer independence, claim-level provenance, live-catalog
  verification, and downstream parity gates.

**Verify:** Focused tests and format check.

## Phase 5: Package and Validate

### Task p05-t01: Bump the canonical skill and public packages

**Files:**

- Modify: `.agents/skills/subagent-orchestration/SKILL.md`
- Modify: public package manifests/lockfile required by the repository release
  policy.

**Changes:**

- Bump the skill once for the final diff.
- Bump all public packages in lockstep according to repository instructions.

**Verify:** Package version parity check and skill frontmatter validation.

### Task p05-t02: Refresh generated views

**Files:**

- Generated provider views and bundle manifests produced by repository scripts.

**Changes:**

- Run the canonical sync/bundle commands; do not hand-edit generated outputs.
- Confirm generated views contain the same canonical reference content.

**Verify:** Generated-tree parity and clean regeneration.

### Task p05-t03: Run repository validation

**Verify:**

- Focused skill tests.
- Formatting, lint, type-check, and relevant test suite.
- `pnpm release:validate`.

Record any environmental limitation explicitly; do not call the integration
complete while a required gate is unverified.

## Phase 6: Record Reverification and Deferral

### Task p06-t01: Write the reverification record

**Files:**

- Modify: `.oat/projects/shared/opus-5-model-guidance/references/reverification.md`

**Changes:**

- Record exact evidence packet, providers, harness contexts, controls, accepted
  incumbent changes, and source dates.
- State that Cursor Opus 5 aliases and thinking/effort behavior remain
  unverified and no pin/catalog changes were shipped.

**Verify:** Required schema keys, source locators, and format check.

### Task p06-t02: Audit policy coherence

**Scope:**

- All canonical subagent-orchestration references and generated views.

**Verify:**

- No stale claim makes xhigh the automatic Opus 5 default.
- No stale claim makes Opus 4.8 the universal cyber primary.
- No cross-provider effort equivalence.
- Mechanical recon remains per harness.
- Reviewer principle and provisional Fable instantiation are separated.
- No unverified Opus 5 Cursor pin or recommendation change exists.

### Task p06-t03: Final review and bookkeeping

Run the configured final review, resolve findings, update `implementation.md`,
and leave the project ready for PR handoff. External vault and downstream
installation updates are deliberately outside this repository plan.

## Phase 7: Admit Probe-Verified Cursor Pins

**Implementation status:** complete (3/3 tasks)

Phases 4 through 6 deferred all Cursor pin work because no selector had been
verified. This phase was added after that blocker was cleared by evidence, and
is the only phase permitted to touch pin mappings, catalog entries, generated
roles, or recommendation tiers.

### Task p07-t01: Run the G01 probe with controls

Capture Cursor's own resolved model for each candidate selector, rather than an
agent self-report or a UI label.

- Install temporary project hooks recording `subagentStart.subagent_model`.
- Launch subjects for five `claude-opus-5` rungs and `claude-opus-4-8[effort=xhigh]`.
- Include controls: a positive control reproducing a previously verified Sonnet
  mapping, and negative controls for an unknown family and an unknown effort.
- Preserve raw payloads and remove the temporary hooks and probe agents after.

**Verify:** Every subject resolves to its intended thinking variant, and the
negative controls demonstrate the channel reports resolution rather than echoing
the request. Evidence at `references/g01-probe-results.md` and
`references/g01-probe-hooks.jsonl`.

### Task p07-t02: Add the verified pins

Promote only probe-passing selectors.

- Add six `approvedMapping` entries whose `probeName` names the probe that
  approved them.
- Rebalance Cursor recommendation tiers and bump the recommendation version.
- Drop `claude-sonnet-5-high` from `economy` where it is strictly dominated,
  keeping the mapping catalogued.
- Keep `claude-opus-4-8-thinking-xhigh` catalogued but out of the bundled
  recommendation.
- Regenerate role files and bundled assets; update affected count assertions.

**Verify:** Full test suite, `release:validate`, type-check, lint, format, and
`oat sync --scope project` reporting no changes required.

### Task p07-t03: Record findings and reconcile artifacts

- Update `provider-cursor.md` from deferral to verified routes, including the
  default-fallback failure mode.
- File a backlog item for silent effort fallback.
- Correct `reverification.md` where it asserts pins were not shipped.

**Verify:** No project artifact claims Cursor pin work is deferred.

## Reviews

| Scope         | Type     | Status   | Date       | Artifact                                            |
| ------------- | -------- | -------- | ---------- | --------------------------------------------------- |
| p04           | code     | passed   | 2026-07-25 | takeover review against the accepted packet         |
| p05           | code     | pending  | -          | -                                                   |
| p06           | code     | pending  | -          | -                                                   |
| p07           | code     | pending  | -          | operator-run manual review                          |
| final         | code     | received | 2026-07-25 | reviews/final-review-2026-07-25T211041Z.md          |
| final         | code     | received | 2026-07-25 | reviews/final-review-2026-07-25T212319Z.md          |
| final         | code     | received | 2026-07-25 | reviews/final-review-2026-07-25T212332Z.md          |
| final         | code     | received | 2026-07-25 | reviews/final-review-2026-07-25T214740Z.md          |
| plan          | artifact | approved | 2026-07-25 | human approval of `Accepted Update Plan.md` (vault) |
| pre-synthesis | artifact | blocked  | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T004651Z.md  |
| pre-synthesis | artifact | blocked  | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T005730Z.md  |
| final         | code     | received | 2026-07-26 | reviews/final-review-2026-07-26T040908Z.md          |
| final         | code     | received | 2026-07-26 | reviews/final-review-2026-07-26T165653Z.md          |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`.

### Review notes

The two `pre-synthesis` rows reviewed `references/pre-synthesis-plan.md`, not
this plan. Both returned blocking findings and exited nonzero; their findings
were remediated in that retired plan before it was superseded. They are
recorded as provenance and must not be read as approvals of the current
`p04`-`p06` scope.

The four `final` rows all predate Phase 7. The last of them passed with zero
findings, but it reviewed the project as guidance and packaging only and
explicitly recorded that Cursor pin work remained deferred. None of them covers
the pins added in `p07`, which are reviewed separately by the operator.

The `p04` takeover review checked the guidance changes against the accepted
vault packet during session takeover. All nine content gates and the deferral
gate passed. Four evidence-specificity gaps were found and corrected; the
underlying conclusions were already correct. The 113 focused skill tests were
independently rerun and passed.

The three `final` reviews ran cross-family on `gpt-5.6-sol-max`. The first
raised two Important findings, both fixed in `bdf3c6c5`. The second raised two
further Important findings against those fixes, both fixed in the closeout
commit.

## References

- Discovery: `discovery.md`
- Superseded discovery: `references/pre-synthesis-discovery.md`
- Superseded plan: `references/pre-synthesis-plan.md`
- Accepted synthesis: shared vault `Opus 5 Post Release Analysis/Cross-Model Review/Cross-Model Synthesis.md`
- Human-approved integration plan: shared vault `Opus 5 Post Release Analysis/Cross-Model Review/Accepted Update Plan.md`
