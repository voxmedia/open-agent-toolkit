---
oat_status: complete
oat_ready_for: oat-plan
oat_blockers: []
oat_last_updated: 2026-02-13
oat_generated: false
---

# Design: provider-interop-cli

## Overview

The `oat` CLI is a TypeScript/Node.js command-line tool that manages provider interoperability for agent skills and subagents. It establishes `.agents/` as the canonical source of truth and generates provider-specific views (directory symlinks, with copy fallback) into `.claude/`, `.cursor/`, and `.codex/` directories automatically.

The architecture follows a layered design: a thin **command layer** parses CLI input and orchestrates operations, a **sync engine** computes diffs between canonical state and provider views, **provider adapters** declare per-provider path mappings and capabilities, and a **manifest manager** tracks all managed relationships for safe drift detection and scoped destructive operations.

The CLI lives in `packages/cli/` within the existing monorepo, built with TypeScript ESM and Turborepo. It uses a command-factory pattern (commander + @inquirer/prompts + chalk/ora + zod) following the accepted CLI structure proposal and the patterns established in `work-chronicler` and `dwp-cli`. File operations use `node:fs`, `node:path`, and `node:crypto`.

## Architecture

### System Context

The `oat` CLI operates on the local filesystem at two scopes:

- **Project scope:** Works within a git repository, reading `.agents/` and writing to provider directories (`.claude/`, `.cursor/`, `.codex/`). The sync manifest lives at `.oat/sync/manifest.json`.
- **User scope:** Works in the user's home directory, reading `~/.agents/skills/` and writing to provider personal directories (`~/.claude/skills/`, `~/.cursor/skills/`). The user manifest lives at `~/.oat/sync/manifest.json`.

The CLI does NOT interact with any network services, APIs, or provider CLIs for its core operations. Provider detection is filesystem-based (checking for directory existence). Provider CLI version detection in `oat doctor` is an optional enhancement that shells out to provider commands if available.

```
┌─────────────────────────────────────────────────────────┐
│                     User (Terminal)                      │
└───────────────────────────┬─────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │  Command Layer │  (init, status, sync, providers, doctor)
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  Sync Engine   │  (diff, plan, execute)
                    └───┬───┬───┬───┘
                        │   │   │
            ┌───────────┘   │   └───────────┐
            │               │               │
    ┌───────▼──────┐ ┌─────▼──────┐ ┌──────▼───────┐
    │Claude Adapter│ │Cursor Adapt│ │ Codex Adapter│
    └──────────────┘ └────────────┘ └──────────────┘
                            │
                    ┌───────▼───────┐
                    │Manifest Mgr   │  (.oat/sync/manifest.json)
                    └───────────────┘
```

**Key Components:**
- **Command Layer:** CLI parsing and dispatch via `commander` command-factory pattern, user interaction via `@inquirer/prompts`, orchestration of sync engine calls, centralized output via `chalk`/`ora` logger
- **Sync Engine:** Core diffing logic — compares canonical `.agents/` against provider views and manifest, produces a `SyncPlan` (list of operations), executes plans when `--apply` is passed. Scope-aware content filtering: project scope syncs skills + agents, user scope syncs skills only.
- **Provider Adapters:** Configuration objects declaring path mappings, sync strategy, content types, and detection logic per provider
- **Manifest Manager:** CRUD operations on `manifest.json` — read, write, query mappings, compute content hashes
- **Drift Detector:** Compares filesystem state against manifest records to classify entries as `in_sync`, `drifted`, `missing`, or `stray`

### Data Flow

**`oat sync` flow (primary operation):**

```
1. Parse CLI args (scope filter, --apply flag)
2. Load manifest (project and/or user scope)
3. Scan canonical directories (.agents/skills/, .agents/agents/)
4. For each registered provider adapter:
   a. Resolve provider paths for current scope
   b. Compare canonical entries against provider filesystem
   c. Compare against manifest records
   d. Produce SyncPlanEntry for each canonical item:
      - CREATE_SYMLINK / CREATE_COPY (missing from provider)
      - UPDATE (drifted — re-sync from canonical)
      - REMOVE (canonical deleted, manifest-tracked provider view exists)
      - SKIP (already in sync)
5. If --apply: execute plan, update manifest
6. If dry-run: display plan summary
```

**`oat status` flow:**

```
1. Load manifest for both scopes
2. Scan canonical directories
3. For each provider adapter:
   a. Classify each mapping: in_sync, drifted (modified/broken/replaced), missing
4. Scan provider directories for strays (untracked by manifest, not in canonical)
5. Display summary table
6. If strays found AND interactive: prompt for adoption
7. If strays found AND non-interactive: include remediation text in output
```

## Component Design

### Command Layer (`src/commands/`, `src/app/`)

**Purpose:** Parse CLI input, orchestrate operations, handle user interaction.

**Directory Layout** (per accepted CLI structure proposal):
```text
packages/cli/src/
  index.ts                    # Thin entrypoint — bootstrap + parse
  app/
    create-program.ts         # Build commander program with global flags
    command-context.ts         # Shared context object (scope, flags, logger)
  commands/
    index.ts                  # Register all top-level commands
    init/
      index.ts                # createInitCommand()
    status/
      index.ts                # createStatusCommand()
    sync/
      index.ts                # createSyncCommand()
      apply.ts                # --apply execution logic
      dry-run.ts              # Dry-run display logic
      sync.types.ts           # Zod schemas + inferred types
    providers/
      index.ts                # createProvidersCommand() (list + inspect)
      list.ts                 # oat providers list
      inspect.ts              # oat providers inspect <name>
      providers.types.ts      # Provider command types
    doctor/
      index.ts                # createDoctorCommand()
  providers/
    claude/
      adapter.ts
      paths.ts
    cursor/
      adapter.ts
      paths.ts
    codex/
      adapter.ts
      paths.ts
    shared/
      adapter.types.ts
      adapter.utils.ts
  config/
    env.ts                    # Runtime config + zod validation
    runtime.ts                # Runtime policy (TTY detection, JSON mode)
  shared/
    prompts.ts                # Shared prompt primitives (confirmAction, selectWithAbort)
    types.ts                  # Cross-cutting type primitives
    utils.ts                  # Small cross-cutting helpers
  ui/
    logger.ts                 # Centralized CliLogger (chalk-based, no direct console in commands)
    output.ts                 # Table/diff formatters
    spinner.ts                # ora wrapper (auto-disabled in non-TTY/--json)
  validation/
    parse.ts                  # Input validation helpers
  fs/
    io.ts                     # Filesystem operations (atomic write, symlink, copy)
    paths.ts                  # Path resolution helpers
  errors/
    cli-error.ts              # Structured CLI errors with exit code mapping
  engine/                     # Sync engine (see Sync Engine section)
  manifest/                   # Manifest manager (see Manifest Manager section)
  drift/                      # Drift detector (see Drift Detector section)
```

