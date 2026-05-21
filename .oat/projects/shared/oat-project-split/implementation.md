---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-20
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: oat-project-split

**Started:** 2026-05-18
**Last Updated:** 2026-05-20

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase                                   | Status  | Tasks | Completed |
| --------------------------------------- | ------- | ----- | --------- |
| Phase 1: Schema & pure-logic foundation | pending | 6     | 0/6       |
| Phase 2: oat-project-split skill        | pending | 7     | 0/7       |
| Phase 3: Listings & dashboard filter    | pending | 3     | 0/3       |
| Phase 4: Integration hooks              | pending | 4     | 0/4       |
| Phase 5: Reconcile + dogfood + ship     | pending | 5     | 0/5       |

**Total:** 0/25 tasks completed
**Parallel groups:** `[['p02', 'p03']]` (after p01 completes)

---

## Reviews Received

### Review Received: plan (artifact)

**Date:** 2026-05-20
**Review artifact:** `reviews/archived/artifact-plan-review-2026-05-20.md`
**Review type:** `artifact` (invocation: `manual`)

**Findings:**

- Critical: 0
- Important: 3
- Medium: 0
- Minor: 0

**Disposition map:**

- `I1` — Missing production invocation path for split helpers — `resolve_in_artifact` — added new task **`p01-t06`** (CLI subcommands `oat project split evaluate-signals / validate-plan / run`); updated `p02-t02`–`p02-t05` to orchestrate via the CLI; updated `p04-t01` to call `pnpm run cli -- project split evaluate-signals`.
- `I2` — Speculative / wrong file paths — `resolve_in_artifact` — corrected paths in `p01-t01` (frontmatter + state-utils, not `state/schema.ts`), `p01-t02`, `p03-t01` (`commands/project/list.ts`), `p03-t02` (`commands/state/generate.ts`), plus their verification commands.
- `I3` — Revalidation flag leaks into global discovery template — `resolve_in_artifact` — removed `.oat/templates/discovery.md` modification from `p01-t02`; made `p02-t03` explicit that the seeded child discovery is written from scratch (not copied from the template), with `oat_inherited_context_revalidated: false` written by the seeder only.

**Plan delta:**

- Phase 1 grew from 5 → 6 tasks (added `p01-t06`).
- Total task count: 23 → 24.

**No fix tasks added** (artifact review — findings resolved as direct edits to `plan.md`).

**Next:** Re-run `oat-project-review-provide artifact plan` to verify the edits, or proceed to `oat-project-implement` with the corrected plan.

### Review Received: plan (artifact, re-review v2)

**Date:** 2026-05-20
**Review artifact:** `reviews/archived/artifact-plan-review-2026-05-20-v2.md`
**Review type:** `artifact` (invocation: `manual`)
**Review cycle:** 2 of 3

**Findings:**

- Critical: 0
- Important: 3
- Medium: 0
- Minor: 0

**Disposition map:**

