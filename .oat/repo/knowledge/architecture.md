---
oat_generated: true
oat_generated_at: 2026-08-30
oat_source_head_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_source_main_merge_base_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Architecture

**Analysis Date:** 2026-08-30

## Pattern Overview

**Overall:** TypeScript ESM pnpm/Turborepo monorepo with a command-oriented CLI, a canonical-content-to-provider synchronization engine, a read-only project-state library, and a static documentation application. Workspace membership and task entry points are defined in `package.json` and the packages expose independent public package boundaries in `packages/*/package.json`.

**Key Characteristics:**

- The executable CLI creates a Commander program, registers command factories, builds a per-invocation context, and dispatches asynchronous command actions from `packages/cli/src/index.ts`, `packages/cli/src/app/create-program.ts`, `packages/cli/src/app/command-context.ts`, and `packages/cli/src/commands/index.ts`.
- Provider interoperability is adapter-based: the common `ProviderAdapter` contract describes project and user path mappings, detection, strategy, and optional content transforms in `packages/cli/src/providers/shared/adapter.types.ts`; concrete providers live in `packages/cli/src/providers/{claude,cursor,codex,copilot,gemini}/adapter.ts`.
- Canonical agent content is scanned from `.agents/{skills,agents,rules}` and materialized into provider-specific views through computed sync plans and a persisted manifest, as implemented by `packages/cli/src/engine/scanner.ts`, `packages/cli/src/engine/compute-plan.ts`, `packages/cli/src/engine/execute-plan.ts`, and `packages/cli/src/commands/sync/index.ts`.
- Project-management state is represented as Markdown artifacts and parsed read-only by `@open-agent-toolkit/control-plane`; `packages/control-plane/src/project.ts` combines `state.md`, `plan.md`, `implementation.md`, and review artifacts before routing to the next workflow skill via `packages/control-plane/src/recommender/router.ts`.
- Documentation is a separate Next/Fumadocs app that consumes Markdown under `apps/oat-docs/docs`, shared configuration in `packages/docs-config`, transforms in `packages/docs-transforms`, and UI components in `packages/docs-theme`; see `apps/oat-docs/source.config.ts`, `apps/oat-docs/lib/source.ts`, and `apps/oat-docs/app/[[...slug]]/page.tsx`.

## Layers

**CLI composition and command layer:**

- Purpose: Define the `oat` executable, global options, help behavior, command hierarchy, and command-specific actions.
- Location: `packages/cli/src/index.ts`, `packages/cli/src/app/`, and `packages/cli/src/commands/`.
- Contains: Commander program construction, invocation context, UI logging, and command groups including `sync`, `init`, `project`, `docs`, `pjm`, `review`, and `tools` in `packages/cli/src/commands/index.ts`.
- Depends on: Commander and local aliases such as `@app/*`, `@commands/*`, `@engine/*`, and `@ui/*` configured in `packages/cli/tsconfig.json`.
- Used by: The publishable CLI binary `oat`, whose `bin` maps to `dist/index.js` in `packages/cli/package.json`; repository source execution runs it through the root `cli` and `cli:source` scripts in `package.json`.

**Domain services and persistence layer:**

- Purpose: Resolve configuration, paths, manifests, local filesystem operations, validation, release checks, and project records for commands.
- Location: `packages/cli/src/{config,fs,manifest,projects,validation,release,drift,shared}/`.
- Contains: Zod-backed shared types in `packages/cli/src/shared/types.ts`, config modules in `packages/cli/src/config/`, and manifest helpers imported by `packages/cli/src/commands/sync/index.ts`.
- Depends on: Node filesystem/path APIs plus `zod`, `yaml`, `jsonc-parser`, and `@iarna/toml`, declared by `packages/cli/package.json`.
- Used by: Command factories under `packages/cli/src/commands/` and sync engine modules under `packages/cli/src/engine/`.

**Synchronization engine:**

- Purpose: Convert canonical `.agents` entries and provider mappings into safe create, update, remove, detach, or skip operations, then update the sync manifest.
- Location: `packages/cli/src/engine/`.
- Contains: canonical scanning in `scanner.ts`, plan derivation and path-safe mapping resolution in `compute-plan.ts`, execution in `execute-plan.ts`, markers in `markers.ts`, and provider-target validation in `provider-path-safety.ts`.
- Depends on: provider adapter types from `packages/cli/src/providers/shared/adapter.types.ts`, sync configuration, and manifest I/O.
- Used by: `packages/cli/src/commands/sync/index.ts`, which chooses detected/configured adapters and invokes `computeSyncPlan` then `executeSyncPlan`.

**Provider adapter and materialization layer:**

