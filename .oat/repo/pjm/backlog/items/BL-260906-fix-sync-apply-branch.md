---
id: BL-260906-fix-sync-apply-branch
title: Fix sync apply branch precedence when a rejected collection leaves zero
  planned operations
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - sync
  - cli
  - wave-4-followup
assignee: null
created: 2026-09-06T19:21:28.376Z
updated: 2026-09-06T19:21:28.376Z
associated_issues: []
external_plans: []
---

## Description

runSyncApply checks plannedOperations === 0 before failed > 0, so a rejected collection with no planned entry operations prints 'No changes required.' although the exit code is already 1. Pre-existing; found by the wave-4 p02 review (round 2 ruled: ledger, do not fix in the wave). Reorder the branches so a failure never prints the no-op sentence, with a regression test beside the reject-collection case p02 added.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