**Responsibilities:**
- Parse command-line arguments and dispatch via `commander` command-factory pattern
- Route to appropriate command handler via `createXCommand(): Command` factories
- Manage interactive prompts via `@inquirer/prompts` (adoption, confirmation, selection)
- Format and display output via centralized `CliLogger` (`chalk`/`ora`)
- Handle global flags: `--apply`, `--scope`, `--verbose`, `--json`, `--cwd`

**Interfaces:**
```typescript
interface CommandContext {
  scope: 'project' | 'user' | 'all';
  apply: boolean;
  verbose: boolean;
  json: boolean;
  cwd: string;
  home: string;
  interactive: boolean;  // true when stdin is TTY and --json is false
  logger: CliLogger;
}

// Each command exports a factory function
type CommandFactory = () => Command;  // commander Command instance

// Centralized logger — no direct console usage in commands
interface CliLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  success(message: string, meta?: Record<string, unknown>): void;
  json(payload: unknown): void;
}
```

**Design Decisions:**
- Use `commander` with command-factory pattern (`createXCommand(): Command`) — matches `work-chronicler` and `dwp-cli` patterns, supports subcommand nesting (e.g., `oat providers list`)
- Interactive prompts via `@inquirer/prompts` — richer prompt types (select, confirm, input) for adoption flows and confirmations
- `chalk` for semantic output coloring, `ora` for spinners on longer I/O operations
- `zod` for validation of user input, env config, adapter config, and disk-loaded documents
- **Non-interactive contract:** Prompts only run when stdin is TTY and `--json` is not set. In non-interactive mode (`--json`, piped stdin, or non-TTY), commands return actionable error messages with remediation text instead of prompting. `ora` spinners are auto-disabled in non-TTY and `--json` mode.
- **No direct `console.log`/`console.error` in commands** — all output goes through `CliLogger` for consistent formatting and testability
- Exit codes follow existing repo convention: 0 = success, 1 = user error, 2 = system error
- Global flags (`--json`, `--verbose`, `--cwd`, `--scope`) registered early in `create-program.ts`; startup order: load runtime config → validate env with zod → build command context → register commands

### Sync Engine (`src/engine/`)

**Purpose:** Core diffing and sync logic — compute what needs to change, optionally execute changes.

**Responsibilities:**
- Scan canonical directories to discover skills and agents, filtered by scope-aware content types
- Compute sync plan by comparing canonical state against provider views and manifest
- Execute sync plan (create symlinks, copy files, remove stale views)
- Coordinate across multiple provider adapters and scopes
- Enforce scope content boundaries: project scope processes skills + agents, user scope processes skills only

**Interfaces:**
```typescript
interface CanonicalEntry {
  name: string;
  type: 'skill' | 'agent';
  canonicalPath: string; // absolute path to .agents/skills/<name> or .agents/agents/<name>
}

type SyncOperationType =
  | 'create_symlink'
  | 'create_copy'
  | 'update_symlink'  // broken or replaced → re-create
  | 'update_copy'     // content changed → re-copy
  | 'remove'          // canonical deleted, clean up provider view
  | 'skip';           // already in sync

interface SyncPlanEntry {
  canonical: CanonicalEntry;
  provider: string;           // e.g. 'claude', 'cursor', 'codex'
  providerPath: string;       // absolute target path
  operation: SyncOperationType;
  strategy: 'symlink' | 'copy';
  reason: string;             // human-readable explanation
}

interface SyncPlan {
  scope: 'project' | 'user';
  entries: SyncPlanEntry[];
  removals: SyncPlanEntry[];  // manifest-tracked items whose canonical was deleted
}

// Scope-aware content type resolution
const SCOPE_CONTENT_TYPES: Record<'project' | 'user', ContentType[]> = {
  project: ['skill', 'agent'],  // project scope: skills + agents
  user: ['skill'],              // user scope: skills only (v1)
};

// Core engine functions
function scanCanonical(basePath: string, scope: 'project' | 'user'): CanonicalEntry[];
function computeSyncPlan(
  canonical: CanonicalEntry[],
  adapters: ProviderAdapter[],
  manifest: Manifest,
  scope: 'project' | 'user',
): SyncPlan;
function executeSyncPlan(plan: SyncPlan, manifest: Manifest): Promise<SyncResult>;
```

**Dependencies:**
- Provider adapters (for path resolution)
- Manifest manager (for tracking state)
- `node:fs/promises` for filesystem operations
- `node:path` for path resolution

**Design Decisions:**
- Sync plan is a pure data structure computed before any side effects — enables dry-run by simply not executing
- Removals are always computed from manifest (never scan-and-delete), ensuring only managed content is affected
- The engine does NOT import provider-specific logic; it iterates adapter configurations generically

### Provider Adapters (`src/providers/`)

**Purpose:** Declare per-provider configuration — paths, strategy, content types, detection.

**Responsibilities:**
- Define directory mappings for each scope and content type
- Declare default sync strategy (symlink/copy/auto)
- Provide detection logic (does this provider exist on disk?)
- Report provider CLI version (optional, for `oat doctor`)

