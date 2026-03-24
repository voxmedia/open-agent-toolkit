---
title: CLI Design Principles
description: 'Cross-cutting design rules for CLI commands, UX, logging, safety, and verification.'
---

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
- Prefer named command files for findability (`sync.ts`, `sync.test.ts`, `list.ts`, `list.test.ts`) over generic `index.ts`/`index.test.ts`.
- Reserve `index.ts` for command registration boundaries and optional re-export wrappers.
- Keep command-specific prompts in the command module; reserve `commands/shared/shared.prompts.ts` for reusable command-level prompt primitives.
- Keep domain validation close to the owning domain (`*.types.ts` near command/provider modules).
- Keep shared utilities generic; move domain-specific utilities into the owning command/provider area (for top-level command helpers, use `commands/shared/shared.utils.ts`).

Example command structure pattern (for findability):

```text
packages/cli/src/
  commands/
    <top-level-command>/
      index.ts
      <top-level-command>.types.ts
      <top-level-command>.utils.ts
      <subcommand>/
        <subcommand>.ts
        <subcommand>.test.ts
        <subcommand>.types.ts
        <subcommand>.utils.ts
        <nested-subcommand>/
          <nested-subcommand>.ts
          <nested-subcommand>.test.ts
    shared/
      shared.prompts.ts
      shared.utils.ts
```

## Import Path Rules

- Allow only same-directory relative imports: `./...`
- Disallow parent-directory relative imports: `../...`
- For anything outside the current directory, use explicit TypeScript aliases.
- Do not use `src/...` imports.
- Do not use a catch-all alias like `@/*`.
- CLI alias set: `@app/*`, `@commands/*`, `@config/*`, `@drift/*`, `@engine/*`, `@errors/*`, `@fs/*`, `@manifest/*`, `@providers/*`, `@shared/*`, `@ui/*`, `@validation/*`.

## Runtime Bootstrap and Flags

- Startup order: load runtime config -> validate env/input -> build command context -> register commands.
- Register global flags early and consistently (`--json`, `--verbose`, `--scope`, `--cwd`).

## UX and Output Principles

- Mutating commands apply by default; use `--dry-run` to preview changes safely.
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
  - `pnpm --filter @voxmedia/oat-cli test`
  - `pnpm --filter @voxmedia/oat-cli lint`
  - `pnpm --filter @voxmedia/oat-cli type-check`

## Related Docs

- CLI Reference: [`../guide/cli-reference.md`](../guide/cli-reference.md)
- Provider sync commands: [`../guide/provider-sync/commands.md`](../guide/provider-sync/commands.md)
- Provider sync manifest and drift: [`../guide/provider-sync/manifest-and-drift.md`](../guide/provider-sync/manifest-and-drift.md)
