---
id: BL-260718-rewrite-worktree-bootstrap
title: Rewrite worktree bootstrap-group as tested TypeScript command
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - worktree
  - cli
  - typescript
assignee: null
created: 2026-07-18T17:31:56.257Z
updated: 2026-07-18T17:31:56.257Z
associated_issues: []
external_plans: []
---

## Description

Implement `oat worktree bootstrap-group` as a tested TypeScript command. The
proven portable bash implementation ships as-is for now; rewrite only after
its workflow is established. Evidence: wave-skills promotion packet section 3
row 3 and the project design decision.

## Acceptance Criteria

- The TypeScript command preserves the ported bash script's bootstrap,
  validation, containment, and failure semantics.
- Unit and integration tests cover successful group setup, invalid inputs,
  partial failure, and rerun behavior.
- The promoted wave skills use the CLI command after parity is demonstrated.
- The bash implementation is retired only after migration verification passes.
