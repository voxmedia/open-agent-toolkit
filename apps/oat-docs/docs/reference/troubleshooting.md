---
title: Troubleshooting
description: 'Common issues and fixes for skills visibility, worktrees, sync, and manifest problems.'
---

# Troubleshooting

## Skills not visible in host UI

- Run: `pnpm run cli -- sync --scope all`
- Reload/restart host app session
- Verify `AGENTS.md` skills table matches `.agents/skills/*/SKILL.md`

## Worktree checkout missing provider links

- Run: `pnpm run worktree:init`
- This command installs dependencies, builds the workspace, and runs `oat sync --scope project`.

## Codex appears detected but no skill sync actions are listed

Expected for native-read skill mappings. Codex can read canonical skills without mirrored provider writes.

## `sync` reports provider config mismatch

- For interactive runs, select detected providers to enable when prompted.
- For non-interactive runs, configure providers explicitly:
  - `oat providers set --scope project --enabled <providers> --disabled <providers>`
- Re-run `oat sync --scope project` after updating config.

## `instructions validate` reports `missing` or `content_mismatch`

- Run `oat instructions sync` to preview changes.
- Run `oat instructions sync` to create missing pointer files.
- If mismatched `CLAUDE.md` files should be overwritten, run `oat instructions sync --force`.
- Re-run `oat instructions validate` and confirm status is `ok`.

## `doctor` warns about canonical directories

- Run `oat init` for the relevant scope.
- Re-run `oat doctor` after initialization.

## `doctor` warns about outdated installed OAT skills

- Run `oat init tools` to install/update bundled OAT tool packs.
- In TTY mode, select which outdated skills to update when prompted.
- In non-interactive mode, rerun the relevant pack subcommand with `--force` if you want to overwrite outdated installed skills.

## Manifest not found or invalid

- Missing manifest: run `sync` or `init`
- Invalid manifest: repair/remove file and rerun

## Status/output mismatches with lifecycle expectations

- Reconcile `state.md`, `plan.md` review table, and `implementation.md`.
- Ensure phase/review status has been updated after reviews and fix cycles.

## Reference artifacts

- `.oat/projects/<scope>/<project>/implementation.md`
- `.oat/projects/<scope>/<project>/reviews/`
- `packages/cli/src/commands/doctor/index.ts`
- `packages/cli/src/commands/instructions/`
