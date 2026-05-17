---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-17
oat_current_task_id: null
oat_generated: false
---

# Implementation: subagent-model-selection

**Started:** 2026-05-04
**Last Updated:** 2026-05-17

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the next plan task to do.
> - Reviews are tracked in `plan.md` under `## Reviews`.
> - Dispatch decisions should be recorded in phase notes when useful.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 3     | 3/3       |
| Phase 2 | complete | 2     | 2/2       |
| Phase 3 | complete | 2     | 2/2       |
| Phase 4 | complete | 1     | 1/1       |
| p-rev1  | complete | 1     | 1/1       |
| p-rev2  | complete | 1     | 1/1       |
| p-rev3  | complete | 1     | 1/1       |
| p-rev4  | complete | 1     | 1/1       |
| p-rev5  | complete | 1     | 1/1       |
| p-rev6  | complete | 1     | 1/1       |
| p-rev7  | complete | 5     | 5/5       |
| p-rev8  | complete | 2     | 2/2       |

**Total:** 21/21 tasks completed

---

## Phase 1: Override-only plan syntax and authoring guidance

**Status:** complete
**Started:** 2026-05-13
**Completed:** 2026-05-13

### Task p01-t01: Update plan template with override-only Dispatch Profile guidance

**Status:** completed
**Commit:** 28061a13

### Task p01-t02: Update plan-writing skill for runtime-selection defaults

**Status:** completed
**Commit:** 12769786

### Task p01-t03: Update import-plan handling for explicit dispatch hints

**Status:** completed
**Commit:** ffd5edea

---

## Phase 2: Runtime dispatch selection and escalation

**Status:** complete
**Started:** 2026-05-13
**Completed:** 2026-05-13

### Task p02-t01: Add runtime dispatch-selection policy to `oat-project-implement`

**Status:** completed
**Commit:** 518cc4f7

### Task p02-t02: Add confidence-based escalation and dispatch history notes

**Status:** completed
**Commit:** 93f7fb58

---

## Phase 3: Agent dispatch guidance and plan-review advisory

**Status:** complete
**Started:** 2026-05-13
**Completed:** 2026-05-13

### Task p03-t01: Update phase implementer and reviewer dispatch guidance

**Status:** completed
**Commit:** 13cc8802

### Task p03-t02: Add override-row advisory to `oat-project-review-provide`

**Status:** completed
**Commit:** 378ea010

---

## Phase 4: Final review fixes

**Status:** complete
**Started:** 2026-05-13
**Completed:** 2026-05-13

### Task p04-t01: (review) Add dispatch fields to scope templates

**Status:** completed
**Commit:** 05b5ca08

---

## Phase p-rev1: Revision 1

**Status:** complete
**Started:** 2026-05-13
**Completed:** 2026-05-13

### Task prev1-t01: (revision) Clarify implementation reasoning effort versus review inheritance

**Status:** completed
**Commit:** 8ce52f04

---

## Phase p-rev2: Revision 2

**Status:** complete
**Started:** 2026-05-13
**Completed:** 2026-05-13

### Task prev2-t01: (revision) Split dispatch logging into model and effort axes

**Status:** completed
**Commit:** aa06e926

---

## Phase p-rev3: Revision 3

**Status:** complete
**Started:** 2026-05-13
**Completed:** 2026-05-14

### Task prev3-t01: (revision) Wire selected model axis to host dispatch calls and document design drift

**Status:** completed
**Commit:** 6e49cca0

---

## Phase p-rev4: Revision 4

**Status:** complete
**Started:** 2026-05-14
**Completed:** 2026-05-14

### Task prev4-t01: (revision) Add Codex spawn-agent pre-dispatch parameter assertion

**Status:** completed
**Commit:** 92bf3490

---

## Phase p-rev5: Revision 5

**Status:** complete
**Started:** 2026-05-16
**Completed:** 2026-05-16

### Task prev5-t01: (revision) Make Codex selected-effort dispatch payload-first

**Status:** completed
**Commit:** 8e1c4715

---

## Phase p-rev6: Revision 6

**Status:** complete
**Started:** 2026-05-16
**Completed:** 2026-05-16

### Task prev6-t01: (revision) Use Codex effort-specific implementer variants

**Status:** completed
**Commit:** f8d52b49

---

## Phase p-rev7: Revision 7

