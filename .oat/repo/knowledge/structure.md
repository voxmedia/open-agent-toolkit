---
oat_generated: true
oat_generated_at: 2026-02-16
oat_source_head_sha: 72b568a6cc88d2ce2b3889de3b904b7dd73e9d8d
oat_source_main_merge_base_sha: a80661894616fc9323542a4bcbcc22c08917e440
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"
---

# Codebase Structure

**Analysis Date:** 2026-02-16

## Directory Layout

```
open-agent-toolkit/
├── packages/
│   └── cli/                         # @oat/cli package
│       ├── src/
│       │   ├── index.ts             # Entry point
│       │   ├── app/                 # Application bootstrap
│       │   ├── commands/            # CLI command implementations
│       │   ├── config/              # Configuration loading
│       │   ├── drift/               # Drift detection logic
│       │   ├── engine/              # Sync computation and execution
│       │   ├── errors/              # Error handling
│       │   ├── fs/                  # Filesystem operations
│       │   ├── manifest/            # State persistence
│       │   ├── providers/           # Provider adapters
│       │   ├── shared/              # Common types
│       │   ├── ui/                  # CLI output and logging
│       │   ├── validation/          # Validation utilities
│       │   └── e2e/                 # End-to-end tests
│       ├── dist/                    # Compiled output (generated)
│       ├── package.json
│       └── tsconfig.json
├── tools/
│   └── git-hooks/                   # Git hook management
├── .agents/
│   ├── skills/                      # OAT skills (canonical)
│   ├── agents/                      # OAT agents (canonical)
│   ├── repo/                        # Repository knowledge
│   │   └── knowledge/               # External knowledge base (synced)
│   ├── projects/                    # Project state tracking
│   ├── templates/                   # Agent templates
│   └── scripts/                     # Automation scripts
├── .oat/
│   ├── projects/                    # Ad-hoc project work
│   ├── repo/                        # Repo-level knowledge
│   └── sync/                        # Sync state files (generated)
├── docs/
│   ├── oat/                         # OAT documentation
│   └── plans/                       # Planning documents
├── .vscode/                         # VS Code settings
├── .github/                         # GitHub workflows
├── package.json                     # Workspace root
├── turbo.json                       # Turborepo configuration
├── tsconfig.json                    # Base TypeScript config
└── AGENTS.md                        # Agent workflow documentation
```

## Directory Purposes

**packages/cli/src/:**
- Purpose: Main CLI application source code
- Contains: TypeScript modules organized by architectural layer
- Key files: `index.ts` (main entry), command registrations

**packages/cli/src/app/:**
- Purpose: Application initialization and context
- Contains: Program factory (commander), command context builder
- Key files: `create-program.ts`, `command-context.ts`

**packages/cli/src/commands/:**
- Purpose: CLI command implementations
- Contains: init, sync, status, providers, doctor commands with subcommands
- Key files: `index.ts` (register), `sync/index.ts` (main workflow)

**packages/cli/src/config/:**
- Purpose: Configuration loading and defaults
- Contains: Sync config schema, runtime environment detection
- Key files: `sync-config.ts`, `runtime.ts`

**packages/cli/src/drift/:**
- Purpose: Drift detection between canonical and provider copies
- Contains: Drift detection, stray file discovery, report generation
- Key files: `detector.ts`, `strays.ts`, `drift.types.ts`

**packages/cli/src/engine/:**
- Purpose: Core sync logic (compute and execute)
- Contains: Plan computation, execution, manifest saving, hook management
- Key files: `compute-plan.ts`, `execute-plan.ts`, `scanner.ts`, `engine.types.ts`

**packages/cli/src/errors/:**
- Purpose: CLI error handling with exit codes
- Contains: CliError class for controlled error propagation
- Key files: `cli-error.ts`

**packages/cli/src/fs/:**
- Purpose: Filesystem abstractions
- Contains: Directory operations, symlink/copy strategies, atomic writes
- Key files: `io.ts` (operations), `paths.ts` (path utilities)

**packages/cli/src/manifest/:**
- Purpose: Sync state persistence and management
- Contains: Manifest schema, loading/saving, entry management, hashing
- Key files: `manifest.types.ts`, `manager.ts`, `hash.ts`

**packages/cli/src/providers/:**
- Purpose: Provider adapter implementations
- Contains: Claude, Cursor, Codex adapters; shared adapter contract
- Key files: `*/adapter.ts` (per provider), `shared/adapter.types.ts`

**packages/cli/src/providers/shared/:**
- Purpose: Shared provider infrastructure
- Contains: Adapter contract, type definitions, utility functions
- Key files: `adapter.types.ts`, `adapter.utils.ts`, `adapter-contract.test.ts`

**packages/cli/src/providers/claude/:**
- Purpose: Claude Code adapter implementation
- Contains: Path mappings for Claude projects/user scope
- Key files: `adapter.ts`, `paths.ts`

**packages/cli/src/providers/cursor/:**
- Purpose: Cursor IDE adapter implementation
- Contains: Path mappings for Cursor projects/user scope
- Key files: `adapter.ts`, `paths.ts`

**packages/cli/src/providers/codex/:**
- Purpose: Codex IDE adapter implementation
- Contains: Path mappings for Codex projects/user scope
- Key files: `adapter.ts`, `paths.ts`

**packages/cli/src/shared/:**
- Purpose: Common types and constants
- Contains: ContentType (skill/agent), Scope (project/user/all), SyncStrategy
- Key files: `types.ts`

**packages/cli/src/ui/:**
- Purpose: CLI output, logging, and interaction
- Contains: Logger, spinner, formatted output, ANSI utilities
- Key files: `logger.ts`, `output.ts`, `spinner.ts`, `ansi.ts`

