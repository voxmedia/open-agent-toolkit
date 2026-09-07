---
id: BL-260907-replace-the-default-project
title: Replace the default project recap with a direct agent-authored visual flow
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - explainer
  - lifecycle
  - simplification
assignee: null
created: 2026-09-07T13:44:01.781Z
updated: 2026-09-07T13:44:01.781Z
associated_issues: []
external_plans: []
---

## Description

Replace the implementation-tail project recap path with one dependable agent-authored HTML recap and browser-based visual verification. Keep advanced Explainer Kit recipes available, but stop requiring adaptive portfolio planning, five injected provider seams, multi-artifact expansion, and publish/durability machinery for the ordinary lifecycle recap. Relates to GitHub issue #230 and should reconcile or supersede BL-260902-make-autonomous-project-recap and BL-260904-add-recap-seam-config-keys before implementation.

## Acceptance Criteria

- The ordinary implementation-tail recap no longer depends on adaptive set planning,
  injected author/critic/browser/visual-critic module paths, multi-artifact expansion,
  or publish/durability machinery; advanced Explainer Kit recipes remain available
  through their explicit workflow.
- The active host agent receives an allowlisted fact bundle from approved project
  artifacts and produces one standalone, navigable HTML recap without requiring
  custom provider modules on a normally configured host.
- The recap is opened through an available browser surface and checked at
  representative narrow, medium, and wide viewport widths, with artifact and
  screenshot paths retained in a small result record.
- A `generate` decision is satisfied only when a usable visual artifact exists.
  Generation failure preserves a sanitized actionable cause and requires an explicit
  retry or skip decision instead of becoming a silent closeout warning.
- Focused tests exercise a fresh-host successful generation path and reproduction-grade
  negative controls for provider and browser failures, proving the failures remain
  visible while a valid accepted control still produces the recap.
- Before implementation, reconcile or supersede
  `BL-260902-make-autonomous-project-recap` and
  `BL-260904-add-recap-seam-config-keys` so the backlog does not simultaneously direct
  contributors to add the seam machinery this item removes from the default path.
