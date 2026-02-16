# CLI Design Principles

This page captures cross-cutting design and implementation principles for OAT CLI features.

Use this as the default contract for new CLI commands and modules. Provider- or domain-specific behavior should be layered on top in sub-docs (for example, provider interop docs).

## Scope

These principles apply to `packages/cli/src/**`:

- Command architecture and boundaries
- User interaction and output behavior
- Safety and mutation contracts
- Error semantics and exit codes
- Verification expectations

## Architectural Principles

- Keep commands thin: parse args, validate inputs, orchestrate services.
- Keep business logic in modules (`engine/`, `drift/`, `manifest/`, `providers/`), not in command handlers.
- Use explicit type contracts for command inputs/outputs and adapter behavior.
- Prefer deterministic pure planning stages before execution (compute plan first, then optionally apply).
- Use command-factory exports for top-level commands (`createXCommand(): Command`).

## Module Placement Rules

- If a command needs dedicated prompts/types/utils, use a command directory (`commands/<name>/`).
- Keep single-file commands only for trivial read-only behavior.
- Keep command-specific prompts in the command module; reserve `shared/prompts.ts` for reusable primitives.
- Keep domain validation close to the owning domain (`*.types.ts` near command/provider modules).
- Keep shared utilities generic; move domain-specific utilities into the owning command/provider area.

## Runtime Bootstrap and Flags

- Startup order: load runtime config -> validate env/input -> build command context -> register commands.
- Register global flags early and consistently (`--json`, `--verbose`, `--scope`, `--cwd`).

## UX and Output Principles

- Default to safe behavior for mutating commands (dry-run first where applicable).
- Never require interaction in non-TTY or `--json` mode.
- In interactive mode, prompts should be explicit, reversible where possible, and scoped to actionable choices.
- JSON output must be machine-consumable and stable in structure for automation paths.
- Human output should prioritize actionable state (`what changed`, `what failed`, `what to do next`).

## Logging and Console Rules

- Use the centralized CLI logger for user-facing output and JSON payloads.
- Do not use direct `console.log`/`console.error` in command handlers (except bootstrap-level fatal fallback).
- Keep spinner usage limited to longer operations and auto-disable in non-interactive/`--json` mode.

## Safety Principles

- Treat canonical `.agents/**` as source of truth for provider sync workflows.
- Destructive operations must be scoped and traceable to known managed state.
- Do not mutate unmanaged filesystem state implicitly.
- Prefer idempotent operations; re-running a command should converge, not compound side effects.
- Keep manifest updates aligned with executed operations only.

## Error and Exit Semantics

- `0`: success
- `1`: user/actionable error (invalid input, unmet preconditions, declined required action)
- `2`: system/runtime error (I/O, unexpected failures, corrupted state)

Error messages should include concrete remediation where possible.

## Verification Expectations

For CLI behavior changes:

- Add or update focused unit tests near touched modules.
- Add integration/e2e coverage when behavior spans command -> engine -> filesystem boundaries.
- Verify command wiring and help surfaces for changed command trees.
- Keep adapter contract coverage for provider interface behavior.
- Keep logger/spinner behavior tests aligned with human vs JSON mode behavior.
- Run package checks before merge:
  - `pnpm --filter @oat/cli test`
  - `pnpm --filter @oat/cli lint`
  - `pnpm --filter @oat/cli type-check`

## Related Docs

- CLI docs index: `docs/oat/cli/index.md`
- Provider-interop commands: `docs/oat/cli/provider-interop/commands.md`
- Provider-interop manifest/drift: `docs/oat/cli/provider-interop/manifest-and-drift.md`