**Status:** complete
**Started:** 2026-05-17
**Completed:** 2026-05-17

### Task prev7-t01: (revision) Use structured dispatch log blocks

**Status:** completed
**Commit:** 36098f2e

### Task prev7-t02: (review) Fix escalation example + state per-provider escalation termini

**Status:** completed
**Commit:** 04d9e0c6

### Task prev7-t03: (review) Update stale one-line dispatch references

**Status:** completed
**Commit:** ac1bb5fd

### Task prev7-t04: (review) Make review effort axis host-conditional

**Status:** completed
**Commit:** 170ae71e

### Task prev7-t05: (review) Clarify implementer role dispatch wording

**Status:** completed
**Commit:** 80d2ebb3

---

## Phase p-rev8: Revision 8

**Status:** complete
**Started:** 2026-05-17
**Completed:** 2026-05-17

### Task prev8-t01: (revision) Teach oat status about generated Codex role variants

**Status:** completed
**Commit:** d907f42f

### Task prev8-t02: (revision) Apply the managed-roles stray fix to the oat init call site

**Status:** completed
**Commit:** df239e65

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with run header, phase outcomes, dispatch notes, outstanding items, and verification._

<!-- orchestration-runs-start -->

### Run: 2026-05-13T04:13:19Z

- Tier: 1 — Subagents (`oat-phase-implementer` + `oat-reviewer`)
- Dispatch: p01 uses `host-auto` in Codex multi-agent; rationale: prompt/template edits are mechanical and file-local, so the lowest confident host-selected effort is appropriate.
- HiLL checkpoints: final phase only (`p03`) from `workflow.hillCheckpointDefault`.
- Auto-review at HiLL checkpoints: enabled from `workflow.autoReviewAtHillCheckpoints`.
- Starting from: `p01-t01`.

#### Phase p01 result

- Implementer: DONE_WITH_CONCERNS; scoped tasks complete in `28061a13`, `12769786`, and `ffd5edea`.
- Review: initial p01 review found 0 Critical, 1 Important, 1 Minor in `reviews/archived/p01-review-2026-05-13.md`.
- Fix loop: `f624a367` resolved the lockstep public package version bump and import summary reporting gaps.
- Re-review: passed with 0 Critical, 0 Important, 0 Minor in `reviews/archived/p01-review-2026-05-13-v2.md`.
- Verification: p01 grep checks passed; `pnpm release:validate` passed for all five public packages at `0.0.61`.
- Next: `p02-t01`.

#### Phase p02 result

- Implementer: DONE with high confidence; scoped tasks complete in `518cc4f7` and `93f7fb58`.
- Review: passed with 0 Critical, 0 Important, 0 Minor in `reviews/archived/p02-review-2026-05-13.md`.
- Verification: p02 grep checks passed for `Runtime dispatch selection`, `host-auto`, `low confidence`, and `Dispatch:`.
- Next: `p03-t01`.

#### Phase p03 result

- Implementer: DONE with high confidence; scoped tasks complete in `13cc8802` and `378ea010`.
- Review: initial p03 review found 0 Critical, 1 Important, 0 Minor in `reviews/archived/p03-review-2026-05-13.md`.
- Fix loop: `d3d20bb7` synced managed Codex role exports for `oat-phase-implementer` and `oat-reviewer`.
- Re-review: passed with 0 Critical, 0 Important, 0 Minor in `reviews/archived/p03-review-2026-05-13-v2.md`.
- Verification: p03 grep checks passed; `pnpm run cli -- sync --scope project --dry-run` reports the managed Codex role files in sync; `pnpm release:validate` passed.
- Auto final review: passed with 0 Critical, 0 Important, 1 Minor in `reviews/archived/final-review-2026-05-13.md`; the Minor bookkeeping drift was addressed during final closeout.
- Manual final review: 0 Critical, 0 Important, 0 Medium, 1 Minor in `reviews/archived/final-review-2026-05-13-v2.md`.
- Receive-review disposition: converted `m1` to `p04-t01`.
- Phase p04: completed in `05b5ca08`; phase review passed with 0 Critical, 0 Important, 0 Minor in `reviews/archived/p04-review-2026-05-13.md`.
- Final re-review: initial v3 found a Minor stale state count, fixed in `c1c27bc0`; v4 passed with 0 Critical, 0 Important, 0 Minor in `reviews/archived/final-review-2026-05-13-v4.md`.
- Next: final PR/readiness path.

