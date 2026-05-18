# AGENTS (Docs Transforms Package)

Applies to work under `packages/docs-transforms/**`.

## Purpose

Maintain `@open-agent-toolkit/docs-transforms` — remark/unified plugins and the default transform bundle for OAT-powered Fumadocs apps.

## Read first

- `packages/docs-transforms/README.md` — installation and usage.

## Package commands

- `pnpm --filter @open-agent-toolkit/docs-transforms test`
- `pnpm --filter @open-agent-toolkit/docs-transforms lint`
- `pnpm --filter @open-agent-toolkit/docs-transforms type-check`

## Working conventions

- Changes to transforms (notably the remark-links plugin) affect docs-app link rewriting — verify against `apps/oat-docs` when changing link behavior.
- This is a publishable package in the lockstep public set — see the root `AGENTS.md` "Package Management" section before changing shipped behavior.

## Completion checks

- Tests updated for changed behavior.
- Lint and type-check pass for `@open-agent-toolkit/docs-transforms`.
