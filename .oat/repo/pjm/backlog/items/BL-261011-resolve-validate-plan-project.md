---
id: BL-261011-resolve-validate-plan-project
title: Resolve validate-plan --project-path against --cwd
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - brief-goal-workflow-modes
  - bug
  - cli
assignee: null
created: 2026-10-11T06:34:53.773Z
updated: 2026-10-11T06:34:53.773Z
associated_issues: []
external_plans: []
---

## Description

Found by the p08-t03 real-artifact probe; pre-existing since 2026-04, not brief-introduced. oat --cwd <repo> project validate-plan --project-path <relative path> joins the relative path with the process cwd instead of the command context cwd (packages/cli/src/commands/project/validate-plan/index.ts:60 and :95), so it exits 2 with ENOENT; project status resolves the same flags correctly. Resolve a relative --project-path against context.cwd and add a regression test.

## Acceptance Criteria

- oat --cwd <repo> project validate-plan --project-path <relative> reads <repo>/<relative>/plan.md
- A regression test covers the --cwd case
