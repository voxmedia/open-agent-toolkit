---
id: BL-261011-fix-the-phase-commit-grep
title: Fix the phase commit-grep regex in review-provide and pr-progress
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - brief-goal-workflow-modes
  - bug
  - reviews
assignee: null
created: 2026-10-11T06:34:53.566Z
updated: 2026-10-11T06:34:53.566Z
associated_issues: []
external_plans: []
---

## Description

Pre-existing bug reproduced during p07 (outside brief scope, not fixed there). oat-project-review-provide's quick/spec-driven commit discovery runs git log --oneline --grep="\(p${PHASE}-" HEAD~50..HEAD (~:696-707); under git's default basic regex '\(' opens a group, so git fails with 'parentheses not balanced' and the path finds 0 commits. oat-project-pr-progress's --grep="\\(${PHASE}-" likely shares the defect. Fix with --fixed-strings (or an escaped literal parenthesis under the default regex), add a scripted check that a (p01-t01) commit is found, and bump both skills. Brief modes are unaffected because they scope from journal anchors.

## Acceptance Criteria

- review-provide and pr-progress find (pNN-tNN) commits for a phase scope in quick and spec-driven projects
- A scripted check proves the old pattern fails and the fixed one finds the commits
