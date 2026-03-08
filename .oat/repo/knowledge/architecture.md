---
oat_generated: true
oat_generated_at: 2026-02-16
oat_source_head_sha: 72b568a6cc88d2ce2b3889de3b904b7dd73e9d8d
oat_source_main_merge_base_sha: a80661894616fc9323542a4bcbcc22c08917e440
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"
---

# Architecture

**Analysis Date:** 2026-02-16

## Pattern Overview

**Overall:** Modular TypeScript CLI with layered architecture and adapter pattern for provider support

**Key Characteristics:**
- **Monorepo with Turborepo**: Single package (@oat/cli) with TypeScript ESM throughout
- **Adapter Pattern**: Pluggable provider adapters (Claude, Cursor, Codex) implementing a common contract
- **Synchronization Engine**: Core computation and execution separation for sync operations
- **Manifest-Based State**: JSON manifest tracks canonical-to-provider mappings with content hashes
- **Scope-Based Execution**: Project-level and user-level scoping for skills and agents

## Layers

**Application Layer (app/)**
- Purpose: Bootstrap and command routing infrastructure
- Location: `packages/cli/src/app/`
- Contains: Program factory, command context building, global options handling
- Depends on: Commander.js, configuration, UI
- Used by: Main entry point, all commands

**Command Layer (commands/)**
- Purpose: CLI command implementations (init, sync, status, providers, doctor)
- Location: `packages/cli/src/commands/`
- Contains: Command handlers, prompts, output formatting
- Depends on: Engine, providers, manifest, drift detection
- Used by: Application layer to register CLI commands

**Engine Layer (engine/)**
- Purpose: Core sync computation and execution logic
- Location: `packages/cli/src/engine/`
- Contains: Sync plan computation, plan execution, manifest persistence, hook management
- Depends on: Providers, manifest, file I/O
- Used by: Sync command, compute-plan, execute-plan workflows

**Provider Layer (providers/)**
- Purpose: Adapter implementations for provider-specific path mappings
- Location: `packages/cli/src/providers/`
- Contains: Claude, Cursor, Codex adapters; shared adapter contract and utilities
- Depends on: Shared types and interfaces
- Used by: Engine for detecting and configuring providers

**Manifest Layer (manifest/)**
- Purpose: State persistence for sync operations
- Location: `packages/cli/src/manifest/`
- Contains: Manifest loading/saving, entry management, content hashing
- Depends on: File I/O, Zod validation
- Used by: Engine for state tracking, drift detection

**Drift Detection Layer (drift/)**
- Purpose: Identify divergence between canonical and provider copies
- Location: `packages/cli/src/drift/`
- Contains: Drift detection, "stray" file discovery, drift report generation
- Depends on: Manifest, file I/O, hashing
- Used by: Status command, drift reporting

**Configuration Layer (config/)**
- Purpose: Sync configuration loading and runtime context
- Location: `packages/cli/src/config/`
- Contains: Sync config schema, defaults, runtime environment detection
- Depends on: Zod validation, file I/O
- Used by: Engine for strategy and provider enablement

**File I/O Layer (fs/)**
- Purpose: Filesystem abstractions and path utilities
- Location: `packages/cli/src/fs/`
- Contains: Directory operations, symlink/copy strategies, atomic writes, path resolution
- Depends on: Node.js fs/promises
- Used by: Engine, manifest manager, drift detector

**UI Layer (ui/)**
- Purpose: CLI output, logging, and interactive elements
- Location: `packages/cli/src/ui/`
- Contains: Logger, spinner, output formatting, ANSI utilities
- Depends on: Chalk, Ora, Inquirer (for prompts)
- Used by: All commands for user feedback

**Shared Layer (shared/)**
- Purpose: Common types and constants across modules
- Location: `packages/cli/src/shared/`
- Contains: Content types (skill/agent), scopes (project/user/all), sync strategies
- Depends on: Zod for validation
- Used by: All layers for type safety

**Error Handling Layer (errors/)**
- Purpose: CLI-specific error handling
- Location: `packages/cli/src/errors/`
- Contains: CliError class with exit codes
- Depends on: None
- Used by: All layers for controlled error propagation

## Data Flow

**Sync Workflow (init -> status -> sync):**

1. User runs `oat sync` with scope and apply flag
2. buildCommandContext constructs context (cwd, home, interactive, logger)
3. CommandContext feeds into sync command handler
4. For each concrete scope (project, user):
   - Resolve scope root (.agents/skills, .agents/agents directories)
   - Load manifest from `.oat/sync/manifest.json` (or create empty)
   - Load sync config from `.oat/sync/config.json` (or use defaults)
   - scanCanonical discovers entries in `.agents/skills` and `.agents/agents`
   - getActiveAdapters detects installed providers (Claude, Cursor, Codex)
   - computeSyncPlan generates sync operations comparing canonical vs manifest vs provider paths