**packages/cli/src/validation/:**
- Purpose: Validation utilities
- Contains: Input validation helpers
- Key files: Index exports validation functions

**.agents/skills/:**
- Purpose: Canonical skills for OAT (source of truth)
- Generated: No
- Committed: Yes

**.agents/agents/:**
- Purpose: Canonical agents for OAT (source of truth)
- Generated: No
- Committed: Yes

**.agents/repo/:**
- Purpose: Repository-level knowledge and documentation
- Generated: No (synced from knowledge)
- Committed: Partial

**.oat/sync/:**
- Purpose: Runtime sync state tracking
- Generated: Yes
- Committed: No
- Contains: manifest.json (state), config.json (user configuration)

**tools/git-hooks/:**
- Purpose: Git hook management utilities
- Contains: Hook enable/disable scripts
- Key files: `manage-hooks.js`

## Key File Locations

**Entry Points:**
- `packages/cli/src/index.ts`: CLI main entry point with argv parsing
- `packages/cli/src/commands/sync/index.ts`: Sync command orchestration
- `packages/cli/src/commands/init/index.ts`: Initialization workflow
- `packages/cli/src/commands/status/index.ts`: Status reporting
- `packages/cli/src/commands/providers/index.ts`: Provider introspection

**Configuration:**
- `packages/cli/src/config/sync-config.ts`: Sync configuration schema and loading
- `packages/cli/tsconfig.json`: TypeScript configuration with path aliases
- `turbo.json`: Turborepo task definitions

**Core Logic:**
- `packages/cli/src/engine/compute-plan.ts`: Sync plan generation algorithm
- `packages/cli/src/engine/execute-plan.ts`: Sync plan execution
- `packages/cli/src/engine/scanner.ts`: Canonical entry discovery
- `packages/cli/src/manifest/manager.ts`: Manifest persistence
- `packages/cli/src/drift/detector.ts`: Drift detection algorithm

**Testing:**
- `packages/cli/src/**/*.test.ts`: Unit tests (Vitest)
- `packages/cli/src/**/*.integration.test.ts`: Integration tests
- `packages/cli/src/commands/__tests__/helpers.ts`: Test utilities
- `packages/cli/src/e2e/workflow.test.ts`: End-to-end tests

## Naming Conventions

**Files:**
- Action modules: `action-name.ts` (e.g., `sync-config.ts`, `cli-error.ts`)
- Adapter modules: `adapter.ts` with `paths.ts` companion
- Type-only modules: `*.types.ts` (e.g., `manifest.types.ts`, `engine.types.ts`)
- Index exports: `index.ts` to re-export public APIs
- Tests: `*.test.ts` for unit tests, `*.integration.test.ts` for integration

**Directories:**
- Feature/domain folders: Singular for types/files, plural for collections
- Layer directories: `commands`, `providers`, `ui` (action verbs or layers)
- Sub-providers: `claude`, `cursor`, `codex` (provider name lowercase)
- Shared logic: `shared` folder within layered directories

**Functions/Classes:**
- Adapter instances: `claudeAdapter`, `cursorAdapter` (lowerCamelCase)
- Factory functions: `create*` prefix (e.g., `createProgram`, `createSpinner`)
- Async operations: Async function names without prefix convention
- Type guards/predicates: `is*`, `has*`, `can*` prefixes

## Where to Add New Code

**New Provider:**
- Adapter implementation: `packages/cli/src/providers/<name>/adapter.ts`
- Path mappings: `packages/cli/src/providers/<name>/paths.ts`
- Index: `packages/cli/src/providers/<name>/index.ts`
- Register in: `packages/cli/src/commands/sync/index.ts` getAdapters()

**New Command:**
- Implementation: `packages/cli/src/commands/<name>/index.ts`
- Helper functions: `packages/cli/src/commands/<name>/<helper>.ts`
- Prompts: Centralized in `packages/cli/src/commands/shared/shared.prompts.ts`
- Register in: `packages/cli/src/commands/index.ts` registerCommands()

**New Engine Operation:**
- Type definitions: `packages/cli/src/engine/engine.types.ts`
- Implementation: `packages/cli/src/engine/<operation>.ts`
- Export in: `packages/cli/src/engine/index.ts`

**New Error Type:**
- All errors: Extend or use `CliError` in `packages/cli/src/errors/cli-error.ts`
- Export in: `packages/cli/src/errors/index.ts`

**Utilities/Helpers:**
- UI components: `packages/cli/src/ui/<component>.ts`
- Filesystem helpers: `packages/cli/src/fs/<helper>.ts`
- Shared utilities: `packages/cli/src/shared/` or command-specific `shared/`

**Tests:**
- Colocate with source files using `*.test.ts` suffix
- Test helpers: `packages/cli/src/<domain>/__tests__/` directory
- E2E tests: `packages/cli/src/e2e/` directory

## Special Directories

**.agents/:**
- Purpose: OAT system's canonical definitions (skills and agents)
- Generated: No (user-maintained)
- Committed: Yes (version controlled)
- Structure: `.agents/skills/<name>/` and `.agents/agents/<name>/`

**.oat/sync/:**
- Purpose: Runtime sync state and configuration
- Generated: Yes (created/updated by sync engine)
- Committed: No (git-ignored for local state)
- Files: `manifest.json`, `config.json`

**packages/cli/dist/:**
- Purpose: Compiled TypeScript output (ESM JavaScript)
- Generated: Yes (by tsc + tsc-alias)
- Committed: No
- Entry: `dist/index.js` (executable via `bin` field in package.json)

**node_modules/:**
- Purpose: pnpm dependencies (monorepo workspace and node_modules)
- Generated: Yes (by pnpm install)
- Committed: No (.pnpm-store used for offline installation)

---

*Structure analysis: 2026-02-16*
