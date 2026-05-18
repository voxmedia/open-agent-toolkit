# AGENTS (Docs Theme Package)

Applies to work under `packages/docs-theme/**`.

## Purpose

Maintain `@open-agent-toolkit/docs-theme` — shared React components for OAT-powered Fumadocs documentation apps.

## Read first

- `packages/docs-theme/README.md` — installation, peer dependencies, and usage.

## Package commands

- `pnpm --filter @open-agent-toolkit/docs-theme lint`
- `pnpm --filter @open-agent-toolkit/docs-theme type-check`

## Working conventions

- This is the one OAT package authored primarily in React `.tsx` — component source differs from the otherwise `.ts`-only repo.
- Keep components presentational and Fumadocs-compatible; the consuming app provides the Fumadocs and React peer dependencies.
- This is a publishable package in the lockstep public set — see the root `AGENTS.md` "Package Management" section before changing shipped behavior.

## Completion checks

- Lint and type-check pass for `@open-agent-toolkit/docs-theme`.