### Run: 2026-05-13T23:19:11Z

- Tier: 2 — Inline revision task after inline dogfood feedback.
- Dispatch: prev1-t01 used parent session execution; implementation guidance now distinguishes phase implementation effort selection from review inheritance.

#### Phase p-rev1 result

- Implementer: inline revision completed in `8ce52f04`.
- Scope: clarified `oat-project-implement`, `oat-reviewer`, generated Codex reviewer export, docs, project plan, and project summary.
- Verification: revision grep checks passed; old strongest-review wording absent; `pnpm build:docs` passed; `pnpm run cli -- project validate-plan --project-path .oat/projects/shared/subagent-model-selection` passed; `pnpm run cli -- sync --scope project --dry-run` reported no changes; `pnpm release:validate` passed for public packages at `0.0.70`; `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main` passed; `git diff --check` passed.
- Review: no separate reviewer dispatch for this inline clarification; validated by focused grep checks and build/sync/release guardrails.
- Next: update PR #79.

### Run: 2026-05-13T23:40:09Z

- Tier: 2 — Inline revision task after inline Claude Code dogfood feedback.
- Dispatch: prev2-t01 used parent session execution; guidance now logs model and effort as separate axes.

#### Phase p-rev2 result

- Implementer: inline revision completed in `aa06e926`.
- Scope: split runtime dispatch logging into `model_axis` and `effort_axis` across `oat-project-implement`, phase implementer, reviewer, generated Codex role exports, docs, and project summary.
- Verification: task grep checks passed; old single-axis review strings absent; `pnpm build:docs` passed; `pnpm run cli -- project validate-plan --project-path .oat/projects/shared/subagent-model-selection` passed; `pnpm run cli -- sync --scope project --dry-run` reported no changes; `pnpm release:validate` passed for public packages at `0.0.70`; `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main` passed; `git diff --check` passed.
- Review: no separate reviewer dispatch for this inline clarification; validated by focused grep checks and build/sync/release guardrails.
- Next: update PR #79.

### Run: 2026-05-14T00:36:50Z

- Tier: 2 — Inline revision task after follow-up review feedback.
- Dispatch: prev3-t01 used parent session execution; guidance now requires selected axis logs to match actual host dispatch parameters.

#### Phase p-rev3 result

- Implementer: inline revision completed in `6e49cca0`.
- Scope: tied `model_axis=selected:<value>` to passing Claude Code Task `model`, reframed phase implementer axis fields as descriptive context, added a Revision 2 design audit-trail note, bumped touched canonical skill/agent versions, and synced the generated Codex phase implementer role.
- Verification: task grep checks passed; `pnpm run cli -- sync --scope project --dry-run` reported no changes; `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main` passed; `pnpm release:validate` passed for public packages at `0.0.70`; `pnpm build:docs` passed; `git diff --check` passed.
- Review: no separate reviewer dispatch for this inline clarification; validated by focused grep checks and build/sync/release guardrails.
- Next: update PR #79.

### Run: 2026-05-14T01:42:42Z

- Tier: 2 — Inline revision task after live Codex dogfood feedback.
- Dispatch: prev4-t01 used parent session execution; guidance now covers Codex implementer and fix dispatch selected-effort assertions.

#### Phase p-rev4 result

- Implementer: inline revision completed in `92bf3490`.
- Scope: added a Tier 1 Codex pre-dispatch assertion requiring `effort_axis=selected:<value>` to be passed as top-level `reasoning_effort: "<value>"`, treats mismatched spawned effort as an orchestration deviation, and applies the same assertion to fix-loop dispatches.
- Verification: task grep checks passed; `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main` passed; `pnpm release:validate` passed for public packages at `0.0.70`; `pnpm build:docs` passed; `git diff --check` passed.
- Review: no separate reviewer dispatch for this inline clarification; validated by focused grep checks and build/release guardrails.
- Next: update PR #79.

### Run: 2026-05-16T00:00:00Z

- Tier: 2 — Inline revision task after repeated live Codex dogfood feedback.
- Dispatch: prev5-t01 used parent session execution; guidance now requires Codex selected-effort dispatch to be payload-first.

#### Phase p-rev5 result

