---
id: BL-261002-keep-hand-written-knowledge
title: Keep hand-written knowledge files and unrelated staged changes safe
  during knowledge-index refresh
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - skills
  - git
  - safety
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:52.135Z
updated: 2026-10-02T18:40:52.135Z
associated_issues: []
external_plans: []
---

## Description

The `oat-repo-knowledge-index` refresh path runs
`rm -rf .oat/repo/knowledge/*.md` before regenerating, so every Markdown file
in that directory is deleted, including hand-written ones. It then runs
`git add .oat/repo/knowledge/` and `git commit` on the current branch; the
commit is not path-scoped, so anything the user had already staged is
committed with it.

Why it matters: a user who added their own notes to `.oat/repo/knowledge/`
loses them on refresh, and unrelated staged work can land in an
"index refresh" commit on whatever branch is checked out.

Confirmed by reading the skill contract, not by running it. Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/skill-guides-family-A.verify.md` (rows for
`oat-repo-knowledge-index`). Related, not a duplicate:
BL-260927-share-one-hook-safe-exact-path (exact-path commit primitive for
lifecycle commits).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry A4.

## Acceptance Criteria

- Refresh deletes or overwrites only files it generated (for example, files it
  recorded in a manifest or that carry its generated marker); a hand-written
  `.oat/repo/knowledge/*.md` file survives a refresh.
- The refresh commit contains only the knowledge-index paths; an unrelated
  staged file stays staged and uncommitted (reuse the exact-path commit
  approach from BL-260927-share-one-hook-safe-exact-path if it has shipped).
- A skill contract test (or scripted probe) reproduces both cases and fails
  when the broad delete or broad commit returns.
- The skill's `metadata.version` is bumped, and the warning on the docs branch `docs-overhaul-readme-visual`
  (`skills/repo-improve.md:237` and its "Refresh regenerates" caveat) is
  removed once the fix ships.
