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

# Architecture

**Analysis Date:** 2026-08-19

## Pattern Overview

**Overall:** TypeScript ESM monorepo with a command-oriented CLI, a provider-adapter synchronization engine, a read-only project control-plane library, and a separately deployable Fumadocs application.

**Key Characteristics:**

- `packages/cli/src/index.ts` creates the Commander program, registers command modules, builds command context, and dispatches asynchronous actions.
- Canonical content under `.agents/` is scanned by `packages/cli/src/engine/scanner.ts`, mapped through provider adapters, converted into a plan by `packages/cli/src/engine/compute-plan.ts`, and applied by `packages/cli/src/engine/execute-plan.ts`.
- `packages/control-plane/src/project.ts` composes state, artifacts, reviews, and task-progress parsers into project summaries and recommendations without mutating project files.
- `apps/oat-docs` is a Next/Fumadocs app consuming Markdown through generated Fumadocs sources and shared packages under `packages/docs-*`.

## Layers

**CLI application and command layer:**

- Purpose: Parse global options, register subcommands, resolve scope/context, and present text or JSON results.
- Location: `packages/cli/src/index.ts`, `packages/cli/src/app/`, and `packages/cli/src/commands/`.
- Contains: Commander program setup, `CommandContext`, command factories, command-specific dependency bundles, and UI output.
- Depends on: CLI engines, configuration, filesystem helpers, provider adapters, and the control-plane package where project state is exposed.
- Used by: The root `cli` and `cli:source` scripts in `package.json`; the published `oat` binary declared in `packages/cli/package.json`.

**Canonical asset and synchronization engine:**

- Purpose: Treat `.agents/skills`, `.agents/agents`, and `.agents/rules` as canonical content and synchronize provider views.
- Location: `packages/cli/src/engine/`, `packages/cli/src/providers/`, `packages/cli/src/manifest/`, and `packages/cli/src/drift/`.
- Contains: Canonical scanning, sync-plan computation, operation execution, provider path safety, content markers, provider adapters, manifests, and drift/stray detection.
- Depends on: Scope configuration from `packages/cli/src/config/sync-config.ts`, filesystem operations under `packages/cli/src/fs/`, and provider mapping contracts in `packages/cli/src/providers/shared/adapter.types.ts`.
- Used by: `packages/cli/src/commands/sync/index.ts`, provider and drift-related commands, and materialization extensions for Codex and Cursor.

**Provider adapter and codec layer:**

- Purpose: Describe provider detection, scope-specific mappings, default strategies, and provider-specific content transforms.
- Location: `packages/cli/src/providers/claude/`, `packages/cli/src/providers/cursor/`, `packages/cli/src/providers/codex/`, `packages/cli/src/providers/copilot/`, and `packages/cli/src/providers/gemini/`.
- Contains: `ProviderAdapter` values, project/user `PathMapping[]` declarations, rule transforms, and provider-specific codecs/materializers.
- Depends on: The shared `ProviderAdapter`/`PathMapping` contract in `packages/cli/src/providers/shared/adapter.types.ts` and canonical agent types in `packages/cli/src/agents/canonical/`.
- Used by: `packages/cli/src/commands/sync/index.ts` to select active adapters and by `packages/cli/src/engine/compute-plan.ts` to derive provider operations.

**Control-plane state layer:**

- Purpose: Read tracked OAT project artifacts and derive a normalized state/recommendation model.
- Location: `packages/control-plane/src/project.ts`, `packages/control-plane/src/state/`, `packages/control-plane/src/recommender/`, and `packages/control-plane/src/shared/utils/`.
- Contains: State frontmatter, artifact, review, and task parsers plus boundary detection and workflow-skill routing.
- Depends on: YAML/frontmatter parsing and project files such as `state.md`, `plan.md`, `implementation.md`, and `reviews/*.md`.
- Used by: The public exports in `packages/control-plane/src/index.ts` and CLI project/status commands.

**Documentation configuration, rendering, and site layer:**

