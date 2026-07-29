---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-28
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: surface-implementer-dispatches

**Started:** 2026-07-28
**Last Updated:** 2026-07-29

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

| Phase   | Status  | Tasks | Completed |
| ------- | ------- | ----- | --------- |
| Phase 1 | pending | 2     | 0/2       |
| Phase 2 | pending | 2     | 0/2       |
| Phase 3 | pending | 2     | 0/2       |

**Total:** 0/6 tasks completed

### Review Received: design

**Date:** 2026-07-29
**Review artifact:**
`reviews/archived/artifact-design-review-2026-07-28T235619Z.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 3
- Minor: 3

**Disposition:**

- I1: `resolve_in_artifact` — exclude legacy `--preferred` selection from the
  skipped-selection notice predicate.
- M1: `resolve_in_artifact` — serialize nullable
  `selection.preferredValue` for auditability.
- M2: `resolve_in_artifact` — distinguish the static choices recommendation
  from effective adoption/runtime disclosure.
- M3: `resolve_in_artifact` — use `--task-effort` for classification and retain
  legacy `--preferred` for selection.
- m1: `resolve_in_artifact` — name invalid reviewer classification flags
  explicitly.
- m2: `resolve_in_artifact` — validate task effort against Codex effort values
  and use null for non-Codex providers.
- m3: `resolve_in_artifact` — define Frontier/Fable terminology and cite the
  bundled recommendation.

**New tasks added:** None — artifact reviews update lifecycle artifacts directly.

**Next:** Re-review the design artifact or continue quick-start plan review.

### Review Received: plan exit gate

**Date:** 2026-07-29
**Review artifact:**
`reviews/archived/artifact-plan-review-2026-07-29T034646Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 1
- Minor: 1

**Disposition:**

- M1: `resolve_in_artifact` — finalize `plan.md` with
  `oat_template: false` and `oat_template_name: plan`.
- m1: `resolve_in_artifact` — annotate the artifact-less structured
  quick-start review row with its provenance.

**New tasks added:** None — artifact reviews update lifecycle artifacts directly.

**Gate outcome:** Passed at the `important` threshold with corroborated handoff.

**Next:** Start implementation at `p01-t01`.

---

## Phase 1: Enforce Selection Provenance

**Status:** in_progress
**Started:** 2026-07-28

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

### Task p01-t01: Extend Dispatch Report V1 with classification and notices

**Status:** in_progress
**Commit:** -

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

### Task p01-t02: Add classification inputs and managed-cap warnings

**Status:** pending
**Commit:** -

**Notes:**

- {Notes will be added during implementation}

---

## Phase 2: Expose Terminal Reviewer Constraints

**Status:** pending
**Started:** -

### Task p02-t01: Add shared terminal-reviewer disclosures

**Status:** pending
**Commit:** -

---

### Task p02-t02: Update implementation guidance and documentation

**Status:** pending
**Commit:** -

---

## Phase 3: Release and Backlog Closeout

**Status:** pending
**Started:** -

### Task p03-t01: Bump lockstep public package versions

**Status:** pending
**Commit:** -

---

### Task p03-t02: Archive the completed backlog item and run final verification

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

### 2026-07-28

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

### 2026-07-28

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

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
