---
id: BL-260820-bind-each-gate-review
title: Bind each gate review disposition to its exact received ledger event
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - reviews
  - gates
  - lifecycle
  - reliability
assignee: null
created: 2026-08-20T00:51:29.893Z
updated: 2026-08-20T00:51:29.893Z
associated_issues: []
external_plans: []
---

## Description

Repeated blocking gate rounds can leave an earlier received lifecycle event
unconsumed when disposition follows a later round. Bind every gate review
disposition to the exact scope, type, artifact, and received-event identity it
consumes so stale events cannot block closeout or route later work incorrectly.
Source: [GitHub issue #194](https://github.com/voxmedia/open-agent-toolkit/issues/194).

## Acceptance Criteria

- A deterministic fixture exercises repeated blocking gate rounds through
  receive, fix, and re-review, and proves no stale `received` gate event remains
  after each disposition.
- Gate/root receive handoffs carry or resolve the exact lifecycle-event identity
  to consume rather than selecting an event from scope and type alone.
- Consumption validates the expected scope, type, artifact, and event identity;
  a mismatch fails closed with structured diagnostics instead of mutating a
  different ledger row.
- Existing single-round review flows remain compatible, and focused lifecycle
  contract tests cover both the legacy path and repeated-round regression.
