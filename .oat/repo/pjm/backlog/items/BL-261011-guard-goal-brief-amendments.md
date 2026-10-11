---
id: BL-261011-guard-goal-brief-amendments
title: Guard goal brief amendments against an open delivery head branch
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - brief-goal-workflow-modes
  - goal
  - delivery
assignee: null
created: 2026-10-11T16:27:33.088Z
updated: 2026-10-11T16:27:33.088Z
associated_issues: []
external_plans: []
---

## Description

Confirmed by the p12-t02 real-artifact probe (p11 implementer concern b). A goal project's branch is also the head branch of its open delivery pull request. Re-alignment amends plan.md (substantive under brief-contract 12.8), so pushing the amendment while the delivery is open advances the member head and delivery refresh marks the delivery's integrated review stale (probe: substantive-change under '## Phase p03'). Today the only guard is prose in oat-project-goal Step 8 item 5 ('do not push amendment commits onto a still-open delivery member's head branch'). Options: keep amendments on a separate branch until the delivery merges, have pr-progress or the push step refuse when an amendment commit sits above an open member's observed head, or let delivery check name the amendment commit explicitly.

## Acceptance Criteria

- A goal re-alignment with an open delivery cannot publish an amendment onto that delivery's head branch without an explicit refusal or warning
- The probe scenario (amendment pushed while d01 is open) is covered by a test
