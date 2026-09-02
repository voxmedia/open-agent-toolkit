---
id: BL-260902-retry-gate-project-log
title: Retry gate project-log finalization across transient Git index locks
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - gate
  - git
  - reliability
  - review-gate-integrity
assignee: null
created: 2026-09-02T23:48:45.450Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/213
external_plans: []
---

## Description

Gate-owned project-log finalization commits its own append but has no `index.lock` retry, lock classification, stable event idempotency, or partial-finalization receipt, so a transient Git index lock from a concurrent process turns a completed review into a failed gate. Add bounded lock retry with classification, make the finalization idempotent on its event identity, and emit a partial-finalization receipt that a later run can complete. Source: GitHub issue #213; child of the review-gate-integrity project.

## Acceptance Criteria

- Gate-owned project-log finalization retries a bounded number of times on a transient `index.lock` and classifies the lock as transient versus persistent in its diagnostics.
- Finalization is idempotent on its event identity: a retry never appends a duplicate log entry or commit.
- When retries are exhausted, the gate emits a partial-finalization receipt that a later run can complete without re-running the review.
- Focused tests simulate a held index lock during finalization and assert retry, classification, idempotency, and the receipt.