- Implementer: inline revision completed in `8e1c4715`.
- Scope: changed `oat-project-implement` so Codex implementer/fix dispatch must construct the `spawn_agent` argument map before logging dispatch, include top-level `reasoning_effort` for selected effort, derive the log from that payload, treat Phase Scope-only selected effort as invalid, and perform a post-spawn status check before waiting on the agent.
- Verification: focused grep checks passed; `git diff --check` passed; `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main` passed; `pnpm release:validate` passed for public packages at `0.0.70`; `pnpm build:docs` passed after rerun.
- Review: no separate reviewer dispatch for this inline clarification; validation will use focused grep checks plus release/docs guardrails.
- Next: update PR #79.

### Run: 2026-05-16T00:00:00Z

- Tier: 2 — Inline revision task after Codex selected-effort dogfood feedback.
- Dispatch: prev6-t01 used parent session execution; guidance now maps Codex selected effort to effort-specific implementer role names.

#### Phase p-rev6 result

- Implementer: inline revision completed in `f8d52b49`.
- Scope: add managed `oat-phase-implementer-low`, `oat-phase-implementer-medium`, and `oat-phase-implementer-high` Codex role variants through the Codex sync extension, update docs, and update the skill so selected `low|medium|high` effort dispatch uses those role names instead of top-level per-call `reasoning_effort`.
- Verification: focused grep checks passed; `git diff --check` passed; `pnpm --filter @open-agent-toolkit/cli test -- src/providers/codex/codec/sync-extension.test.ts` passed (full CLI suite: 163 files, 1469 tests); `pnpm run cli -- sync --scope project --dry-run` passed with variants managed and in sync; `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main` passed; `pnpm build:docs` passed; `pnpm release:validate` passed after rerun outside concurrent docs build.
- Review: no separate reviewer dispatch for this inline clarification; validated by tests plus sync/release/docs guardrails.
- Next: update PR #79.

### Run: 2026-05-17T21:10:15Z

- Tier: 1 — Subagents (`oat-phase-implementer`).
- Dispatch: p-rev7 review-fix tasks dispatched to `oat-phase-implementer` with `model_axis=selected:sonnet, effort_axis=not-applicable` (Claude Code); rationale: moderate doc-contract edits applying already-decided range-review fixes.

#### Phase p-rev7 result

- Implementer: DONE with high confidence; review-fix tasks `prev7-t03`, `prev7-t04`, `prev7-t05` complete in `ac1bb5fd`, `170ae71e`, `80d2ebb3`.
- Scope: replaced stale one-line dispatch-log references with structured `OAT Dispatch:` block references (t03); made review-dispatch effort axis host-conditional — `not-applicable` on Claude Code, `inherited` on Codex — across the skill, `oat-reviewer` agent, generated Codex view, docs, and summary (t04); reworded the loop dispatch step to name the asserted implementer role (t05). `oat-project-implement` skill bumped to `2.0.15`.
- Verification: all task grep checks passed; `pnpm run cli -- sync --scope project --dry-run` reports managed views in sync; `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main` passed; `pnpm build:docs` passed (t04).
- Review: range-review fixes are closed out by the pending `prev1-prev7` re-review rather than a separate per-phase reviewer dispatch, consistent with prior revision phases.
- Next: re-review the `prev1-prev7` fix commits, then update PR #79.

### Run: 2026-05-17T22:00:49Z

- Tier: 1 — Subagents (`oat-phase-implementer` + `oat-reviewer`).
- Dispatch: p-rev8 tasks dispatched to `oat-phase-implementer` with `model_axis=selected:sonnet, effort_axis=not-applicable` (Claude Code); reviews dispatched to `oat-reviewer` with `model_axis=inherited, effort_axis=not-applicable`.

#### Phase p-rev8 result

- Implementer: DONE with high confidence; `prev8-t01` complete in `d907f42f`, `prev8-t02` complete in `df239e65`.
- Scope: taught `oat status` (`prev8-t01`) and `oat init` (`prev8-t02`) to recognize generated Codex effort-variant role files (`oat-phase-implementer-{low,medium,high}.toml`) as managed rather than stray, by passing the Codex extension plan's `managedRoles` to `detectCodexRoleStrays`. Added unit tests for both call sites.
- Review: `prev8-t01` reviewed — passed (0 Critical/Important/Medium, 1 Minor: the `oat init` parity gap, converted to `prev8-t02`). `prev8-t02` reviewed — passed (0 Critical/Important/Medium, 1 Minor: non-blocking test-harness duplication).
- Verification: `codex-strays` and `init` test suites pass; type-check and lint clean; `oat status --scope project` reports no strays; `oat sync --scope project --dry-run` clean; `pnpm release:validate` passed (no version bump required).
- Next: re-review the `prev1-prev7` fix commits, then update PR #79.

