---
oat_generated: true
oat_generated_at: 2026-05-17
oat_source_head_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_source_main_merge_base_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Architecture

**Analysis Date:** 2026-05-17

## Pattern Overview

**Overall:** Monorepo-based toolkit with layered CLI application, shared control-plane library, and companion documentation site.

**Key Characteristics:**

- TypeScript ESM monorepo using Turborepo for build orchestration and pnpm workspaces for dependency management
- CLI application (`@open-agent-toolkit/cli`) with command registry pattern, provider-agnostic adapter system, and state management engine
- Shared read-only control-plane library (`@open-agent-toolkit/control-plane`) that parses project state from YAML frontmatter and artifacts
- Plugin architecture for provider adapters (Claude, Codex, Copilot, Cursor, Gemini) with per-provider configuration and drift detection
- Multi-package build pipeline with lockstep public package versioning for shipped CLI functionality

## Layers

**Entry Point (CLI):**

- Purpose: Node.js executable that routes commands and manages global options
- Location: `packages/cli/src/index.ts`
- Contains: Command-line argument parsing, error handling, exit code management
- Depends on: `createProgram()`, `registerCommands()`, `CliError`
- Used by: Node.js runtime via `bin` field in `package.json`

**Application Layer (CLI):**

- Purpose: Command registration, program setup, and context management
- Location: `packages/cli/src/app/`
- Contains: `createProgram()` (Commander.js setup), `CommandContext` (runtime state), `command-context.ts` (logger/config injection)
- Depends on: commander, logging utilities
- Used by: Entry point (`index.ts`), all command handlers

**Command Layer:**

- Purpose: Organized command handlers grouped by domain (project, sync, config, tools, docs, etc.)
- Location: `packages/cli/src/commands/`
- Contains: Subcommand structure (`createProjectCommand()`, `createSyncCommand()`, etc.), domain-specific utilities
- Depends on: engine, config, providers, manifest, control-plane, UI layer
- Used by: Application layer (registered via `registerCommands()`)

**Engine/Execution Layer:**

- Purpose: Core sync logic, plan computation, and execution of sync operations
- Location: `packages/cli/src/engine/`
- Contains: `computeSyncPlan()`, `executeSyncPlan()`, git hook management, marker insertion, canonical scanning
- Depends on: manifest, drift, config
- Used by: `sync` command, `init` command, cleanup operations

**Configuration Layer:**

- Purpose: Load, validate, and resolve runtime configuration
- Location: `packages/cli/src/config/`
- Contains: `SyncConfig` (oat.yaml parsing), `OatConfig` (environment/providers), `runtime.ts` (interactive mode detection)
- Depends on: zod (validation), YAML parser
- Used by: Engine, commands, providers

**Manifest Layer:**

- Purpose: Track canonical/user skill/agent entries and detect changes
- Location: `packages/cli/src/manifest/`
- Contains: `Manifest` (in-memory representation), `ManifestManager` (load/save/hash), hash computation for drift detection
- Depends on: File system, validation
- Used by: Sync engine, drift detector

**Drift & Strays Layer:**

- Purpose: Detect divergence between canonical and local state, identify stray files
- Location: `packages/cli/src/drift/`
- Contains: `detectDrift()` (compare manifest to filesystem), `detectStrays()` (untracked files)
- Depends on: Manifest, filesystem
- Used by: Sync command, status display

**Provider Adapter Layer:**

- Purpose: Abstractly handle provider-specific file locations, rules, and transformations
- Location: `packages/cli/src/providers/`
- Contains: Per-provider adapters (claude, codex, copilot, cursor, gemini) with `adapter.ts` (detection + mapping), `paths.ts` (file location templates), `rule-transform.ts` (rule syntax)
- Depends on: Shared adapter interface, config
- Used by: Sync engine (apply provider-specific transforms)

**Control-Plane Library:**

- Purpose: Read-only state parsing and project lifecycle tracking
- Location: `packages/control-plane/src/`
- Contains: `getProjectState()` (parses `.oat/projects/*/state.md`), `ProjectState` type, task progress parsing, artifact scanning, skill recommender
- Depends on: YAML parser
- Used by: Commands requiring project state (design, plan, implement), skill recommendation router

**UI Layer:**

- Purpose: Consistent terminal output, logging, and user interaction
- Location: `packages/cli/src/ui/`
- Contains: `Logger` (structured logging), `Spinner` (progress indication), `Output` (rich formatting), ANSI utilities
- Depends on: chalk (colors), ora (spinner)
- Used by: All commands for user-facing output

**Validation Layer:**

- Purpose: Skill and agent validation against schemas
- Location: `packages/cli/src/validation/`
- Contains: Schema validators for skills (SKILL.md frontmatter, content structure)
- Depends on: File system, YAML parsing
- Used by: `validate-oat-skills` command, internal validation

## Data Flow

**Sync Operation (High-Level):**

1. User runs `oat sync --scope project`
2. Application layer loads config (`SyncConfig` from `oat.yaml`)
3. Engine scans canonical (`.agents/skills/`, etc.) and creates `Manifest`
4. Engine detects drift between manifest and user directories (via `detectDrift()`)
5. Engine computes sync plan (`computeSyncPlan()`) — what to copy, symlink, remove
6. For each provider, apply provider-specific rule transformations
7. Engine executes plan (`executeSyncPlan()`) — mutates filesystem, updates manifest
8. Git hooks installed if enabled

