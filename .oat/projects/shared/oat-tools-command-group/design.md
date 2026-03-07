---
oat_status: complete
oat_ready_for: plan
oat_blockers: []
oat_last_updated: 2026-03-07
oat_generated: false
---

# Design: oat-tools-command-group

## Overview

The `oat tools` command group consolidates tool lifecycle management into a single noun-first namespace with five subcommands: `install`, `update`, `remove`, `list`, and `outdated`. Each subcommand follows the established CLI architecture patterns (Commander.js factory, dependency injection, help snapshot tests).

The core new logic lives in two engines: a **scan engine** that enumerates installed tools with metadata (version, pack, scope, update status) and an **update engine** that applies version-aware updates from bundled assets. The `install` and `remove` subcommands are thin wrappers delegating to existing logic. All mutating subcommands (install, update, remove) auto-trigger sync after successful operations.

Agent version detection is addressed by adding `version` frontmatter to bundled agent files, reusing the same `getSkillVersion`/`compareVersions` infrastructure already used for skills.

## Architecture

### System Context

The `oat tools` command group sits alongside existing top-level commands (`init`, `remove`, `sync`, etc.) and reuses their internal modules. It introduces no new external dependencies.

**Key Components:**
- **tools command group** (`commands/tools/index.ts`): Commander command factory registering all subcommands
- **scan engine** (`commands/tools/shared/scan-tools.ts`): Enumerates installed tools with version/pack/status metadata
- **update engine** (`commands/tools/update/update-tools.ts`): Compares installed vs bundled, applies updates
- **install wrapper** (`commands/tools/install/index.ts`): Delegates to existing `runInitTools`
- **remove wrapper** (`commands/tools/remove/index.ts`): Delegates to existing `runRemoveSkill`
- **auto-sync** (`commands/tools/shared/auto-sync.ts`): Triggers sync after mutations

### Component Diagram

```
oat tools
├── install  ──→ existing runInitTools() + auto-sync
├── update   ──→ scan engine → update engine + auto-sync
├── remove   ──→ existing runRemoveSkill() + auto-sync
├── list     ──→ scan engine → format output
└── outdated ──→ scan engine → filter outdated → format output
```

### Data Flow

**Update flow:**
```
1. Parse args → determine target set (name / pack / all)
2. For each concrete scope:
   a. Resolve scope root and assets root
   b. Scan installed tools (scan engine)
   c. For each target tool:
      - Read installed version from SKILL.md / agent frontmatter
      - Read bundled version from assets
      - Compare versions → outdated / current / newer / not-installed
   d. If not dry-run: copy outdated from bundled to installed (force=true)
3. Report results (text or JSON)
4. If mutations occurred and not dry-run: auto-sync affected scopes
```

## Component Design

### Scan Engine

**Purpose:** Enumerate installed tools with metadata across scopes

**Responsibilities:**
- Scan `.agents/skills/` directories for installed skills
- Scan `.agents/agents/` directory for installed agents (project scope only)
- For each tool: read version, determine pack membership, compare with bundled version
- Return structured results suitable for display or filtering

**Interfaces:**
```typescript
interface ToolInfo {
  name: string;
  type: 'skill' | 'agent';
  scope: ConcreteScope;
  version: string | null;
  bundledVersion: string | null;
  pack: PackName | 'custom';
  status: 'current' | 'outdated' | 'newer' | 'not-bundled';
}

interface ScanToolsOptions {
  scopeRoot: string;
  scope: ConcreteScope;
  assetsRoot: string;
}

async function scanTools(options: ScanToolsOptions): Promise<ToolInfo[]>
```

**Dependencies:**
- `getSkillVersion` from `@commands/shared/frontmatter`
- `compareVersions` from `@commands/init/tools/shared/version`
- `dirExists` from `@fs/io`
- Pack arrays: `IDEA_SKILLS`, `WORKFLOW_SKILLS`, `UTILITY_SKILLS`, `WORKFLOW_AGENTS`

**Design Decisions:**
- Pack membership is determined statically from existing arrays (not stored in metadata)
- Agents are treated as first-class tools alongside skills
- `not-bundled` status for custom/user-created tools that have no bundled equivalent

### Update Engine

**Purpose:** Apply version-aware updates from bundled assets to installed tools

**Responsibilities:**
- Accept target set (single name, pack, or all)
- Use scan engine to determine which tools are outdated
- Copy updated versions using existing `copyDirWithStatus` (force=true)
- Return structured results for reporting

**Interfaces:**
```typescript
type UpdateTarget =
  | { kind: 'name'; name: string }
  | { kind: 'pack'; pack: PackName }
  | { kind: 'all' };

interface UpdateResult {
  updated: ToolInfo[];
  current: ToolInfo[];
  newer: ToolInfo[];
  notInstalled: string[];
  notBundled: string[];
}

interface UpdateToolsOptions {
  target: UpdateTarget;
  scopes: ConcreteScope[];
  dryRun: boolean;
  context: CommandContext;
}

async function updateTools(
  options: UpdateToolsOptions,
  dependencies: UpdateToolsDependencies,
): Promise<UpdateResult>
```

