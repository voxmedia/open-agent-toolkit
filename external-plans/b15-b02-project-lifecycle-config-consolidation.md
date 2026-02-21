# B15 + B02: Project Lifecycle Commands & Config Consolidation

## Context

Every OAT workflow session currently requires manual pointer file manipulation (`cat .oat/active-project`, editing `.oat/projects-root`) and there are no CLI commands for opening, switching, or pausing projects. Meanwhile, configuration is scattered across multiple single-value text files (`.oat/active-project`, `.oat/projects-root`) instead of being consolidated into structured JSON.

This plan combines **B15** (project open/pause CLI commands) and **B02** (config consolidation Phase B/C) using a config-first approach: build the config.local.json infrastructure first, then implement project commands on top, then migrate all skills and CLI consumers in one clean cut.

## Design Decisions

- **Config-first sequencing**: config.local.json infrastructure before commands
- **Direct to config.local.json**: no v1 pointer file writes — clean cut
- **All skills updated immediately**: no dual-write compatibility shim
- **Single `open` command**: contextual "switching from X to Y" messaging when another project is active
- **Pause clears the active pointer**: records `oat_lifecycle: paused` + timestamp/reason in state.md AND removes activeProject from config.local.json. Only clears pointer when paused project matches active project.
- **`lastPausedProject` field**: config.local.json tracks the last paused project so dashboard can surface resume guidance even with no active pointer
- **Resume via `open`**: opening a paused project clears pause metadata and sets it active
- **Repo-relative paths**: activeProject stored as repo-relative path (e.g., `.oat/projects/shared/my-project`), never absolute. Normalized on read.
- **Active-idea out of scope**: `.oat/active-idea` and `~/.oat/active-idea` remain as pointer files — not migrated in this project
- **`--reason` persistence**: pause reason saved to state.md frontmatter (`oat_pause_reason`); open reason is stdout-only
- **Config CLI commands**: `oat config get/set/list` provide a clean interface for reading/writing config — skills use these instead of raw `jq` against config files

---

## Phase 1: Extract Shared Frontmatter Write Utilities

`upsertFrontmatterField` and `replaceFrontmatter` live in set-mode but are needed by open/pause commands.

**Create:** `packages/cli/src/commands/shared/frontmatter-write.ts`
- Move `upsertFrontmatterField()` and `replaceFrontmatter()` from `set-mode/index.ts`
- Export both functions

**Modify:** `packages/cli/src/commands/project/set-mode/index.ts`
- Import from `@commands/shared/frontmatter-write` instead of local definitions
- Remove local copies

**Tests:** `packages/cli/src/commands/shared/frontmatter-write.test.ts`
- Unit tests for upsert (existing field, new field, overwrite, no-overwrite, comment preservation)
- Unit tests for replaceFrontmatter

---

## Phase 2: Config Infrastructure (config.local.json + config.json migration)

### 2a: Config types and utilities

**Create:** `packages/cli/src/config/oat-config.ts`

```typescript
// Schema
interface OatConfig {           // .oat/config.json (tracked)
  version: number;              // 1
  worktrees?: { root: string }; // existing Phase A
  projects?: { root: string };  // NEW: Phase B migration from .oat/projects-root
}

interface OatLocalConfig {       // .oat/config.local.json (gitignored)
  version: number;               // 1
  activeProject?: string | null; // repo-relative path (replaces .oat/active-project)
  lastPausedProject?: string | null; // repo-relative path of last paused project
}
```

Note: `activeIdea` is **not** included — idea pointers remain as `.oat/active-idea` files (out of scope).

Functions:
- `readOatConfig(repoRoot): Promise<OatConfig>` — reads `.oat/config.json`, returns `{version:1}` if missing
- `readOatLocalConfig(repoRoot): Promise<OatLocalConfig>` — reads `.oat/config.local.json`, returns `{version:1}` if missing
- `writeOatLocalConfig(repoRoot, config): Promise<void>` — writes JSON with newline
- `writeOatConfig(repoRoot, config): Promise<void>` — writes JSON with newline
- `resolveActiveProject(repoRoot, env?): Promise<{name, path, status}>` — reads local config, validates path exists, returns repo-relative path
- `setActiveProject(repoRoot, projectRelativePath): Promise<void>` — updates local config (stores repo-relative path)
- `clearActiveProject(repoRoot, opts?: {lastPaused?: string}): Promise<void>` — sets activeProject to null, optionally sets lastPausedProject

Path normalization: if an absolute path is read (legacy), strip the repo root prefix to make it repo-relative. All writes use repo-relative paths.

### 2b: Update resolveProjectsRoot

**Modify:** `packages/cli/src/commands/shared/oat-paths.ts`

