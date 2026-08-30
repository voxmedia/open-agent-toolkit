---
oat_generated: true
oat_generated_at: 2026-08-30
oat_source_head_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_source_main_merge_base_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Codebase Structure

**Analysis Date:** 2026-08-30

## Directory Layout

```text
open-agent-toolkit/
├── packages/                 # Publishable TypeScript packages and CLI implementation
│   ├── cli/                  # `oat` executable, commands, sync engine, providers, validation
│   ├── control-plane/        # Read-only project-state parser and recommendation library
│   ├── docs-config/          # Reusable Fumadocs/Next configuration factories
│   ├── docs-theme/           # Reusable React documentation components
│   └── docs-transforms/      # Reusable remark/unified MDX transforms
├── apps/oat-docs/            # Next/Fumadocs documentation site and Markdown source
├── .agents/                  # Canonical provider-neutral skills, agents, and docs
├── .oat/                     # Repository OAT state, projects, templates, scripts, and sync state
├── tools/                    # Repository verification, release, docs, smoke, and Git-hook tooling
├── scripts/                  # Worktree and other repository maintenance scripts
├── docs/                     # Repository-level documentation and research materials
├── package.json              # pnpm workspace task scripts and toolchain entry points
├── pnpm-workspace.yaml       # Workspace package selection
└── turbo.json                # Turborepo task graph
```

## Directory Purposes

**`packages/cli/`:**

- Purpose: Publish the `oat` command-line interface and implement provider synchronization, project workflows, tooling, validation, and command UX.
- Contains: Source under `packages/cli/src/`, runtime asset bundling in `packages/cli/scripts/bundle-assets.sh`, and a package manifest with the `oat` binary mapping in `packages/cli/package.json`.
- Key files: `packages/cli/src/index.ts`, `packages/cli/src/commands/index.ts`, `packages/cli/src/engine/index.ts`, and `packages/cli/tsconfig.json`.

**`packages/cli/src/app/`:**

- Purpose: Compose the executable program and its per-invocation behavior.
- Contains: Commander creation, command context, help configuration, global installer behavior, and update notifications.
- Key files: `packages/cli/src/app/create-program.ts` and `packages/cli/src/app/command-context.ts`.

**`packages/cli/src/commands/`:**

- Purpose: Group Commander command factories by user-facing command domain.
- Contains: Directories such as `sync/`, `init/`, `project/`, `docs/`, `pjm/`, `review/`, `tools/`, plus shared command helpers in `shared/`.
- Key files: `packages/cli/src/commands/index.ts` is the registration hub, and `packages/cli/src/commands/sync/index.ts` is the sync command composition root.

**`packages/cli/src/engine/`:**

- Purpose: Scan canonical agent content, compute a provider synchronization plan, and perform filesystem mutations.
- Contains: Scanner, plan computation, execution, marker, hook, and provider-path safety modules, normally paired with colocated tests.
- Key files: `packages/cli/src/engine/scanner.ts`, `packages/cli/src/engine/compute-plan.ts`, `packages/cli/src/engine/execute-plan.ts`, and `packages/cli/src/engine/engine.types.ts`.

**`packages/cli/src/providers/`:**

- Purpose: Express provider-specific agent-file mappings and materialization behavior.
- Contains: One directory per provider (`claude/`, `codex/`, `copilot/`, `cursor/`, `gemini/`), common contracts in `shared/`, and provider-support policy in `ceiling/` and `identity/`.
- Key files: `packages/cli/src/providers/shared/adapter.types.ts`, `packages/cli/src/providers/shared/adapter.utils.ts`, and `packages/cli/src/providers/codex/adapter.ts`.

**`packages/cli/src/{config,fs,manifest,projects,validation,release,drift,shared,ui,errors}/`:**

- Purpose: Hold CLI domain services that are shared by multiple command groups rather than owned by one command.
- Contains: Configuration loading, filesystem/path helpers, sync-manifest handling, project operations, release/skill validation, output formatting, and `CliError` definitions.
- Key files: `packages/cli/src/shared/types.ts`, `packages/cli/src/errors/cli-error.ts`, and `packages/cli/src/validation/skills.ts`.