- Purpose: Isolate each supported agent provider's directories, format transforms, detection, and default materialization strategy.
- Location: `packages/cli/src/providers/`.
- Contains: adapters for Claude, Cursor, Codex, GitHub Copilot, and Gemini; common mapping utilities in `packages/cli/src/providers/shared/adapter.utils.ts`; provider-specific paths in each provider's `paths.ts`; and extension codecs under `packages/cli/src/providers/{codex,cursor}/codec/` imported by `packages/cli/src/commands/sync/index.ts`.
- Depends on: the provider-neutral contract in `packages/cli/src/providers/shared/adapter.types.ts`.
- Used by: setup and synchronization command groups, which assemble all five adapter instances in `packages/cli/src/commands/sync/index.ts` and `packages/cli/src/commands/init/index.ts`.

**Control-plane library:**

- Purpose: Read project filesystem artifacts and compute a structured `ProjectState`, `ProjectSummary`, and next-skill recommendation without mutating project state.
- Location: `packages/control-plane/src/`.
- Contains: public exports in `packages/control-plane/src/index.ts`, domain types in `types.ts`, state scanners/parsers under `state/`, and recommendation rules under `recommender/`.
- Depends on: Markdown/YAML project artifacts and the `yaml` package, declared in `packages/control-plane/package.json`.
- Used by: the CLI through its workspace dependency on `@open-agent-toolkit/control-plane` in `packages/cli/package.json`.

**Documentation packages and application:**

- Purpose: Package reusable Fumadocs configuration, MDX/remark transforms, themed React components, and publish the repository docs surface.
- Location: `packages/docs-config/src/`, `packages/docs-transforms/src/`, `packages/docs-theme/src/`, and `apps/oat-docs/`.
- Contains: docs configuration factories in `packages/docs-config/src/{next-config,source-config,search-config}.ts`, transforms in `packages/docs-transforms/src/`, theme exports in `packages/docs-theme/src/index.ts`, and Next routes/components in `apps/oat-docs/app/` and `apps/oat-docs/components/`.
- Depends on: Fumadocs/Next/React packages and shared workspace packages declared in `apps/oat-docs/package.json`.
- Used by: the `build:docs` root script in `package.json`; the app's `prebuild` generates Fumadocs source and docs index before `next build` in `apps/oat-docs/package.json`.

## Data Flow

**Canonical agent-content synchronization:**

1. A `sync` command action constructs context and resolves project/user scope roots, config, manifest, and canonical `.agents` entries in `packages/cli/src/commands/sync/index.ts`.
2. `scanCanonical` enumerates directory entries under `.agents/skills`, `.agents/agents`, and `.agents/rules` in `packages/cli/src/engine/scanner.ts`.
3. The command selects active Claude, Cursor, Codex, Copilot, and Gemini adapters and calls `computeSyncPlan` with adapter mappings, configuration, scope, and manifest in `packages/cli/src/commands/sync/index.ts`.
4. `computeSyncPlan` resolves copy/symlink behavior, transformed content, safe provider target paths, and removal operations in `packages/cli/src/engine/compute-plan.ts`.
5. `executeSyncPlan` applies each plan operation, writes copy markers/sentinels where applicable, and saves the updated manifest in `packages/cli/src/engine/execute-plan.ts`.

**Project-state recommendation:**

1. A caller invokes `getProjectState` or `listProjects` exposed by `packages/control-plane/src/index.ts`.
2. `packages/control-plane/src/project.ts` reads project Markdown files, scans artifacts and review files, and parses frontmatter, review tables, and task progress using modules under `packages/control-plane/src/state/`.
3. The assembled state is passed to `recommendSkill` in `packages/control-plane/src/recommender/router.ts`, which selects the next OAT workflow skill from phase, artifact status, HiLL gates, reviews, and lifecycle.

**Documentation rendering:**

1. `apps/oat-docs/source.config.ts` requests shared source configuration from `packages/docs-config/src/source-config.ts`, which selects the `./docs` content directory and remark transforms.
2. Fumadocs generates `apps/oat-docs/.source/server.ts`; `apps/oat-docs/lib/source.ts` wraps it as a Fumadocs loader.
3. The catch-all page in `apps/oat-docs/app/[[...slug]]/page.tsx` looks up a page, renders its MDX body with theme components from `@open-agent-toolkit/docs-theme`, or delegates a missing page to `notFound()`.

**State Management:**

- CLI synchronization state persists in `.oat/sync/` under each resolved scope, using the manifest and configuration paths constructed in `packages/cli/src/commands/sync/index.ts`.
- Project workflow state is file-backed in `.oat/projects/` and read by `packages/control-plane/src/project.ts`; the control-plane package is described as read-only in `packages/control-plane/package.json`.
- The documentation app uses generated Fumadocs source and static export configuration, with `output: 'export'` set by `packages/docs-config/src/next-config.ts`.

