---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-25
oat_current_task_id: p04-t01
oat_generated: false
---

# Implementation: opus-5-model-guidance

## Progress Overview

| Phase | Status      | Tasks | Completed |
| ----- | ----------- | ----- | --------- |
| p04   | in_progress | 5     | 2/5       |
| p05   | pending     | 3     | 0/3       |
| p06   | pending     | 3     | 0/3       |

**Total:** 2/11 tasks completed

## Phase 4: Integrate the Accepted Selection Policy

**Status:** in_progress

| Task    | Status  | Commit         |
| ------- | ------- | -------------- |
| p04-t01 | done    | `e594ab12`     |
| p04-t02 | done    | pending commit |
| p04-t03 | pending | -              |
| p04-t04 | pending | -              |
| p04-t05 | pending | -              |

## Phase 5: Package and Validate

**Status:** pending

| Task    | Status  | Commit |
| ------- | ------- | ------ |
| p05-t01 | pending | -      |
| p05-t02 | pending | -      |
| p05-t03 | pending | -      |

## Phase 6: Record Reverification and Deferral

**Status:** pending

| Task    | Status  | Commit |
| ------- | ------- | ------ |
| p06-t01 | pending | -      |
| p06-t02 | pending | -      |
| p06-t03 | pending | -      |

## Orchestration Runs

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

## Implementation Log

### 2026-07-25

- Reconciled the active quick project with the accepted post-release research.
- Retired unimplemented task IDs `p01-*` through `p03-*`.
- Explicitly deferred speculative Cursor pins until live alias and control
  probes exist.
- `p04-t01`: separated task class, effort, consequence, reviewer role, and
  eligibility; added failure-mode review and multi-measure speed contracts.
- `p04-t02`: made Opus 5 medium/high the substantive Claude route, retained
  Sonnet and Fable as measured or eligibility-gated cases, and documented cyber
  fallback handling.

## Deviations from Pre-Synthesis Plan

| Previous plan                        | Accepted plan                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Opus xhigh as default                | Opus medium/high by work shape; xhigh selective                                   |
| Consequential implies xhigh/max      | Consequential adds independent review and root authority                          |
| Opus 4.8 universal cyber primary     | Opus 5 general route with documented fallback handling                            |
| Five speculative Cursor pins         | No pin/catalog change before live probe                                           |
| Fable generic exceptional escalation | Reviewer principle durable; Fable instantiation provisional and eligibility-gated |

## Test Results

| Phase | Tests Run | Result |
| ----- | --------- | ------ |
| p04   | -         | -      |
| p05   | -         | -      |
| p06   | -         | -      |

## Final Summary

To be completed after implementation and validation.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Historical plan: `references/pre-synthesis-plan.md`