**Interfaces:**
```typescript
type ContentType = 'skill' | 'agent';
type SyncStrategy = 'symlink' | 'copy' | 'auto';

interface PathMapping {
  contentType: ContentType;
  canonicalDir: string;  // relative to scope root (e.g. '.agents/skills')
  providerDir: string;   // relative to scope root (e.g. '.claude/skills')
  nativeRead: boolean;   // true if provider reads canonical dir natively (no sync needed)
}

interface ProviderAdapter {
  name: string;              // 'claude' | 'cursor' | 'codex'
  displayName: string;       // 'Claude Code' | 'Cursor' | 'Codex CLI'
  defaultStrategy: SyncStrategy;
  projectMappings: PathMapping[];
  userMappings: PathMapping[];
  detect: (scopeRoot: string) => Promise<boolean>;
  detectVersion?: () => Promise<string | null>;  // optional CLI version
}
```

**Provider Configuration (v1):**

| Provider | Scope | Content | Canonical | Provider Dir | Native? | Sync Needed? |
|----------|-------|---------|-----------|-------------|---------|-------------|
| Claude | project | skills | `.agents/skills` | `.claude/skills` | no | **yes** (symlink) |
| Claude | project | agents | `.agents/agents` | `.claude/agents` | no | **yes** (symlink) |
| Claude | user | skills | `~/.agents/skills` | `~/.claude/skills` | no | **yes** (symlink) |
| Cursor | project | skills | `.agents/skills` | `.cursor/skills` | no | **yes** (symlink) |
| Cursor | project | agents | `.agents/agents` | `.cursor/agents` | no | **yes** (symlink) |
| Cursor | user | skills | `~/.agents/skills` | `~/.cursor/skills` | no | **yes** (symlink) |
| Codex | project | skills | `.agents/skills` | `.agents/skills` | yes | no (reads natively) |
| Codex | project | agents | `.agents/agents` | `.codex/agents` | no | **best-effort** |
| Codex | user | skills | `~/.agents/skills` | `~/.agents/skills` | yes | no (reads natively) |

> **Note on Cursor project skills:** Although Cursor can read `.claude/skills/` as cross-compatibility, `oat` always syncs directly to `.cursor/skills/` for Cursor. This avoids a hidden dependency on Claude directory detection — in a Cursor-only environment without `.claude/`, skills would be missed entirely if we relied on the `.claude/` fallback. Each provider gets its own explicit sync target.

**Design Decisions:**
- Adapters are plain configuration objects, not classes — no inheritance, no polymorphism, just data
- `nativeRead: true` means the provider reads the canonical directory directly; the sync engine skips these mappings entirely
- Cursor always gets its own symlinks in `.cursor/skills/` and `.cursor/agents/` — never relies on `.claude/` cross-compat fallback
- Detection is filesystem-based: Claude detected by `.claude/` directory existence, Cursor by `.cursor/`, Codex by `.codex/` or presence of Codex config
- Codex agent sync is best-effort: if `.codex/agents/` doesn't exist and Codex agent support isn't detected, sync logs a warning and continues

### Manifest Manager (`src/manifest/`)

**Purpose:** Persist and query the sync state — what's managed, when it was synced, content hashes for copy mode.

**Responsibilities:**
- Read and write manifest files (JSON)
- Add, update, and remove mapping entries
- Compute content hashes for copy-mode drift detection
- Atomic writes (write to temp file, rename)

**Interfaces:**
```typescript
interface ManifestEntry {
  canonicalPath: string;     // relative to scope root
  providerPath: string;      // relative to scope root
  provider: string;          // 'claude' | 'cursor' | 'codex'
  contentType: ContentType;  // 'skill' | 'agent'
  strategy: 'symlink' | 'copy';
  contentHash: string | null; // SHA-256 of dir contents (copy mode only)
  lastSynced: string;         // ISO 8601 timestamp
}

interface Manifest {
  version: 1;
  oatVersion: string;
  entries: ManifestEntry[];
  lastUpdated: string;        // ISO 8601 timestamp
}

// Manager functions
function loadManifest(manifestPath: string): Promise<Manifest>;
function saveManifest(manifestPath: string, manifest: Manifest): Promise<void>;
function findEntry(manifest: Manifest, canonicalPath: string, provider: string): ManifestEntry | undefined;
function addEntry(manifest: Manifest, entry: ManifestEntry): Manifest;
function removeEntry(manifest: Manifest, canonicalPath: string, provider: string): Manifest;
function computeDirectoryHash(dirPath: string): Promise<string>;
```

**Storage:**
- Project manifest: `.oat/sync/manifest.json`
- User manifest: `~/.oat/sync/manifest.json`

**Design Decisions:**
- Manifest version field (`version: 1`) enables future schema migrations without breaking existing manifests
- Paths in manifest are relative to scope root (project root or `$HOME`), making manifests portable
- Content hash uses SHA-256 of sorted file contents within a skill/agent directory — deterministic regardless of filesystem ordering
- Atomic writes via `writeFile` to a temp path + `rename` — prevents corruption on crash
- User-level manifest does NOT track which repo triggered a mapping. Each user-level mapping is global; if two repos both have the same canonical skill at `~/.agents/skills/foo`, they share the same user-level symlink. This is correct because user-level content is inherently shared across repos.

### Drift Detector (`src/drift/`)

**Purpose:** Classify the sync state of each canonical → provider relationship.

**Responsibilities:**
- Check symlink validity (exists, points to correct target)
- Check copy-mode content integrity (hash comparison)
- Identify strays (provider-local content not in canonical or manifest)

**Interfaces:**
```typescript
type DriftState =
  | { status: 'in_sync' }
  | { status: 'drifted'; reason: 'modified' | 'broken' | 'replaced' }
  | { status: 'missing' }
  | { status: 'stray' };

interface DriftReport {
  canonical: string;        // canonical path (or null for strays)
  provider: string;
  providerPath: string;
  state: DriftState;
}

function detectDrift(
  entry: ManifestEntry,
  scopeRoot: string,
): Promise<DriftReport>;

function detectStrays(
  providerDir: string,
  manifest: Manifest,
  canonicalEntries: CanonicalEntry[],
): Promise<DriftReport[]>;
```

