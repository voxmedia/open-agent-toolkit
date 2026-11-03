---
id: BL-261103-codex-gate-target-loses
title: Codex gate target loses the branch-local route receipt
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - gates
  - codex
  - reviews
  - bug
assignee: null
created: 2026-11-03T02:04:42.927Z
updated: 2026-11-03T02:04:42.927Z
associated_issues: []
external_plans: []
---

## Description

`oat --json gate review --target codex-6-sol-xhigh` (installed CLI 0.3.42) ran the Sol reviewer to completion and committed a 0/0/0/0 artifact, then failed `review_failed` / `unexpected_post_selection_failure` at `target-dispatch` ("Branch-local gate route did not return JSON."). The route receipt at `OAT_GATE_ROUTE_RECEIPT_PATH` was missing or empty after the child exited (run `48f5553c-f8fa-4f17-be77-7461789a416c`, review-gate-integrity-goal m01 exit gate rerun, 2026-11-02). Claude targets completed normally in the same session.

Effect: cross-family Sol gating is unavailable for Claude-produced code, so the configured selection falls back to same-family Opus. Source: review-gate-integrity-goal project-log learning `rgi-m01-codex-route-receipt` and its implementation.md m01 exit-gate rerun entry.

## Acceptance Criteria

- The root cause of the missing or empty route receipt after a Codex gate child exits is identified and recorded.
- `oat --json gate review --target codex-6-sol-xhigh` against a project completes with a valid result envelope when the reviewer finishes.
- A regression test drives a Codex target through the branch-local route and fails if the receipt is not written or read.
