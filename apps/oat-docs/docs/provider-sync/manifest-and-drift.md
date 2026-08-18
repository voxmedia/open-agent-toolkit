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

Provider files listed in sync config `knownStrays` are also omitted from stray
summaries and adoption prompts. Known strays can be configured at project scope
in `.oat/sync/config.json` or user scope in `~/.oat/sync/config.json`; entries use
exact provider-path matching, so `.cursor/skills/cloud-environment-setup` does
not suppress `.cursor/skills/cloud-environment-setup-extra`.

### Cursor skill migration

Cursor reads canonical project and user skills directly from `.agents/skills`
and `~/.agents/skills`. OAT therefore treats `.cursor/skills` as a Cursor-only
extension and adoption surface rather than generated output.

Interactive `oat init` and `oat status` ask about every unresolved Cursor-local
skill separately:

- **Adopt:** move the skill to the matching canonical `.agents/skills`
  directory without creating a Cursor skill view or manifest row. If identical
  canonical content already exists, OAT removes the redundant Cursor-local
  copy.
- **Keep Cursor-only:** leave the skill in place and immediately add its exact
  normalized path to the applicable project or user sync config.
- **Abort:** keep the current and remaining skills unresolved. Choices already
  completed in the same run remain saved.

Keep Cursor-only is unavailable when a canonical skill has the same name.
Rename one skill before retrying; Cursor does not document a safe precedence
rule for duplicates discovered from both roots. Non-interactive and JSON modes
report pending migration actions without choosing or mutating a disposition.

### Retiring legacy Cursor skill views

When upgrading from generated Cursor skill views, sync classifies each obsolete
manifest-owned path before acting:

- Verified clean symlinks and managed copies are removed with their manifest
  entries.
- Missing paths lose only their stale manifest entries.
- Modified, replaced, broken, unreadable, or otherwise unverified paths are
  preserved while OAT detaches their obsolete manifest ownership.
- Unmanaged Cursor-only content is never removed.

Use `oat sync --scope <project|user|all> --dry-run` to distinguish planned
removal from preserve-and-detach operations before running a mutating sync.

### Copilot skill migration

Copilot reads canonical project and user skills directly from `.agents/skills`
and `~/.agents/skills`. OAT no longer generates `.github/skills` or
`~/.copilot/skills` views, but it still scans those legacy directories as
adoption sources.

Interactive `oat init` and `oat status` ask about each unresolved Copilot-local
skill separately. Adopt moves it into the matching canonical directory without
recreating a provider view or manifest entry. Keep Copilot-only leaves it in
place and records its exact path as a known stray. A same-name canonical skill
blocks Keep Copilot-only until one package is renamed. Non-interactive and JSON
modes report pending migration actions without choosing a disposition.

During upgrade cleanup, OAT removes only verified clean manifest-owned views.
Changed, replaced, broken, unreadable, or otherwise unverifiable paths are
preserved and detached from obsolete manifest ownership so they remain
available for adoption or manual resolution.

Copilot agent mappings remain materialized under `.github/agents` and
`~/.copilot/agents`, and project rules remain rendered under
`.github/instructions`; this retirement behavior applies only to skill views.

For rules, adoption maps provider-native files back into `.agents/rules/*.md`:

- Claude: `.claude/rules/*.md`
- Cursor: `.cursor/rules/*.mdc`
- Copilot: `.github/instructions/*.instructions.md`

After adoption, `oat sync` regenerates the managed provider copies from the canonical rule file.

### Generated provider roles

Some Codex roles are **generated-derived** - produced by the Codex sync
extension rather than mapped 1:1 from a canonical `.agents/agents/*.md` file.
Materialized dispatch roles are the current example: a matrix target or
`oat providers codex materialize` command supplies a canonical agent, model, and
reasoning effort, and OAT writes a role such as
`oat-phase-implementer-gpt-5-6-terra-xhigh`.

`oat status` and `oat init` treat any role listed in the Codex extension plan's `managedRoles` set as managed, so generated variants are **not** reported as `stray` and are **not** offered for adoption — even though they have no canonical `.agents` source. A genuinely orphaned Codex role (no canonical source and not in `managedRoles`) is still flagged.

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md` (FR2, FR3, FR6)
- `.oat/projects/<scope>/<project>/design.md`
- `packages/cli/src/manifest/**`
- `packages/cli/src/drift/**`
