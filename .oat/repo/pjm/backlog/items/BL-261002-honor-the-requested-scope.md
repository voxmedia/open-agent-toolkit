---
id: BL-261002-honor-the-requested-scope
title: Honor the requested scope for every pack in tools install and init --setup
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - tools
  - tool-packs
  - cli
  - user-scope
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:54.250Z
updated: 2026-10-02T18:40:54.250Z
associated_issues: []
external_plans: []
---

## Description

Several install paths do not do what their scope flag says (all reproduced
with the branch CLI and an isolated HOME):

- **B2.** `oat tools install core --scope project` exits 0 and prints
  `Installed core tool pack.` but writes nothing (`--json` shows
  `"scopes":[]`, `"targetScopes":[]`). `oat tools install --scope project` with
  no pack name still installs core under the home directory
  (`~/.oat/config.json`, `~/.agents/skills/oat-docs`, `oat-doctor`,
  `~/.oat/docs/**`). `--help` shows the scope default as `all`, while a
  not-yet-installed pack lands at user scope.
- **B3.** `oat init --scope project --setup` installs all eight packs at user
  scope (`Installed tool packs: core (user), ideas (user), …`), writing
  hundreds of files under HOME, and runs `gh repo view` through
  `detectDefaultBranch` (`packages/cli/src/config/oat-config.ts:2586-2596`),
  which makes the `gh` CLI write `~/.local/state/gh/device-id`, even in a
  repository with no remote.
- **B4.** `oat tools install --scope user` writes into the current repository
  when the workflows pack is already installed there at project scope: it
  adds `localPaths` to `.oat/config.json` and a `# OAT local paths` block to
  `.gitignore` (multi-pack path, `commands/init/tools/index.ts:1461-1490`).

Why it matters: users who choose project scope to keep OAT out of their home
directory (or user scope to keep it out of the repository) get the opposite,
and a success message hides it.

Evidence: `.oat/projects/shared/docs-improvement-overhaul/references/fact-sheet-writes-and-removal.md` sections B6, D3, D4
(untracked in the project when this item was filed).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry B2, B3, B4.

## Acceptance Criteria

- `oat tools install core --scope project` either installs core at project
  scope or exits non-zero with a message saying core is user-scope only; it
  never prints "Installed" after writing nothing.
- `oat tools install --scope project` writes nothing under HOME, and
  `--scope user` writes nothing into the repository; `--help` states the real
  default and where a new pack lands.
- `oat init --scope project --setup` installs packs at project scope (or asks),
  and does not call `gh` unless the user opted into remote detection.
- Tests snapshot HOME and the repository for each command and assert no writes
  outside the requested scope.
- The "Known surprises" bullets on the docs branch `docs-overhaul-readme-visual`
  (`reference/what-oat-writes.md`, "Known surprises in 0.3.14") and the matching
  notes in `getting-started/tool-packs.md` are removed once fixed.
