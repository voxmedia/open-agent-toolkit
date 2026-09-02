---
id: BL-260826-warn-on-silent-oatversion
title: Warn on silent oatVersion restamps outside sync
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - cli
  - sync
  - manifest
  - wave-2-follow-up
assignee: null
created: 2026-08-26T22:57:18.952Z
updated: 2026-08-30T23:49:30Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-30-warn-on-non-sync-manifest-restamps.md
---

## Description

Sibling saveManifest call sites restamp the sync manifest oatVersion with no advisory: packages/cli/src/commands/init/index.ts:1187, packages/cli/src/commands/remove/skill/remove-skill.ts:347, packages/cli/src/commands/status/index.ts:887. Also reconsider the pre-existing 'No changes required.' message on a restamp-only oat sync apply (packages/cli/src/commands/sync/apply.ts:187, guard summary.plannedOperations === 0). Source: wave-2-execution p01 review m4/m6, deferred as out of the source plan's scope.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
