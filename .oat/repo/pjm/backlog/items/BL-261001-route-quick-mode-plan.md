---
id: BL-261001-route-quick-mode-plan
title: Route quick-mode plan in-progress consistently across the router,
  dashboard, and skill tables
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - lifecycle
  - control-plane
assignee: null
created: 2026-10-01T05:38:45.845Z
updated: 2026-10-01T05:38:45.845Z
associated_issues: []
external_plans: []
---

## Description

Found during Wave 3 reconnaissance, outside
`BL-260928-route-quick-mode-discovery`'s criteria. For quick-mode projects the
control-plane router sends `plan:in_progress:3` to `oat-project-plan`
(`packages/control-plane/src/recommender/router.ts:58,68`), while the
`oat-project-next` and `oat-project-progress` skill tables send it to
quick-start. The dashboard's shared map (`packages/cli/src/commands/state/generate.ts`,
around line 430) also sends quick `plan:in_progress` to `oat-project-plan`, with
no readiness check.

## Acceptance Criteria

- The router, the dashboard, and both skill tables agree on where a quick-mode
  `plan:in_progress` project goes, with any readiness condition stated once.
- Router and dashboard tests pin the agreed route.
