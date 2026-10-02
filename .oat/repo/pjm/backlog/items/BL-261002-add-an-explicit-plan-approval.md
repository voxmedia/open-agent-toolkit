---
id: BL-261002-add-an-explicit-plan-approval
title: Add an explicit plan-approval step to quick and spec-driven projects
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - lifecycle
  - workflow
  - skills
  - gates
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:57.426Z
updated: 2026-10-02T18:40:57.426Z
associated_issues: []
external_plans: []
---

## Description

Quick and spec-driven projects have no plan-approval step. The plan is marked
ready for implementation after an automatic review, and the only way for a
person to approve it is to remember to read `plan.md` before running
`/oat-project-implement`. Re-running `/oat-project-quick-start` on an
implementation-ready plan starts implementation straight away.

Contract locations: quick-start Step 3.7 marks the plan ready after the
automatic review (`oat-project-quick-start/SKILL.md:908-931`), and quick
scaffolds `oat_hill_checkpoints: []` (`scaffold.ts:177`); quick-start Step 0.5
resume sends a ready plan to `oat-project-implement`. Spec-driven scaffolds
`['discovery','design']` (`scaffold.ts:157`), so the plan is not a default
checkpoint (`oat-project-plan/SKILL.md:382`, `:706`). Lite has one approval of
its single plan.

Why it matters: adopters expect to approve the plan before code is written. A
persona reviewer could not find where a human approves the plan and concluded
that "approval means remembering to read a file". An accidental re-run can
start implementation of a plan nobody read.

Confirmed by reading the skill contracts (not run). Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/editorial/approvals-page.verify.md` (untracked in the project
when this item was filed) and
`.oat/projects/shared/docs-improvement-overhaul/reviews/p06-persona-adoption-rerun.md`
(finding H2). Related, not duplicates: BL-260927-persist-quick-start-prompt
(persisting gate-prompt approvals) and BL-260904-make-quick-the-default-oat.

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry C1.

## Acceptance Criteria

- Quick and spec-driven planning end with an explicit human plan approval
  (or a configurable checkpoint whose default is on), recorded in `state.md`
  with who/when and the approved plan revision.
- `oat-project-implement` and the quick-start resume path refuse to start
  implementation on an unapproved plan, naming the approval step; an explicit
  opt-out (config or flag) is available for unattended runs and is recorded.
- Re-running `/oat-project-quick-start` on a ready but unapproved plan asks
  for approval rather than starting implementation.
- Router, progress and next tables route an unapproved ready plan to the
  approval step; tests cover both modes and fail when the gate is removed.
- Changed skills get `metadata.version` bumps, and the "no plan approval"
  rows on the docs branch `docs-overhaul-readme-visual` (`workflows/approvals-and-automation.md:22-23` and
  `:107`) are updated once it ships.
