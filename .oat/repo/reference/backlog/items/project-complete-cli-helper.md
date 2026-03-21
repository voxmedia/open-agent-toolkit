---
id: bl-0ace
title: 'Move oat-project-complete state mutations into a CLI helper'
status: open
priority: medium
scope: feature
scope_estimate: M
labels: ['workflow', 'cli']
assignee: null
created: '2026-03-21T00:28:34Z'
updated: '2026-03-21T00:28:34Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

`oat-project-complete` currently has to encode the exact `state.md` completion mutations in the skill body, including markdown body updates that are easy to drift from the canonical project state shape. The completion flow should move those state mutations into a CLI-owned helper so the skill can delegate to one implementation instead of carrying formatting rules and inferred conventions.

## Acceptance Criteria

- A CLI-owned helper or command updates project completion state in the canonical shape, including both frontmatter and markdown body mutations.
- `oat-project-complete` delegates the state mutation work to the CLI helper instead of hardcoding the completion-state formatting contract.
- Completing a project no longer requires checking archived project state files to infer the expected output shape.
- Tests cover the resulting completion-state format and protect against drift between the CLI behavior and the skill guidance.
