---
oat_generated: true
oat_generated_at: 2026-03-24
oat_source_head_sha: 539d8ac2b1ba2d2315bac69753ded87509967c6b
oat_source_main_merge_base_sha: 146eed87a123f0b31d60726a4acfd6d7c83d1478
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** TypeScript pnpm monorepo with one primary CLI package, three reusable docs libraries, and one reference docs application.

**Key Characteristics:**

- Root-level orchestration is handled by pnpm workspaces plus Turborepo.
- `packages/cli` is the operational core and bundles repo-owned assets into the built CLI.
- `packages/docs-config`, `packages/docs-theme`, and `packages/docs-transforms` form a composable docs toolkit consumed by `apps/oat-docs` and scaffold flows.
- OAT workflow state lives in committed markdown artifacts under `.oat/`.

## Layers

**Workspace Orchestration:**

- Purpose: Coordinate install, build, lint, type-check, test, and docs tasks across packages.
- Location: repo root (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`)
- Contains: shared scripts, workspace package registration, TypeScript defaults, Turbo task graph
- Depends on: pnpm, Turbo, TypeScript
- Used by: all packages and CI workflows

**CLI Application Layer:**

- Purpose: Expose the `oat` command surface and execute sync, project, docs, tools, cleanup, and diagnostics flows.
- Location: `packages/cli/src/`
- Contains: command registration, command handlers, sync engine, provider adapters, filesystem helpers, validation, UI helpers
- Depends on: Commander, Chalk, Ora, Zod, filesystem and git state
- Used by: local development scripts, generated docs-app scaffolds, future external consumers

**Bundled Asset Layer:**

- Purpose: Package canonical skills, templates, scripts, agents, and docs alongside the CLI runtime.
- Location: `packages/cli/scripts/bundle-assets.sh`, `packages/cli/assets/`
- Contains: copied `.agents` skills/agents, `.oat` templates/scripts, bundled docs content
- Depends on: repository source-of-truth directories and CLI build
- Used by: `oat tools ...`, docs scaffolding, workflow/project commands

**Docs Library Layer:**

- Purpose: Provide reusable building blocks for Fumadocs-based documentation apps.
- Location: `packages/docs-config/src/`, `packages/docs-theme/src/`, `packages/docs-transforms/src/`
- Contains: Next/Fumadocs config factories, UI wrappers, remark plugins, search/source helpers
- Depends on: Next, Fumadocs, Unified/remark ecosystem, Mermaid
- Used by: `apps/oat-docs` and generated consumer docs apps

**Docs App Layer:**

- Purpose: Serve and statically export the OAT documentation site.
- Location: `apps/oat-docs/`
- Contains: Next app routes, docs content, source loader, global styling, docs build hooks
- Depends on: the three docs libraries plus Fumadocs runtime packages
- Used by: GitHub Pages deployment and docs authoring workflows

**Workflow Artifact Layer:**

- Purpose: Track project lifecycle state and repo-level operational context in markdown and JSON files.
- Location: `.oat/projects/`, `.oat/repo/`, `.oat/sync/`, `.oat/templates/`
- Contains: discovery/spec/design/plan artifacts, repo knowledge, tracking data, template files
- Depends on: CLI commands that read and write these artifacts
- Used by: OAT lifecycle skills and status/dashboard generation

## Data Flow

**CLI Build and Asset Bundling:**

1. Root or package build invokes `packages/cli` build.
2. `bundle-assets.sh` copies canonical skills, templates, scripts, and docs into `packages/cli/assets/`.
3. TypeScript compiles CLI source into `packages/cli/dist/`.
4. Runtime commands resolve assets relative to the built package root.

**Provider Sync / Workflow Operations:**

1. `packages/cli/src/index.ts` builds a command program and dispatches the selected command.
2. Commands build a shared command context from cwd, environment, and output flags.
3. Providers, manifests, filesystem helpers, and workflow/project modules read repo state.
4. Commands mutate `.oat/`, provider directories, or generated outputs as needed and surface status through the UI layer.

**Docs App Build:**

1. `apps/oat-docs` prebuild/predev runs `fumadocs-mdx` and `oat docs generate-index`.
2. `@voxmedia/oat-docs-config` supplies source and search config.
3. `@voxmedia/oat-docs-transforms` rewrites markdown features like tabs, Mermaid, and internal links.
4. `@voxmedia/oat-docs-theme` wraps Fumadocs layout/page primitives for site rendering.
5. Next statically exports the site for GitHub Pages deployment.

## Key Abstractions

**CommandContext:**

- Purpose: Shared runtime context for CLI commands.
- Examples: `packages/cli/src/app/command-context.ts`
- Pattern: collect cwd, home, logger, JSON/verbose flags, and environment once and pass through command execution

**ProviderAdapter and Sync Planning Types:**

- Purpose: Normalize provider-specific behavior for Claude, Cursor, Codex, Copilot, and Gemini paths/sync logic.
- Examples: `packages/cli/src/providers/*`, `packages/cli/src/engine/*`
- Pattern: adapter contract plus plan/apply separation

**Bundled Tool Packs:**

- Purpose: Treat skills, agents, docs, templates, and scripts as installable or updatable assets.
- Examples: `packages/cli/src/commands/init/tools/`, `packages/cli/assets/`
- Pattern: canonical repo content copied into a bundled asset surface, then installed into user/project scopes

**Docs Toolkit Factories and Plugins:**

- Purpose: Keep docs-app scaffolding and the reference docs app on a shared config/theme/transform stack.
- Examples: `packages/docs-config/src/*.ts`, `packages/docs-theme/src/*.tsx`, `packages/docs-transforms/src/*.ts`
- Pattern: factory exports and small focused plugins/components

## Entry Points

**CLI Entrypoint:**

- Location: `packages/cli/src/index.ts`
- Triggers: `oat` executable or `pnpm run cli -- ...`
- Responsibilities: normalize argv, register commands, handle top-level CLI errors

**Docs Library Entrypoints:**

- Location: `packages/docs-config/src/index.ts`, `packages/docs-theme/src/index.ts`, `packages/docs-transforms/src/index.ts`
- Triggers: consumed by `apps/oat-docs` and generated docs apps
- Responsibilities: expose reusable docs configuration, components, and markdown transforms

**Docs App Entrypoints:**

- Location: `apps/oat-docs/app/layout.tsx`, `apps/oat-docs/app/[[...slug]]/page.tsx`, `apps/oat-docs/source.config.ts`
- Triggers: Next build/dev server and static export
- Responsibilities: load docs content, render the Fumadocs site, wire shared theme/config

## Error Handling

**Strategy:** Explicit CLI errors in the runtime packages, standard build/test failure propagation in the workspace and docs app.

**Patterns:**

- `CliError` is used for controlled user-facing command failures in the CLI.
- Most package libraries prefer typed return values and tests rather than custom error hierarchies.
- CI relies on command exit codes from pnpm scripts and GitHub Actions steps.

## Cross-Cutting Concerns

**Logging:** CLI-oriented logger and spinner abstractions in `packages/cli/src/ui/`; docs app uses framework defaults.
**Validation:** Zod in the CLI, TypeScript strict mode across the repo, frontmatter parsing for project artifacts.
**Persistence:** Mostly filesystem-backed markdown/JSON state; no database layer.

---

_Architecture analysis: 2026-03-24_
