---
id: BL-260820-track-pr-closeout-evidence
title: Track PR-closeout evidence freshness against the current head
status: open
priority: high
scope: feature
scope_estimate: L
labels:
  - closeout
  - freshness
  - reviews
  - gates
assignee: null
created: 2026-08-20T00:51:34.444Z
updated: 2026-08-20T00:51:34.444Z
associated_issues: []
external_plans: []
---

## Description

PR closeout evidence can become stale after the reviewed or tested head changes,
yet completion may still proceed without proving that every required closeout
check covers the current head. Persist source-head identity for closeout evidence
and fail closed when the evidence no longer matches the current PR head. Source:
[GitHub issue #201](https://github.com/voxmedia/open-agent-toolkit/issues/201).

## Acceptance Criteria

- Every closeout-relevant review, check, and gate receipt records the exact source
  head (or an equivalent immutable revision identity) that it covered.
- PR progress and final closeout compare every required receipt with the current
  head and report which evidence became stale after subsequent commits.
- Terminal completion fails closed while required evidence is absent or stale;
  rerunning the affected check against the current head restores eligibility.
- Head changes caused only by explicitly classified lifecycle bookkeeping are
  handled through a documented, deterministic rule rather than a broad freshness
  exemption.
- Tests cover current evidence, stale evidence, mixed receipts, post-review
  commits, and recovery after rerun across configured closeout sequences.
