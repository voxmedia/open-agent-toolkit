---
id: BL-260719-avoid-final-gate-reruns
title: Avoid final-gate reruns for merge-only updates
status: closed
priority: high
scope: task
scope_estimate: S
labels:
  - gates
  - freshness
  - workflow
  - performance
assignee: null
created: 2026-07-19T13:42:05.069Z
updated: '2026-07-19T16:34:24Z'
associated_issues: []
external_plans: []
---

## Description

Narrowly preserve a successful implementation exit gate when updating, merging, or rebasing the base branch leaves the effective implementation/PR delta unchanged. Continue to invalidate the gate when conflict resolution or any branch-owned implementation, test, skill, template, or workflow change alters that delta; rely on fresh CI, Bugbot, and lifecycle self-review for merge-only integration evidence.

## Acceptance Criteria

- A successful implementation exit gate remains fresh after a merge, rebase, or
  base update when the effective implementation/PR delta is unchanged.
- Conflict resolutions and branch-owned implementation, test, skill, template,
  or workflow changes still invalidate the prior gate result.
- Persisted freshness evidence remains deterministic and resumable without
  weakening malformed, missing, pending, or blocked gate handling.
- Regression tests cover unchanged-delta base updates and changed-delta
  integration work.
- Lifecycle documentation identifies fresh CI, Bugbot, and lifecycle
  self-review as the safety layer for merge-only updates.
