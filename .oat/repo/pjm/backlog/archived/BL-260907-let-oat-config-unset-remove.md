---
id: BL-260907-let-oat-config-unset-remove
title: Let oat config unset remove a malformed stored value
status: closed
priority: medium
scope: task
scope_estimate: XS
labels:
  - cli
  - config
  - wave-5-followup
assignee: null
created: 2026-09-07T18:28:12.299Z
updated: '2026-09-09T10:16:41Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-fix-oat-config-unset-and-adopt.md
---

## Description

`unsetConfigValue` reaches `resolveEffectiveConfig` (the strict reader) before its lenient branch, so `oat config unset <key>` exits 1 when the stored value is malformed; the operator must repair through `oat config set <key> ''` instead. Identical pre-existing behavior for `documentation.excludes` and, since wave-5 p12-t03, `documentation.instructionPointerExcludes` (Codex finding on the exit-gate fix round, deferred for sibling parity). Fix: read leniently for the targeted key before resolving the effective config so `unset` can remove a value the loader rejects.

## Acceptance Criteria

- [ ] `oat config unset <key>` removes a malformed stored value for every catalogued key and exits 0
- [ ] A control seeds a malformed `documentation.excludes` and `documentation.instructionPointerExcludes` value and asserts both `unset` paths succeed and leave siblings intact
