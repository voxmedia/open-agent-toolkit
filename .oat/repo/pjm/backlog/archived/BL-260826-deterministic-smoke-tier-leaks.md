---
id: BL-260826-deterministic-smoke-tier-leaks
title: Deterministic smoke tier leaks worktrees on interrupted runs
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - smoke
  - tooling
  - wave-2-follow-up
assignee: null
created: 2026-08-26T22:57:19.956Z
updated: '2026-09-06T13:43:54Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-30-journal-deterministic-smoke-worktrees-before-creation.md
---

## Description

When a gate reviewer's pnpm test was interrupted on 2026-08-26, the deterministic smoke tier left smoke-automated-_ worktrees and branches behind (a 2026-07-29 leftover also exists). Add teardown on signal/interrupt or a pnpm smoke:clean script, and have the tier prune stale smoke-automated-_ worktrees at start.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