**Project State Retrieval:**

1. Control-plane `getProjectState(projectPath)` reads `.oat/projects/{scope}/{name}/state.md`
2. Parses YAML frontmatter for phase, lifecycle, timestamps, etc.
3. Scans artifact directory for discovery.md, spec.md, design.md, plan.md, implementation.md
4. Parses plan.md task table and implementation.md task progress
5. Parses review table from plan.md
6. Returns structured `ProjectState` object
7. Skill recommender routes to appropriate skill based on phase + state

**Provider Configuration Resolution:**

1. Load oat.yaml (top-level `providers` section)
2. For each provider (claude, codex, copilot, cursor, gemini):
   - Call provider adapter's `detect()` function (check for `.claude/`, `.cursor/`, etc.)
   - If detected and enabled in config, apply provider's mappings (project vs user scope)
3. Build effective config with enabled providers and their file mappings

**State Management:**

- `ProjectState`: Immutable struct parsed from artifact YAML frontmatter and file system state
- `Manifest`: In-memory tracking of canonical and synced entries; persisted as JSON to prevent redundant re-scans
- `SyncConfig`: YAML-based provider settings; defaults applied at load time
- Command context: Logger, config, cwd injected at execution time

## Key Abstractions

**ProviderAdapter:**

- Purpose: Abstract provider-specific file locations and rule syntax
- Examples: `claudeAdapter`, `copilotAdapter`, `cursorAdapter`, `geminiAdapter`, `codexAdapter` in `packages/cli/src/providers/{provider}/adapter.ts`
- Pattern: Each adapter has `name`, `displayName`, `defaultStrategy` (copy vs symlink), `projectMappings` (file path templates), `userMappings`, and `detect()` function

**Manifest:**

- Purpose: Track canonical and user-synced entries (skills, agents, templates) to detect changes
- Examples: `packages/cli/src/manifest/manifest.types.ts` (schema), `manager.ts` (load/save/validate)
- Pattern: Zod validation, version pinning, hash-based comparison for drift detection

**SyncPlan:**

- Purpose: Declarative representation of file operations to apply
- Examples: `packages/cli/src/engine/engine.types.ts` (SyncPlanEntry, SyncOperation)
- Pattern: Immutable plan generated by `computeSyncPlan()`, executed by `executeSyncPlan()`; supports copy, symlink, remove, update operations

**ProjectState:**

- Purpose: Structured, read-only representation of OAT project lifecycle
- Examples: `packages/control-plane/src/types.ts` (ProjectState, ProjectSummary)
- Pattern: Parsed from artifact YAML frontmatter and file system; fields include phase, lifecycle, progress (task counts), reviews, blockers, PR status

## Entry Points

**CLI Entry Point:**

- Location: `packages/cli/src/index.ts`
- Triggers: Invoked by Node.js when `oat` binary is executed
- Responsibilities: Normalize arguments (strip pnpm sentinel `--`), create program, register commands, parse and execute

**Command Registration:**

- Location: `packages/cli/src/commands/index.ts` (`registerCommands()`)
- Triggers: Called by application layer during startup
- Responsibilities: Attach all command handlers to Commander.js program instance

**Sync Execution:**

- Location: `packages/cli/src/commands/sync/index.ts`
- Triggers: User runs `oat sync [subcommand]`
- Responsibilities: Load config, compute sync plan, apply provider-specific transforms, execute plan

**Project State Access:**

- Location: `packages/control-plane/src/project.ts` (`getProjectState()`)
- Triggers: Called by commands needing project state (design, plan, implement)
- Responsibilities: Parse state.md frontmatter, scan artifacts, parse task progress, return ProjectState

## Error Handling

**Strategy:** Explicit error types with exit code semantics; CLI catches and logs before process exit.

**Patterns:**

- `CliError` (actionable user error, exit 1) vs generic `Error` (system error, exit 2) in `packages/cli/src/errors/index.ts`
- Zod validation failures caught and reformatted as human-readable messages (`SyncConfigSchema.safeParse()`)
- Manifest load failures trigger remediation guidance ("Delete or repair the file")
- Hook installation wrapped in try-catch; drift warnings logged but non-fatal
- Command handlers catch all errors, log via logger (not console.\*), exit with appropriate code

## Cross-Cutting Concerns

**Logging:** Centralized `Logger` in `packages/cli/src/ui/logger.ts` with JSON and human-readable modes; all commands route output through logger.

**Validation:** Zod schemas for manifest, sync config, frontmatter; validation errors caught at load time with remediation guidance.

**File Operations:** All mutations go through engine layer; `--dry-run` flag toggles execution without side effects; git hooks manage pre-commit/pre-push validation.

**Provider Interop:** Provider adapters decouple provider-specific logic from core sync engine; rule transformations applied per-provider after plan is computed.

**State Persistence:** Manifest JSON + artifact YAML frontmatter; both use versioning and timestamps to detect staleness; control-plane reads-only (no mutations).

---

_Architecture analysis: 2026-05-17_
