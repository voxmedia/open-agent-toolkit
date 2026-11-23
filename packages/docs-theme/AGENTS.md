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
- The figure components under `src/figures/` are vendored from mdxcn (MIT) and must stay static server components: no client directive, state, effect or context hooks (`src/figures/graph-frame.test.ts` imports each under the `react-server` condition). Keep each vendored file's provenance header, including the full MIT notice that `tsc` preserves in `dist`, and record new local patches there and in root `NOTICES.md`.
- This is a publishable package in the lockstep public set — see the root `AGENTS.md` "Package Management" section before changing shipped behavior.
- `pele` is pinned to an exact version. A bump needs a visual check of Mermaid diagrams in light, dark and zoomed views, plus `src/zoom-svg.test.ts`, which depends on the shape of Pele's root `<svg>` style attribute.
- `katex` is pinned to an exact version and must keep `trust: false`, because Pele inserts its markup unsanitized. A bump needs `src/render-chart.test.ts` and a check that `$$` labels still render.

## Completion checks

- Lint and type-check pass for `@open-agent-toolkit/docs-theme`.
- A new docs authoring capability updates the scaffold contributing templates, scaffold app AGENTS guidance, `oat-docs-bootstrap`/`oat-docs-analyze` guidance and OAT's Markdown Features page in the same PR.