**Drift Classification Logic:**

| Mode | Check | Result |
|------|-------|--------|
| Any | Provider path absent? (canonical exists, provider-side missing entirely) | → `missing` |
| Symlink | Provider path is not a symlink? | → `drifted:replaced` |
| Symlink | Symlink target exists? | No → `drifted:broken` |
| Symlink | Symlink target matches canonical? | No → `drifted:replaced` |
| Symlink | Symlink target matches + exists | → `in_sync` |
| Copy | Provider path absent? | → `missing` |
| Copy | Hash matches manifest? | No → `drifted:modified` |
| Copy | Hash matches | → `in_sync` |
| Any | Provider-side exists but not in manifest or canonical | → `stray` |

> **Note:** The first check (provider path absent) runs before any symlink/copy-specific checks. This ensures FR2's `missing` classification is explicit — if canonical `.agents/skills/foo` exists but `.claude/skills/foo` does not, the result is `missing` regardless of sync mode.

**Design Decisions:**
- Symlink drift detection uses `fs.readlink` + `fs.stat` — checks both target path and target existence
- Copy drift detection recomputes the directory hash and compares against manifest — no file-watching or timestamps
- Stray detection scans provider directories for entries not present in manifest AND not present in canonical source

### Output Layer (`src/ui/`)

**Purpose:** Format CLI output consistently across commands via a centralized logger and formatters.

**Modules:**
- `logger.ts` — Single output API for all commands (`CliLogger`). Uses `chalk` for semantic coloring. No direct `console.log`/`console.error` in command handlers.
- `output.ts` — Table/diff/doctor formatters for structured display.
- `spinner.ts` — `ora` wrapper for long-running I/O operations. Auto-disabled in non-TTY and `--json` mode.

**Responsibilities:**
- Render status tables (provider x content type x state)
- Render sync plan diffs (what would change vs. what changed)
- Render doctor check results (pass/warn/fail with fix suggestions)
- Render provider inspection details
- Support `--json` flag for machine-readable output (single JSON document per command invocation)
- Support `--verbose` flag for detailed output with context metadata
- Auto-detect non-TTY and suppress colors/spinners accordingly

**Interfaces:**
```typescript
interface CliLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  success(message: string, meta?: Record<string, unknown>): void;
  json(payload: unknown): void;  // single JSON document to stdout
}

interface TableRow {
  provider: string;
  contentType: string;
  name: string;
  state: string;
  detail?: string;
}

function formatStatusTable(reports: DriftReport[]): string;
function formatSyncPlan(plan: SyncPlan, applied: boolean): string;
function formatDoctorResults(checks: DoctorCheck[]): string;
function formatProviderDetails(adapter: ProviderAdapter, detected: boolean, version?: string): string;
```

**Design Decisions:**
- **Human mode:** `chalk`-colored output with semantic markers (green checkmark, yellow warning, red cross). `ora` spinners for operations > ~500ms. Auto-disabled on non-TTY.
- **JSON mode:** `--json` outputs a single JSON document per command invocation (not NDJSON). Spinners and colors are suppressed. Errors still go to stderr as structured JSON.
- **No direct console usage:** All command output goes through `CliLogger`. This ensures consistent formatting and makes output testable.
- **Verbose mode:** `--verbose` adds context metadata (command name, provider, path scope, elapsed ms) to human output.

## Data Models

### Manifest (`manifest.json`)

**Purpose:** Tracks all managed canonical → provider mappings for safe operations.

**Schema:**
```typescript
interface Manifest {
  version: 1;
  oatVersion: string;         // e.g. "0.1.0"
  entries: ManifestEntry[];
  lastUpdated: string;        // ISO 8601
}

interface ManifestEntry {
  canonicalPath: string;      // relative, e.g. ".agents/skills/my-skill"
  providerPath: string;       // relative, e.g. ".claude/skills/my-skill"
  provider: string;           // "claude" | "cursor" | "codex"
  contentType: 'skill' | 'agent';
  strategy: 'symlink' | 'copy';
  contentHash: string | null; // SHA-256 for copy mode, null for symlink
  lastSynced: string;         // ISO 8601
}
```

**Validation Rules:**
- `version` must be `1` (future versions trigger a "please upgrade oat" message)
- `entries` array may be empty (freshly initialized)
- `canonicalPath` and `providerPath` must be relative (no leading `/` or `~`)
- `contentHash` must be non-null when `strategy` is `"copy"`, null when `"symlink"`
- No duplicate `(canonicalPath, provider)` pairs

**Storage:**
- **Location:** `.oat/sync/manifest.json` (project), `~/.oat/sync/manifest.json` (user)
- **Persistence:** Written atomically after each `oat sync --apply` or `oat init` adoption

### Sync Configuration

**Purpose:** User-configurable sync strategy overrides.

**Schema:**
```typescript
interface SyncConfig {
  version: 1;
  defaultStrategy: SyncStrategy;  // 'auto' | 'symlink' | 'copy'
  providers?: {
    [providerName: string]: {
      strategy?: SyncStrategy;
      enabled?: boolean;         // false to skip this provider entirely
    };
  };
}
```

**Storage:**
- **Location:** `.oat/sync/config.json` (project), `~/.oat/sync/config.json` (user)
- **Persistence:** Created only when user explicitly configures (not created by default)
- **Defaults:** When no config file exists, `defaultStrategy: 'auto'` and all detected providers are enabled

**Design Decision:** Separate config file rather than embedding in a broader `.oat/config.json`. This keeps sync config self-contained and avoids coupling with future OAT features. The config is optional — the CLI works with sensible defaults when no config exists.

### Doctor Check Result

**Purpose:** Structured result for each diagnostic check.

