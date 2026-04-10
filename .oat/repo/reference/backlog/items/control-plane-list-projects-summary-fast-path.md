---
id: bl-931d
title: 'Optimize control-plane `listProjects()` summary path'
status: open
priority: low
scope: task
scope_estimate: M
labels: ['control-plane', 'performance']
assignee: null
created: '2026-04-10T02:05:20Z'
updated: '2026-04-10T02:05:20Z'
associated_issues:
  - type: project
    ref: 'control-plane-state-parsing'
oat_template: false
oat_template_name: backlog-item
---

## Description

The control-plane project deliberately shipped `listProjects()` by assembling the same underlying state model used by `getProjectState()`. That keeps recommendation behavior aligned, but it may do more work than a dedicated summary path needs.

The follow-up is intentionally conditional: only introduce a lighter-weight summary fast path if measured project-list performance shows the current approach is materially too expensive for real repositories.

## Acceptance Criteria

- Measure `oat project list` / `listProjects()` behavior on a representative repo before changing architecture.
- If performance warrants it, introduce a summary-oriented fast path without changing the outward JSON contract.
- Keep recommendation behavior and lifecycle/review correctness aligned with the full-state model.
