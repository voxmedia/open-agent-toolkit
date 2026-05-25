---
title: Manifest and Drift
description: 'Manifest tracking, drift states, and stray adoption for canonical-to-provider reconciliation.'
---

# Manifest and Drift

This page explains how OAT remembers what it manages and how it distinguishes clean sync state from drift, missing files, or unmanaged strays.

## Quick Look

- What it does: describes the manifest contract behind provider sync and the drift/adoption model built on top of it.
- When to use it: when `oat status` shows drift or strays and you need to understand why OAT thinks a file is managed, missing, or adoptable.
- Primary commands: `oat status`, `oat init`, `oat sync`

## Manifest locations

- Project: `.oat/sync/manifest.json`
- User: `~/.oat/sync/manifest.json`

## Manifest purpose

Tracks managed mappings so the CLI can:

- detect drift safely
- avoid deleting unmanaged provider content
- execute scoped removals only for managed entries

Install-triggered auto-sync narrows that removal scope further: after `oat tools install <pack>`, the follow-up sync only plans removals for canonical entries from the installed pack. This protects unrelated provider views if the current worktree has stale manifest entries for other packs whose canonical assets are missing locally.

Autonomous worktree bootstrap also treats sync output as setup state. `oat-worktree-bootstrap-auto` checks inherited cleanliness before the all-scope sync run, then commits dirty sync-managed output as `chore: run sync` when needed. The commit is scoped to existing or tracked sync paths (`.oat/sync/manifest.json`, `.claude`, `.cursor`, `.codex`) and reports the result as `sync_commit: pass | fail | skip` in its structured status.

For transformed mappings such as project-scoped rules, the manifest stores hashes for the rendered provider output that was actually written, not the canonical source markdown. This keeps drift detection aligned with the on-disk managed file.

## Drift states

- `in_sync`
- `drifted`
- `missing`
- `stray`

`drifted` reasons currently include:

- `modified`
- `broken`
- `replaced`

Rendered rule files participate in the same drift states as other managed copies. If a provider rule file is edited directly, drift is computed against the expected rendered output for that provider.

## Stray adoption

`oat init` and `oat status` can offer adoption of unmanaged provider entries into canonical `.agents`.

Provider files ignored by Git are treated as intentionally local runtime files and are not reported as strays. This includes files covered by tracked `.gitignore`, repo-local `.git/info/exclude`, or other standard Git exclude mechanisms.

For rules, adoption maps provider-native files back into `.agents/rules/*.md`:

- Claude: `.claude/rules/*.md`
- Cursor: `.cursor/rules/*.mdc`
- Copilot: `.github/instructions/*.instructions.md`

After adoption, `oat sync` regenerates the managed provider copies from the canonical rule file.

### Generated provider roles

Some Codex roles are **generated-derived** — produced by the Codex sync extension rather than mapped 1:1 from a canonical `.agents/agents/*.md` file. The effort-specific implementer variants (`oat-phase-implementer-low`, `oat-phase-implementer-medium`, `oat-phase-implementer-high`) are the current example.

`oat status` and `oat init` treat any role listed in the Codex extension plan's `managedRoles` set as managed, so generated variants are **not** reported as `stray` and are **not** offered for adoption — even though they have no canonical `.agents` source. A genuinely orphaned Codex role (no canonical source and not in `managedRoles`) is still flagged.

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md` (FR2, FR3, FR6)
- `.oat/projects/<scope>/<project>/design.md`
- `packages/cli/src/manifest/**`
- `packages/cli/src/drift/**`