- Purpose: Configure Markdown/MDX ingestion, transforms, shared theme components, search, and route rendering.
- Location: `packages/docs-config/src/`, `packages/docs-transforms/src/`, `packages/docs-theme/src/`, and `apps/oat-docs/`.
- Contains: Fumadocs/Next configuration factories, remark plugins, React layout/page components, generated source loading, and static search route handling.
- Depends on: Fumadocs, Next, React, unified/remark, and workspace package exports.
- Used by: `apps/oat-docs/source.config.ts`, `apps/oat-docs/app/layout.tsx`, `apps/oat-docs/app/[[...slug]]/page.tsx`, and `apps/oat-docs/app/api/search/route.ts`.

## Data Flow

**Provider sync flow:**

1. `packages/cli/src/index.ts` normalizes argv, creates the program, registers commands, and builds a `CommandContext` before command actions.
2. `packages/cli/src/commands/sync/index.ts` resolves project/user scope roots, loads `.oat/sync/config.json` and `.oat/sync/manifest.json`, scans canonical entries, detects/configures providers, and invokes materialization extensions.
3. `packages/cli/src/engine/scanner.ts` returns canonical entries; `packages/cli/src/providers/shared/adapter.utils.ts` filters native-read mappings and resolves active provider mappings.
4. `packages/cli/src/engine/compute-plan.ts` computes create/update/skip/removal operations, applies provider transforms, and validates provider mutation paths.
5. `packages/cli/src/commands/sync/apply.ts` invokes `packages/cli/src/engine/execute-plan.ts`, then applies provider materialization plans and emits a summary or JSON response.
6. `packages/cli/src/engine/execute-plan.ts` writes provider views and updates the validated manifest through `packages/cli/src/manifest/manager.ts`.

**Project state flow:**

1. `packages/control-plane/src/project.ts` reads optional `state.md`, `plan.md`, `implementation.md`, and review files concurrently.
2. `packages/control-plane/src/state/parser.ts`, `artifacts.ts`, `reviews.ts`, and `tasks.ts` normalize frontmatter, artifact status, review rows, and task progress.
3. `packages/control-plane/src/recommender/router.ts` combines parsed state, boundary tiers, workflow mode, review state, and HiLL checkpoints into a `SkillRecommendation`.
4. `packages/control-plane/src/index.ts` exposes `getProjectState`, `listProjects`, and `recommendSkill` as the public read-only API.

**Documentation flow:**

1. `apps/oat-docs/source.config.ts` uses `createSourceConfig` from `packages/docs-config/src/source-config.ts` to select `remarkLinks`, `remarkTabs`, `remarkAlert`, and `remarkMermaid`.
2. `apps/oat-docs/lib/source.ts` converts generated MDX content to a Fumadocs source with `loader`.
3. `apps/oat-docs/app/[[...slug]]/page.tsx` resolves the requested slug, renders the page body, and returns `notFound()` when absent.
4. `apps/oat-docs/app/api/search/route.ts` exposes static search generated from the same source; `apps/oat-docs/app/layout.tsx` supplies navigation, providers, branding, and search UI.

**State Management:**

- Synchronization state is persisted per scope in `.oat/sync/config.json` and `.oat/sync/manifest.json`, managed by `packages/cli/src/config/sync-config.ts` and `packages/cli/src/manifest/manager.ts`.
- Project workflow state is persisted in Markdown frontmatter and headings under `.oat/projects/`, read by `packages/control-plane/src/project.ts`.
- The docs site derives runtime page/search state from generated Fumadocs content in `apps/oat-docs/lib/source.ts`; no application database or client state store is detected.

## Key Abstractions

**`ProviderAdapter` and `PathMapping`:**

- Purpose: Represent provider detection and canonical-to-provider mappings for project and user scopes.
- Examples: `packages/cli/src/providers/shared/adapter.types.ts`, `packages/cli/src/providers/claude/paths.ts`, `packages/cli/src/providers/cursor/paths.ts`.
- Pattern: Adapters declare mappings and detection; shared utilities select mappings while the engine owns planning/execution.

**`SyncPlan` / `Manifest`:**

- Purpose: Separate calculated filesystem operations from applied ownership state.
- Examples: `packages/cli/src/engine/engine.types.ts`, `packages/cli/src/engine/compute-plan.ts`, `packages/cli/src/manifest/manifest.types.ts`.
- Pattern: Plan entries carry operation, strategy, provider path, reason, and optional rendered content; successful execution updates a Zod-validated manifest.

**`CommandContext`:**

