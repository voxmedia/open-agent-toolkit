---
id: BL-261030-evaluate-stacked-goal-delivery
title: Evaluate stacked goal-delivery exit carriers against the stack tip
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - delivery
  - goal-mode
assignee: null
created: 2026-10-30T22:27:33.721Z
updated: 2026-10-30T22:27:33.721Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/383
external_plans: []
---

## Description

A stacked (multi-member) goal delivery can never pass oat project delivery check: the delivery check, delivery refresh and closeout check test the milestone exit carrier against every member's observed head, and lower stack layers cannot contain the tip's reviewed head. The milestone-subject evidence scope also omits the delivery's own evidence artifacts, so the milestone and delivery subjects disagree. Stacks are accepted by the parser but not documented. Source: GitHub #383; triage record .oat/repo/pjm/triage/2026-10-30-untriaged-issues.md.

## Acceptance Criteria

- `kind: stack` is a documented, supported delivery shape in the brief contract (§12.7) and in `oat-project-pr-progress` registration, with members ordered base to tip.
- For a stacked delivery, `delivery check`, `delivery refresh` and the closeout check evaluate the exit carrier against the tip member's observed head, and require each lower member's head to be an ancestor of the tip.
- `delivery refresh` writes a milestone carrier freshness reason only when it applies to that carrier, not a reason produced by a different evaluation subject.
- The milestone-subject evidence scope includes the delivery's own evidence artifacts when the milestone has a registered, non-superseded delivery, so the milestone and delivery subjects agree on the same commit.
- Single-member `kind: pr` deliveries behave exactly as before.
- Multi-member fixtures cover check, refresh and closeout, including a non-ancestor lower layer that must still fail.
