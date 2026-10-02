---
id: BL-261002-warn-when-the-default-branch
title: Warn when the default branch has changed planned paths since the branch base
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - lifecycle
  - workflow
  - skills
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T20:01:28.833Z
updated: 2026-10-02T20:01:28.833Z
associated_issues: []
external_plans: []
---

## Description

Quick-start, plan and implement never check whether the default branch changed the plan's target paths after the branch was cut. In the docs overhaul, main merged Fumadocs navigation sync (#336) during design; the plan was approved hours later and phase 1 rebuilt the same feature, about 2.5 hours of implementation and three review rounds that were then discarded. The overlap surfaced only when release:check-versions failed the next day. Source: docs-improvement-overhaul retro UP-01.

## Acceptance Criteria

- At plan approval and at each phase dispatch, the lifecycle fetches the
  default branch and lists its commits since the branch base that touch the
  plan's target paths.
- When any exist, the run stops and asks whether to merge or rebase,
  re-plan, or continue; non-interactive runs stop at a boundary.
- A test covers a fixture where the default branch changed a planned path and
  one where it did not.
