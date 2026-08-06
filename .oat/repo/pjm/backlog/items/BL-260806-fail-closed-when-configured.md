---
id: BL-260806-fail-closed-when-configured
title: Fail closed when configured closeout snapshot is absent
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - lifecycle-skills
  - workflow-integrity
  - dx
assignee: null
created: 2026-08-06T23:52:48.886Z
updated: 2026-08-06T23:52:48.886Z
associated_issues: []
external_plans: []
---

## Description

Configured or autonomous closeout can reach terminal completion without a durable oat_post_implement_sequence snapshot, allowing required summary, documentation, and PR children to be skipped without provenance. Track the configured-plus-absent snapshot invariant separately from mandatory skill loading so each mechanism has focused ownership and executable evidence.

## Acceptance Criteria

- A configured or autonomous closeout cannot reach terminal completion when
  its required `oat_post_implement_sequence` snapshot is absent or incomplete;
  terminal routing fails closed to `oat-project-implement` with the missing
  invariant reported.
- The normalized closeout sequence and its source are persisted in a durable
  snapshot before any sequence child is dispatched.
- Transition-level tests begin from configured-plus-absent state and prove
  snapshot persistence, ordered summary/document/PR child dispatch, approval
  transition, and terminal completion only after every required child is
  durably recorded complete.
- Coverage preserves the valid unconfigured path and diagnoses the observed
  missing snapshot without assuming an unproven internal skip mechanism.