**Schema:**
```typescript
type CheckStatus = 'pass' | 'warn' | 'fail';

interface DoctorCheck {
  name: string;           // e.g. "canonical_directory", "symlink_support"
  description: string;    // e.g. "Check .agents/ directory exists"
  status: CheckStatus;
  message: string;        // e.g. ".agents/skills/ exists with 3 skills"
  fix?: string;           // e.g. "Run `oat init` to create the directory"
}
```

## API Design

This is a CLI tool, not a web service. The "API" is the command-line interface.

### `oat init`

**Usage:** `oat init [--scope project|user|all]`

**Behavior:**
1. Create canonical directories (`.agents/skills/`, `.agents/agents/` for project; `~/.agents/skills/` for user)
2. Scan provider directories for existing content
3. For each detected stray AND interactive mode: prompt adopt or skip
4. For each detected stray AND non-interactive mode: skip adoption, report strays with remediation text (`run "oat init" interactively to adopt`)
5. Create initial manifest (empty or with adopted entries)
6. Report summary

**Flags:**
- `--scope <project|user|all>` — Which scope to initialize (default: `all`)

**Non-interactive contract:** When stdin is not a TTY, stray adoption prompts are skipped. Directory creation and manifest initialization proceed without prompts. Strays are reported in output with remediation guidance.

**Exit codes:** 0 = success, 1 = user cancelled, 2 = filesystem error

### `oat status`

**Usage:** `oat status [--scope project|user|all] [--json] [--verbose]`

**Behavior:**
1. Load manifest
2. Detect providers
3. Classify each managed mapping (in_sync / drifted / missing)
4. Detect strays
5. Display summary table
6. If strays found AND interactive mode: prompt for adoption
7. If strays found AND non-interactive mode: report strays in output with remediation text (`run "oat init" to adopt`)

**Flags:**
- `--scope <project|user|all>` — Which scope to report (default: `all`)
- `--json` — Machine-readable output (no prompts, no spinners, single JSON document)
- `--verbose` — Show per-entry details

**Non-interactive contract:** When `--json` is set or stdin is not a TTY, no prompts are issued. Strays and adoption suggestions are included in the output data structure with a `remediation` field. Exit code still reflects drift/stray presence.

**Exit codes:** 0 = all in sync, 1 = drift or strays detected, 2 = error

### `oat sync`

**Usage:** `oat sync [--apply] [--scope project|user|all] [--json] [--verbose]`

**Behavior:**
1. Compute sync plan for requested scope(s)
2. If no `--apply`: display plan (dry-run) and exit
3. If `--apply`: execute plan, update manifest, display results

**Flags:**
- `--apply` — Execute the sync plan (without this, dry-run only)
- `--scope <project|user|all>` — Which scope to sync (default: `all`)
- `--json` — Machine-readable output
- `--verbose` — Show per-entry details

**Exit codes:** 0 = success (or nothing to do), 1 = partial failure, 2 = error

### `oat providers`

**Usage:** `oat providers <subcommand>`

Parent command for provider management. Provides `list` and `inspect` subcommands.

#### `oat providers list`

**Usage:** `oat providers list [--scope project|user|all] [--json]`

**Behavior:**
1. Enumerate all registered provider adapters (Claude, Cursor, Codex)
2. For each provider, run detection logic against the requested scope(s)
3. Display provider table: name, detected (yes/no), default strategy, content types supported, sync status summary

**Output (human mode):**
```
Provider     Detected  Strategy   Content Types    Status
Claude Code  ✓         symlink    skills, agents   3 synced, 1 drifted
Cursor       ✓         symlink    skills, agents   3 synced
Codex CLI    ✗         symlink    skills (native)  not detected
```

**Output (JSON mode):** Single JSON document with array of provider objects.

**Flags:**
- `--scope <project|user|all>` — Which scope to check (default: `all`)
- `--json` — Machine-readable output

**Exit codes:** 0 = success, 2 = error

#### `oat providers inspect`

**Usage:** `oat providers inspect <provider-name> [--scope project|user|all] [--json]`

**Behavior:**
1. Resolve provider by name (case-insensitive: `claude`, `cursor`, `codex`)
2. Display detailed provider information:
   - Provider name, display name, detection status
   - Path mappings for each scope and content type
   - Default sync strategy and any config overrides
   - Per-mapping sync state (in_sync/drifted/missing)
   - CLI version if available (calls `detectVersion()`)

**Flags:**
- `--scope <project|user|all>` — Which scope to inspect (default: `all`)
- `--json` — Machine-readable output

**Exit codes:** 0 = success, 1 = provider not found, 2 = error

### `oat doctor`

**Usage:** `oat doctor [--scope project|user|all] [--json]`

**Behavior:**
1. Run diagnostic checks:
   - Canonical directory exists and has valid structure
   - Manifest exists and is valid JSON with correct schema
   - Symlink creation works on this filesystem
   - Each provider detected + version (if CLI available)
   - Provider directory structures match expected paths
   - Codex agent support availability (best-effort)
2. Display results as pass/warn/fail with fix suggestions

**Flags:**
- `--scope <project|user|all>` — Which scope to check (default: `all`)
- `--json` — Machine-readable output

**Exit codes:** 0 = all pass, 1 = warnings present, 2 = failures present

## Security Considerations

### Authentication

Not applicable — the CLI operates on the local filesystem with the user's own permissions. No network calls, no API keys, no authentication.

### Authorization

The CLI operates with the same filesystem permissions as the invoking user. It does not escalate privileges.

### Data Protection

- **No sensitive data:** The CLI manages skill and agent markdown files. No PII, secrets, or credentials are processed.
- **Manifest safety:** Manifests contain only relative file paths, provider names, and content hashes. No sensitive information.
- **No network access:** The CLI makes zero network requests. All operations are local filesystem.

### Input Validation

- **Path traversal prevention:** All paths resolved via `node:path.resolve` and validated to stay within scope root (project root or `$HOME`). Canonical paths must be under `.agents/`; provider paths must be under their expected directories.
- **Symlink target validation:** Before creating symlinks, verify the target exists and is within the expected canonical directory.
- **Manifest integrity:** JSON parsing is wrapped in try-catch; corrupt manifests trigger a clear error with recovery instructions (`delete manifest and re-run oat sync`).

