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
updated: 2026-10-02T03:10:18Z
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

## Markdown docs bootstrap retrospective evidence

[RP-03: late documentation](../../../reference/project-summaries/20261002-markdown-docs-bootstrap.md#rp-03-add-a-late-documentation-case-to-closeout-freshness-tracking)
provides a real post-review control: accepted gate
`39b33a8d-8a63-41e5-af34-145a5d525935` was followed by public-docs commit
`420bceded`. The shipped documentation changed the gate fingerprint after
summary/document/PR closeout steps had already completed.

Resume must classify changed completed-step outputs, identify stale exact
receipts, and refresh affected evidence before approval while preserving the
completed sequence instead of resetting or reordering it. Public bundled docs
must not inherit the project/reference bookkeeping exemption. This strengthens
the existing freshness contract; it does not establish that current resume
incorrectly approves stale work.
