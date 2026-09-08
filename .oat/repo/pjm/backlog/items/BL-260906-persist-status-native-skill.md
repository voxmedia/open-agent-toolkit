---
id: BL-260906-persist-status-native-skill
title: Persist status native-skill adoption by setting manifestChanged
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - status
  - cli
  - wave-4-followup
assignee: null
created: 2026-09-06T19:21:29.824Z
updated: 2026-09-08T17:36:27.000Z
associated_issues: []
external_plans: []
---

## Description

In packages/cli/src/commands/status/index.ts the native-skill adopt path mutates the in-memory manifest without setting manifestChanged, so the adoption is never saved. Pre-existing; observed by the wave-4 p02 review round 1 while verifying the migrationAborted branches. Set the flag (so the new pre-save restamp advisory also fires) and add a test that the adoption persists.

## Acceptance Criteria

- [ ] The native-skill adoption loop in `status/index.ts` sets `manifestChanged` when it moves files, so the manifest save at `:1527-1534` runs and the adopted entry persists (re-read from disk in the test)
- [ ] A control shows the pre-fix tree dropping the entry and reporting the skill as a stray on the next `oat status`
- [ ] The restamp behavior around the save is unchanged and pinned
