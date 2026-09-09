---
id: BL-260909-fix-the-agents-md-unsafe
title: Fix the agents-md unsafe-directory test race under parallel turbo
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - testing
  - flake
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:42.059Z
updated: 2026-09-09T08:35:42.059Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p12 hit a pre-existing flake: the `it.each` unsafe-directory variants in `packages/cli/src/.../agents-md.test.ts` share one `outside.md` fixture, so under parallel `turbo run test` two variants race on the same path. Give each variant its own `mktemp`-style directory (or serialize the block) and prove the fix by running the file under `--repeat` with the shared-path form red and the isolated form green.

## Acceptance Criteria

- Each `it.each` variant writes only under its own temporary directory.
- A repeated run (`vitest --repeat 20` or equivalent) is green.
- No other test in the file references the shared `outside.md` path.
