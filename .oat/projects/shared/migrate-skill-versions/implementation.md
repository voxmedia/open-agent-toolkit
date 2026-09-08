---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-08
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: migrate-skill-versions

**Started:** 2026-09-08
**Last Updated:** 2026-09-08

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.

## Progress Overview

| Phase   | Status  | Tasks | Completed |
| ------- | ------- | ----- | --------- |
| Phase 1 | pending | 3     | 0/3       |
| Phase 2 | pending | 2     | 0/2       |

**Total:** 0/5 tasks completed

---

## Phase 1: Metadata-aware readers and shape-agnostic tests

**Status:** pending
**Started:** -

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- -

**Key files touched:**

- -

**Verification:**

- Run: -
- Result: -

**Notes / Decisions:**

- -

### Task p01-t01: Read metadata.version in the explainer RC builder

**Status:** pending
**Commit:** -

### Task p01-t02: Read metadata.version in the explainer-kit core check and its packaged-layout probe

**Status:** pending
**Commit:** -

### Task p01-t03: Make the skill test sweeps and mutation tests read through the resolver

**Status:** pending
**Commit:** -

## Phase 2: Migrate the 82 skills, repoint the pins, record the decision

**Status:** pending
**Started:** -

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- -

**Key files touched:**

- -

**Verification:**

- Run: -
- Result: -

**Notes / Decisions:**

- -

### Task p02-t01: Move every bundled skill's version to metadata.version and bump it

**Status:** pending
**Commit:** -

### Task p02-t02: Record the alias retirement decision, update the docs, and take the lockstep bump

**Status:** pending
**Commit:** -

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

### 2026-09-08

- Project scaffolded (quick mode) on branch `migrate-skill-versions` from `origin/main` `5b3b82151` (the wave-6 close); discovery and plan authored from the 2026-09-08 recon; plan gate next.

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

- (filled at closeout)

**Behavioral changes (user-facing):**

- (filled at closeout)

**Key files / modules:**

- (filled at closeout)

**Verification performed:**

- (filled at closeout)

**Design deltas (if any):**

- (filled at closeout)

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