<!-- orchestration-runs-end -->

---

## Implementation Log

Implementation tasks completed on 2026-05-13. Final review receive added one Minor review-fix task, now completed with final re-review passed. Revision 1 clarified the implementation reasoning-effort versus review inheritance guidance after dogfood feedback. Revision 2 split dispatch logging into model and effort axes after Claude Code dogfood feedback. Revision 3 wired selected axis values to host dispatch parameters and documented the design audit trail. Revision 4 added Codex selected-effort pre-dispatch assertions for implementer and fix dispatches. Revision 5 made Codex selected-effort dispatch payload-first after repeated dogfood runs still logged selected low/medium effort while spawning high-effort workers. Revision 6 maps Codex selected low/medium/high effort to configured implementer role variants instead of relying on per-call effort overrides.

### Revision Received: Inline Feedback

**Date:** 2026-05-13
**Source:** inline dogfood feedback

**Changes requested:**

- Clarify that implementation subagents should choose and log the lowest sufficient reasoning effort when the host exposes that control.
- Clarify that review subagents should inherit the parent session's model/effort controls and should not receive separate reasoning-effort overrides unless explicitly requested.
- Reserve `host-auto` for hosts that truly do not expose model/effort controls.

**New tasks added:** prev1-t01

**Resolved in:** `8ce52f04`

**Next:** Update PR #79.

### Revision Received: Inline Claude Code Feedback

**Date:** 2026-05-13
**Source:** inline Claude Code dogfood feedback

**Changes requested:**

- Split dispatch logging into independent model and effort axes.
- Treat Claude Code model selection as a real model axis when available, while effort remains `not-applicable`.
- Reserve `host-auto` for axes the host owns but the orchestrator cannot read or pin.
- Keep review dispatch inheriting both axes unless the user explicitly requests an override.

**New tasks added:** prev2-t01

**Resolved in:** `aa06e926`

**Next:** Update PR #79.

### Revision Received: Follow-up Review Feedback

**Date:** 2026-05-13
**Source:** inline follow-up review feedback

**Changes requested:**

- Explicitly tie `model_axis=selected:<value>` to passing the corresponding host dispatch parameter.
- Add a design audit-trail note explaining that the original single-axis design sections are superseded by the two-axis contract.
- Reword phase implementer dispatch-axis text as descriptive context rather than an action the dispatched implementer can take.

**New tasks added:** prev3-t01

**Resolved in:** `6e49cca0`

**Next:** Update PR #79.

### Revision Received: Live Codex Dogfood Feedback

**Date:** 2026-05-14
**Source:** live Codex dogfood feedback

**Changes requested:**

- Fix drift where the log says `effort_axis=selected:medium` but the spawned Codex agent reports high effort.
- Add a Codex pre-dispatch assertion requiring selected effort to be passed as the top-level `reasoning_effort` argument to `spawn_agent`.
- Treat mismatched spawned effort as an orchestration deviation to stop, record, and redispatch before continuing.

**New tasks added:** prev4-t01

**Resolved in:** `92bf3490`

**Next:** Update PR #79.

### Revision Received: Repeated Live Codex Dogfood Feedback

**Date:** 2026-05-16
**Source:** repeated live Codex dogfood feedback

**Changes requested:**

- Fix repeated drift where the log says `effort_axis=selected:low` or `effort_axis=selected:medium` but the spawned Codex agent reports high effort.
- Make the Codex selected-effort path payload-first so the actual `spawn_agent` arguments are constructed before logging.
- Treat selected effort that exists only in the Phase Scope packet as invalid.
- Promote mismatch handling into a post-spawn verification gate before waiting on the agent.

**New tasks added:** prev5-t01

**Resolved in:** `8e1c4715`

**Next:** Update PR #79.

### Revision Received: Codex Effort Variant Feedback

