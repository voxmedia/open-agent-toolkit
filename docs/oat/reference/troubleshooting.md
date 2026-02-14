# Troubleshooting

## Skills not visible in host UI

- Run: `pnpm run cli -- sync --scope all --apply`
- Reload/restart host app session
- Verify `AGENTS.md` skills table matches `.agents/skills/*/SKILL.md`

## Codex appears detected but no skill sync actions are listed

Expected for native-read skill mappings. Codex can read canonical skills without mirrored provider writes.

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