### Threat Mitigation

- **Accidental deletion:** Destructive operations (removing provider views) only apply to manifest-tracked entries. Unmanaged content is never touched.
- **Symlink attacks:** The CLI only creates symlinks pointing FROM provider directories TO canonical `.agents/`. It does not follow arbitrary symlinks. Existing symlinks that point outside `.agents/` are flagged as `drifted:replaced`.
- **Command injection:** No shell-out for core operations. `oat doctor` version detection uses `execFile` (not `exec`) with fixed command names and no user-controlled arguments.

## Performance Considerations

### Scalability

The CLI is designed for repositories with up to ~100 skills and ~50 agents across 3-5 providers. This is well within the practical range — most teams have 5-30 skills.

**Per-operation complexity:**
- `oat status`: O(skills x providers) filesystem stat calls — trivial for expected sizes
- `oat sync`: Same stat calls + O(skills x providers) symlink/copy operations
- `oat doctor`: Fixed number of checks (< 20)

### Caching

No caching layer needed. All operations are fast enough with direct filesystem access. The manifest itself is a form of "cache" — it records the last-known sync state so drift detection doesn't require comparing file contents in symlink mode.

### Resource Limits

- **Memory:** Manifest loaded fully into memory. At 100 entries x ~200 bytes each = ~20KB. Negligible.
- **Disk I/O:** Symlink creation is a single syscall per entry. Copy mode reads + writes file contents. For typical skill sizes (< 50KB per skill directory), this is sub-second.
- **Process:** Single-threaded, synchronous-feeling (async internally for I/O). No worker threads needed.

## Error Handling

### Error Categories

- **User Errors (exit 1):** Invalid arguments, cancelled operations, scope not initialized
- **System Errors (exit 2):** Filesystem permission denied, symlink creation failed, manifest corruption
- **Non-blocking Warnings:** Codex agent support unavailable, provider CLI not found (for version detection)

### Retry Logic

No retry logic. Filesystem operations either succeed or fail deterministically. If `oat sync --apply` fails mid-execution (e.g., permission denied on one symlink), it:
1. Reports the failure
2. Continues with remaining entries
3. Saves manifest with successfully synced entries only
4. Exits with code 1 (partial failure)
5. Re-running `oat sync --apply` picks up where it left off (idempotent)

### Logging

- **Normal output:** Status tables, sync plans, doctor results — always to stdout
- **Errors:** Error messages to stderr with suggested fix actions
- **Verbose (--verbose):** Per-entry details, filesystem operations performed, timing
- **JSON (--json):** Structured output to stdout; errors still to stderr
- No log files. The CLI is stateless between invocations (manifest is the only persisted state).

## Testing Strategy

### Requirement-to-Test Mapping

| ID | Verification | Key Scenarios |
|----|--------------|---------------|
| FR1 | integration | init on empty repo, init with existing provider skills, init idempotent re-run, init with --scope user |
| FR2 | integration | status with all in sync, status with drifted entries, status with strays, status with missing providers |
| FR3 | integration | sync dry-run shows plan, sync --apply creates symlinks, sync --apply with copy fallback, sync removes stale manifest entries |
| FR4 | integration | doctor on healthy env, doctor with missing .agents/, doctor with broken symlinks, doctor with provider CLI detection |
| FR5 | unit | claude adapter path resolution, cursor adapter always-sync-to-.cursor logic, codex native read detection, adapter detection logic |
| FR6 | unit | manifest create/read/write, add entry, remove entry, hash computation, atomic write, corrupt manifest recovery |
| FR7 | unit + integration | symlink in_sync, symlink broken, symlink replaced, copy modified, stray detection |
| FR8 | integration | adoption move + symlink, adoption skip, adoption skip-all |
| FR9 | unit | config loading, per-provider override, default fallback, auto strategy resolution |
| FR10 | unit | copy-mode marker insertion, marker detection in status |
| FR11 | integration | hook install, hook drift warning, hook uninstall |
| FR12 | integration | providers list enumerates all adapters, providers inspect shows detail + per-mapping state, --json output, unknown provider name error |
| NFR1 | integration | sync without --apply makes zero changes (snapshot before/after), removal only of tracked entries |
| NFR2 | e2e | symlink creation on macOS/Linux, copy fallback when symlinks fail |
| NFR3 | manual | add mock provider adapter without changing engine code |
| NFR4 | manual | review CLI output for clarity and formatting |
| NFR5 | integration | double-run init produces no changes, double-run sync produces no changes |

### Unit Tests

