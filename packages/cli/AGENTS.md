# AGENTS (CLI Package)

Applies to work under `packages/cli/**`.

## Purpose

Maintain consistent, safe CLI behavior across commands and modules.

## Read first

- `docs/oat/cli/design-principles.md`
- `docs/oat/cli/provider-interop/index.md` (for provider-interop surfaces)

## Package commands

- `pnpm --filter @open-agent-toolkit/cli test`
- `pnpm --filter @open-agent-toolkit/cli lint`
- `pnpm --filter @open-agent-toolkit/cli type-check`

## Working conventions

- Keep command handlers thin; push logic into `engine/`, `manifest/`, `drift/`, and provider modules.
- Follow command ownership rules for prompts/types/utils (domain-local first, shared only when generic).
- Prefer named command files (`<command>.ts`, `<command>.test.ts`) and use `index.ts` mainly for command registration/re-export boundaries.
- Import policy: use only `./...` relative imports; use TypeScript aliases for anything outside the current directory.
- Do not use `../...`, `src/...`, or a catch-all alias like `@/*` in CLI source files.
- Preserve mutate-by-default with `--dry-run` opt-in and non-interactive/JSON contracts.
- Use explicit exit semantics (0 success, 1 actionable/user error, 2 system/runtime error).
- Avoid direct `console.*` calls in commands; route output through CLI logger utilities.
- Avoid unmanaged destructive filesystem mutations.

## Completion checks

- Tests updated for changed behavior.
- Lint and type-check pass for `@open-agent-toolkit/cli`.
- User-facing output includes clear next steps when failing.
