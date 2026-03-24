---
id: bl-fb3f
title: 'Add configurable autonomous project lifecycle follow-through'
status: open
priority: medium
scope: feature
scope_estimate: L
labels: ['automation', 'workflow', 'project-management']
assignee: null
created: '2026-03-22T00:27:02Z'
updated: '2026-03-22T00:27:02Z'
associated_issues:
  - type: project
    ref: 'local-project-management'
---

## Description

Several OAT lifecycle flows still stop at intermediate handoff points even when the next step is deterministic. This item tracks configurable autonomous follow-through for project execution so workflows can continue without requiring a new manual trigger after each successful phase boundary.

The initial target cases are:

- After converting review findings into fix tasks, automatically continue into `oat-project-implement`.
- After a final review passes, automatically create the final PR.
- Decide whether project documentation should become an explicit final phase or a configurable required step before final completion.
- Support configurable completion ordering, such as opening the final PR before marking the project complete, and optionally marking the project complete automatically after PR creation.

This should be implemented as explicit lifecycle policy rather than ad hoc chaining so teams can choose which follow-on actions run automatically and in what order.

## Acceptance Criteria

- OAT supports configured follow-on execution after review-to-fix conversion, including automatically invoking `oat-project-implement` when policy allows.
- OAT supports configured follow-on execution after a passing final review, including automatically generating the final PR when policy allows.
- The lifecycle model defines how project documentation participates in finalization, either as an explicit phase or a configurable required step, and the chosen behavior is documented.
- OAT configuration can express terminal lifecycle ordering for actions such as documentation, final PR creation, and project completion.
- Lifecycle commands respect the configured automation policy and remain safe when a required prerequisite fails or needs human input.
