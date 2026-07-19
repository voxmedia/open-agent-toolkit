---
id: BL-260719-evaluate-broader-final-gate
title: Evaluate broader final-gate freshness policy after narrow optimization
status: open
priority: low
scope: feature
scope_estimate: M
labels:
  - gates
  - freshness
  - workflow
  - follow-up
assignee: null
created: 2026-07-19T13:42:05.701Z
updated: 2026-07-19T13:42:05.701Z
associated_issues: []
external_plans: []
---

## Description

After the narrow merge-only optimization ships and has usage evidence, evaluate whether a broader freshness-policy redesign is necessary. Measure how far the small change gets us before adding complexity; consider base-sensitive interactions, persisted fingerprint compatibility, in-flight generations, and risk-based invalidation only if observed gaps justify them. CI, Bugbot, and lifecycle self-review remain the expected safety layer for ordinary base updates.

## Acceptance Criteria

- The narrow merge-only optimization has shipped and accumulated enough usage
  evidence to assess rerun frequency, cost reduction, and any missed risks.
- The evaluation distinguishes problems already covered by CI, Bugbot, and
  lifecycle self-review from risks that require semantic final-gate execution.
- Options for base-sensitive interactions, persisted fingerprint compatibility,
  in-flight generations, conflict resolution, and risk-based invalidation are
  documented with complexity and migration tradeoffs.
- The outcome records an explicit proceed/defer/close decision based on observed
  gaps; broader implementation is not assumed necessary.
- If broader work is justified, its contract and test plan preserve the narrow
  optimization and avoid duplicate gate execution.
