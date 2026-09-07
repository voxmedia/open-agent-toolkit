---
id: BL-260906-scope-the-restamp-only-sync
title: Scope the restamp-only sync body suppression per scope under --scope all
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - sync
  - cli
  - wave-4-followup
assignee: null
created: 2026-09-06T19:21:32.718Z
updated: 2026-09-06T19:21:32.718Z
associated_issues: []
external_plans: []
---

## Description

restampOnly in runSyncApply is a whole-run boolean: under --scope all with only one scope's manifest stale, the other scope's plan body also loses its 'No changes required.' sentence although nothing was restamped there. Nothing false is stated; make the suppression per scope. From the wave-4 p02 review round 2 (Minor).

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
