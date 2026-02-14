# Commands

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

## Reference artifacts

- `.oat/projects/shared/provider-interop-cli/spec.md` (FR1-FR6)
- `.oat/projects/shared/provider-interop-cli/implementation.md` (`Phase 4`, `Phase 5`, final summary)
- `packages/cli/src/commands/**`