**Date:** 2026-05-16
**Source:** inline conversation

**Changes requested:**

- Use `low`, `medium`, and `high` Codex implementer variants for selected effort.
- Keep the base Codex phase implementer as inherited effort.
- Treat `xhigh` as inherited-only, used when the parent/orchestrator session is already xhigh rather than as a normal selected variant.

**New tasks added:** prev6-t01

**Resolved in:** `f8d52b49`

**Next:** Update PR #79.

### Revision Received: Structured Dispatch Log Feedback

**Date:** 2026-05-17
**Source:** inline conversation

**Changes requested:**

- Replace compact one-line dispatch examples with a consistent structured block.
- Keep `Model axis` and `Effort axis` as the cross-host field names.
- Include `Host`, `Dispatch target`, and `Rationale` so Claude Code and Codex dispatch behavior are easier to compare.
- Clarify that Codex `xhigh` remains inherited-only rather than a selectable implementer variant.

**New tasks added:** prev7-t01

**Resolved in:** `36098f2e`

**Next:** Update PR #79.

### Review Received: prev1-prev7

**Date:** 2026-05-17
**Review artifact:** reviews/archived/range-review-2026-05-17.md

**Findings:**

- Critical: 0
- Important: 1
- Medium: 2
- Minor: 2

**New tasks added:** prev7-t02, prev7-t03, prev7-t04, prev7-t05

**Finding disposition map:**

- `I1` -> converted: fix the invalid `effort_axis=selected:xhigh` escalation example.
- `M1` -> converted: update stale one-line `Dispatching ...` references to the structured `OAT Dispatch` block.
- `M2` -> converted: make review-dispatch effort axis host-conditional (`inherited` where effort exists, `not-applicable` where it does not).
- `m1` -> converted: reword generic base implementer dispatch wording to refer to the selected/asserted implementer role.
- `m2` -> deferred/no-action: earlier revision commits did not bump versions in the same commit, but cumulative PR-scoped skill version bumps are monotonic and pass the guardrail; no code or doc fix is useful for this range.

**Next:** Execute fix tasks via the `oat-project-implement` skill.

After the fix tasks are complete:

- Update the `prev1-prev7` review row status to `fixes_completed`.
- Re-run `oat-project-review-provide code prev1-prev7` then `oat-project-review-receive` to reach `passed`.

### Review Received: final

**Date:** 2026-05-13
**Review artifact:** reviews/archived/final-review-2026-05-13-v2.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 1

**New tasks added:** p04-t01

**Finding disposition map:**

- `m1` -> converted: add `dispatch_control` and `dispatch_rationale` fields to the `oat-project-implement` Phase Scope and Review Scope templates.

**Next:** Final PR/readiness path.

## Deviations from Plan

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

| Phase         | Tests Run                                                                                                                      | Passed | Failed | Coverage                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | ------------------------------------------------------ |
| p01           | Plan grep checks; `pnpm release:validate` after fix                                                                            | yes    | no     | Prompt/template behavior and release guardrail         |
| p02           | Plan grep checks                                                                                                               | yes    | no     | Runtime dispatch policy markers                        |
| p03           | Plan grep checks; project sync dry-run; `pnpm release:validate`                                                                | yes    | no     | Agent/review guidance and generated Codex role exports |
| final         | `pnpm test`; `pnpm lint`; `pnpm type-check`; `pnpm build`; sync dry-run; `pnpm release:validate`                               | yes    | no     | Full branch verification                               |
| final-receive | Final review finding disposition                                                                                               | yes    | no     | Added `p04-t01` for the accepted Minor finding         |
| p04           | `grep -q "dispatch_control"`; `grep -q "dispatch_rationale"`; `git diff --check`                                               | yes    | no     | Final review fix scope template consistency            |
| final-v4      | `git diff --check`; `validate-plan`; state count grep                                                                          | yes    | no     | Final re-review bookkeeping correction                 |
| p-rev1        | Revision grep checks; docs build; validate-plan; sync dry-run; release validation; skill version guardrail; `git diff --check` | yes    | no     | Reasoning-effort/review-inheritance guidance           |
| p-rev2        | Two-axis grep checks; docs build; validate-plan; sync dry-run; release validation; skill version guardrail; `git diff --check` | yes    | no     | Model/effort axis dispatch guidance                    |
| p-rev3        | Selected-axis grep checks; sync dry-run; skill version guardrail; release validation; docs build; `git diff --check`           | yes    | no     | Selected axis dispatch-call wiring and design note     |
| p-rev4        | Codex selected-effort grep checks; skill version guardrail; release validation; docs build; `git diff --check`                 | yes    | no     | Codex selected effort pre-dispatch assertion           |
| p-rev5        | Payload-first grep checks; skill version guardrail; release validation; docs build after rerun; `git diff --check`             | yes    | no     | Codex payload-first selected effort dispatch           |
| p-rev6        | Grep checks; full CLI test run; sync dry-run; skill version guardrail; release validation; docs build; `git diff --check`      | yes    | no     | Codex effort-specific implementer variants             |
| p-rev7        | Grep checks; sync dry-run; skill version guardrail; docs build; release validation; `git diff --check`                         | yes    | no     | Structured dispatch log blocks                         |