**`packages/control-plane/`:**

- Purpose: Publish read-only structured access to OAT project state.
- Contains: Public exports at `packages/control-plane/src/index.ts`, Markdown state parsing under `src/state/`, recommendation routing under `src/recommender/`, and package types in `src/types.ts`.
- Key files: `packages/control-plane/src/project.ts` and `packages/control-plane/src/recommender/router.ts`.

**`packages/docs-config/`, `packages/docs-theme/`, and `packages/docs-transforms/`:**

- Purpose: Separate reusable documentation configuration, React presentation components, and remark/unified transformations into public workspace packages.
- Contains: TypeScript source under each package's `src/` directory; the exported package surfaces are at `packages/docs-config/src/index.ts`, `packages/docs-theme/src/index.ts`, and `packages/docs-transforms/src/index.ts`.
- Key files: `packages/docs-config/src/source-config.ts`, `packages/docs-theme/src/docs-page.tsx`, and `packages/docs-transforms/src/remark-links.ts`.

**`apps/oat-docs/`:**

- Purpose: Build and publish the documentation site that composes the three docs packages.
- Contains: Next App Router files in `app/`, React components in `components/`, Fumadocs source wrapper in `lib/`, Markdown source in `docs/`, and Fumadocs config in `source.config.ts`.
- Key files: `apps/oat-docs/app/layout.tsx`, `apps/oat-docs/app/[[...slug]]/page.tsx`, `apps/oat-docs/lib/source.ts`, and `apps/oat-docs/package.json`.

**`.agents/`:**

- Purpose: Store canonical, provider-neutral agent assets consumed by the CLI sync engine.
- Contains: `skills/` directories containing `SKILL.md`, `agents/` role definitions, and supporting `.agents/docs/` material.
- Key files: `.agents/skills/oat-repo-knowledge-index/SKILL.md` and `.agents/agents/`.

**`.oat/`:**

- Purpose: Store OAT repository configuration, project records, knowledge artifacts, templates, scripts, and sync metadata.
- Contains: `projects/`, `repo/`, `templates/`, `scripts/`, and `sync/`; the current project state is organized below `.oat/projects/{shared,local,archived}/`.
- Key files: `.oat/config.json`, `.oat/repo/AGENTS.md`, and `.oat/sync/` (where scope-specific sync commands resolve config/manifest paths in `packages/cli/src/commands/sync/index.ts`).

**`tools/`:**

- Purpose: Keep repository-level automation outside published package source.
- Contains: Docs checking in `tools/docs/`, Git hook management in `tools/git-hooks/`, release validation in `tools/release/`, smoke checks in `tools/smoke/`, and verification utilities in `tools/verification/`.
- Key files: `tools/docs/check-links.ts`, `tools/release/check-version-bumps.ts`, and `tools/git-hooks/manage-hooks.js`.

**`scripts/`:**

- Purpose: Hold shell workflows invoked by root package scripts.
- Contains: Worktree setup and validation under `scripts/worktree/` and archived-project synchronization in `scripts/sync-archived-projects-from-s3.sh`.
- Key files: `scripts/worktree/init.sh` and `scripts/worktree/validate.sh`.

## Key File Locations

**Entry Points:**

- `packages/cli/src/index.ts`: Node shebang executable, command dispatch, error boundary, and `main()` export.
- `packages/cli/src/commands/index.ts`: Registers every top-level Commander command.
- `packages/control-plane/src/index.ts`: Public library export surface.
- `apps/oat-docs/app/layout.tsx`: Next layout entry for the documentation app.
- `apps/oat-docs/app/[[...slug]]/page.tsx`: Catch-all documentation page renderer.

**Configuration:**

- `package.json`: Root scripts, engine requirements, and toolchain dependencies.
- `pnpm-workspace.yaml`: pnpm workspace package definitions.
- `turbo.json`: Turborepo task pipeline configuration.
- `tsconfig.json`: Root TypeScript compiler settings inherited by package configs.
- `packages/cli/tsconfig.json`: CLI path aliases and build/test exclusions.
- `apps/oat-docs/source.config.ts`: Fumadocs content and remark configuration.
- `apps/oat-docs/next.config.mjs`: Next configuration through the shared docs-config package.