Precedence: `OAT_PROJECTS_ROOT` env → `config.json.projects.root` → `.oat/projects-root` file (compat) → default `.oat/projects/shared`

### 2c: Gitignore

**Modify:** `.gitignore`
- Add `.oat/config.local.json` to the "OAT local-only workspace state" section

### Tests: `packages/cli/src/config/oat-config.test.ts`
- Read/write round-trip for both config files
- Missing file returns defaults
- resolveActiveProject with valid/invalid/missing paths
- Absolute path normalization to repo-relative
- setActiveProject + clearActiveProject with lastPausedProject

---

## Phase 2.5: `oat config` CLI Commands

Provide a CLI interface for reading/writing config values. This eliminates the `jq` dependency in skills and centralizes precedence logic.

**Create:** `packages/cli/src/commands/config/index.ts`

### `oat config get <key>`
- Reads a config value with full precedence resolution
- Key routing: keys like `activeProject`, `lastPausedProject` read from config.local.json; keys like `projects.root`, `worktrees.root` read from config.json
- Environment variable overrides apply (e.g., `OAT_PROJECTS_ROOT` overrides `projects.root`)
- Outputs raw value to stdout (no decoration) for easy shell capture: `$(oat config get activeProject)`
- Outputs empty string + exit 0 if key exists but is null/unset
- Exit 1 if key is unrecognized

### `oat config set <key> <value>`
- Writes a config value to the appropriate file based on key
- Local keys (`activeProject`, `lastPausedProject`) → config.local.json
- Shared keys (`projects.root`, `worktrees.root`) → config.json
- Creates the config file if it doesn't exist
- JSON output mode supported

### `oat config list`
- Shows all resolved config values (merged view of config.json + config.local.json + env overrides)
- Table format for human output, JSON for `--json`
- Indicates source of each value (env, config.json, config.local.json, default)

**Modify:** `packages/cli/src/commands/index.ts`
- Import and register `createConfigCommand()`

**Known keys (v1):**

| Key | File | Default | Env Override |
|-----|------|---------|-------------|
| `activeProject` | config.local.json | null | — |
| `lastPausedProject` | config.local.json | null | — |
| `projects.root` | config.json | `.oat/projects/shared` | `OAT_PROJECTS_ROOT` |
| `worktrees.root` | config.json | `.worktrees` | `OAT_WORKTREES_ROOT` |

**Tests:** `packages/cli/src/commands/config/index.test.ts`
- get existing key, get missing key, get with env override
- set local key, set shared key, set creates file if missing
- list shows merged view with sources
- JSON output mode for all three subcommands

---

## Phase 3: `oat project open` Command

**Create:** `packages/cli/src/commands/project/open/index.ts`

```
oat project open <name>
  --reason <string>  Optional reason for opening/switching (stdout only)
```

Behavior:
1. Resolve repo root
2. Resolve projects root (via updated `resolveProjectsRoot`)
3. Validate `<name>` exists as `{projectsRoot}/<name>/` with `state.md`
4. Read current active project from config.local.json
5. If same project already active → report "already active" and exit 0
6. If different project active → report "switching from X to Y"
7. Read target project's state.md frontmatter:
   - If `oat_lifecycle: paused` → clear pause fields (`oat_lifecycle: active`, remove `oat_pause_timestamp`, remove `oat_pause_reason`) using shared frontmatter-write utilities
8. Write activeProject (repo-relative path) to config.local.json via `setActiveProject()`
9. Clear `lastPausedProject` if the opened project matches it
10. Run `generateStateDashboard()`
11. Report success (JSON or human-readable)

**Modify:** `packages/cli/src/commands/project/index.ts`
- Import and register `createProjectOpenCommand()`

**Tests:** `packages/cli/src/commands/project/open/index.test.ts`
- Open with no prior active project
- Open when another project is active (switch messaging)
- Open a paused project (clears pause state in state.md)
- Open non-existent project (error)
- Open project with missing state.md (error)
- JSON output mode

---

## Phase 4: `oat project pause` Command

**Create:** `packages/cli/src/commands/project/pause/index.ts`

```
oat project pause [name]
  --reason <string>  Optional pause reason (saved to state.md frontmatter)
```

Behavior:
1. Resolve repo root
2. If `<name>` provided, resolve that project. If not, use current active project from config.local.json
3. If no active project and no name → error "No project specified and no active project"
4. Validate project exists with state.md
5. Read state.md, update frontmatter:
   - Set `oat_lifecycle: paused`
   - Set `oat_pause_timestamp: <ISO date>`
   - Set `oat_pause_reason: <reason>` (if provided; omit field if no reason)
