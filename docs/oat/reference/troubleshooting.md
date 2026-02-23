# Troubleshooting

## Skills not visible in host UI

- Run: `pnpm run cli -- sync --scope all --apply`
- Reload/restart host app session
- Verify `AGENTS.md` skills table matches `.agents/skills/*/SKILL.md`

## Worktree checkout missing provider links

- Run: `pnpm run worktree:init`
- This command installs dependencies, builds the workspace, and runs `oat sync --scope project --apply`.

## Codex appears detected but no skill sync actions are listed

Expected for native-read skill mappings. Codex can read canonical skills without mirrored provider writes.

## `sync` reports provider config mismatch

- For interactive runs, select detected providers to enable when prompted.
- For non-interactive runs, configure providers explicitly:
  - `oat providers set --scope project --enabled <providers> --disabled <providers>`
- Re-run `oat sync --scope project --apply` after updating config.

## `instructions validate` reports `missing` or `content_mismatch`

- Run `oat instructions sync` to preview changes.
- Run `oat instructions sync --apply` to create missing pointer files.
- If mismatched `CLAUDE.md` files should be overwritten, run `oat instructions sync --apply --force`.
- Re-run `oat instructions validate` and confirm status is `ok`.

## `doctor` warns about canonical directories

- Run `oat init` for the relevant scope.
- Re-run `oat doctor` after initialization.

## Manifest not found or invalid

- Missing manifest: run `sync --apply` or `init`
- Invalid manifest: repair/remove file and rerun

## Status/output mismatches with lifecycle expectations

- Reconcile `state.md`, `plan.md` review table, and `implementation.md`.
- Ensure phase/review status has been updated after reviews and fix cycles.

## Reference artifacts

- `.oat/projects/<scope>/<project>/implementation.md`
- `.oat/projects/<scope>/<project>/reviews/`
- `packages/cli/src/commands/doctor/index.ts`
- `packages/cli/src/commands/instructions/`
