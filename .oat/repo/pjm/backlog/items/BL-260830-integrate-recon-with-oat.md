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
updated: 2026-08-30T23:13:16.914Z
associated_issues: []
external_plans: []
---

## Description

Add first-class recon orchestration to oat-project-discover and oat-project-quick-start after the standalone recon evidence-packet contract stabilizes. The lifecycle workflows should be able to offer or launch recon, resolve the packet destination and approved execution manifest, consume complete or explicitly partial packets, and preserve source/provenance boundaries through discovery pauses without forcing recon on every project.

## Acceptance Criteria

- Treat the shipped standalone `recon` packet contract as a dependency rather
  than redefining its schemas, profiles, dispatch mechanics, or approval gate
  inside project lifecycle skills.
- Let `oat-project-discover` and `oat-project-quick-start` offer first-class
  recon only when the request would benefit from evidence gathering; declining
  or lacking subagent capability must preserve the ordinary discovery path.
- Delegate model and effort approval, scope-adaptive execution planning, packet
  destination resolution, and partial-publication semantics to `recon` without
  duplicating those interactions in each lifecycle skill.
- Consume the compact packet contract while keeping `raw/` dossiers outside the
  discovery parent's context by default; reopen raw evidence only for an
  explicit targeted follow-up.
- Record the packet path, source snapshot, requested and achieved profile,
  completed passes, and material unresolved gaps in `discovery.md` so planning
  can distinguish verified evidence from partial reconnaissance.
- Preserve quick-start and discovery pause, commit, synced-project, and resume
  guarantees when recon is declined, unavailable, interrupted, partial, or
  complete.
- Add focused tests and docs covering opt-in, decline, capability failure,
  complete packet consumption, partial packet downgrade, and resume behavior
  for both lifecycle entry points.