## Key Abstractions

**ProviderAdapter and PathMapping:**

- Purpose: Represent a provider's detection and its mappings from canonical content type/directory to provider paths.
- Examples: `packages/cli/src/providers/shared/adapter.types.ts`, `packages/cli/src/providers/codex/adapter.ts`, and `packages/cli/src/providers/claude/paths.ts`.
- Pattern: A common interface plus provider-specific data/configuration adapters; mappings can opt into extensions and canonical-content transforms.

**CanonicalEntry and SyncPlan:**

- Purpose: Separate input discovery from calculated filesystem mutations.
- Examples: `packages/cli/src/engine/scanner.ts`, `packages/cli/src/engine/engine.types.ts`, `packages/cli/src/engine/compute-plan.ts`, and `packages/cli/src/engine/execute-plan.ts`.
- Pattern: Scan -> plan -> validate -> execute, with the manifest recording managed outputs.

**ProjectState and recommendation router:**

- Purpose: Normalize Markdown project evidence into a typed view and derive the next workflow operation.
- Examples: `packages/control-plane/src/types.ts`, `packages/control-plane/src/project.ts`, and `packages/control-plane/src/recommender/router.ts`.
- Pattern: Filesystem parsing and aggregation are separate from recommendation policy.

**Docs configuration factories and transforms:**

- Purpose: Reuse docs-site configuration and MDX rendering behavior outside the app package.
- Examples: `packages/docs-config/src/next-config.ts`, `packages/docs-config/src/source-config.ts`, `packages/docs-transforms/src/index.ts`, and `packages/docs-theme/src/index.ts`.
- Pattern: Small publishable packages expose factories/components; `apps/oat-docs` composes them.

## Entry Points

**OAT CLI:**

- Location: `packages/cli/src/index.ts`.
- Triggers: The published `oat` binary in `packages/cli/package.json` and the source-execution scripts in root `package.json`.
- Responsibilities: Create the Commander program, register command groups, normalize package-manager argv, set lifecycle hooks, and convert unhandled errors to CLI output/exit codes.

**CLI command registry:**

- Location: `packages/cli/src/commands/index.ts`.
- Triggers: `main()` in `packages/cli/src/index.ts`.
- Responsibilities: Add top-level command factories and recursively apply help configuration.

**Documentation app:**

- Location: `apps/oat-docs/app/layout.tsx`, `apps/oat-docs/app/[[...slug]]/page.tsx`, and `apps/oat-docs/app/api/search/route.ts`.
- Triggers: Next development/build/start scripts in `apps/oat-docs/package.json`.
- Responsibilities: Render Fumadocs layout and MDX routes, and serve static search integration.

**Documentation configuration:**

- Location: `apps/oat-docs/source.config.ts` and `apps/oat-docs/next.config.mjs`.
- Triggers: `fumadocs-mdx` during the `predev` and `prebuild` scripts in `apps/oat-docs/package.json`.
- Responsibilities: Configure content discovery, remark plugins, and static Next export.

## Error Handling

**Strategy:** CLI errors are typed and rendered at the executable boundary, while expected filesystem absence is handled locally where an optional resource is read.

**Patterns:**

- `packages/cli/src/index.ts` catches `CliError` separately, logs its message, and assigns the contained exit code; generic `Error` and unknown failures receive exit code 2.
- `packages/cli/src/engine/scanner.ts` treats missing canonical directories as empty, converts permission errors into `CliError`, and otherwise rethrows unexpected read failures.
- `packages/control-plane/src/project.ts` treats `ENOENT` as an absent optional project artifact in `readOptionalFile` and rethrows other filesystem errors.
- `packages/cli/src/engine/execute-plan.ts` counts individual operation failures rather than aborting the complete plan, while retaining manifest persistence at the end of execution.

## Cross-Cutting Concerns

**Logging:** CLI logging is constructed from `json` and `verbose` invocation options in `packages/cli/src/app/command-context.ts` and used by the executable error boundary in `packages/cli/src/index.ts`.

**Validation:** Shared content/scope types are defined with Zod in `packages/cli/src/shared/types.ts`; sync target safety is enforced before mutation in `packages/cli/src/engine/provider-path-safety.ts` and invoked by `packages/cli/src/engine/execute-plan.ts`.

**Authentication:** Not detected in the CLI, control-plane, or documentation entry/configuration modules inspected for this analysis (`packages/cli/src/index.ts`, `packages/control-plane/src/index.ts`, and `apps/oat-docs/`).

---

_Architecture analysis: 2026-08-30_
