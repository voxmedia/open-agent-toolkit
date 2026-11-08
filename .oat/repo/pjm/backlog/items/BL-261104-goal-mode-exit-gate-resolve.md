---
id: BL-261104-goal-mode-exit-gate-resolve
title: "Goal-mode exit gate: resolve state-selected final to the active
  milestone's phases"
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - gates
  - goal-mode
  - review
assignee: null
created: 2026-11-04T02:00:47.760Z
updated: 2026-11-04T02:00:47.760Z
associated_issues: []
external_plans: []
---

## Description

In goal mode the configured implement exit gate runs `--review-scope final` with a prompt that delegates scope to project state. Outside a committed recovery at `exit_gate`, `final` expands to the whole project, and after a squash-merged earlier milestone it refuses: "p07 base does not equal or descend from the previous head" (m02 of review-gate-integrity-goal, 2026-11-03). The operator had to route each m02 exit run to an explicit phase range (`p07-p13`, `p07-p-rev2`, `p07-p-rev3`), which the closeout contract says not to do. A state-selected `final` hint in a goal milestone closeout should resolve to the active milestone's ordered accepted phases, as the recovery-exit rule already does for `oat_goal_recovery`. Source: implementation.md Reviews and Gates operator-routing lines; operator approved filing on 2026-11-03.

## Acceptance Criteria

- In a goal milestone closeout, an unchanged configured exit gate command (`--review-scope final` with the state-selection prompt) reviews exactly the active milestone's ordered accepted phases, with no operator rewrite of argv.
- A squash-merged earlier milestone no longer makes that gate refuse on phase anchors.
- An explicit whole-project `code final` request keeps its whole-project meaning.
- The review records the original `final` hint and the resolved phase set, as the recovery-exit rule does.
