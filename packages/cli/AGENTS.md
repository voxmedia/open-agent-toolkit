# AGENTS (CLI Package)

Applies to work under `packages/cli/**`.

## Purpose

Maintain consistent, safe CLI behavior across commands and modules.

## Read first

- `docs/oat/cli/design-principles.md`
- `docs/oat/cli/provider-interop/index.md` (for provider-interop surfaces)

## Package commands

- `pnpm --filter @oat/cli test`
- `pnpm --filter @oat/cli lint`
- `pnpm --filter @oat/cli type-check`

## Working conventions

- Keep command handlers thin; push logic into `engine/`, `manifest/`, `drift/`, and provider modules.
- Preserve dry-run-first and non-interactive/JSON contracts.
- Use explicit exit semantics (0 success, 1 actionable/user error, 2 system/runtime error).
- Avoid unmanaged destructive filesystem mutations.

## Completion checks

- Tests updated for changed behavior.
- Lint and type-check pass for `@oat/cli`.
- User-facing output includes clear next steps when failing.
