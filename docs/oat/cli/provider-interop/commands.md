# Commands

## Shared conventions

These command definitions inherit the cross-cutting CLI conventions in:

- `docs/oat/cli/design-principles.md`

## `oat init`

Purpose:
- Bootstrap canonical directories
- Detect and optionally adopt strays
- Optionally install drift warning hook

Key behavior:
- Idempotent initialization
- Interactive adoption in TTY mode
- JSON/non-TTY contract support

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
- Dry-run default
- `--apply` for mutation
- Strategy-aware operations (`symlink`, `copy`, `auto`)
- Provider enable/disable honored via sync config

## `oat providers list`

Purpose:
- Summarize adapters, detection, and mapping-level health summary

## `oat providers inspect <provider>`

Purpose:
- Show adapter mappings and per-scope mapping state details

## `oat doctor`

Purpose:
- Run environment diagnostics with pass/warn/fail outcomes and fix guidance

## Other implemented namespaces

## `oat cleanup project`

Purpose:
- Cleanup project pointers, state, and lifecycle drift

Key behavior:
- Scans `.oat/projects/shared/*` and `.oat/projects/local/*` plus `.oat/active-project`
- Dry-run default with `--apply` for mutation
- Repairs invalid active-project pointer, missing `state.md`, and missing `oat_lifecycle: complete` on completed projects

## `oat cleanup artifacts`

Purpose:
- Cleanup stale review and external-plan artifacts

Key behavior:
- Scans `.oat/repo/reviews/` and `.oat/repo/reference/external-plans/`
- Dry-run default with `--apply` for mutation
- Prunes duplicate chains automatically; handles stale candidates via archive/delete/keep triage
- In non-interactive apply mode, stale deletions require `--all-candidates --yes`; referenced candidates remain blocked

## `oat project new <name>`

Purpose:
- Create/update OAT project scaffolds with mode support (`full`, `quick`, `import`)

Key behavior:
- Non-destructive scaffold generation (fills missing files, keeps existing files)
- Supports `--mode`, `--force`, `--no-set-active`, and `--no-dashboard`

## `oat internal validate-oat-skills`

Purpose:
- Validate required structure for `oat-*` skills

Key behavior:
- Exit code `0` for pass, `1` for validation findings, `2` for runtime error
- Primary invocation path remains `pnpm oat:validate-skills`

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md` (FR1-FR6)
- `.oat/projects/<scope>/<project>/implementation.md` (`Phase 4`, `Phase 5`, final summary)
- `packages/cli/src/commands/**`
