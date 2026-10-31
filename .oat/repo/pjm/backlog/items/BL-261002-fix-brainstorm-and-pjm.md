---
id: BL-261002-fix-brainstorm-and-pjm
title: Fix brainstorm and PJM template contract gaps for lite mode and archive-dated
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - skills
  - pjm
  - templates
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:07.191Z
updated: 2026-10-31T21:08:00Z
associated_issues: []
external_plans: []
---

## Description

Small contract defects (read in the skill and template text):

- **E5.** `oat-pjm-review-backlog` accepts `--archive-dated`, but the flag is
  missing from its argument hint.
- **E6.** `oat-brainstorm` contradicts its own lite branch
  (`references/destinations.md:122-126` and `SKILL.md:821` vs
  `SKILL.md:509-548`).
- **E8.** The PJM kickoff-handoff templates
  (`.oat/templates/pjm-handoffs-readme.md`, `pjm-agents.md:89-90`) omit the
  lite workflow mode when listing modes to recommend.

Why it matters: users cannot discover a supported flag, agents get two
answers about where a lite brainstorm goes, and generated handoffs never
recommend lite.

Evidence: `.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/skill-guides-family-D.verify.md` and
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/04-ideas-promotion.verify.md`.

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry E5, E6, E8.

**Delivery status (2026-10-31):** Landed: E6. The brief workflow mode (#361,
`d1e2a93c1`) made `oat-brainstorm/references/destinations.md:125-126` and the
skill's lite branch (`SKILL.md:523`) both route a lite brainstorm to `plan.md`
and `oat-project-lite`. Remaining: E5 (the `argument-hint` at
`oat-pjm-review-backlog/SKILL.md:4` still omits `--archive-dated`, which `:68`
documents) and E8 (`.oat/templates/pjm-agents.md:121-122` and
`.oat/templates/pjm-handoffs-readme.md:11` still offer only
`oat-project-quick-start` or `oat-project-new`).

## Acceptance Criteria

- `oat-pjm-review-backlog`'s argument hint lists `--archive-dated`.
- The kickoff-handoff templates list lite alongside quick and spec-driven.
- Changed skills get `metadata.version` bumps; template changes follow the
  lockstep release rule.
