---
id: BL-261002-provide-a-complete-oat
title: Provide a complete OAT uninstall path and make pack removal clean up
  after itself
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - tools
  - tool-packs
  - cli
  - sync
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:53.219Z
updated: 2026-10-02T18:40:53.219Z
associated_issues: []
external_plans: []
---

## Description

OAT has no uninstall command, and the removal commands that exist do not get a
repository back to its pre-OAT state:

- `oat tools remove --all --scope project` and `oat tools remove --all`
  (default scope) exit 2 with `Pack core does not allow project scope`, even
  with `--dry-run`. Only `--scope user` works.
- `oat tools remove --pack <pack> --scope project` (each pack in turn) leaves
  `.oat/templates/**` (46 files), `.oat/ideas/{backlog,scratchpad}.md`,
  `.oat/projects-root`, `.oat/sync/{config,manifest}.json`, both `.gitignore`
  blocks, `.gitattributes`, empty folders, and every generated Cursor
  model-variant file and Codex `.codex/agents/*.toml` / `[agents.*]` table.
- `.oat/config.json` keeps a stale `tools.requiredBy` entry
  (`{"utility":["research"]}`), so `oat status --scope project` then reports
  `utility: project (absent, 10 missing)` and suggests reinstalling it.
- `oat tools remove --all --scope user` leaves `~/.oat/config.json`,
  `~/.oat/sync/manifest.json` and empty `~/.agents/skills/` and
  `~/.claude/skills/` folders.

Why it matters: a team that tries OAT and backs out must follow an eight-step
manual procedure. That procedure was verified to restore the pre-OAT tree
exactly, but it is easy to get wrong (it uses `rm -r` on `.agents` and
`.oat`). The stale `requiredBy` key also produces a false "missing pack" report
after an ordinary removal.

Reproduced with the branch CLI in a scratch repository with an isolated HOME.
Evidence: `.oat/projects/shared/docs-improvement-overhaul/references/fact-sheet-writes-and-removal.md` section F (F1-F3, F8; untracked
in the project when this item was filed). Related: BL-260911-support-per-tool-scope
(per-tool scope migration).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry B1.

## Acceptance Criteria

- `oat tools remove --all` works at project scope and at the default scope
  (core is skipped or handled at its own scope, not a fatal error), with a
  truthful `--dry-run`.
- Removing a pack also removes the files that pack installed (templates,
  ideas files, scripts) and the generated Cursor and Codex copies of its
  agents, and drops the `tools.requiredBy` entries that referenced it, so
  `oat status` reports no missing pack afterwards.
- A supported command (for example `oat uninstall` or `oat init --remove`, name
  to be decided) removes OAT's repository files, `.gitignore`/`.gitattributes`
  blocks, the hook and, with an explicit flag, its home-directory files, and
  never deletes user-authored skills or projects without explicit
  confirmation.
- Tests cover a full install-then-remove cycle and assert the leftover list is
  empty (or matches a documented, intentional remainder).
- The "Backing out" section and removal table on the docs branch `docs-overhaul-readme-visual`
  (`reference/what-oat-writes.md`, "Supported removal commands" and "Remove
  everything") are replaced by the supported command once it ships.
