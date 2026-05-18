---
oat_generated: true
oat_generated_at: 2026-05-17
oat_source_head_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_source_main_merge_base_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Codebase Structure

**Analysis Date:** 2026-05-17

## Directory Layout

```
open-agent-toolkit/
├── packages/                      # Publishable and private packages
│   ├── cli/                       # Main OAT CLI application
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── app/              # Application setup (program, context)
│   │   │   ├── commands/         # Command handlers (project, sync, config, etc.)
│   │   │   ├── engine/           # Sync computation and execution
│   │   │   ├── manifest/         # Manifest tracking and hashing
│   │   │   ├── drift/            # Drift detection and strays
│   │   │   ├── providers/        # Per-provider adapters (claude, codex, copilot, cursor, gemini)
│   │   │   ├── config/           # Configuration loading and resolution
│   │   │   ├── ui/               # Logger, spinner, output formatting
│   │   │   ├── validation/       # Skill and agent schema validation
│   │   │   ├── errors/           # Error types and handling
│   │   │   ├── fs/               # File system utilities
│   │   │   ├── shared/           # Version and shared types
│   │   │   └── release/          # Release tooling
│   │   ├── assets/               # Bundled assets (skills, agents, templates)
│   │   ├── scripts/              # Build scripts (bundle-assets.sh)
│   │   └── package.json          # CLI package metadata (bin: "oat")
│   ├── control-plane/            # Read-only state library
│   │   ├── src/
│   │   │   ├── index.ts          # Public exports (getProjectState, listProjects, recommendSkill)
│   │   │   ├── types.ts          # ProjectState, ProjectSummary, Phase, Lifecycle types
│   │   │   ├── project.ts        # Project state parsing and loading
│   │   │   ├── state/            # Artifact scanning, frontmatter parsing, task parsing
│   │   │   ├── recommender/      # Skill recommendation router and boundary logic
│   │   │   └── shared/           # Error utilities, normalization, frontmatter parsing
│   │   └── package.json
│   ├── docs-config/              # Docs site configuration
│   ├── docs-theme/               # Docs site theme and components
│   └── docs-transforms/          # Docs transformation utilities
├── apps/
│   └── oat-docs/                 # Documentation site (Next.js)
│       ├── app/                  # App router (API, catch-all routes)
│       ├── docs/                 # Documentation content (Markdown)
│       ├── lib/                  # Utilities for docs processing
│       └── package.json
├── .agents/
│   ├── skills/                   # Canonical skill definitions
│   │   ├── oat-repo-knowledge-index/  # Codebase knowledge generation
│   │   ├── oat-project-design/        # Project design workflow
│   │   ├── oat-project-plan-writing/  # Plan generation
│   │   ├── oat-project-implement/     # Implementation execution
│   │   ├── create-oat-skill/          # Skill creation template
│   │   ├── create-agnostic-skill/     # Provider-agnostic skill template
│   │   └── [30+ other skills]
│   ├── agents/                   # Agent definitions
│   └── docs/                     # Agent documentation
├── .oat/
│   ├── templates/                # Project artifact templates (state, plan, spec, design, etc.)
│   ├── scripts/                  # OAT workflow scripts
│   ├── projects/                 # Active OAT projects (user-created)
│   ├── sync/                     # Sync cache and state
│   ├── repo/
│   │   ├── knowledge/            # Generated codebase knowledge (architecture.md, stack.md, etc.)
│   │   ├── reference/            # Repository reference docs
│   │   ├── analysis/             # Analysis artifacts
│   │   └── reviews/              # Code review artifacts
│   └── README.md
├── .claude/                       # Claude Code provider local state
├── .codex/                        # Codex provider local state
├── .cursor/                       # Cursor provider local state
├── tools/
│   ├── git-hooks/                # Git hook management and implementations
│   │   ├── pre-commit            # Lint, format, type-check
│   │   ├── commit-msg            # Commit message validation (commitlint)
│   │   ├── pre-push              # Release validation
│   │   └── manage-hooks.js       # Hook installation/disabling
│   ├── release/                  # Release validation and version checking
│   └── docs/                     # Documentation tooling (link checker)
├── .github/
│   ├── workflows/                # CI/CD workflows
│   └── actions/                  # Reusable GitHub Actions
├── docs/                         # Repo-level documentation
│   └── research/                 # Research and reference docs
├── AGENTS.md                      # Development conventions for this project
├── CLAUDE.md                      # Local Claude Code instructions
├── package.json                   # Root workspace manifest
├── tsconfig.json                  # TypeScript base configuration
├── .eslintrc.json                 # Linting (oxlint via oxlintrc.json)
├── .oxlintrc.json                 # oxlint configuration
├── .oxfmtrc.jsonc                 # oxfmt configuration
├── pnpm-workspace.yaml            # pnpm monorepo configuration
├── turbo.json                     # Turborepo build orchestration
└── .gitignore                     # Git ignore patterns
```

