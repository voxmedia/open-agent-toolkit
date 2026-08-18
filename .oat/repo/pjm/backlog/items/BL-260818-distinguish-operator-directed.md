---
id: BL-260818-distinguish-operator-directed
title: Distinguish operator-directed review rounds from failed fix cycles in the
  review-cycle cap
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - workflow
  - review
  - skills
assignee: null
created: 2026-08-18T00:01:02.918Z
updated: 2026-08-18T00:01:02.918Z
associated_issues: []
external_plans: []
---

## Description

The three-cycle review governance cap in oat-project-review-provide/receive counts artifacts per scope, so explainer-improvements-v2's final scope exceeded it by round 3 of 6 even though rounds were operator-directed and every round through round 5 found real defects. The standing override had to be re-recorded manually at each subsequent round. Let the cap distinguish failed automatic fix loops (its target) from explicitly operator-directed continuation — e.g. a durable recorded override in project state rather than per-round re-justification. Related (different mechanism): BL-260711-skip-re-review-for-bookkeeping covers skipping redundant bookkeeping-only re-reviews. Source: explainer-improvements-v2 retro RP-04.

## Acceptance Criteria

- A durable, explicitly operator-granted override exempts a scope from the per-round cap warning until revoked.
- Failed automatic fix loops still hit the cap unchanged.
- The override's grant and scope are recorded in project state, not inferred from conversation.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
