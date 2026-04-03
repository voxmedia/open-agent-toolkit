---
title: Provider Interop Commands
description: 'CLI commands for provider status, sync, and drift management.'
---

# Provider Interop Commands

## Shared conventions

These command definitions inherit the cross-cutting CLI conventions in:

- [`../contributing/design-principles.md`](../contributing/design-principles.md)

## Adjacent command docs (outside provider interop scope)

- `oat init` (bootstrap): `../guide/getting-started.md`
- `oat tools ...` (tool-pack lifecycle — install, update, remove, list, info): `../guide/tool-packs.md`
- `oat doctor` (cross-cutting diagnostics): `../reference/cli-reference.md`

## `oat status`

Purpose:

- Report `in_sync`, `drifted`, `missing`, and `stray` states

Key behavior:

- Scope support (`project`, `user`, `all`)
- Optional interactive stray adoption
- JSON output for automation

## `oat sync`

Purpose:

- Reconcile provider views from canonical sources

Key behavior:

- Mutates by default; use `--dry-run` to preview
- Strategy-aware operations (`symlink`, `copy`, `auto`)
- Provider enable/disable honored via sync config

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

## Notes

- `oat init --scope project` is commonly used before provider-interop commands because it initializes `.oat/sync/config.json`.
- `oat doctor` complements interop workflows by surfacing environment and bundled-skill version issues before or after sync operations.

## Adjacent Instruction Integrity Commands

These commands are documented here because they are commonly used during interop-only repo maintenance, but they are not provider sync/drift commands.

## `oat instructions validate`

Purpose:

- Validate AGENTS.md to CLAUDE.md pointer integrity

Key behavior:

- Read-only validation of sibling `CLAUDE.md` pointer files for each discovered `AGENTS.md`
- Reports `ok`, `missing`, and `content_mismatch` states
- Exit code `0` when all entries are valid, `1` when drift is detected

## `oat instructions sync`

Purpose:

- Repair AGENTS.md to CLAUDE.md pointer drift

Key behavior:

- Mutates by default; use `--dry-run` to preview changes
- Creates missing `CLAUDE.md` pointers
- Skips mismatched files unless `--force` is provided
- Writes canonical pointer content `@AGENTS.md\n`
