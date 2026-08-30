---
id: BL-260826-gate-targets-must-not-yield
title: Gate targets must not yield on background work in headless mode
status: closed
priority: high
scope: task
scope_estimate: M
labels:
  - gates
  - workflow
  - oat-project-implement
  - wave-2-follow-up
assignee: null
created: 2026-08-26T22:57:19.221Z
updated: '2026-08-30T23:11:07Z'
associated_issues: []
external_plans: []
---

## Description

Three consecutive claude-fable-skip-permissions exit-gate children (2026-08-26, runs 4199a1c1 and a31a6325) backgrounded the DoD gates behind a waiter and ended their headless turn before writing the review artifact; the gate runner reported targeting_correlation_failed with no diagnosis of the cause. Proposals: (1) the exec-target/gate prompt contract forbids background tasks, monitors, and waiters in headless gate runs; (2) the runner distinguishes 'child exited without an artifact' from a correlation mismatch; (3) audit configured gate commands for --avoid none, which defeats cross-family review (found on the implement gate; removed by the operator).

## Acceptance Criteria

- Headless gate instructions and the runner-owned prompt require review work,
  artifact creation, and bookkeeping to finish inline or through a
  synchronously awaited child before the child exits; background tasks,
  monitors, and waiters must not outlive the turn.
- A clean accepted child exit without a produced artifact returns a dedicated
  `artifact_missing` terminal result with actionable recovery guidance.
- An observed wrong-run, wrong-project, duplicate, or otherwise mismatched
  artifact remains `targeting_correlation_failed`; neither terminal is
  receive-eligible, remediable within the accepted run, or replacement-
  eligible.
- Deterministic integration coverage proves correlated success, clean
  child-without-artifact failure, and correlation mismatch as separate
  headless outcomes.