**Dependencies:**
- Scan engine for version comparison
- `copyDirWithStatus` from `@commands/init/tools/shared/copy-helpers`
- `copyFileWithStatus` for agent files
- `resolveAssetsRoot`, `resolveScopeRoot`, `resolveProjectRoot`

**Design Decisions:**
- Skills are updated by copying the entire skill directory (same as init)
- Agents are updated by copying the single `.md` file
- `force=true` is always used when updating (version check already confirmed outdated)
- Non-interactive mode applies updates without prompting (the explicit `oat tools update` command is the user's intent signal)

### Auto-Sync

**Purpose:** Trigger sync automatically after mutations to keep provider views current

**Interfaces:**
```typescript
interface AutoSyncOptions {
  scopes: ConcreteScope[];
  context: CommandContext;
}

async function autoSync(
  options: AutoSyncOptions,
  dependencies: AutoSyncDependencies,
): Promise<void>
```

**Design Decisions:**
- Invokes the same sync pipeline used by `oat sync --apply` (reuses `computePlans` + `runSyncApply`)
- Sync failures are caught and logged as warnings — they do not affect the exit code of the tool operation itself
- `--no-sync` flag on mutating commands allows skipping auto-sync
- In `--dry-run` mode, sync is never triggered
- In `--json` mode, sync results are included in the JSON output under a `sync` key
- The auto-sync context is constructed with `apply: true`, `interactive: false` (no prompts), and matching scope

### Install Wrapper

**Purpose:** Delegate to existing `runInitTools` logic under the `oat tools install` namespace

**Interfaces:**
```typescript
function createToolsInstallCommand(): Command
```

**Design Decisions:**
- Reuses `createInitToolsCommand` or directly calls `runInitTools` with appropriate dependencies
- Same options as `oat init tools`: `--force`, pack subcommands (`ideas`, `workflows`, `utility`)
- Auto-sync is handled by the wrapper after `runInitTools` completes

### Remove Wrapper

**Purpose:** Unified remove interface delegating to existing remove logic

**Interfaces:**
```typescript
function createToolsRemoveCommand(): Command
// oat tools remove <name>
// oat tools remove --pack <pack>
// oat tools remove --all
// oat tools remove --dry-run
```

**Design Decisions:**
- Single tool removal delegates to `runRemoveSkill` with `apply=true` (since the new convention defaults to mutating)
- Pack removal iterates pack members through `runRemoveSkill` (same as existing `oat remove skills`)
- `--all` removal iterates all packs
- `--dry-run` delegates with `apply=false`
- Auto-sync after successful removals

## Data Models

### ToolInfo

**Purpose:** Represents a single installed tool with all metadata needed for display and update decisions

**Schema:**
```typescript
interface ToolInfo {
  name: string;                          // e.g., "oat-idea-new" or "oat-reviewer"
  type: 'skill' | 'agent';              // content type
  scope: ConcreteScope;                  // "project" | "user"
  version: string | null;               // installed version from frontmatter
  bundledVersion: string | null;         // version in bundled assets
  pack: PackName | 'custom';            // which pack this belongs to, or "custom"
  status: 'current' | 'outdated' | 'newer' | 'not-bundled';
}
```

**Validation Rules:**
- `name` must be non-empty
- `version` follows semver format when present
- `pack` is derived from static arrays, not stored

**Storage:**
- In-memory only — computed on each invocation by scanning filesystem

### PackName

**Purpose:** Identifies a tool pack

**Schema:**
```typescript
type PackName = 'ideas' | 'workflows' | 'utility';
```

## API Design

Not applicable — this is a CLI command group, not a web API.

## CLI Command Interface

### `oat tools update [name]`

**Options:**
- `--pack <pack>` — update all tools in a pack (ideas|workflows|utility)
- `--all` — update all installed tools
- `--dry-run` — preview without applying
- `--no-sync` — skip auto-sync after updates
- `--scope <scope>` — scope filter (project|user|all, default: all)
- `--json` — structured JSON output

**Mutual exclusion:** exactly one of `[name]`, `--pack`, `--all` required

**Exit codes:**
- 0: success (even if nothing was outdated)
- 1: target not found or invalid arguments

### `oat tools list`

**Options:**
- `--scope <scope>` — scope filter
- `--json` — structured JSON output

**Exit codes:**
- 0: always (informational)

### `oat tools outdated`

**Options:**
- `--scope <scope>` — scope filter
- `--json` — structured JSON output

**Exit codes:**
- 0: always (informational)

### `oat tools install`

**Options:** Same as `oat init tools` plus `--no-sync`

### `oat tools remove <name>`

**Options:**
- `--pack <pack>` — remove all tools in a pack
- `--all` — remove all installed tools
- `--dry-run` — preview without applying
- `--no-sync` — skip auto-sync after removals
- `--scope <scope>` — scope filter
- `--json` — structured JSON output

## Error Handling

### Error Categories

- **User Errors (exit 1):** invalid pack name, tool not found, conflicting flags (e.g., both `--pack` and `--all`)
- **System Errors (exit 2):** assets root not found, filesystem I/O failures

### Logging

- All output through `context.logger` (no direct `console.*`)
- Text mode: human-readable summary with version table for update/list/outdated
- JSON mode: structured object with arrays of tool info
- Auto-sync warnings logged at `warn` level, not `error`

## Testing Strategy

### Requirement-to-Test Mapping

| ID | Verification | Key Scenarios |
|----|--------------|---------------|
| FR1 | unit | update single skill, update single agent, tool not installed, tool not bundled |
| FR2 | unit | update ideas pack, workflows pack, utility pack, mixed outdated/current |
| FR3 | unit | update all with mixed packs and scopes |
| FR4 | unit | dry-run reports but doesn't copy, no dry-run copies |
| FR5 | unit | list shows all tools, scope filtering, custom tools shown |
| FR6 | unit | outdated filter excludes current/newer tools |
| FR7 | unit | install delegates to runInitTools |
| FR8 | unit | remove single, remove pack, remove all, dry-run |
| FR9 | unit | sync triggered after update, sync skipped on dry-run, sync failure is warning |
| NFR1 | unit | JSON output structure for each subcommand |
| NFR2 | unit | non-interactive mode uses defaults |
| NFR3 | unit + integration | help snapshots, DI overrides |
| NFR4 | integration | existing tests still pass |

### Unit Tests

- **Scope:** scan engine, update engine, auto-sync, command handlers
- **Key Test Cases:**
  - Scan finds skills and agents across scopes
  - Version comparison correctly classifies tools
  - Pack membership correctly assigned
  - Update copies only outdated tools
  - Dry-run prevents mutations
  - JSON output matches expected structure
  - Auto-sync invoked after mutations
  - Auto-sync skipped on dry-run
  - Auto-sync failure doesn't change exit code
  - `--no-sync` prevents auto-sync

### Integration Tests

- **Scope:** help snapshot tests for all new commands
- **Key Test Cases:**
  - `oat tools --help` output matches snapshot
  - `oat tools update --help` output matches snapshot
  - `oat tools list --help` output matches snapshot
  - `oat tools outdated --help` output matches snapshot
  - `oat tools install --help` output matches snapshot
  - `oat tools remove --help` output matches snapshot

## Implementation Phases

### Phase 1: Scan Engine + List + Outdated

**Goal:** Build the scanning foundation and read-only commands

**Tasks:**
- Implement scan engine
- Implement `oat tools list` command
- Implement `oat tools outdated` command
- Add help snapshot tests

**Verification:** `pnpm --filter @oat/cli test` passes, list/outdated produce correct output

### Phase 2: Update Engine + Update Command

**Goal:** Core new feature — version-aware updates

**Tasks:**
- Implement update engine
- Implement `oat tools update` command with name/pack/all targeting
- Add dry-run support
- Add auto-sync integration
- Add unit tests

**Verification:** Update correctly detects and applies outdated tools

### Phase 3: Install + Remove Wrappers

**Goal:** Consolidate existing functionality under `oat tools`

**Tasks:**
- Implement `oat tools install` wrapper
- Implement `oat tools remove` wrapper
- Add auto-sync to both
- Add help snapshot tests

**Verification:** Wrappers delegate correctly, existing tests still pass

### Phase 4: Agent Versioning

**Goal:** Enable version-based update detection for agents

**Tasks:**
- Add `version: 1.0.0` frontmatter to bundled agent files
- Generalize version reading to work with agent `.md` files
- Update scan engine to use version comparison for agents

**Verification:** Agents appear with correct version info in list/outdated

## Dependencies

### Internal Dependencies

- **init/tools module:** install logic, pack arrays, copy helpers, version utilities
- **remove/skill module:** removal logic with manifest cleanup
- **sync module:** sync pipeline for auto-sync
- **shared utilities:** `readGlobalOptions`, `resolveConcreteScopes`, `buildCommandContext`
- **fs utilities:** `dirExists`, `resolveAssetsRoot`, `resolveScopeRoot`
- **frontmatter utilities:** `getSkillVersion`, `parseFrontmatterField`

### Development Dependencies

- **vitest:** test runner (already in workspace)
- **Commander.js:** CLI framework (already in workspace)

## Risks and Mitigation

- **Auto-sync complexity:** Sync pipeline has many dependencies (providers, manifests, config)
  - **Mitigation:** Wrap sync invocation in try/catch, log failures as warnings. DI enables testing without real sync.
- **Agent version bootstrapping:** Adding version frontmatter to agents is a format change
  - **Mitigation:** Version field is optional — agents without it are treated as `not-bundled` or use hash comparison as fallback

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
