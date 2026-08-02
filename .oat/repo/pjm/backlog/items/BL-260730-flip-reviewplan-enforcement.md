---
id: BL-260730-flip-reviewplan-enforcement
title: Flip ReviewPlan enforcement to the default
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - reviews
  - rollout
  - compatibility
  - release
assignee: null
created: 2026-07-30T00:00:00.000Z
updated: 2026-07-30T00:00:00.000Z
associated_issues: []
external_plans: []
---

## Description

Complete the second stage of the ReviewPlan-first compatibility rollout by
changing `workflow.reviewPlanMode` from `legacy` to `enforce` by default in the
release after the Stage A compatibility release. Keep the legacy override
available. The flip is blocked until every exit criterion below has durable
evidence; if the criteria are still incomplete 14 calendar days after Stage A
publication, record an explicit owned disposition instead of silently leaving
legacy as the default.

## Acceptance Criteria

### Stage A — Compatibility release and soak

- [ ] Record the Stage A compatibility release version and publication
      timestamp.
- [ ] Assign a named rollout owner and record the next review date.
- [ ] Attach exhaustive coordinator-inventory/parity evidence covering every
      direct and indirect in-scope review rail.
- [ ] Attach passing explicit-`enforce` dogfood evidence for both output sinks,
      Tier 1 and Tier 3, direct implementation review, and every gate alias.
- [ ] Attach fixture evidence that distinguishes accounting-invalid completion,
      reviewer `BLOCKED`, timeout, and correlation failure envelopes.
- [ ] Complete at least seven calendar days of soak after publication with no
      unresolved P0/P1 compatibility regression.
- [ ] Attach passing full release validation for the compatibility release.

### Stage B — Enforce-default release

- [ ] Confirm every Stage A exit criterion remains satisfied immediately before
      the default flip.
- [ ] Change the default to `enforce` without removing the explicit `legacy`
      override.
- [ ] Repeat lockstep public-package versioning and attach passing full release
      validation for the enforce-default release.
- [ ] Publish the enforce-default release and record its version and publication
      timestamp.

### Day-14 disposition

- [ ] Fourteen calendar days after the Stage A publication timestamp, either
      Stage B is complete or this item records exactly one explicit disposition: a
      dated fix plan, rollback of the new contract, or a time-bounded extension
      with a named owner and next review date.

## Rollout Evidence

- Stage A release/version: pending
- Stage A publication timestamp: pending
- Rollout owner: pending
- Next review date: pending
- Seven-day soak window: pending
- Day-14 deadline: pending
- Disposition: pending