## Directory Purposes

**`packages/cli/`:**

- Purpose: Main CLI application distributable; contains all command implementations, sync engine, provider adapters
- Contains: TypeScript source, test fixtures, build artifacts (dist/), bundle assets
- Key files: `src/index.ts` (entry), `src/commands/index.ts` (registry), `src/engine/` (core logic)

**`packages/cli/src/commands/`:**

- Purpose: Domain-organized command handlers
- Contains: Subcommand files (sync.ts, init.ts, project.ts, tools.ts, docs.ts, etc.), shared utilities per domain
- Key structure: Each command has `index.ts` exporting `create<CommandName>Command()`, plus supporting modules
- Examples: `project/new/index.ts`, `sync/index.ts`, `tools/install/index.ts`

**`packages/cli/src/engine/`:**

- Purpose: Core sync algorithm and execution
- Contains: Plan computation, plan execution, git hook management, marker insertion, canonical scanning
- Key files: `compute-plan.ts` (algorithm), `execute-plan.ts` (mutations), `hook.ts` (pre-commit/pre-push), `scanner.ts` (find canonical)

**`packages/cli/src/providers/`:**

- Purpose: Provider-agnostic adapter pattern for CLI tool location discovery
- Contains: Per-provider subdirectories (claude, codex, copilot, cursor, gemini) with adapter, paths, and transforms
- Key pattern: Each provider exports `<name>Adapter` (e.g., `claudeAdapter`), `MAPPINGS` (file location templates), and optional `transformRules()` function

**`packages/control-plane/src/`:**

- Purpose: Read-only library for project state parsing and lifecycle tracking
- Contains: Project state types, artifact scanning, frontmatter parsing, task progress parsing, skill recommender
- Key exports: `getProjectState()`, `listProjects()`, `recommendSkill()`

**`.agents/skills/`:**

- Purpose: Canonical skill repository; synced to user environments via CLI
- Contains: Skill definitions (SKILL.md), instructions, examples
- Note: Actual skills stored in `.agents/skills/{skill-name}/` with version controlled frontmatter

**`.oat/templates/`:**

- Purpose: Template scaffolds for new OAT projects
- Contains: Markdown templates for state.md, plan.md, spec.md, design.md, implementation.md, discovery.md
- Pattern: Templates use YAML frontmatter; users customize for their projects

**`.oat/projects/`:**

- Purpose: Local OAT project workspace
- Contains: User-created project directories under `.oat/projects/{scope}/{project-name}/` (e.g., `.oat/projects/user/feature-x/`)
- Key files: state.md (project lifecycle), plan.md (task breakdown), implementation.md (progress), spec.md, design.md, discovery.md, reviews/

**`tools/git-hooks/`:**

- Purpose: Git hook scripts for workflow automation
- Contains: pre-commit (lint, format, type-check), commit-msg (commitlint), pre-push (release validation), manage-hooks.js
- Key files: `pre-commit` (runs oxlint + oxfmt + type-check), `manage-hooks.js` (installation controller)

**`apps/oat-docs/`:**

- Purpose: Documentation website (Next.js)
- Contains: Content (Markdown in docs/), routes (app/), styling (packages/docs-theme), API endpoints
- Key structure: `docs/` contains category folders (guide, reference, workflows), `app/[[...slug]]/` for dynamic routing

**`packages/docs-config/`, `packages/docs-theme/`, `packages/docs-transforms/`:**

- Purpose: Reusable docs infrastructure (config, UI, processing)
- Exports: Used by oat-docs application

## Key File Locations

**Entry Points:**

- `packages/cli/src/index.ts`: CLI executable entry point (shebang, main(), isEntrypoint())
- `packages/cli/src/commands/index.ts`: Command registration
- `packages/control-plane/src/index.ts`: Public exports (getProjectState, listProjects, recommendSkill)

**Configuration:**

- `oat.yaml`: User sync configuration (top-level or project-level); defines enabled providers, scope
- `package.json`: Workspace and package manifests; bin field for CLI
- `packages/cli/src/config/sync-config.ts`: Sync config schema and loading
- `packages/cli/src/config/oat-config.ts`: OAT environment and provider config

**Core Logic:**

- `packages/cli/src/engine/compute-plan.ts`: Sync plan algorithm
- `packages/cli/src/engine/execute-plan.ts`: Sync plan execution
- `packages/cli/src/drift/detector.ts`: Drift detection logic
- `packages/control-plane/src/project.ts`: Project state loading
- `packages/control-plane/src/recommender/router.ts`: Skill recommendation

**Testing:**