6. **Only if paused project matches current active project:** clear activeProject from config.local.json via `clearActiveProject(repoRoot, {lastPaused: projectRelativePath})`
7. Run `generateStateDashboard()`
8. Report success

**Modify:** `packages/cli/src/commands/project/index.ts`
- Import and register `createProjectPauseCommand()`

**Tests:** `packages/cli/src/commands/project/pause/index.test.ts`
- Pause current active project (clears pointer + sets lastPausedProject)
- Pause named project that is NOT currently active (does NOT clear pointer)
- Pause with reason (saved to state.md frontmatter)
- Pause non-existent project (error)
- Pause when no active project and no name (error)
- JSON output mode

---

## Phase 5: Dashboard Updates

**Modify:** `packages/cli/src/commands/state/generate.ts`

### 5a: readActiveProject reads config.local.json
- Replace file-based pointer read with `readOatLocalConfig()` → `resolveActiveProject()`
- Remove direct `.oat/active-project` file reads

### 5b: readProjectState handles pause
- Read `oat_lifecycle` field (already does, defaults to 'active')
- Read `oat_pause_timestamp` and `oat_pause_reason` if lifecycle is 'paused'

### 5c: computeNextStep handles paused + lastPausedProject
- When project is active with `lifecycle === 'paused'`: return `{step: 'oat project open <name>', reason: 'Project is paused — open to resume'}`
- When no active project but `lastPausedProject` is set in config.local.json: return `{step: 'oat project open <lastPaused>', reason: 'Resume paused project or open a different one'}`

### 5d: Dashboard markdown shows pause state
- In "Active Project Summary" table, add Lifecycle row when not 'active'
- If no active project but lastPausedProject exists, show "Last paused: X" section
- If paused, show pause timestamp and reason

### 5e: Quick Commands update
- Add `oat project open <name>` and `oat project pause [name]` to quick commands list
- Keep skill names for workflow commands (oat-project-progress etc.)

**Tests:** Update `packages/cli/src/commands/state/generate.test.ts`
- Dashboard with paused project (active pointer still set — pausing a non-active project)
- Dashboard with no active project + lastPausedProject (paused the active project)
- computeNextStep with paused lifecycle
- readActiveProject from config.local.json (no pointer file)

---

## Phase 6: Migrate CLI Consumers

### 6a: scaffold.ts (project new)
**Modify:** `packages/cli/src/commands/project/new/scaffold.ts`
- Replace `writeActiveProjectPointer()` with `setActiveProject()` from config utilities
- Remove the old `writeActiveProjectPointer` function

### 6b: set-mode
**Modify:** `packages/cli/src/commands/project/set-mode/index.ts`
- Replace inline pointer file reads with `readOatLocalConfig()` + resolve
- Replace `readProjectsRoot()` with `resolveProjectsRoot()` from shared oat-paths
- Remove local `readProjectsRoot()`, `resolveActiveProjectPath()` functions

### 6c: cleanup commands
**Modify:** `packages/cli/src/commands/cleanup/project/project.ts`
- Read active project from config.local.json instead of pointer file
- Adjust cleanup actions to reference config.local.json

