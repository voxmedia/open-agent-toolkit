# Troubleshooting

## Skills not showing up in host UI

- Re-run sync: `pnpm run cli -- sync --scope all --apply`
- Restart/reload host app session
- Confirm `AGENTS.md` table matches `.agents/skills`

## Codex detected but no skill sync operations shown

- Codex skill mappings are native-read; no mirrored sync action is expected for those mappings.

## `doctor` warns about missing canonical directories

- Run: `pnpm run cli -- init --scope <project|user>`

## Manifest warnings

- If missing: run `sync --apply` or `init`
- If invalid/corrupt: repair or remove manifest and rerun

## State/artifact mismatch

- Align `state.md`, `plan.md` Reviews table, and `implementation.md` phase/task status before progressing.
