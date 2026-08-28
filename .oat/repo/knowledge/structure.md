---
oat_generated: true
oat_generated_at: 2026-08-19
oat_source_head_sha: e0408f4676a7b84e4240b4c568b78265f1d5cd0a
oat_source_main_merge_base_sha: 6f443c0843d75b704168b8ca739b5bcf7f406f07
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

<!--
Vendored from: https://github.com/glittercowboy/get-shit-done
License: MIT
Original: agents/gsd-codebase-mapper.md (embedded template)
Modified: 2026-01-27 - Adapted for OAT (added frontmatter)
-->

# Codebase Structure

**Analysis Date:** 2026-08-19

## Directory Layout

```
open-agent-toolkit/
├── .agents/                  # Canonical skills, agents, and agent-operational docs
├── .oat/                     # OAT templates, project state, repo knowledge, and sync state
├── apps/oat-docs/            # Next.js/Fumadocs documentation application
├── packages/cli/             # Published OAT CLI and bundled assets
├── packages/control-plane/   # Read-only project-state and recommendation library
├── packages/docs-config/     # Fumadocs/Next configuration helpers
├── packages/docs-theme/      # Shared React docs layout/page/components
├── packages/docs-transforms/ # Shared unified/remark plugins
├── scripts/                  # Repository/worktree maintenance scripts
├── tools/                    # Hooks, smoke tests, release, and docs tooling
├── package.json              # Root scripts and workspace metadata
├── pnpm-workspace.yaml       # apps/* and packages/* workspace globs
└── turbo.json                # Task dependency and output configuration
```

## Directory Purposes

**`.agents/`:**

- Purpose: Canonical, provider-agnostic agent infrastructure.
- Contains: `docs/` references, `agents/` definitions, and many skill directories under `skills/`; the canonical skill source is consumed/bundled by CLI tooling.
- Key files: `.agents/agents/`, `.agents/docs/reference-architecture.md`, and `.agents/skills/`.

**`.oat/`:**

- Purpose: OAT-managed project and repository state.
- Contains: `.oat/projects/` project artifacts, `.oat/repo/knowledge/` generated repository knowledge, and templates/scripts used by OAT workflows.
- Key files: `.oat/repo/knowledge/project-index.md` when generated and per-project `state.md`, `plan.md`, and `implementation.md` files.

**`packages/cli/`:**

- Purpose: Main CLI package and publishable executable.
- Contains: TypeScript sources in `src/`, bundled provider-neutral assets in `assets/`, package config in `config/`, and build/bundle scripts in `scripts/`.
- Key files: `packages/cli/src/index.ts`, `packages/cli/src/commands/index.ts`, `packages/cli/src/engine/`, `packages/cli/src/providers/`, and `packages/cli/package.json`.

**`packages/cli/src/`:**

- Purpose: CLI implementation organized by runtime responsibility.
- Contains: `app/`, `commands/`, `config/`, `engine/`, `fs/`, `manifest/`, `providers/`, `drift/`, `projects/`, `rules/`, `agents/`, `validation/`, `release/`, `review-remote/`, `shared/`, `ui/`, and `errors/`.
- Key files: `packages/cli/src/app/command-context.ts`, `packages/cli/src/commands/sync/index.ts`, and `packages/cli/src/engine/compute-plan.ts`.

**`packages/control-plane/`:**

- Purpose: Read-only projection of tracked OAT project state.
- Contains: `src/project.ts`, `src/state/` parsers, `src/recommender/`, shared parsing utilities, and tests next to implementation files.
- Key files: `packages/control-plane/src/index.ts`, `packages/control-plane/src/project.ts`, and `packages/control-plane/src/types.ts`.

**`packages/docs-config/`, `packages/docs-theme/`, and `packages/docs-transforms/`:**

- Purpose: Reusable configuration, presentation, and Markdown transform packages for OAT-powered docs sites.
- Contains: Each package has `src/`, tests, a package manifest, and TypeScript build configuration; source exports are surfaced through each `src/index.ts`.
- Key files: `packages/docs-config/src/source-config.ts`, `packages/docs-theme/src/docs-layout.tsx`, and `packages/docs-transforms/src/index.ts`.

**`apps/oat-docs/`:**

- Purpose: OAT's documentation website.
- Contains: Next App Router files under `app/`, source loader under `lib/`, Markdown docs under `docs/`, generated `index.md`, and Fumadocs/Next config files.
- Key files: `apps/oat-docs/source.config.ts`, `apps/oat-docs/lib/source.ts`, `apps/oat-docs/app/layout.tsx`, and `apps/oat-docs/app/[[...slug]]/page.tsx`.

**`scripts/` and `tools/`:**

- Purpose: Repository-level lifecycle operations outside package runtime code.
- Contains: Worktree setup/validation under `scripts/worktree/`, archive sync scripts under `scripts/`, Git hook management under `tools/git-hooks/`, smoke tests under `tools/smoke/`, and release/docs utilities under `tools/`.
- Key files: `scripts/worktree/init.sh`, `scripts/worktree/validate.sh`, `tools/git-hooks/manage-hooks.js`, and `tools/git-hooks/pre-commit`.

## Key File Locations

**Entry Points:**

- `packages/cli/src/index.ts`: CLI executable and top-level error boundary.
- `packages/control-plane/src/index.ts`: Public control-plane library exports.
- `apps/oat-docs/app/layout.tsx`: Docs application root layout and navigation.
- `apps/oat-docs/app/[[...slug]]/page.tsx`: Catch-all documentation page route.
- `apps/oat-docs/app/api/search/route.ts`: Static search API route.

