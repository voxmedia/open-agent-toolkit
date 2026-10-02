---
id: BL-261002-decide-first-run-defaults
title: Decide first-run defaults for project scope without origin and
  non-interactive pack install
status: open
priority: medium
scope: idea
scope_estimate: M
labels:
  - workflow
  - tool-packs
  - ux
  - needs-discussion
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:12.309Z
updated: 2026-10-02T18:41:12.309Z
associated_issues: []
external_plans: []
---

## Description

First-run behaviors that may be intended but surprise new adopters:

- **F1.** New tracked projects default to the synced scope, which needs an
  `origin` remote and pushes `refs/oat/projects/<name>` there when the project
  is saved. In a repository without `origin`, the first `oat project new`
  fails (`Synced project creation requires a configured origin remote.
Configure origin or use --scope local.`, exit 1, no writes). Entry skills
  other than `oat-project-new` cannot take a scope. A fresh clone does not
  receive `refs/oat/*`.
- **F2.** A non-interactive `oat tools install` installs all eight packs.

Why it matters: a first project in a local or new repository fails, and teams
learn that project files are pushed to `origin` only after it has happened; a
scripted install brings in far more than a first-time user needs.

Reproduced (F1 creation behavior) with the branch CLI. Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fact-sheet-writes-and-removal.md` sections E1-E4 (untracked in the
project when this item was filed). F2 is from the defect list.

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry F1, F2.

## Acceptance Criteria

- A decision is recorded on the default project scope for repositories with
  and without `origin` (for example, fall back to shared or local with a
  message, or keep synced and make every entry skill accept a scope).
- A decision is recorded on the non-interactive default pack set.
- Whatever is chosen is implemented with tests for the no-`origin` case, and
  the docs branch `docs-overhaul-readme-visual` (`workflows/projects/planning/starting-projects.md:55-57` and
  `:155`, `reference/what-oat-writes.md:139`) describe it.
