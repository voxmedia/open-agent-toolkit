---
id: BL-260927-derive-current-lifecycle-state
title: Derive current lifecycle state from one authority for review, phase, and
  publication status
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - lifecycle
  - reviews
  - state
assignee: null
created: 2026-09-27T03:35:36.887Z
updated: 2026-09-27T03:35:36.887Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/305
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/310
external_plans: []
---

## Description

Review, phase, and routing status are duplicated across the `## Reviews` table, implementation and state prose, routing fields, and counters. Several skills maintain them through prose instructions, with no transition helper. Downstream runs spent extra review cycles on stale or reintroduced status (#305). Project summaries also go stale after review-fix phases, publication, rebases, or merges: the summary skill detects task and revision staleness only when re-run, and nothing tracks publication heads (#310). Routing does not read `summary.md`. Related: `BL-260820-bind-each-gate-review` (exact event binding and single-row upsert), `BL-260711-skip-re-review-for-bookkeeping`, and `BL-260820-track-pr-closeout-evidence`. Sources: GitHub issues #305 and #310.

## Acceptance Criteria

- One transition helper or structured authority owns current review, phase, and publication status; plan, implementation, and state views are derived from it or updated atomically with it.
- A pre-review invariant rejects stale or contradictory current status before a reviewer is dispatched.
- Append-ordered review provenance stays immutable and distinguishable from current state.
- Adding a review-fix phase, or publishing, rebasing, or merging a tracked PR, invalidates or updates the affected summary fields.
- Secondary fields and counters are synchronized with the authority or documented as intentionally different.
- Regression tests cover stale-state retention and reintroduction after an otherwise valid correction.