5. executeSyncPlan applies operations (create symlink/copy, update, remove)
6. saveManifest persists updated state with content hashes
7. Output formatted results to user

**Provider Detection:**
1. Each adapter (ProviderAdapter) exposes a detect() function
2. Detection checks for provider-specific markers (e.g., `.claude` directory)
3. getActiveAdapters runs parallel detection across all adapters
4. Only active adapters are included in sync plan computation

**Drift Detection:**
1. Status command loads manifest entries
2. detectDrift() checks each entry:
   - Provider path exists? (symlink or file)
   - For symlink: target points to canonical? 
   - For copy: content hash matches?
3. Generate DriftReport with status (in_sync, drifted, missing)
4. Display drift summary and stray files

**State Management:**
- Manifest acts as source of truth for sync state
- Content hashes enable copy strategy drift detection
- Symlink targets are validated by target path resolution
- Last sync timestamp in manifest for audit

## Key Abstractions

**ProviderAdapter:**
- Purpose: Standardized interface for providers (Claude, Cursor, Codex)
- Examples: `claudeAdapter`, `cursorAdapter`, `codexAdapter`
- Pattern: Adapter exposes name, displayName, path mappings (project/user), detect function

**PathMapping:**
- Purpose: Define canonical-to-provider directory mappings per content type
- Examples: Claude skills path, Cursor agents path
- Pattern: Maps contentType + canonicalDir to providerDir with nativeRead flag

**SyncPlan & SyncPlanEntry:**
- Purpose: Computed representation of all sync operations for a scope
- Pattern: Entry specifies canonical path, provider, strategy, operation type (create/update/remove)
- Contains reason for operation and actual strategy to apply

**Manifest & ManifestEntry:**
- Purpose: Persistent state tracking canonical-provider relationships
- Pattern: Entry stores both paths, provider name, content hash, last sync timestamp
- Zod schema ensures invariants (copy must have hash, symlink must not)

**CommandContext:**
- Purpose: Unified context object passed through command execution
- Pattern: Encapsulates cwd, scope, interactive flag, logger, apply mode
- Contains: home directory, verbose/json flags for output control

**CanonicalEntry:**
- Purpose: Discovered skill/agent in canonical location
- Pattern: Name, type, canonicalPath derived from .agents directory scan
- Sourced from scanCanonical during sync plan computation

## Entry Points

**CLI Main Entry (index.ts):**
- Location: `packages/cli/src/index.ts`
- Triggers: `oat` command execution
- Responsibilities: Bootstrap program, register commands, error handling, exit codes

**Sync Command (commands/sync/index.ts):**
- Location: `packages/cli/src/commands/sync/index.ts`
- Triggers: `oat sync [--scope] [--dry-run] [--verbose] [--json]`
- Responsibilities: Orchestrate sync workflow, compute plans per scope, execute by default (preview with --dry-run)

**Init Command (commands/init/index.ts):**
- Location: `packages/cli/src/commands/init/index.ts`
- Triggers: `oat init`
- Responsibilities: Initialize .oat structure, create default config/manifest

**Status Command (commands/status/index.ts):**
- Location: `packages/cli/src/commands/status/index.ts`
- Triggers: `oat status`
- Responsibilities: Load manifest, detect drift, display sync status per scope

**Providers Command (commands/providers/index.ts):**
- Location: `packages/cli/src/commands/providers/index.ts`
- Triggers: `oat providers list|inspect`
- Responsibilities: List installed providers, inspect adapter details and mappings

**Doctor Command (commands/doctor/index.ts):**
- Location: `packages/cli/src/commands/doctor/index.ts`
- Triggers: `oat doctor`
- Responsibilities: Run diagnostic checks on environment and configurations

## Error Handling

**Strategy:** Custom CliError class with exit codes (1 for user errors, 2 for system errors)

**Patterns:**
- Validation errors (manifest, config): CliError with exit code 1
- File access errors: CliError with descriptive message and exit code 2
- JSON parsing failures: Caught and converted to CliError with remediation advice
- Zod validation failures: Formatted with issue path and message
- Unhandled errors: Caught at main() entry point, logged, exit code 2

## Cross-Cutting Concerns

**Logging:** CliLogger supports json/verbose modes, routed through ui/logger module. JSON output wraps results in structured format. Verbose enables debug information.

**Validation:** Zod schemas enforce shape and constraints for Manifest, SyncConfig, ProviderSyncConfig. Superrefine blocks invalid state (copy without hash, symlink with hash).

**Type Safety:** TypeScript strict mode, exhaustive scope handling, path-based imports via aliases (@commands, @engine, @providers, etc). ESM modules with verbatimModuleSyntax.

---

*Architecture analysis: 2026-02-16*
