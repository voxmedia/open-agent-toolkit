# AGENTS (Docs Config Package)

Applies to work under `packages/docs-config/**`.

## Purpose

Maintain `@open-agent-toolkit/docs-config` — configuration factory helpers for OAT-powered Fumadocs documentation apps.

## Read first

- `packages/docs-config/README.md` — installation, peer dependencies, and usage.

## Package commands

- `pnpm --filter @open-agent-toolkit/docs-config test`
- `pnpm --filter @open-agent-toolkit/docs-config lint`
- `pnpm --filter @open-agent-toolkit/docs-config type-check`

## Working conventions

- Keep this package focused on configuration factories for docs sites; it is consumed alongside `@open-agent-toolkit/docs-theme` and `@open-agent-toolkit/docs-transforms`.
- This is a publishable package in the lockstep public set — see the root `AGENTS.md` "Package Management" section before changing shipped behavior.

## Completion checks

- Tests updated for changed behavior.
- Lint and type-check pass for `@open-agent-toolkit/docs-config`.
