---
id: BL-260906-fix-sync-apply-branch
title: Fix sync apply branch precedence when a rejected collection leaves zero
  planned operations
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - sync
  - cli
  - wave-4-followup
assignee: null
created: 2026-09-06T19:21:28.376Z
updated: '2026-09-09T10:17:02Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-fix-sync-apply-failure-summary.md
---

## Description

runSyncApply checks plannedOperations === 0 before failed > 0, so a rejected collection with no planned entry operations prints 'No changes required.' although the exit code is already 1. Pre-existing; found by the wave-4 p02 review (round 2 ruled: ledger, do not fix in the wave). Reorder the branches so a failure never prints the no-op sentence, with a regression test beside the reject-collection case p02 added.

## Acceptance Criteria

- [ ] A rejected collection that leaves zero planned operations exits 1 and prints the failure summary, never `No changes required.` (`sync/apply.ts:539` ordering), pinned by a test
- [ ] The intentional restamp-only whole-run suppression at `apply.ts:286-291` is preserved and its existing tests still pass
- [ ] A control shows the pre-fix tree printing `No changes required.` on an exit-1 run
