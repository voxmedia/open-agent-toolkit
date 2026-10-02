---
id: BL-261002-fix-project-planning-skill
title: Fix project planning skill handoffs and inputs across discover, spec,
  promote, split, and plan
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - skills
  - lifecycle
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:04.931Z
updated: 2026-10-02T18:41:04.931Z
associated_issues: []
external_plans: []
---

## Description

Contract defects in the project planning skills (read in the skill text; not
run end to end):

- **E1.** `oat-project-spec` requires discovery marked ready for
  `oat-project-spec`, but `oat-project-discover` finishes ready for
  `oat-project-design`.
- **E3.** `oat-project-promote-spec-driven` advertises `--project`, which
  step 0 never reads.
- **E4.** `oat-project-split` accepts only `--plan-file`, while
  `oat-brainstorm` and `oat-project-discover` hand it an in-conversation
  payload; split also creates children in quick mode.
- **E7.** `oat-project-new/SKILL.md:94` and the spec, design, plan and promote
  fallbacks check the shared projects root, which is wrong for the default
  synced scope.
- **E9.** `oat-project-plan` updates `spec.md` but commits only `plan.md` and
  `state.md` outside synced scope.

Why it matters: an agent following these contracts can stall at a handoff
that never matches, ignore a flag the user passed, fail to find a project in
the default scope, or leave a spec edit uncommitted.

Evidence: `.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/skill-guides-family-B.verify.md` and
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/04-ideas-promotion.verify.md`.

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry E1, E3, E4, E7, E9.

## Acceptance Criteria

- Discover's ready-for value and spec's required value agree (or spec accepts
  both), with a contract test pinning the handoff.
- Every advertised argument of promote-spec-driven is read, or removed from
  the hint.
- Split accepts the payload its callers send (or callers write a plan file
  first), and the child mode is chosen deliberately and documented.
- Project-root lookups in new/spec/design/plan/promote resolve the configured
  scope (synced by default) rather than the shared root.
- The plan skill commits every file it changed.
- Each changed skill's `metadata.version` is bumped.
