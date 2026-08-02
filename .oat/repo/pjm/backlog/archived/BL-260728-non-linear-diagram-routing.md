---
id: BL-260728-non-linear-diagram-routing
title: Non-linear diagram routing
status: closed
priority: medium
scope: feature
scope_estimate: M
labels:
  - explainer-kit
  - diagrams
  - visual-quality
assignee: null
created: 2026-07-28T02:30:11.713Z
updated: '2026-07-29T16:16:26Z'
associated_issues: []
external_plans: []
---

## Description

Detect branch, fan-in, and cycle topology before inline rendering. The inline
renderer may reject unsupported topology and route the artifact to the artistic
composer; it must never silently flatten the graph into a linear chain.

## Dependencies

- Ordered outcome 3 under
  `BL-260727-close-the-explainer-kit-visual`.
- Depends on the shared set context and artistic composition path from
  `BL-260728-cohesive-adaptive-recap-set`.

## Acceptance Criteria

- Branch, fan-in, and cycle topology is detected before the inline renderer can
  serialize it.
- Unsupported topology is either preserved by the artistic composer or rejected
  with an actionable error; the inline renderer is not required to implement a
  general graph-layout engine.
- No path silently flattens a declared non-linear graph into a chain.

## Acceptance Evidence

- Diagram fixtures declare a branch, fan-in, and cycle and assert detection plus
  preservation or explicit rejection.
- A negative regression test fails when any unsupported graph reaches the
  sequential inline-layout path.
- The non-linear golden benchmark records the original graph semantics and the
  selected artistic route.

## Disposition

In the current explainer-improvements critical path. Planned for phase 4 before
the non-linear golden benchmark.
