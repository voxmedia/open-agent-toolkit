---
id: BL-260728-cohesive-adaptive-recap-set
title: Cohesive adaptive recap set
status: open
priority: high
scope: feature
scope_estimate: L
labels:
  - explainer-kit
  - recipes
  - visual-quality
assignee: null
created: 2026-07-28T02:30:11.108Z
updated: 2026-07-28T02:30:11.108Z
associated_issues: []
external_plans: []
---

## Description

Plan each recap set once and require a cohesive adaptive minimum of a visual
hub, an architecture or system visual, and a deck. Optional artifacts must be
source-backed and justified by the shared plan instead of appearing by default.

## Dependencies

- Ordered outcome 2 under
  `BL-260727-close-the-explainer-kit-visual`.
- Consumes the bundled guidance and provider contracts from
  `BL-260728-unattended-visual-author-critic`.
- Supplies the shared manifest and set context needed by
  `BL-260728-non-linear-diagram-routing` and
  `BL-260728-durable-backlinks-catalog`.

## Acceptance Criteria

- One validated set plan owns the terminology, status, number ledger, source
  coverage, adaptive portfolio, per-artifact draft, and visual intent.
- Every unattended project recap includes a cohesive hub, architecture or
  system visual, and deck; optional status, rollout, or deep-dive artifacts
  require an allowed source-backed justification.
- Every artifact author receives identical immutable set context, and retained
  records are sufficient to reproduce each request without a machine-local
  dependency.

## Acceptance Evidence

- Schema tests reject ledger drift, unknown sources, missing required drafts,
  and unjustified optional artifacts.
- Recipe and integration tests prove the planner runs once before composition,
  the adaptive minimum is always present, and identical set context reaches
  every author.
- Golden fixture manifests show exact portfolio membership and source coverage.

## Disposition

In the current explainer-improvements critical path. Planned for phase 2 and
required before browser criticism and golden benchmark execution.
