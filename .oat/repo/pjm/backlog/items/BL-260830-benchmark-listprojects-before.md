---
id: BL-260830-benchmark-listprojects-before
title: Benchmark listProjects before approving a summary fast path
status: open
priority: low
scope: idea
scope_estimate: M
labels:
  - control-plane
  - performance
  - needs-discussion
  - legacy-promoted
assignee: null
created: 2026-08-30T22:32:58.611Z
updated: 2026-08-30T22:32:58.611Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-931d. Measure representative project-list performance and approve a separate summary path only if the current full-state assembly is materially expensive.

## Acceptance Criteria

- Representative repositories establish a reproducible `listProjects()` performance baseline.
- A fast path is approved only if measurements show material cost in the current full-state model.
- Any approved optimization preserves outward JSON and lifecycle recommendation semantics.