- `packages/cli/src/**/*.test.ts`: CLI unit and integration tests (vitest)
- `packages/control-plane/src/**/*.test.ts`: Control-plane tests
- `packages/cli/src/commands/__tests__/`: Command-level fixtures
- `packages/cli/src/e2e/`: End-to-end test scenarios

## Naming Conventions

**Files:**

- Commands: `create<CommandName>Command()` exported from `src/commands/<domain>/<command>.ts` (e.g., `createSyncCommand()` in `src/commands/sync/index.ts`)
- Adapters: `<provider>Adapter` (e.g., `claudeAdapter`, `copilotAdapter`)
- Types: `.types.ts` suffix for standalone type files (e.g., `manifest.types.ts`, `engine.types.ts`)
- Tests: `.test.ts` suffix (e.g., `loader.test.ts`)
- Fixtures: `__fixtures__/` subdirectories for test data
- Utilities: `*.utils.ts` or `*.helpers.ts` for shared functions within a domain

**Directories:**

- Command domains: lowercase plural (e.g., `commands/project/`, `commands/tools/`, `commands/providers/`)
- Provider subdirectories: lowercase provider name (e.g., `providers/claude/`, `providers/codex/`)
- Layers: lowercase semantic name (e.g., `engine/`, `drift/`, `manifest/`, `ui/`)

**TypeScript:**

- ESM imports only; no CommonJS (type: "module" in package.json)
- Relative local imports: `./filename.ts` (prefer within same directory)
- Alias imports for non-local: TypeScript paths (e.g., `@shared/`, `@errors/`, `@providers/shared/`) — mapped in tsconfig.json
- Avoid parent-relative imports (`../`) outside of monorepo navigation; AGENTS.md prohibits catch-all `@/*` aliases

## Where to Add New Code

**New Command:**

- Primary code: `packages/cli/src/commands/<domain>/<command>.ts` (export `create<CommandName>Command()`)
- Tests: `packages/cli/src/commands/<domain>/<command>.test.ts`
- Register: Add `createCommand()` call in `packages/cli/src/commands/index.ts` (`registerCommands()`)

**New Provider Adapter:**

- Implementation: `packages/cli/src/providers/<provider-name>/adapter.ts` (export adapter, mappings, detect function)
- File mappings: `packages/cli/src/providers/<provider-name>/paths.ts`
- Rule transforms: `packages/cli/src/providers/<provider-name>/rule-transform.ts` (if provider has custom syntax)
- Register: Import and add to provider registry in sync engine

**New Skill/Agent:**

- Location: `.agents/skills/<skill-name>/` or `.agents/agents/<agent-name>/`
- Template: `.agents/skills/<skill-name>/SKILL.md` with frontmatter (version, type, steps, etc.)
- Asset bundling: Included in `packages/cli/assets/` during build (see `scripts/bundle-assets.sh`)

**Shared Utilities:**

- CLI utilities: `packages/cli/src/shared/` (exported via `src/shared/index.ts`)
- Control-plane utilities: `packages/control-plane/src/shared/`
- Domain-local utilities: Keep in command/module directory until proven generic

**Configuration:**

- Sync config schema: Update `packages/cli/src/config/sync-config.ts` (SyncConfigSchema)
- Runtime config: Update `packages/cli/src/config/oat-config.ts` (OatConfig type)
- Project artifact templates: Add to `.oat/templates/` as Markdown with frontmatter examples

## Special Directories

**`.agents/skills/oat-repo-knowledge-index/`:**

- Purpose: This codebase mapper; generates architecture.md, structure.md, stack.md, etc.
- Generated: No (source-controlled)
- Committed: Yes
- References: `.agents/skills/oat-repo-knowledge-index/references/templates/` contains markdown templates for generated docs

**`.oat/repo/knowledge/`:**

- Purpose: Repository codebase knowledge generated by `oat-repo-knowledge-index` skill
- Generated: Yes (via skill execution)
- Committed: Yes (tracked in git to provide continuity across sessions)
- Content: architecture.md, structure.md, stack.md, integrations.md, conventions.md, testing.md, concerns.md

**`packages/cli/assets/`:**

- Purpose: Bundled canonical skills, agents, and templates shipped with CLI
- Generated: Yes (created by `scripts/bundle-assets.sh` during build)
- Committed: No (generated artifact; in .gitignore)
- Scope: All canonical content from `.agents/skills/`, `.agents/agents/`, `.oat/templates/` copied here for distribution

**`.oat/sync/`:**

- Purpose: Manifest cache and sync state
- Generated: Yes (created/updated by sync engine)
- Committed: No (local state; in .gitignore)
- Content: Manifest JSON, last sync timestamp, provider state

**`.claude/`, `.cursor/`, `.codex/`:**

- Purpose: Local provider configuration (gitignored)
- Generated: Yes (created by provider detection or user setup)
- Committed: No
- Content: Provider-specific tool definitions, settings, state

---

_Structure analysis: 2026-05-17_
