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
- `pele` is pinned to an exact version. A bump needs a visual check of Mermaid diagrams in light, dark and zoomed views, plus `src/zoom-svg.test.ts`, which depends on the shape of Pele's root `<svg>` style attribute.

## Completion checks

- Lint and type-check pass for `@open-agent-toolkit/docs-theme`.
