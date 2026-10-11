---
id: BL-261011-route-a-standalone-out
title: Route a standalone Out of Scope brief section into discovery on promotion
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - brief-goal-workflow-modes
  - review-follow-up
  - promote
assignee: null
created: 2026-10-11T06:34:53.365Z
updated: 2026-10-11T06:34:53.365Z
associated_issues: []
external_plans: []
---

## Description

Deferred from the p04 round-2 review (Low). oat project promote --to quick renders the brief's Goal, Outcomes, Approach, Decisions, Constraints, Known Unknowns, and delivery endpoint and authority into discovery.md. A brief that carries a standalone '## Out of Scope' section (rather than the combined 'Constraints and Out of Scope' section) is preserved only in references/brief-archive.md. Additive fix: render a standalone Out of Scope section into discovery.md's Constraints (or a dedicated subsection) and pin it in promote.brief.test.ts.

## Acceptance Criteria

- A brief with a standalone ## Out of Scope section promotes with that text in discovery.md
- promote.brief.test.ts pins the rendering