**Core Logic:**

- `packages/cli/src/commands/`: Command-specific CLI behavior; add a command group beneath this directory and register it from `packages/cli/src/commands/index.ts`.
- `packages/cli/src/engine/`: Sync scanning, plan derivation, and execution.
- `packages/cli/src/providers/`: Provider-specific adapter mappings and codecs.
- `packages/cli/src/manifest/`: Persisted managed-content metadata used by the sync engine.
- `packages/control-plane/src/state/`: Project artifact parsing and status discovery.
- `packages/control-plane/src/recommender/`: Routing policy from project state to workflow skill.

**Testing:**

- `packages/cli/src/**/*.test.ts`: Unit, integration, and behavior tests colocated with CLI source; examples include `packages/cli/src/engine/compute-plan.test.ts` and `packages/cli/src/commands/sync/index.test.ts`.
- `packages/control-plane/src/**/*.test.ts`: Colocated Vitest coverage for project parsing and recommendation rules, such as `packages/control-plane/src/project.test.ts` and `packages/control-plane/src/recommender/router.test.ts`.
- `packages/docs-config/src/**/*.test.ts` and `packages/docs-transforms/src/**/*.test.ts`: Colocated tests for public documentation packages.
- `tools/smoke/`: Node test-runner checks included by the root `test:smoke` script in `package.json`.
- `.agents/skills/*/tests/`: Skill-specific Node test-runner checks included by `test:skills` in `package.json`.

## Naming Conventions

**Files:**

- TypeScript implementation files use lowercase kebab-case names, e.g. `packages/cli/src/app/command-context.ts`, `packages/cli/src/engine/compute-plan.ts`, and `packages/control-plane/src/recommender/router.ts`.
- React component implementation files in the theme package use lowercase kebab-case names, e.g. `packages/docs-theme/src/docs-layout.tsx` and `packages/docs-theme/src/docs-page.tsx`.
- Test files are colocated and use `.test.ts`, e.g. `packages/cli/src/providers/codex/adapter.test.ts` and `packages/docs-transforms/src/remark-tabs.test.ts`.
- Provider integrations use a consistent `adapter.ts`, `paths.ts`, and optional `rule-transform.ts` layout, visible in `packages/cli/src/providers/{claude,cursor,codex,copilot,gemini}/`.
- Canonical skill directories use kebab-case names and a `SKILL.md` entry point, e.g. `.agents/skills/oat-repo-knowledge-index/SKILL.md`.

**Directories:**

- CLI command directories use the top-level command noun in lowercase, e.g. `packages/cli/src/commands/{sync,project,docs,pjm}/`.
- Provider directories use the lower-case provider identity, e.g. `packages/cli/src/providers/{claude,cursor,codex,copilot,gemini}/`.
- Public package roots use kebab-case names beneath `packages/`, e.g. `packages/docs-config/` and `packages/docs-transforms/`.
- Test-only helper directories use `__tests__/` where a package needs shared fixtures, as in `packages/cli/src/__tests__/` and `packages/cli/src/commands/__tests__/`.

## Where to Add New Code

**New CLI Feature:**

- Primary code: Place a new command group in `packages/cli/src/commands/<command>/` when it owns a user-facing Commander command, following existing groups such as `packages/cli/src/commands/sync/` and `packages/cli/src/commands/project/`.
- Registration: Add its factory to `packages/cli/src/commands/index.ts`.
- Tests: Colocate `*.test.ts` beside the new source in `packages/cli/src/commands/<command>/`.

**New synchronization provider:**

- Implementation: Add its mapping/detection adapter under `packages/cli/src/providers/<provider>/` using `packages/cli/src/providers/shared/adapter.types.ts`.
- Integration: Include the adapter in the default adapter lists in `packages/cli/src/commands/sync/index.ts` and `packages/cli/src/commands/init/index.ts` when it is supported by those flows.
- Tests: Colocate adapter and mapping behavior tests in `packages/cli/src/providers/<provider>/*.test.ts`.

**New sync behavior:**

