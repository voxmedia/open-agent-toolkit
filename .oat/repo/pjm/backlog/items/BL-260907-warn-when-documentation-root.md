---
id: BL-260907-warn-when-documentation-root
title: Warn when documentation.root has the wrong type instead of dropping it
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - cli
  - config
  - docs
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:37.111Z
updated: 2026-09-08T21:57:08.000Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-warn-on-wrong-typed-documentation-root.md
---

## Description

A wrong-typed `documentation.root` (for example the number 5) is silently dropped by the config parser in both the pointer and docs-tree modes, zero warnings, and the docs tree quietly reverts to pointer sites. Wave-5 p02 (2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md) added inert-exclusion warnings for `instructionPointerExcludes` but the pre-existing typed-root door is outside its scope (review round 2, M2).

## Acceptance Criteria

- [ ] `oat config`/`oat sync`/`oat validate` surface a warning naming the key and the observed type when `documentation.root` is not a string
- [ ] A test covers the number and object cases and asserts the docs tree does not silently fall back to pointer sites without the warning