**Configuration:**

- `package.json`: Root scripts, package manager, engine constraints, and workspace-level commands.
- `pnpm-workspace.yaml`: Workspace package globs.
- `turbo.json`: Build/test/check dependency ordering and outputs.
- `packages/cli/tsconfig.json`: CLI path aliases and TypeScript output configuration.
- `packages/cli/src/config/sync-config.ts`: Per-scope provider sync config schema and persistence.
- `apps/oat-docs/source.config.ts`: Fumadocs MDX source and remark-plugin configuration.

**Core Logic:**

- `packages/cli/src/engine/`: Canonical scanning, plan computation, execution, markers, and safety.
- `packages/cli/src/providers/`: Provider adapters, mappings, codecs, and materialization extensions.
- `packages/cli/src/manifest/`: Sync ownership manifest schema and persistence.
- `packages/control-plane/src/state/`: Project state/artifact/review/task parsing.
- `packages/control-plane/src/recommender/router.ts`: Workflow recommendation routing.

**Testing:**

- `packages/cli/src/**/*.test.ts`: CLI unit and integration tests colocated with implementation; `packages/cli/src/e2e/` contains end-to-end tests.
- `packages/control-plane/src/**/*.test.ts`: Control-plane tests colocated with parsers, state readers, and recommender code.
- `packages/docs-config/src/*.test.ts` and `packages/docs-transforms/src/*.test.ts`: Docs package tests colocated with source modules.
- `tools/smoke/` and `.agents/skills/*/tests/`: Repository smoke tests and skill-specific tests invoked by root scripts.

## Naming Conventions

**Files:**

- TypeScript implementation files use lowercase kebab-free names such as `command-context.ts`, `compute-plan.ts`, and `sync-config.ts` (`packages/cli/src/app/command-context.ts`, `packages/cli/src/engine/compute-plan.ts`, `packages/cli/src/config/sync-config.ts`).
- Tests append `.test.ts` to the implementation or subject name, for example `packages/control-plane/src/state/parser.test.ts` and `packages/cli/src/commands/sync/index.test.ts`.
- React components use `.tsx`, while route conventions follow Next App Router names such as `layout.tsx`, `page.tsx`, and `route.ts` under `apps/oat-docs/app/`.
- Provider-specific constants use uppercase names in `paths.ts`, for example `CLAUDE_PROJECT_MAPPINGS` in `packages/cli/src/providers/claude/paths.ts`.

**Directories:**

- CLI command directories mirror command names and use `index.ts` for command factories, e.g. `packages/cli/src/commands/project/` and `packages/cli/src/commands/providers/`.
- Cross-cutting CLI modules are grouped by domain (`engine`, `providers`, `manifest`, `drift`, `validation`, `ui`) under `packages/cli/src/`.
- Provider directories are lowercase provider names (`claude`, `cursor`, `codex`, `copilot`, `gemini`) under `packages/cli/src/providers/`.
- Docs content is grouped by navigation area under `apps/oat-docs/docs/`, such as `guide/`, `reference/`, `workflows/`, and `provider-sync/`.

## Where to Add New Code

**New Feature:**

- Primary code: A new command domain belongs under `packages/cli/src/commands/<command>/`, with registration added in `packages/cli/src/commands/index.ts`; reusable engine behavior belongs in the relevant existing domain directory.
- Tests: Colocated `*.test.ts` files under the same command or domain directory, with end-to-end cases under `packages/cli/src/e2e/` when the feature crosses CLI boundaries.

**New Component/Module:**

- CLI implementation: `packages/cli/src/<domain>/` with a public `index.ts` when the domain exposes grouped exports.
- Provider behavior: `packages/cli/src/providers/<provider>/` and shared contracts in `packages/cli/src/providers/shared/`.
- Control-plane behavior: `packages/control-plane/src/state/`, `packages/control-plane/src/recommender/`, or `packages/control-plane/src/shared/` according to responsibility.
- Docs UI: `packages/docs-theme/src/`; docs configuration or Markdown transforms belong in `packages/docs-config/src/` or `packages/docs-transforms/src/`.

**Utilities:**

- Shared CLI helpers are located in `packages/cli/src/shared/`, filesystem helpers in `packages/cli/src/fs/`, and reusable control-plane parsing helpers in `packages/control-plane/src/shared/utils/`.

## Special Directories

**`packages/cli/assets/`:**

- Purpose: Bundled skills, agents, templates, docs, scripts, and config copied during the CLI build.
- Generated: Yes; `packages/cli/scripts/bundle-assets.mjs` and the package build script manage the bundle.
- Committed: Yes; the directory is part of the package's published files according to `packages/cli/package.json`.

**`dist/` directories and `.turbo/`:**

- Purpose: TypeScript build output and Turborepo cache metadata.
- Generated: Yes, by package build tasks and Turborepo.
- Committed: Not detected as tracked source; they are present locally during this mapping pass.

**`.oat/repo/knowledge/`:**

- Purpose: Generated repository knowledge artifacts consumed by OAT workflows.
- Generated: Yes, by `oat-repo-knowledge-index`.
- Committed: The directory contains `.gitkeep` and a generated `project-index.md` in the current worktree; generated mapper files are workflow artifacts.

**`node_modules/`:**

- Purpose: Installed workspace dependencies and package links.
- Generated: Yes, by pnpm installation.
- Committed: No; the directory is ignored and not tracked.

---

_Structure analysis: 2026-08-19_
