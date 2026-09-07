---
id: BL-260906-persist-status-native-skill
title: Persist status native-skill adoption by setting manifestChanged
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - status
  - cli
  - wave-4-followup
assignee: null
created: 2026-09-06T19:21:29.824Z
updated: 2026-09-06T19:21:29.824Z
associated_issues: []
external_plans: []
---

## Description

In packages/cli/src/commands/status/index.ts the native-skill adopt path mutates the in-memory manifest without setting manifestChanged, so the adoption is never saved. Pre-existing; observed by the wave-4 p02 review round 1 while verifying the migrationAborted branches. Set the flag (so the new pre-save restamp advisory also fires) and add a test that the adoption persists.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
