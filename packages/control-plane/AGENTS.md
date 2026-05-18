# AGENTS (Control Plane Package)

Applies to work under `packages/control-plane/**`.

## Purpose

Maintain `@open-agent-toolkit/control-plane` as the typed, read-only "read" layer behind OAT project inspection. It parses OAT project artifacts from disk into stable typed objects for CLI and future UI consumers.

## Read first

- `packages/control-plane/README.md` — purpose, public API (`getProjectState`, `listProjects`, `recommendSkill`), and current consumers.

## Package commands

- `pnpm --filter @open-agent-toolkit/control-plane test`
- `pnpm --filter @open-agent-toolkit/control-plane lint`
- `pnpm --filter @open-agent-toolkit/control-plane type-check`

## Working conventions

- Keep the package read-only: parse and aggregate project artifacts; do not mutate project files or write to disk.
- Stay dependency-light — no CLI, UI, or server dependencies beyond Node.js builtins and `yaml` for frontmatter parsing.
- Module layout: `state/` (artifact, task, review, frontmatter parsing), `recommender/` (next-skill routing and boundary logic), `shared/utils/` (errors, normalization, frontmatter helpers).
- Return stable typed objects (`ProjectState`, `ProjectSummary`); keep shared types in `types.ts` and the public surface in `index.ts`.
- This is a publishable package in the lockstep public set — see the root `AGENTS.md` "Package Management" section before changing shipped behavior.

## Completion checks

- Tests updated for changed behavior.
- Lint and type-check pass for `@open-agent-toolkit/control-plane`.
- Public API changes are reflected in `README.md`.
