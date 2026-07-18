---
id: BL-260718-add-tracked-config-guard
title: Add tracked-config guard against managed-file reverts
status: wont_do
priority: none
scope: task
scope_estimate: S
labels:
  - config
  - cli
  - rejected
assignee: null
created: 2026-07-18T17:31:56.596Z
updated: '2026-07-18T17:33:12Z'
associated_issues: []
external_plans: []
---

## Description

Disposition record for a proposed CLI-level tracked-config guard. Rejected
after root cause showed a stale locally resolved CLI in the consuming repo:
`node_modules/.bin/oat` 0.1.1 shadowed the global binary, pnpm scripts prepended
`.bin` to `PATH`, and two tool versions thrashed managed files. Dependency
hygiene in the consuming repo is the cure; a CLI-level guard is unnecessary.

## Acceptance Criteria

- The stale locally resolved CLI root cause and its managed-file thrash
  mechanism are preserved in the terminal disposition.
- Dependency hygiene is applied in the consuming repo instead of adding a
  toolkit guard.
- This item is archived immediately as `wont_do`; no CLI guard is implemented.
