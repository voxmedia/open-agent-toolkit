---
title: Provider Interop Commands
description: 'CLI commands for provider status, sync, and drift management.'
---

# Provider Interop Commands

## Shared conventions

These command definitions inherit the cross-cutting CLI conventions in:

- [`../contributing/design-principles.md`](../contributing/design-principles.md)

## Adjacent command docs (outside provider interop scope)

- `oat init` (bootstrap): `../cli-utilities/bootstrap.md`
- `oat tools ...` (tool-pack lifecycle — install, update, remove, list, info): `../cli-utilities/tool-packs.md`
- `oat doctor` (cross-cutting diagnostics): `../reference/cli-reference.md`

## Quick Look

- What it does: defines the day-to-day provider-sync command surface for inspecting state, reconciling provider views, and changing provider enablement.
- When to use it: after you have canonical assets in place and need to check sync state, write provider views, or change provider config.
- Primary commands: `oat status`, `oat sync`, `oat providers list`, `oat providers inspect`, `oat providers set`, `oat providers codex materialize`

## `oat status`

Purpose:

- Report `in_sync`, `drifted`, `missing`, and `stray` states

Key behavior:

- Scope support (`project`, `user`, `all`)
- Optional interactive stray adoption
- Cursor-local skills are handled individually: Adopt moves the skill into the
  matching canonical `.agents/skills` directory, while Keep Cursor-only
  preserves it and records its exact path in the applicable sync config
- Aborting a Cursor migration preserves completed choices and leaves the
  current and remaining skills unresolved
- Keep Cursor-only is blocked when a canonical skill has the same name; rename
  one skill before retrying
- Non-interactive and JSON modes report unresolved Cursor skill actions without
  choosing or mutating a disposition
- JSON output for automation

## `oat sync`

Purpose:

- Reconcile provider views from canonical sources

Key behavior:

- Mutates by default; use `--dry-run` to preview
- Strategy-aware operations (`symlink`, `copy`, `auto`)
- Provider enable/disable honored via sync config
- Cursor skills are native-read from canonical `.agents/skills`; sync does not
  create `.cursor/skills` mirrors
- Upgrade cleanup removes only verified clean legacy Cursor skill views.
  Changed or unverified views are preserved and detached from obsolete manifest
  ownership.

Preview project and user cleanup before applying it:

```bash
oat sync --scope all --dry-run
```

Review every planned `remove` and `detach` operation before running the same
command without `--dry-run`.

## `oat providers list`

Purpose:

- Summarize adapters, detection, and mapping-level health summary

## `oat providers inspect <provider>`

Purpose:

- Show adapter mappings and per-scope mapping state details

## `oat providers set`

Purpose:

- Enable or disable project providers in sync config

Key behavior:

- Modifies `.oat/sync/config.json` to toggle provider enablement
- Options: `--enabled <providers>`, `--disabled <providers>` (comma-separated)
- Changes take effect on next `oat sync`

## `oat providers codex materialize`

Purpose:

- Materialize one canonical Markdown agent as a Codex TOML role and register it
  in Codex configuration

Required operands:

```bash
oat providers codex materialize <agent-name> \
  --model <model-id> \
  --effort <reasoning-effort>
```

Key behavior:

- Project scope is the default and writes only `.codex/config.toml` plus the
  project role file; `--scope user` writes only under `~/.codex`
- `--agent-path` selects a specific canonical agent and `--role-name` overrides
  the generated role name
- Managed role registration enables multi-agent support and merges an
  `agents.max_depth` floor of `2`
- Project writes preserve a higher existing project depth or inherited user
  depth without mutating user configuration; user writes do not inspect or
  mutate project configuration
- Existing unrelated Codex configuration and custom roles are preserved

## Notes

- `oat init --scope project` is commonly used before provider-interop commands because it initializes `.oat/sync/config.json`.
- User-scope known-stray choices are stored in `~/.oat/sync/config.json`.
  Legacy `~/.oat/config.json#knownStrays` entries migrate automatically before
  user-scope stray filtering.
- `oat doctor` complements interop workflows by surfacing environment and bundled-skill version issues before or after sync operations.

## Adjacent Instruction Integrity Commands

These commands are documented here because they are commonly used during interop-only repo maintenance, but they are not provider sync/drift commands.

## `oat instructions validate`

Purpose:

- Validate project-scoped `AGENTS.md` to `CLAUDE.md` integrity

Key behavior:

- Read-only validation of nested project-scoped instruction directories
- Supports `--strategy pointer|symlink|copy` to validate the expected file shape
- Reports `ok`, `missing`, `content_mismatch`, and `stray` states
- Detects Claude-only adoptable directories and unreadable/broken instruction paths as drift
- Exit code `0` when all entries are valid, `1` when drift is detected
- Detailed behavior: [`Instruction Sync`](instruction-sync.md)

## `oat instructions sync`

Purpose:

- Repair project-scoped `AGENTS.md` to `CLAUDE.md` drift

Key behavior:

- Mutates by default; use `--dry-run` to preview changes
- Supports `--strategy pointer|symlink|copy`
- Creates missing `CLAUDE.md` files using the selected strategy
- Adopts Claude-only stray files by writing canonical `AGENTS.md` content first, then regenerating `CLAUDE.md`
- Skips mismatched files unless `--force` is provided
- Skips unreadable canonical or Claude-only sources and reports manual-repair guidance instead of forcing recovery
- Uses pointer content `@AGENTS.md\n`, file symlinks, or hard copies depending on the selected strategy
- Detailed behavior and examples: [`Instruction Sync`](instruction-sync.md)
