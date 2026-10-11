---
id: BL-261011-persist-pre-registration
title: Persist pre-registration review staleness for goal milestones
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - brief-goal-workflow-modes
  - review-follow-up
  - goal
assignee: null
created: 2026-10-11T16:27:32.866Z
updated: 2026-10-11T16:27:32.866Z
associated_issues: []
external_plans: []
---

## Description

Deferred from the p11 review (implementer concern a, accepted design gap). When a goal milestone's integrated review goes stale before registration (a substantive commit after the reviewed revision while oat_milestone_status is delivering), nothing persisted records it: the router reads only persisted state, so it routes delivering to oat-project-pr-progress, whose delivery check reports undeliverable; pr-progress then writes reviewing and the router sends the milestone through review-receive, which declines, before review-provide. One extra hop, no wrong outcome. Candidate fix: have pr-progress Step 5.5 item 3 record the missing-evidence stage so the router routes straight to review-provide, or mark the Reviews row stale.

## Acceptance Criteria

- A stale pre-registration integrated review routes from pr-progress to oat-project-review-provide without visiting review-receive
- A router test covers the persisted marker and the existing goal routes stay unchanged