- `I1` — `p01-t06` scheduled CLI orchestration before its helpers and omitted command registration — `resolve_in_artifact` — **reshaped `p01-t06`** to ship only `evaluate-signals` + `validate-plan` (pure-logic-only deps); **added `p02-t07`** at end of Phase 2 to ship `oat project split run` after `write-parent`/`seed-children`/`finalize`/`resume` exist; both tasks now include `packages/cli/src/commands/project/index.ts` registration.
- `I2` — State-validation tasks targeted files that don't own validation — `resolve_in_artifact` — **introduced `packages/cli/src/validation/project-state.ts`** as the dedicated cross-field validator (joins existing `validation/skills.ts`); `frontmatter.ts` now only recognizes new fields; `p01-t01`/`p01-t02` include an audit-then-wire step listing the lifecycle call sites (`commands/project/new/`, `commands/project/complete-state/`, the discovery-status-transition path).
- `I3` — Stale `packages/cli/src/projects/list/` path in `p03-t03` — `resolve_in_artifact` — corrected to `packages/cli/src/commands/project/list.integration.test.ts`. (Same path correction applied to `p02-t06`'s integration test directory as a consistency carryover.)

**Plan delta:**

- Phase 1 stays at 6 tasks (p01-t06 reshaped, scope narrowed).
- Phase 2 grew from 6 → 7 tasks (added `p02-t07` for `oat project split run`).
- Total task count: 24 → 25.

**No fix tasks added** (artifact review — findings resolved as direct edits to `plan.md`).

**Next:** Re-run `oat-project-review-provide artifact plan` to verify the v2 edits, or proceed to `oat-project-implement` with the corrected plan.

### Review Received: plan (artifact, re-review v3)

**Date:** 2026-05-20
**Review artifact:** `reviews/archived/artifact-plan-review-2026-05-20-v3.md`
**Review type:** `artifact` (invocation: `manual`)
**Review cycle:** 3 of 3

**Findings:**

- Critical: 0
- Important: 4
- Medium: 0
- Minor: 0

**Disposition map:**

- `I1` — `oat project split run --plan-file` could not enforce declared-vs-detected non-interactive behavior after normalization — `resolve_in_artifact` — introduced `SplitPlanDocument` as the command-boundary shape carrying `origin`, `interactive`, and the normalized `ChildPlan`; updated validation and run tasks to consume this document and test declared/detected non-interactive behavior at the actual CLI boundary.
- `I2` — `finalizeSplit` wrote the active project as a slug instead of a repo-relative project path — `resolve_in_artifact` — updated `p02-t04` to activate via `oat project open <child>` or a resolved `.oat/projects/<scope>/<child>` path, with a test against `.oat/config.local.json.activeProject`.
- `I3` — resume lacked durable child seed data — `resolve_in_artifact` — added `references/split-plan.json` on the coordination parent as the persisted `SplitPlanDocument`; updated parent writer, resume, integration tests, and design storage/error-handling rules to use it instead of reconstructing from `oat_children` slugs.
- `I4` — signal evaluator surface drifted from the accepted architecture — `resolve_in_artifact` — updated `design.md` to explicitly bless the shared pure-logic module plus `oat project split evaluate-signals` CLI adapter; updated hook tasks to use installed `oat` CLI syntax with `pnpm run cli --` only as a local-development fallback.

**Plan/design delta:**

- Phase/task counts unchanged: total remains 25 tasks.
- `p01-t04`, `p01-t06`, `p02-t02`, `p02-t04`, `p02-t05`, `p02-t06`, `p02-t07`, `p04-t01`, and `p04-t03` were refined in place.
- `design.md` now documents `SplitPlanDocument`, `references/split-plan.json`, CLI-backed signal evaluation, and repo-relative active child activation.

**No fix tasks added** (artifact review — findings resolved as direct edits to `plan.md` and `design.md`).

**Next:** This was the third plan review cycle. Do not continue automatic plan re-review looping without explicit user override; proceed with implementation or perform a manual approval check.

---

## Phase 1: {Phase Name}

**Status:** in_progress
**Started:** 2026-05-18

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- {2-5 bullets describing user-visible / behavior-level changes delivered in this phase}

**Key files touched:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {trade-offs or deviations discovered during implementation}

### Task p01-t01: {Task Name}

**Status:** completed / in_progress / pending / blocked
**Commit:** {sha} (if completed)

**Outcome (required when completed):**

- {what materially changed (not “did task”, but “system now does X”)}

**Files changed:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {gotchas, trade-offs, design deltas, important context for future sessions}

**Issues Encountered:**

- {Issue and resolution}

---

### Task p01-t02: {Task Name}

**Status:** pending
**Commit:** -

**Notes:**

- {Notes will be added during implementation}

---

## Phase 2: {Phase Name}

**Status:** pending
**Started:** -

### Task p02-t01: {Task Name}

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-05-18

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-05-18

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
