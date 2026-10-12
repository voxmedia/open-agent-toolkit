---
id: BL-261011-validate-skill-bumps-against
title: Validate skill bumps against a stacked PR's base branch, not only origin/main
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - brief-goal-workflow-modes
  - release
  - gh-stack
assignee: null
created: 2026-10-11T22:25:07.898Z
updated: 2026-10-11T22:25:07.898Z
associated_issues: []
external_plans: []
---

## Description

Retro RP-04 (brief-goal-workflow-modes). For PR #362, the second layer of GitHub stack #363, pnpm run check:skill-bumps --base-ref origin/main passed vacuously: the first layer (PR #361, branch feat/brief-workflow-mode-v1) had already bumped every changed skill against main, so the gate had nothing to compare for the goal layer. The implementer validated against the v1 branch by hand. Teach the gate, or the oat-project-pr-final skill, to accept a base ref and, when the PR's base is not the default branch, run the comparison against that base as well as origin/main.

## Acceptance Criteria

- `pnpm run check:skill-bumps` (or the pr-final skill's call to it) accepts a base ref and, when a PR's base branch is not the default branch, compares against that base as well as `origin/main`
- A test covers the stacked case: a skill changed in the upper layer but already bumped in the lower layer against main is reported as needing a bump against the lower layer
