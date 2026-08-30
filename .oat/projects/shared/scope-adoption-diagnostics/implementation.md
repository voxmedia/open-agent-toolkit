---
oat_status: in_progress
oat_ready_for: null
oat_blockers:
  - Current-main plan review retry bound exhausted after the final Important atomicity finding was corrected; implementation has not started.
oat_last_updated: 2026-08-30
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: Scope and Adoption Diagnostics

**Started:** Not started
**Last Updated:** 2026-08-30

> `oat_current_task_id` points to the next plan task. No implementation work or
> verification is complete at this planning-stage initialization.

## Progress Overview

| Phase   | Status  | Tasks | Completed |
| ------- | ------- | ----- | --------- |
| Phase 1 | pending | 2     | 0/2       |
| Phase 2 | pending | 3     | 0/3       |
| Phase 3 | pending | 2     | 0/2       |
| Phase 4 | pending | 2     | 0/2       |

**Total:** 0/9 tasks completed

## Current-Main Plan Revalidation

**Date:** 2026-08-30
**Baseline:** `origin/main` at `5d684ba97`; PR #240 `cd07d72e5`; PR #242
`ce7c3225d`

| Classification        | Tasks                                       |
| --------------------- | ------------------------------------------- |
| 1 — unchanged         | p01-t01, p01-t02, p03-t02, p04-t02          |
| 2 — adapted           | p02-t01, p02-t02, p02-t03, p03-t01, p04-t01 |
| 3 — already satisfied | none                                        |
| 4 — transferred tasks | none                                        |

Transferred sub-scope: provider × scope × content-type state, provider
projection/catalog visibility, collection-directory symlinks, restart guidance,
`AGENTS.md` behavior, picker truthfulness, and dispatch provenance remain in
`tool-pack-scope-provider-truthfulness`. This project lands first and exposes
only a narrow config-aware managed-role materialization input for that project
to consume or supersede later.

**First executable task:** p01-t01.

## Phase 1: PJM Migration Adoption Semantics

**Status:** pending
**Started:** -

### Task p01-t01: Make the migration core and caller adoption-aware

**Status:** pending
**Commit:** -

### Task p01-t02: Expand migration eligibility across adoption and legacy evidence

**Status:** pending
**Commit:** -

## Phase 2: Provider-Aware and Fault-Tolerant Diagnostics

**Status:** pending
**Started:** -

### Task p02-t01: Make user-agent reachability provider-aware

**Status:** pending
**Commit:** -

### Task p02-t02: Attribute shared-owner observations to applicable packs

**Status:** pending
**Commit:** -

### Task p02-t03: Degrade status inventory failures and delimit doctor output

**Status:** pending
**Commit:** -

## Phase 3: Test-Quality Ratchets

**Status:** pending
**Started:** -

### Task p03-t01: Replace tautological manifest and lifecycle assertions

**Status:** pending
**Commit:** -

### Task p03-t02: Make scoped CLI harnesses realistic and exception-safe

**Status:** pending
**Commit:** -

## Phase 4: Integrated Release Readiness

**Status:** pending
**Started:** -

### Task p04-t01: Advance lockstep public package versions

**Status:** pending
**Commit:** -

### Task p04-t02: Run the complete repository gate sequence

**Status:** pending
**Commit:** -

## Orchestration Runs

<!-- orchestration-runs-start -->

_No implementation orchestration run has started._

<!-- orchestration-runs-end -->

## Deviations from Plan / Design

| Task / Review     | Source Artifact | Planned / Documented                                                      | Actual / Accepted                                              | Reason                                                                                      | Source of Truth     | Follow-up                                                        |
| ----------------- | --------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| plan revalidation | plan.md         | Pre-PR-#240 inventory/provider assumptions and parallel p01-p03 execution | Current-main-adapted tasks; sequential diagnostics-first merge | PRs #240/#242 changed shared contracts and the umbrella reserved broader provider semantics | Revalidated plan.md | Umbrella rebases onto the merged diagnostic input/renderer seams |

## Test Results

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |
| 3     | -         | -      | -      | -        |
| 4     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

Not populated. Implementation has not started.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Associated backlog item:
  `../../../repo/pjm/backlog/items/BL-260827-correct-scope-and-adoption.md`
