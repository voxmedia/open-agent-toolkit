---
id: BL-260902-make-consolidated-project
title: Make consolidated-project retirement checks semantic
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - lifecycle
  - skills
  - quick-start
assignee: null
created: 2026-09-02T23:48:38.755Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/250
external_plans: []
---

## Description

When a quick-start project consolidates earlier scaffolds, retirement checks only verify physical cleanup (deleted directories, moved backlog records) and miss active planning prose that still claims the superseded projects own the work; a recent consolidated run needed two extra review passes to find it. Add a bounded sweep across active planning surfaces keyed by absorbed project slugs, absorbed backlog IDs, and future-oriented ownership language, producing an actionable finding or fix task before closeout. Source: GitHub issue #250.

## Acceptance Criteria

- Consolidation records the absorbed project slugs and backlog IDs needed for a retirement sweep.
- Retirement verification sweeps active planning surfaces (roadmap, priority alignment, current state, active project artifacts) for absorbed slugs, absorbed backlog IDs, and future-oriented ownership language tied to superseded projects.
- Stale ownership statements produce an actionable finding or fix task before closeout; historical evidence that clearly describes past state is exempt.
- Tests cover a physically retired scaffold whose active prose still claims future ownership.
