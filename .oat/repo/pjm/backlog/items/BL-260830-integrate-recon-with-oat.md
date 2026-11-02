---
id: BL-260830-integrate-recon-with-oat
title: Integrate recon with OAT discovery and quick start
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - recon
  - skills
  - workflows
  - integration
assignee: null
created: 2026-08-30T23:13:16.914Z
updated: 2026-11-01T16:05:00Z
associated_issues: []
external_plans: []
---

## Description

Offer opt-in recon at the OAT planning entry points: `oat-project-discover`,
`oat-project-quick-start`, `oat-project-brief` and `oat-project-goal`.
Recon already integrates through review, retro and wave execution; planning
still has no recon offer. Blocked on BL-261001-make-recon-controller-setup.

**Reframed (2026-11-01, operator):** Rescoped from discovery and quick start
only to every planning entry point, kept opt-in, with advisory text aligned to
the knowledge-index-optional policy in BL-260830-make-documentation-aware.

## Acceptance Criteria

- Each planning entry point (discover, quick-start, brief, goal) offers recon
  only when the request would benefit from evidence gathering; declining, or
  lacking subagent capability, keeps the ordinary planning path.
- The shipped `recon` packet contract is a dependency: schemas, profiles,
  dispatch, model approval and partial-publication semantics are delegated to
  `recon`, not redefined in lifecycle skills.
- The offer's advisory wording matches the knowledge-index-optional policy of
  BL-260830-make-documentation-aware: recon and the knowledge index are
  offered, never required, unless the repository opts in.
- The planning artifact records the packet path, source snapshot, achieved
  profile and material unresolved gaps, and raw dossiers stay out of the
  planning context by default.
- Pause, commit, synced-project and resume guarantees hold when recon is
  declined, unavailable, interrupted, partial or complete; focused tests and
  docs cover opt-in, decline, capability failure and partial-packet downgrade.
