---
id: BL-260928-route-quick-mode-discovery
title: Route quick-mode discovery to quick-start in the CLI recommender and dashboard
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - routing
  - quick-mode
  - cli
  - control-plane
assignee: null
created: 2026-09-28T10:16:23.302Z
updated: 2026-09-28T10:16:23.302Z
associated_issues: []
external_plans: []
---

## Description

Follow-up from backlog-wave-2 p03 review L1 (reviews/archived/p03-review-2026-09-28T014814Z.md). BL-260907-route-quick-mode-discovery fixed the oat-project-next and oat-project-progress skill tables, but packages/control-plane/src/recommender/router.ts:66-67 (used by oat project status/list) and packages/cli/src/commands/state/generate.ts:411-414 (dashboard) still route quick-mode discovery to oat-project-plan, a two-hop route. Point both at oat-project-quick-start and pin them with tests alongside the skill routing pins.

## Acceptance Criteria

- `packages/control-plane/src/recommender/router.ts` and `packages/cli/src/commands/state/generate.ts` route quick-mode discovery to `oat-project-quick-start`.
- Tests pin both routes, and they agree with the `oat-project-next` and `oat-project-progress` skill tables.
