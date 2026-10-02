---
id: BL-261002-re-review-a-phase-only-after
title: Re-review a phase only after Critical or High findings
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - lifecycle
  - reviews
  - gates
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T20:01:29.159Z
updated: 2026-10-02T20:01:29.159Z
associated_issues: []
external_plans: []
---

## Description

Phase code reviews and artifact reviews run until a round comes back clean. In the docs overhaul, phase 1 went 1 High/3 Medium/1 Low, then 1 Low, then 0; the migration map went 2 Medium, then 0, then 1 Low. Each extra round cost a dispatch, a fix and a gate run. Related but distinct: BL-260711-skip-re-review-for-bookkeeping (bookkeeping findings) and issue #233. Source: docs-improvement-overhaul retro UP-02.

## Acceptance Criteria

- After a review round with no Critical or High findings, Medium and Low fixes
  are applied and verified without dispatching another review round.
- A round with Critical or High findings still triggers a re-review, and the
  number of rounds is capped by configuration.
- Skill text and the review ledger record which findings were fixed without
  re-review.