- Primary code: Use `packages/cli/src/engine/` for provider-neutral scanning, plan, marker, or execution behavior.
- Tests: Place plan/execution tests next to affected engine modules, e.g. `packages/cli/src/engine/compute-plan.test.ts`.

**New project-state capability:**

- Implementation: Place Markdown parsing/scanning in `packages/control-plane/src/state/`, routing policy in `packages/control-plane/src/recommender/`, and shared shape changes in `packages/control-plane/src/types.ts`.
- Public API: Export externally supported functions from `packages/control-plane/src/index.ts`.
- Tests: Colocate Vitest tests with the implementation, following `packages/control-plane/src/project.test.ts`.

**New documentation reusable capability:**

- Configuration: Add reusable site factories under `packages/docs-config/src/`.
- Rendering component: Add shared React components under `packages/docs-theme/src/` and export them through `packages/docs-theme/src/index.ts`.
- Markdown transformation: Add remark/unified transforms under `packages/docs-transforms/src/` and export them through `packages/docs-transforms/src/index.ts`.

**New documentation page:**

- Content: Add Markdown/MDX source under `apps/oat-docs/docs/`, following the existing content-area directories such as `apps/oat-docs/docs/guide/`, `apps/oat-docs/docs/reference/`, and `apps/oat-docs/docs/workflows/`.
- App behavior: Add a Next route or component under `apps/oat-docs/app/` or `apps/oat-docs/components/` only for a site behavior not handled by the existing catch-all page.

**Utilities:**

- CLI shared helpers: Place reusable command-independent helpers in the appropriate focused directory under `packages/cli/src/` (for example `fs/`, `shared/`, `config/`, or `validation/`) rather than a generic root utility file; existing boundaries are shown by `packages/cli/src/fs/`, `packages/cli/src/shared/`, and `packages/cli/src/validation/`.
- Cross-package documentation helpers: Use the dedicated docs package that matches responsibility (`packages/docs-config/`, `packages/docs-theme/`, or `packages/docs-transforms/`).

## Special Directories

**`.agents/`:**

- Purpose: Canonical source of provider-neutral skills, agents, and related agent documentation used by the sync scanner (`packages/cli/src/engine/scanner.ts`).
- Generated: No; canonical skills such as `.agents/skills/oat-repo-knowledge-index/SKILL.md` are source artifacts.
- Committed: Yes; it is a tracked top-level source directory.

**`.claude/`, `.codex/`, and `.cursor/`:**

- Purpose: Provider-specific views/configuration detected by `packages/cli/src/providers/{claude,codex,cursor}/adapter.ts`.
- Generated: Mixed/unknown; provider adapters detect these directories, and the sync engine can materialize managed content into provider paths (`packages/cli/src/engine/execute-plan.ts`).
- Committed: Mixed/unknown; this repository contains each directory, while per-file tracking must be inspected separately.

**`.oat/`:**

- Purpose: OAT workflow data, repository references, project artifacts, generated knowledge, templates, and synchronization state.
- Generated: Mixed; `packages/cli/src/commands/sync/index.ts` resolves sync config/manifest under `.oat/sync/`, while `.oat/templates/` and `.oat/scripts/` are repository assets.
- Committed: Mixed/unknown; the directory contains both durable repository artifacts and runtime-managed state.

**`apps/oat-docs/.source/`, `apps/oat-docs/.next/`, and `apps/oat-docs/out/`:**

- Purpose: Fumadocs source generation, Next build state, and static-export output for the documentation application.
- Generated: Yes; `apps/oat-docs/package.json` runs `fumadocs-mdx` before development/build and configures `next build`, while `packages/docs-config/src/next-config.ts` sets static export output.
- Committed: Mixed/unknown; generated-directory tracking must be determined from Git metadata rather than inferred from their existence.

**`tools/`:**

- Purpose: Repository-only quality, release, documentation, hook, and smoke automation.
- Generated: No; scripts such as `tools/release/check-version-bumps.ts` and `tools/docs/check-links.ts` are invoked by root scripts in `package.json`.
- Committed: Yes; it is a tracked top-level tooling source directory.

---

_Structure analysis: 2026-08-30_
