---
id: BL-261108-give-goal-closeout-a-recorded
title: Give goal closeout a recorded path for a squash-merged stale delivery
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - goal
  - closeout
  - freshness
  - pr-progress
assignee: null
created: 2026-11-08T21:52:19.125Z
updated: 2026-11-08T21:52:19.125Z
associated_issues: []
external_plans: []
---

## Description

When a fix lands on a goal milestone PR after its exit gate and integrated review, and the PR is then squash-merged, that delivery's evidence reads stale forever. Fresh evidence would have to bind a head that is no longer an ancestor of main, so oat project closeout-check refuses (review-not-fresh / exit-carrier-not-fresh), the recovery skills cannot help, and complete-state never runs. Observed in review-gate-integrity-goal d01 (#400): a Bugbot fix merged after the gates without a re-gate, and the operator had to accept the delivery outside the state machine. PR bots make post-gate fixes likely on every milestone. Source: review-gate-integrity-goal project retro UP-01. Related but distinct: BL-260820-track-pr-closeout-evidence (closeout evidence vs current head for post-snapshot docs) and BL-261102 (legacy-shaped projects). Prior art for an operator waiver: DR-260927-operator-waiver-for-test-only and the m02 Review waived line.

## Acceptance Criteria

- Prevention first: before a goal milestone PR merges, oat-project-pr-progress runs `oat project delivery check` and refuses the merge while it reports stale, until the operator re-gates or records a waiver for that delivery.
- An operator waiver can be recorded for a stale delivery (who, why, and the exact waived head). `oat project closeout-check` accepts a waived delivery instead of refusing it, and the outcome audit lists the waiver.
- `complete-state` can finish a goal project whose only closeout refusal is a waived stale delivery.
- A waiver is operator-only: autonomous runs never self-issue one, matching DR-260927-operator-waiver-for-test-only.
- Tests cover a squash-merged delivery with a post-gate fix: refused without a waiver, accepted with one, and a fresh delivery still accepted.
