---
id: BL-260927-detect-unfilled-placeholders
title: Detect unfilled placeholders and frontmatter-body drift at PR-final and
  completion
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - lifecycle
  - pr-final
  - completion
  - templates
assignee: null
created: 2026-09-27T03:35:37.105Z
updated: 2026-09-27T03:35:37.105Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/328
external_plans: []
---

## Description

The project scaffold writes `**Status:** Discovery` into the `state.md` body and only completion rewrites it. The implementation template ships `{…}` placeholders and `oat_status: in_progress`. `oat-project-pr-final` only warns when the Final Summary is obviously empty, and `oat-project-complete` has no placeholder or frontmatter-body check, so stale prose and placeholders reach PR bodies, archives, and reviewers. Related: the current-state authority item from GitHub issues #305 and #310. Source: GitHub issue #328.

## Acceptance Criteria

- A shared deterministic check reports unreplaced template placeholders in core project artifacts and frontmatter-body disagreement, including `state.md` status and `implementation.md` `oat_status`.
- `oat-project-pr-final` runs the check before generating the PR body, and `oat-project-complete` reports or refuses on remaining findings.
- The `state.md` body cannot contradict its frontmatter after any lifecycle command, whether by derivation or by the check.
- Fixtures cover placeholder and drift cases plus a clean project.
