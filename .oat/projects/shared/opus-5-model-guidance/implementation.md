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
| p04   | complete    | 5     | 5/5       |
| p05   | in_progress | 3     | 1/3       |
| p06   | pending     | 3     | 0/3       |

**Total:** 6/11 tasks completed

## Phase 4: Integrate the Accepted Selection Policy

**Status:** complete

| Task    | Status | Commit                 |
| ------- | ------ | ---------------------- |
| p04-t01 | done   | `e594ab12`             |
| p04-t02 | done   | `0e651d0f`             |
| p04-t03 | done   | `7801e136`, `f62d01dd` |
| p04-t04 | done   | `609f0833`             |
| p04-t05 | done   | `33cc3b8b`             |

## Phase 5: Package and Validate

**Status:** in_progress

| Task    | Status  | Commit         |
| ------- | ------- | -------------- |
| p05-t01 | done    | pending commit |
| p05-t02 | pending | -              |
| p05-t03 | pending | -              |

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
- `p04-t03`: retained the Codex task-class ladder while adding Sol's >272K
  pricing step, trajectory economics, and consequence-versus-effort guidance.
  Follow-up review aligned the consequential default to Sol high plus
  independent review, reserving xhigh and max for depth-driven escalation.
- `p04-t04`: retained current Cursor catalog examples, made Opus 5 explicitly
  probe-gated, and expanded service-tier latency measurement without adding
  pins.
- `p04-t05`: added comparable-rung, speed, claim-provenance, independent-review,
  live-catalog, and downstream parity gates to the refresh protocol.
- `p05-t01`: bumped the canonical skill once to `1.0.1` and all five public
  packages in lockstep to `0.2.18`.

## Deviations from Pre-Synthesis Plan

| Previous plan                        | Accepted plan                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Opus xhigh as default                | Opus medium/high by work shape; xhigh selective                                   |
| Consequential implies xhigh/max      | Consequential adds independent review and root authority                          |
| Opus 4.8 universal cyber primary     | Opus 5 general route with documented fallback handling                            |
| Five speculative Cursor pins         | No pin/catalog change before live probe                                           |
| Fable generic exceptional escalation | Reviewer principle durable; Fable instantiation provisional and eligibility-gated |

## Test Results

| Phase | Tests Run                                                               | Result |
| ----- | ----------------------------------------------------------------------- | ------ |
| p04   | Focused skill tests (113), format, terminology, scope, policy coherence | pass   |
| p05   | -                                                                       | -      |
| p06   | -                                                                       | -      |

## Final Summary

To be completed after implementation and validation.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Historical plan: `references/pre-synthesis-plan.md`
