---
id: BL-261002-decide-how-teams-enforce
title: Decide how teams enforce shared gate and checkpoint rules
status: open
priority: medium
scope: idea
scope_estimate: M
labels:
  - gates
  - config
  - needs-discussion
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:01.761Z
updated: 2026-10-02T18:41:01.761Z
associated_issues: []
external_plans: []
---

## Description

Team rules set in shared config are not enforceable:

- A gitignored local layer overrides a shared gate. Reproduced: a shared gate
  set with `--on-failure block --layer shared`, then
  `oat gate set … --disable --layer local`, makes `oat gate resolve` return
  `null`, and `.oat/config.local.json` (gitignored by `oat init`) holds the
  override.
- A local `hillCheckpointDefault` overrides the shared one
  (shared `every`, local `final` → `config get` returns `final`, source local).
- Interactive planning asks each developer to Keep or Disable each configured
  gate for the new project and writes `disabled` into `state.md`
  (`.agents/skills/oat-project-plan-writing/SKILL.md:413`).
- `workflow.autoArtifactReview.plan` set to `false` at any layer, including
  the local file, skips the plan review.

Why it matters: a team that sets a review gate or checkpoint in shared config
cannot rely on it; nothing outside the developer's machine records that the
gate ran. Currently the only enforcement is branch protection, required
reviewers and CI.

Reproduced with the branch CLI. Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/editorial/approvals-page.verify.md` (findings 4 and 5;
untracked in the project when this item was filed).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry C6.

## Acceptance Criteria

- A decision is recorded on whether shared gate and checkpoint rules may be
  weakened locally, and if not, which layers can lock them.
- If enforcement is wanted: OAT writes a CI-checkable record (for example, in
  the PR artifacts or project state) of which gates ran, with which config
  source, and a documented CI check fails a PR whose record shows a shared
  gate disabled or skipped.
- Docs explain the chosen model; the section "Can a teammate weaken a team
  rule?" on the docs branch `docs-overhaul-readme-visual` (`workflows/approvals-and-automation.md:173-195`) is
  updated to match.
