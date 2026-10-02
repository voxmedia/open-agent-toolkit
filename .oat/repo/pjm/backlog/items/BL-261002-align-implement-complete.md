---
id: BL-261002-align-implement-complete
title: Align implement, complete, and pr-final skill contracts with their actual
  behavior
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - lifecycle
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:06.018Z
updated: 2026-10-02T18:41:06.018Z
associated_issues: []
external_plans: []
---

## Description

Contract defects in the execution and closeout skills (read in the skill text):

- **E2.** `oat-project-implement` advertises `--retry-limit <N>` in its
  argument hint, but no step reads it.
- **E10.** `oat-project-complete` hardcodes `--base main`
  (`SKILL.md:1508-1509`), while the PR skills resolve the base branch from
  config.
- **E11.** `oat-project-pr-final` usage text says it will ask for a title and
  base branch; later steps fill both from defaults and push and create the PR
  automatically.

Why it matters: users pass a retry limit that has no effect; repositories
whose default branch is not `main` get completion PRs against the wrong base;
users expecting a confirmation before a push and PR creation do not get one.

Evidence: `.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/skill-guides-family-C.verify.md`,
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/skill-guides-family-D.verify.md`,
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/skill-guides-family-E.verify.md`.

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry E2, E10, E11.

## Acceptance Criteria

- `--retry-limit` is either wired into implement's retry loop (with a test)
  or removed from the hint.
- `oat-project-complete` resolves the base branch the same way the PR skills
  do; no hardcoded `main` remains.
- `oat-project-pr-final` usage text matches its behavior, or it actually asks
  before pushing and creating the PR.
- Each changed skill's `metadata.version` is bumped, and the `--retry-limit`
  note on the docs branch `docs-overhaul-readme-visual`
  (`workflows/projects/execution/execution-skills.md:74`) is removed once
  fixed.
