---
id: BL-260830-integrate-recon-across
title: Integrate recon across analysis and research workflows
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - recon
  - skills
  - research
  - integration
  - deferred
assignee: null
created: 2026-08-30T23:13:17.543Z
updated: 2026-11-01T16:05:00Z
associated_issues: []
external_plans: []
---

## Description

Extend the proven standalone recon evidence-packet contract across the broader analysis and research skill family. Define deliberate handoffs for analyze, deep-research, skeptic, synthesize, and review-oriented consumers while preserving each skill's ownership boundary, avoiding duplicate reconnaissance, and keeping raw dossiers outside expensive consumer context by default.

Merged from BL-260719-add-pinned-recon-agents (2026-11-01): the recon-scoped
`recon-worker` leaf and the `recon` role class in `oat-dispatch-subagents`
already shipped; a generic pinned recon role is now a conditional criterion
here.

**Deferred (2026-11-01, operator):** Take up only after
BL-260830-integrate-recon-with-oat ships and a real duplicate-reconnaissance
case appears across two of these skills.

## Acceptance Criteria

- Inventory the evidence needs and ownership boundaries of `analyze`,
  `deep-research`, `skeptic`, `synthesize`, and review-oriented workflows before
  selecting which callers should invoke recon versus consume an existing
  packet.
- Reuse the standalone `recon` packet schema, rigor profiles, user-approved
  model contract, and dispatch integration without introducing caller-specific
  packet forks.
- Define explicit handoff contracts that prevent duplicate reconnaissance,
  preserve each caller's final synthesis or review authority, and keep raw
  dossiers outside expensive consumer context by default.
- Preserve selectively blind verification and adversarial boundaries when a
  caller requests additional passes or follows up on contested and unresolved
  claims.
- Handle unavailable source capabilities, structurally invalid runs, and honest
  partial packets consistently across every integrated caller.
- Build a generic, read-only, non-recursive pinned recon role that an
  orchestrator selects by declared task-class/model floor only when a second
  non-recon orchestrator needs it. It keeps native generic-worker selection and
  caller-inline fallback, never selects below the floor, and is never a
  prerequisite for the general-purpose skill or its consumers
  (`DR-260910-restore-economical-recon`,
  `DR-260719-full-reviewers-are-not-recon`).
- Add cross-skill contract tests, representative end-to-end packet handoffs,
  and documentation that makes automatic invocation, explicit packet
  consumption, and non-integration behavior distinguishable.
