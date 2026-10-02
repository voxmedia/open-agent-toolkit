---
id: BL-261002-clean-up-stale-provider-views
title: Clean up stale provider views and Codex entries when a canonical agent is
  deleted or renamed
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - sync
  - provider-sync
  - codex
  - cli
  - safety
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:49.939Z
updated: 2026-10-02T18:40:49.939Z
associated_issues: []
external_plans: []
---

## Description

When Cursor or Codex is enabled, deleting or renaming a canonical agent under
`.agents/agents/` breaks sync. `oat sync --scope project`, its `--dry-run`, and
`oat status` all exit 1 with `Cursor agent definition is a symbolic link at
.cursor/agents/<name>.md whose target escapes the sync scope.` After that
dangling link is deleted by hand, the commands fail again on the matching
dangling link under `.claude/agents/`. Sync recovers only after every
dangling agent link is removed by hand. Codex's generated
`.codex/agents/<name>.toml` and its `[agents.<name>]` table in
`.codex/config.toml` are never removed.

Why it matters: an ordinary rename or deletion of an agent leaves the whole
team unable to run `oat sync` or `oat status` until someone finds and deletes
the dangling links manually. Stale Codex role definitions also stay registered
indefinitely. A related leftover was seen in pack removal: removing the
workflows and research packs left 71 Codex TOML files and 69 `[agents.*]`
tables, and a following `oat sync --scope project` removed nothing
(fact sheet section F2).

Reproduced with the branch CLI in a scratch repository with claude, cursor and
codex enabled. Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/editorial/fact-sheet-pages.verify.md` (finding P2) and
`.oat/projects/shared/docs-improvement-overhaul/references/fact-sheet-writes-and-removal.md` (F2). Both files were untracked in the
project when this item was filed.

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry A2.

## Acceptance Criteria

- After a canonical agent is deleted or renamed, `oat sync --scope project`
  removes the dangling `.cursor/agents/`, `.claude/agents/` and `.github/agents/`
  views it owns and exits 0; `oat status` reports the change instead of
  failing.
- Sync removes the deleted agent's generated `.codex/agents/<name>.toml` and its
  `[agents.<name>]` table in `.codex/config.toml`, leaving user-authored tables
  untouched; the same cleanup applies when a pack removal deletes agents.
- `--dry-run` lists these removals and writes nothing.
- Regression tests cover delete and rename with Cursor and Codex enabled, and
  fail when the cleanup is removed.
- The manual-cleanup warnings on the docs branch `docs-overhaul-readme-visual`
  (`provider-sync/manifest-and-drift.md:65-70`,
  `provider-sync/pilot-with-a-team.md:147` and `:158`) are removed once the
  fix ships.