## Final Summary (for PR/docs)

**What shipped:**

- Override-only Dispatch Profile guidance for plan templates, plan writing, and imported plans.
- Runtime dispatch-selection guidance for `oat-project-implement`, including lowest-confident model/effort axis selection, `host-auto`, dispatch notes, and confidence-based escalation.
- Dispatch fields in `oat-project-implement` phase/review scope templates so downstream agents receive resolved model/effort axis context when the orchestrator has it.
- Revision clarifications: implementation and fix dispatch may choose explicit reasoning effort or model when supported, selected axes must be passed to the host dispatch API, Codex selected effort maps to configured low/medium/high implementer role variants, mismatched spawned effort is a post-spawn orchestration deviation, and review dispatch inherits parent controls by default.
- Agent and review guidance for dispatch confidence reporting, review inheritance, two-axis dispatch state, and Dispatch Profile override review advisories.

**Behavioral changes (user-facing):**

- Planners omit Dispatch Profile rows by default; explicit rows are treated as user constraints/preferences.
- Implement orchestration now documents runtime provider-control selection and escalation instead of precomputing a cap during planning.
- Codex implementation and fix dispatch should normally use `model_axis=inherited` plus explicit phase-appropriate `effort_axis=selected:low|medium|high` mapped to `oat-phase-implementer-low|medium|high`; Codex review dispatch should use the inherited base role and log `model_axis=inherited, effort_axis=inherited`.
- Claude Code implementation dispatch should use a selected model axis when available, pass the corresponding Task `model` parameter, and set `effort_axis=not-applicable`; Claude Code review dispatch should inherit the model axis by default.
- Dispatch logs now use a structured `OAT Dispatch` block with `Host`, `Model axis`, `Effort axis`, `Dispatch target`, and `Rationale`.
- Codex managed role exports are synced with canonical phase implementer and reviewer guidance.

**Key files / modules:**

- `.oat/templates/plan.md` - optional override-only Dispatch Profile template guidance.
- `.agents/skills/oat-project-plan-writing/SKILL.md` - plan authoring rules for runtime-selection defaults.
- `.agents/skills/oat-project-import-plan/SKILL.md` - import handling and reporting for dispatch hints.
- `.agents/skills/oat-project-implement/SKILL.md` - runtime dispatch selection and escalation policy.
- `.agents/agents/oat-phase-implementer.md` and `.agents/agents/oat-reviewer.md` - phase/reporting and review-tier guidance.
- `.agents/skills/oat-project-review-provide/SKILL.md` - Dispatch Profile override advisory for plan artifact review.
- `.codex/agents/oat-phase-implementer.toml`, `.codex/agents/oat-phase-implementer-low.toml`, `.codex/agents/oat-phase-implementer-medium.toml`, `.codex/agents/oat-phase-implementer-high.toml`, and `.codex/agents/oat-reviewer.toml` - Codex role exports and effort-specific variants.
- `packages/*/package.json` - lockstep public package version bump to `0.0.70`.

**Verification performed:**

- Phase grep checks from `plan.md`.
- `pnpm run cli -- project validate-plan --project-path .oat/projects/shared/subagent-model-selection`.
- `pnpm run cli -- sync --scope project --dry-run`.
- `pnpm release:validate`.

**Design deltas (if any):**

- Pivoted from invocation-cap preflight to runtime lowest-confident-tier dispatch before implementation started.

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