- **Scope:** Provider adapters, manifest manager, drift detector, output/logger, sync config loader
- **Coverage Target:** 90%+ for core modules (engine, manifest, drift)
- **Framework:** `vitest` — matches CLI structure proposal and provides fast watch mode, native ESM support, and coverage reporting
- **Key Test Cases:**
  - Adapter path resolution for each provider x scope x content type
  - Manifest entry CRUD operations and hash computation
  - Drift detection for all state transitions (in_sync, drifted/*, missing, stray)
  - Output formatting for tables, diffs, doctor results, provider details
  - Logger behavior: human mode vs `--json` mode, color/spinner suppression
  - Command factory wiring (`createXCommand` composition)
  - Domain-local validation/type modules (`*.types.ts`) and parse helpers

### Integration Tests

- **Scope:** Full command execution against a temp directory filesystem
- **Framework:** `vitest` with temp directory fixtures per test
- **Test Environment:** Each test creates a temp directory with a mock repo structure, runs commands, and asserts filesystem state
- **Key Test Cases:**
  - `oat init` bootstraps correct directory structure
  - `oat sync --apply` creates correct symlinks
  - `oat status` reports correct states after manual modifications
  - `oat providers list` enumerates detected providers with status
  - `oat providers inspect claude` shows provider detail with per-mapping state
  - `oat doctor` passes on healthy setup, reports issues on broken setup
  - Dry-run produces zero filesystem changes (snapshot comparison)
  - Idempotency: double-run produces identical state
  - `--json` mode: no prompts emitted, single JSON document output
  - Snapshot tests for stable help output on root and key parent commands
  - Contract tests for adapter interface conformance (one suite reused across providers)

### End-to-End Tests

- **Scope:** Full workflow (init → sync → modify → status → sync) on macOS and Linux
- **Test Scenarios:**
  - Fresh repo: init → sync → verify providers can discover skills
  - Drift scenario: sync → manually modify provider file → status reports drift → sync fixes it
  - Adoption: create provider-local skill → init detects and offers adoption
  - Copy fallback: force copy mode → verify content hash tracking and drift detection

## Deployment Strategy

### Build Process

The CLI is part of the existing monorepo build:
1. `pnpm build` → Turborepo builds `packages/cli` (TypeScript → `dist/`)
2. `bin.oat` in `package.json` points to `dist/index.js`
3. Runnable via `npx oat` (when published) or `pnpm cli` (local dev)

### Distribution

- **npm package:** `@oat/cli` published to npm registry
- **npx invocation:** `npx @oat/cli init` (or `npx oat` if name is available)
- **Global install:** `npm install -g @oat/cli` for `oat` command in PATH
- **Local dev:** `pnpm --filter=@oat/cli dev` or `tsx packages/cli/src/index.ts`

### Configuration

- **Environment Variables:** None required. All configuration via CLI flags and optional config files.
- **Node.js version:** >=22.17.0 (matches repo requirement)

### Rollback Plan

The CLI writes only two artifacts: symlinks/copies in provider directories and manifest files. Rollback is:
1. Delete manifest files (`.oat/sync/manifest.json`, `~/.oat/sync/manifest.json`)
2. Delete any symlinks created (they point into `.agents/`, removing symlinks doesn't affect canonical content)
3. Run `oat init` + `oat sync --apply` to re-establish from scratch

## Migration Plan

### From `npx openskills` / `npx skills`

The `oat` CLI replaces `npx openskills` for sync management. Migration path:

**v1 (coexistence — existing workflows preserved):**
1. Run `oat init` — detects existing provider-local skills (including those placed by `npx skills`)
2. Adopt detected skills into `.agents/` (moves + creates symlinks)
3. Run `oat sync --apply` to ensure all providers are linked

> **Compatibility contract:** During the transition period, existing `.agent/` workflows, `npx openskills`, and `npx skills` commands remain functional. `oat` does not modify or remove content managed by these tools. Both systems can coexist: `oat` manages `.agents/` → provider symlinks while legacy tools manage their own paths.

**Post-v1 (cutover — after full adoption):**
4. Remove `npx openskills` / `npx skills` from project dependencies
5. Update AGENTS.md skill invocation to use new skill paths (`.agents/skills/` canonical)

### From manual symlinks

If a project has manually created symlinks:
- `oat status` detects them as strays (not in manifest)
- `oat init` offers to adopt them (records in manifest for future tracking)
- Existing symlinks pointing to `.agents/` are detected as already-correct and skipped

### `.agent/` → `.agents/` rename

**Deferred.** This is explicitly out of scope for v1. The CLI works with `.agents/` as canonical from day one. Existing `.agent/` content remains untouched. A future migration tool will move `.agent/skills/` → `.agents/skills/` and update references.

## Open Questions

- **Cursor agent cross-compatibility:** Cursor reads `.claude/skills/` for cross-compat. Does it also read `.claude/agents/` for subagents, or only `.cursor/agents/`? The design syncs to `.cursor/agents/` for safety. Empirical validation needed. (Note: regardless of cross-compat for skills, `oat` always syncs directly to `.cursor/skills/` per design decision — this question only affects whether `.cursor/agents/` is strictly needed or redundant.)

## Implementation Phases

### Phase 1: Foundation — Scaffold, Manifest, Adapters, Scan

**Goal:** Scaffold command-factory structure, establish core data structures, provider adapter definitions, and canonical directory scanning.

**Tasks:**
- Scaffold `packages/cli/src/` directory structure per CLI structure proposal (app/, commands/, providers/, config/, shared/, ui/, validation/, fs/, errors/, engine/, manifest/, drift/)
- Wire up root entrypoint with `commander` command-factory pattern (`create-program.ts`, command registration)
- Implement `CliLogger` (`ui/logger.ts`) with chalk-based semantic output + JSON mode
- Implement `ora` spinner wrapper (`ui/spinner.ts`) with non-TTY auto-disable
- Implement `CommandContext` (`app/command-context.ts`) with global flags + interactive detection
- Add path aliases in tsconfig and `tsc-alias` for clean imports
- Add `vitest` as dev dependency with test scripts (`test`, `test:watch`, `test:coverage`)
- Define TypeScript interfaces + zod schemas for all data models (Manifest, ProviderAdapter, SyncPlan, etc.)
- Implement manifest manager (load, save, add, remove, hash computation) with atomic writes
- Implement provider adapter definitions (Claude, Cursor, Codex) with path mappings — Cursor always syncs to `.cursor/skills/`
- Implement canonical directory scanner with scope-aware content filtering (project: skills+agents, user: skills only)
- Implement sync config loader (read optional config, apply defaults, validate with zod)
- Unit tests for manifest CRUD, adapter resolution, scanner, logger, command context

**Verification:** Unit tests pass for manifest, adapters, scanner, logger. `oat --help` displays command tree.

### Phase 2: Sync Engine — Diff, Plan, Execute

**Goal:** Core sync logic — compute what needs to change and execute it.

**Tasks:**
- Implement sync plan computation (compare canonical x adapters x manifest → plan entries)
- Implement sync plan execution (create symlinks, copy directories, remove stale views)
- Implement directory symlink creation with copy fallback (`fs/io.ts`)
- Implement generated view markers for copy mode
- Integration tests for sync plan computation and execution against temp filesystem

**Verification:** Integration tests: sync creates correct symlinks/copies, dry-run makes no changes, idempotent re-run.

### Phase 3: Drift Detection and Status

**Goal:** Detect drift between canonical and provider views, display status.

**Tasks:**
- Implement drift detector (provider-path-absent → missing check first, then symlink validation, copy hash comparison, stray scanning)
- Implement `oat status` command via `createStatusCommand()` factory (detect providers, classify entries, display table)
- Implement stray adoption flow (interactive prompts via `@inquirer/prompts`, move + symlink)
- Implement non-interactive contract: no prompts in `--json`/non-TTY, output remediation text instead
- Implement output formatters (`ui/output.ts`) for tables, JSON mode (single document per command)
- Integration tests for drift scenarios, status output, non-interactive JSON output

**Verification:** Integration tests: status correctly reports in_sync/drifted/missing/stray across scenarios. `--json` output contains no interactive prompts.

### Phase 4: Commands — init, sync, providers, doctor

**Goal:** Wire up remaining CLI commands with full user interaction.

**Tasks:**
- Implement `oat init` command via `createInitCommand()` (bootstrap + adoption flow)
- Implement `oat sync` command via `createSyncCommand()` (dry-run + apply modes)
- Implement `oat providers` command via `createProvidersCommand()`:
  - `oat providers list` — enumerate providers with detection status and sync summary
  - `oat providers inspect <name>` — detailed provider view with path mappings and per-mapping state
- Implement `oat doctor` command via `createDoctorCommand()` (diagnostic checks with fix suggestions)
- Implement shared prompt primitives (`shared/prompts.ts`) for confirmAction, selectWithAbort
- Integration tests for each command + snapshot tests for help output

**Verification:** All 5 commands functional with correct exit codes, output formats, and flag handling.

### Phase 5: Git Hook and Polish

**Goal:** Optional pre-commit hook, edge cases, documentation.

**Tasks:**
- Implement pre-commit hook installation/uninstallation
- Implement hook drift warning logic
- Handle edge cases (empty canonical dir, permissions errors, corrupt manifest recovery)
- Polish output formatting (alignment, Unicode markers, non-TTY detection)
- End-to-end workflow tests (init → sync → modify → status → sync)
- Contract tests for adapter interface conformance (one suite reused across providers)
- Update package.json bin entry and publish configuration

**Verification:** Full e2e workflow passes. Hook warns on drift. CLI ready for initial release.

## Dependencies

### External Dependencies

**Runtime (npm):**
- `commander` — Command graph, options parsing, help output, subcommand registration
- `@inquirer/prompts` — Interactive prompts (confirm, select, input) for adoption flows and confirmations
- `chalk` — Semantic output coloring (info, warn, error, success) via centralized `CliLogger`
- `ora` — Spinner for longer I/O operations; auto-disabled in non-TTY and `--json` mode
- `zod` — Validation boundary for env, user input, adapter config, and disk-loaded documents
- `dotenv` (optional) — Load env from project/user config paths when enabled by runtime policy
- `gray-matter` + `yaml` (optional) — Parse frontmatter/config docs only where needed

**Node.js builtins (no install needed):**
- `node:fs/promises` — File operations (symlink, copy, stat, readdir)
- `node:path` — Path resolution
- `node:crypto` — SHA-256 hashing for copy mode
- `node:child_process` — `execFile` for optional provider CLI version detection
- `node:os` — Home directory resolution

### Internal Dependencies

- **@oat/cli package** — Existing monorepo package; this design extends the placeholder implementation
- **Turborepo build** — `pnpm build` compiles TypeScript to `dist/`

### Development Dependencies

- **TypeScript 5.8.3** — Type checking and compilation
- **tsx** — Direct TypeScript execution for development
- **tsc-alias** — Path alias resolution after compilation
- **vitest** — Unit + integration test runner for CLI modules and command dispatch behavior
- **Biome** — Linting and formatting

## Risks and Mitigation

- **Symlink behavior differences across platforms:** Medium probability | Low impact
  - **Mitigation:** Integration tests run on both macOS (dev) and Linux (CI). Copy fallback handles edge cases.
  - **Contingency:** Platform-specific symlink helper with documented behavior per OS.

- **Concurrent modification of manifest:** Low probability | Low impact
  - **Mitigation:** Atomic writes (write temp + rename). Single-user CLI tool unlikely to have concurrent invocations.
  - **Contingency:** Add file locking via `node:fs.flock` if concurrency issues arise.

- **Codex agent path changes:** Medium probability | Medium impact
  - **Mitigation:** Codex agent support is best-effort. Adapter paths are data-driven, easily updated.
  - **Contingency:** `oat doctor` reports Codex agent status; users get clear guidance.

- **Premature migration from existing skills tools:** Medium probability | High impact
  - **Mitigation:** v1 coexists with `npx openskills` and `npx skills`. Migration steps 4-5 (removing legacy tools, updating AGENTS.md) are explicitly post-v1/post-cutover. Compatibility contract documented in Migration Plan.
  - **Contingency:** If coexistence causes issues, add a `oat compat check` subcommand to detect conflicts.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Discovery review: `reviews/discovery-review.md`
- Spec review: `reviews/spec-review.md`
- Design review: `reviews/design-review.md`
- CLI structure proposal: `reviews/cli-structure-proposal.md`
- Knowledge Base: `.oat/knowledge/repo/project-index.md`
- Architecture: `.oat/knowledge/repo/architecture.md`
- Stack: `.oat/knowledge/repo/stack.md`
- Conventions: `.oat/knowledge/repo/conventions.md`
- Concerns: `.oat/knowledge/repo/concerns.md`
- Skills research: `.oat/internal-project-reference/research/skills-reference.md`
- Architecture reference: `.oat/internal-project-reference/research/skills-reference-architecture.md`
- Provider docs: `.oat/internal-project-reference/research/provider-documentation-reference.md`
- Subagents research: `.oat/internal-project-reference/research/subagents-reference.md`