**Modify:** `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
- Read active project from config.local.json

### 6d: install-workflows
**Modify:** `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`
- When writing projects-root default, also write to `config.json.projects.root`
- Keep `.oat/projects-root` file write during transition (removed in Phase 9)

**Tests:** Update all affected test files for config.local.json reads

---

## Phase 7: Skill Migration (Batch)

Update all 22 project-related skills from pointer file reads to `oat config` CLI commands.

**Active-idea skills are NOT migrated** (out of scope — 4 idea skills keep using `.oat/active-idea`).

### Active project reads
**Before:**
```bash
ACTIVE_PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)
```
**After:**
```bash
ACTIVE_PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
```

### Active project writes
**Before:**
```bash
echo "$PROJECT_PATH" > .oat/active-project
```
**After:**
```bash
# Prefer purpose-built command when activating a project:
oat project open "$PROJECT_NAME"
# Or for direct config write (e.g., during scaffolding):
oat config set activeProject "$PROJECT_PATH"
```

### Active project deletes
**Before:**
```bash
rm -f .oat/active-project
```
**After:**
```bash
# Prefer purpose-built command:
oat project pause
# Or for direct config clear:
oat config set activeProject ""
```

### Projects root reads
**Before:**
```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo '.oat/projects/shared')}"
```
**After:**
```bash
PROJECTS_ROOT=$(oat config get projects.root 2>/dev/null || echo '.oat/projects/shared')
# oat config get already resolves env override (OAT_PROJECTS_ROOT) and defaults
```

### Skills to update (22 project skills):
oat-project-spec, oat-project-plan, oat-project-open, oat-project-promote-full, oat-project-quick-start, oat-project-progress, oat-project-pr-progress, oat-project-pr-final, oat-project-implement, oat-project-design, oat-project-new, oat-project-complete, oat-project-review-provide, oat-project-review-receive, oat-project-discover, oat-project-import-plan, oat-project-clear-active, oat-project-subagent-implement, oat-worktree-bootstrap, create-oat-skill (template), create-pr-description, oat-review-provide

### Reference doc skills (projects root only):
docs-completed-projects-gap-review, update-repo-reference

### Skill template update
**Modify:** `.agents/skills/create-oat-skill/references/oat-skill-template.md`
- Update the project resolution snippet to use config.local.json pattern

---

## Phase 8: Worktree Bootstrap Update

**Modify:** `.agents/skills/oat-worktree-bootstrap/SKILL.md`
- Step 2.5 (pointer propagation): Instead of copying `.oat/active-project` and `.oat/active-idea`, copy `.oat/config.local.json` as a single file
- `.oat/active-idea` is still separate — copy it too (not migrated)
- Since activeProject is repo-relative, the copied file works correctly in the worktree without path fixup

---

## Phase 9: Legacy Cleanup

**After all migrations are verified working:**

### 9a: Remove legacy fallback code
- Remove `.oat/projects-root` file fallback from `resolveProjectsRoot()` (config.json is now the source)
- Remove `.oat/active-project` file fallback from any remaining code

### 9b: Update .gitignore
- Remove `.oat/active-project` entry (file no longer created)
- Keep `.oat/active-idea` entry (still in use)
- Note: Don't delete existing `.oat/active-project` files from users — they just become inert

### 9c: Retire skill commands
- `oat-project-clear-active` skill can be simplified to call `oat project pause`
- `oat-project-open` skill can be simplified to call `oat project open`

---

## Phase 10: Decision Records

**Modify:** `.oat/repo/reference/decision-record.md`

### ADR-012: Adopt config.local.json for per-developer project state
- Status: accepted
- Supersedes: ADR-001 (path-based pointer), ADR-004 (defer name-only migration)
- Decision: Active project pointer and last-paused project move to `.oat/config.local.json` (gitignored) as repo-relative paths. Projects root moves to `.oat/config.json` (tracked). Active-idea pointers remain as files (separate migration). Legacy pointer files removed after migration.

### ADR-013: Project open/pause CLI semantics
- Status: accepted
- Decision: Single `open` command handles both fresh activation and resume from paused state. `pause` records metadata in state.md and clears the active pointer only when the paused project matches the current active project. `lastPausedProject` field in config.local.json enables dashboard to surface resume guidance.

---

## Verification

### Unit tests
- `pnpm --filter @oat/cli test` — all existing + new tests pass

### Integration checks
1. `pnpm build` succeeds
2. `pnpm lint && pnpm type-check` pass
3. `oat project open <name>` sets config.local.json with repo-relative path and refreshes dashboard
4. `oat project pause` marks state.md paused + clears config.local.json + sets lastPausedProject
5. `oat project pause <other-name>` marks state.md paused but does NOT clear active pointer
6. `oat project open <paused-name>` clears pause state + sets active
7. `oat state refresh` reads from config.local.json correctly
8. `oat project new <name>` writes to config.local.json (not pointer file)
9. Dashboard shows paused status / lastPausedProject context and correct recommended step

### Config CLI checks
- `oat config get activeProject` returns current active project path
- `oat config get projects.root` returns projects root (with env override working)
- `oat config set activeProject .oat/projects/shared/test` writes to config.local.json
- `oat config list` shows merged view with correct sources
- `oat config list --json` outputs valid JSON

### Skill verification
- Spot-check 3-4 representative skills that `oat config get` reads values correctly
- Verify `oat-worktree-bootstrap` copies config.local.json to new worktrees
- Verify repo-relative paths work correctly in worktrees (no absolute path leakage)

### Follow-up backlog item
- Add **(P2) [tooling] Migrate active-idea pointers to config.local.json** to backlog Inbox
  - Scope: Migrate `.oat/active-idea` and `~/.oat/active-idea` into config.local.json with dual-level (repo + user) precedence rules
  - Covers 4 idea skills: oat-idea-new, oat-idea-ideate, oat-idea-scratchpad, oat-idea-summarize
  - Depends on: this project (config.local.json infrastructure must exist)

### Regression checks
- `pnpm oat:validate-skills` passes (frontmatter/banner validation)
- No remaining references to `cat .oat/active-project` in skills (grep check)
- No remaining references to `cat .oat/projects-root` in skills (grep check)
- Idea skills still function with `.oat/active-idea` pointer files unchanged
