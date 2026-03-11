---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-11
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: review-archive-workflow

**Started:** 2026-03-11
**Last Updated:** 2026-03-11

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
| Phase 1 | pending | 3     | 0/3       |
| Phase 2 | pending | 3     | 0/3       |

**Total:** 0/6 tasks completed

---

## Phase 1: Review Lifecycle Archiving

**Status:** pending
**Started:** -

### Task p01-t01: Update review receive workflows to archive consumed artifacts

**Status:** pending
**Commit:** -

**Notes:**

- Archive moves must update any review artifact references written during receive so plan/state/implementation paths stay truthful.

---

### Task p01-t02: Add residual-review archive guards to project PR and completion flows

**Status:** pending
**Commit:** -

**Notes:**

- PR/finalization flows should not proceed with stray top-level review files left behind.

---

### Task p01-t03: Align review-provider and review-path documentation with the new contract

**Status:** pending
**Commit:** -

**Notes:**

- Update skill copy and repo reference docs together to avoid path-policy drift.

---

## Phase 2: Init Defaults And Verification

**Status:** pending
**Started:** -

### Task p02-t01: Change init and local-path defaults to ignore only archived reviews

**Status:** pending
**Commit:** -

---

### Task p02-t02: Update tests and cleanup utilities for archived-review behavior

**Status:** pending
**Commit:** -

---

### Task p02-t03: Run end-to-end verification for import, receive, and init defaults

**Status:** pending
**Commit:** -

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

- **2026-03-11:** Imported external plan into canonical OAT artifacts. No implementation work started yet.

## Deviations from Plan

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

- Pending implementation

**Behavioral changes (user-facing):**

- Pending implementation

**Key files / modules:**

- Pending implementation

**Verification performed:**

- Imported plan artifacts only; no code changes executed yet

**Design deltas (if any):**

- None yet

## References

- Plan: `plan.md`
- Imported Source: `references/imported-plan.md`