- Purpose: Centralize global CLI options, resolved cwd/home/scope, interactivity, and logger behavior.
- Examples: `packages/cli/src/app/command-context.ts`, `packages/cli/src/index.ts`.
- Pattern: Commands obtain context through `buildCommandContext` and use injected dependency interfaces in complex commands such as `packages/cli/src/commands/sync/sync.types.ts`.

**`ProjectState` and `SkillRecommendation`:**

- Purpose: Provide a normalized, read-only control-plane projection of a project and its next workflow skill.
- Examples: `packages/control-plane/src/types.ts`, `packages/control-plane/src/project.ts`, `packages/control-plane/src/recommender/router.ts`.
- Pattern: Parsers produce normalized facts; the recommender applies ordered workflow, review, and checkpoint rules.

## Entry Points

**CLI executable:**

- Location: `packages/cli/src/index.ts`.
- Triggers: The `oat` package binary (`packages/cli/package.json`) or root `pnpm run cli`/`pnpm run cli:source` scripts (`package.json`).
- Responsibilities: Build/register Commander commands, run pre-action update/mutation guards, parse argv, and convert `CliError` instances to exit codes.

**Command registration:**

- Location: `packages/cli/src/commands/index.ts`.
- Triggers: `main()` in `packages/cli/src/index.ts`.
- Responsibilities: Register the backlog, decision, init, sync, project, docs, provider, review, state, tools, and diagnostic command trees.

**Control-plane library:**

- Location: `packages/control-plane/src/index.ts`.
- Triggers: Workspace consumers such as `packages/cli/src/validation/project-state.ts` and CLI project commands.
- Responsibilities: Export read-only types, project state/listing functions, and recommendation routing.

**Documentation site:**

- Location: `apps/oat-docs/app/layout.tsx`, `apps/oat-docs/app/[[...slug]]/page.tsx`, and `apps/oat-docs/app/api/search/route.ts`.
- Triggers: Next.js dev/build/start scripts in `apps/oat-docs/package.json`.
- Responsibilities: Render generated MDX pages, shared docs layout/page components, and static search responses.

## Error Handling

**Strategy:** Validate inputs and persisted state at boundaries, use typed `CliError` for user-facing CLI failures, and preserve uncertain provider ownership during sync retirement.

**Patterns:**

- `packages/cli/src/config/sync-config.ts` and `packages/cli/src/manifest/manager.ts` parse and validate JSON with Zod, converting malformed or unreadable persisted state into actionable `CliError` messages.
- `packages/cli/src/fs/paths.ts` and `packages/cli/src/engine/provider-path-safety.ts` reject paths outside the resolved scope before provider mutations.
- `packages/cli/src/engine/compute-plan.ts` classifies obsolete provider entries as `remove` only after verified symlink/copy ownership; otherwise it emits `detach` and preserves the provider path.
- `packages/cli/src/engine/execute-plan.ts` counts per-operation failures, saves the resulting manifest, and returns applied/failed/skipped counts to the sync command.
- `packages/control-plane/src/project.ts` treats missing optional project files as empty inputs, while malformed parse values normalize to explicit defaults in `packages/control-plane/src/state/parser.ts`.
- `packages/cli/src/index.ts` treats update-notifier failures as best effort and maps unknown failures to exit code `2`.

## Cross-Cutting Concerns

**Logging:** `packages/cli/src/ui/logger.ts` and `packages/cli/src/ui/output.ts` provide human-readable, JSON, verbose, and spinner-oriented output selected by `CommandContext`.

**Validation:** Zod schemas in `packages/cli/src/config/sync-config.ts` and `packages/cli/src/manifest/manifest.types.ts` validate persisted sync state; strict TypeScript settings are inherited from `tsconfig.json`.

**Authentication:** Not detected in the core CLI, control-plane, or docs application; provider detection is filesystem-based in adapters such as `packages/cli/src/providers/claude/adapter.ts`.

**Filesystem safety:** Scope roots and real paths are checked in `packages/cli/src/fs/paths.ts`, and every mutating sync operation is guarded by `packages/cli/src/engine/provider-path-safety.ts`.

**Build/dependency orchestration:** `pnpm-workspace.yaml` defines workspace packages and `turbo.json` defines dependency-ordered build/check/test tasks; publishable package entrypoints are declared in each `packages/*/package.json`.

---

_Architecture analysis: 2026-08-19_
