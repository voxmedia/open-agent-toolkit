---
id: BL-260907-fold-oat-config-adopt-onto
title: Fold oat config adopt onto the shared surface-flag resolver
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - cli
  - config
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:34.000Z
updated: 2026-09-08T21:33:57.000Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-fix-oat-config-unset-and-adopt.md
---

## Description

Wave-5 p05 (2026-09-02-add-oat-config-unset-command.md) extracted the surface-flag block from `oat config set` into `resolveSurfaceFlags` so `unset` shares it, but `oat config adopt` in packages/cli/src/commands/config/index.ts still carries its own inline copy of the same block. Fold `adopt` onto the shared resolver so the three commands cannot drift.

## Acceptance Criteria

- [ ] `oat config adopt` calls `resolveSurfaceFlags` and the inline copy is deleted
- [ ] A test asserts `set`, `unset`, and `adopt` reject the same malformed surface flag with byte-identical errors
