---
id: BL-260826-gate-targets-must-not-yield
title: Gate targets must not yield on background work in headless mode
status: open
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
updated: 2026-08-30T21:53:59Z
associated_issues: []
external_plans: []
---

## Description

Three consecutive claude-fable-skip-permissions exit-gate children (2026-08-26, runs 4199a1c1 and a31a6325) backgrounded the DoD gates behind a waiter and ended their headless turn before writing the review artifact; the gate runner reported targeting_correlation_failed with no diagnosis of the cause. Proposals: (1) the exec-target/gate prompt contract forbids background tasks, monitors, and waiters in headless gate runs; (2) the runner distinguishes 'child exited without an artifact' from a correlation mismatch; (3) audit configured gate commands for --avoid none, which defeats cross-family review (found on the implement gate; removed by the operator).

## Acceptance Criteria

- Headless gate prompts and execution contracts explicitly forbid background
  tasks, monitors, or waiters from hiding required work; accepted work must
  finish synchronously and write its correlated artifact before child exit.
- The runner distinguishes child exit without an artifact from an artifact
  correlation mismatch, and neither outcome is receive-eligible.
- Deterministic tests cover foreground completion, synchronously awaited work,
  a background/waiter exit, and a wrong-run artifact.
- A child that accepted work and then failed does not authorize an automatic
  replacement or generic fallback.
