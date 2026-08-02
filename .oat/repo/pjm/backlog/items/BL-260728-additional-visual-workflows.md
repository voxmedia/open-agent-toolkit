---
id: BL-260728-additional-visual-workflows
title: Additional visual workflows
status: open
priority: low
scope: feature
scope_estimate: L
labels:
  - explainer-kit
  - recipes
  - follow-up
assignee: null
created: 2026-07-28T02:30:12.949Z
updated: 2026-07-28T02:30:12.949Z
associated_issues: []
external_plans: []
---

## Description

Evaluate diff review, plan review, fact-check, dashboard, complex table, and
richer composition workflows after golden unattended recap quality is
restored.

## Dependencies

- Ordered outcome 5 under
  `BL-260727-close-the-explainer-kit-visual`.
- Begins only after the golden recovery outcomes
  `BL-260728-unattended-visual-author-critic`,
  `BL-260728-cohesive-adaptive-recap-set`,
  `BL-260728-non-linear-diagram-routing`, and
  `BL-260728-durable-backlinks-catalog` are complete.

## Acceptance Criteria

- A recorded product decision prioritizes each candidate workflow using observed
  demand and identifies whether it belongs in a bundled recipe or remains an
  author-selected capability.
- Any workflow selected for implementation has an independently testable recipe
  contract, acceptance fixture, and publication/review behavior.
- No candidate is added to the golden recap recovery merely because upstream
  supports it.

## Acceptance Evidence

- The decision record cites usage evidence and names accepted, deferred, and
  rejected workflows.
- Each accepted workflow has a follow-up plan with recipe tests and a portable
  benchmark fixture before implementation begins.

## Disposition

Outside the current explainer-improvements critical path. Retained as a P2
follow-up after golden recap release closure.
