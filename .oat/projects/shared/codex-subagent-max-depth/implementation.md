---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: codex-subagent-max-depth

**Started:** 2026-07-10
**Last Updated:** 2026-07-10

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

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | 4     | 0/4       |
| Phase 2 | pending     | 2     | 0/2       |
| Phase 3 | pending     | 2     | 0/2       |

**Total:** 0/8 tasks completed

---

## Phase 1: Codex Depth Policy and Scope Wiring

**Status:** in_progress
**Started:** 2026-07-10

### Task p01-t01: Enforce the shared max-depth floor

**Status:** pending
**Commit:** -

---

### Task p01-t02: Preserve inherited depth during Codex sync

**Status:** pending
**Commit:** -

---

### Task p01-t03: Apply scope-safe depth in direct materialization

**Status:** pending
**Commit:** -

---

### Task p01-t04: Diagnose insufficient depth in doctor and preflight

**Status:** pending
**Commit:** -

---

## Phase 2: Native Dispatch Provenance Contract

**Status:** pending
**Started:** -

### Task p02-t01: Make exact native dispatch the primary route

**Status:** pending
**Commit:** -

---

### Task p02-t02: Document configured reviewer and worker provenance

**Status:** pending
**Commit:** -

---

## Phase 3: Provider Surface and Release Validation

**Status:** pending
**Started:** -

### Task p03-t01: Document and regenerate the Codex provider surface

**Status:** pending
**Commit:** -

---

### Task p03-t02: Bump lockstep packages and validate the release

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

No implementation runs yet.

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
| 3     | -         | -      | -      | -        |

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
- Discovery: `discovery.md`
