---
id: BL-260901-add-corrective-revision
title: Add corrective-revision transition after review exhaustion
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - project-lifecycle
  - reviews
  - revisions
assignee: null
created: 2026-09-01T20:02:34.731Z
updated: 2026-09-01T20:02:34.731Z
associated_issues: []
external_plans: []
---

## Description

Add a first-class recovery path when a phase or final review exhausts its configured fix budget but identifies a design-level correction. The transition must retain the exhausted review evidence and authorization boundary while turning the correction into explicit revision work instead of an improvised continuation.

## Acceptance Criteria

- When a phase or final review exhausts its configured fix budget, the workflow
  can offer a named corrective-revision transition without resetting or
  obscuring the exhausted budget.
- Entering corrective revision requires explicit user authorization and
  preserves links to the source review, its findings, and the phase or final
  state that triggered the transition.
- The transition creates bounded revision tasks whose scope is derived from the
  accepted findings rather than reopening unrelated implementation work.
- Completing corrective revision requires a fresh whole-history review; a
  review limited only to the corrective patch cannot satisfy the exit gate.
- Interrupted, declined, and partially completed corrective revisions remain
  resumable without losing the original review evidence or authorization state.
- Tests and workflow documentation cover phase-review and final-review
  exhaustion, authorization decline, successful revision, resume behavior, and
  mandatory whole-history re-review.
