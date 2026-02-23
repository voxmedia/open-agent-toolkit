# Skill Lifecycle: Versioning + Removal

## Context

OAT distributes skills (markdown-based agent workflow instructions) via `oat init tools`, which copies bundled skill directories from the CLI's `assets/` into a target repo's `.agents/skills/`. Skills are grouped into **packs**: `ideas` (4 skills), `workflows` (~20 skills), and `utility` (variable). Once installed, `oat sync --apply` creates **provider views** (symlinks or copies) in provider-specific directories (`.claude/skills/`, `.cursor/skills/`, `.codex/agents/`) so each AI coding agent can read them natively.

**Problem 1 — No update detection:** `oat init tools` checks only whether a skill directory exists. If it exists, it skips — even if the bundled version is newer. Users must use `--force` to blindly overwrite everything, losing any local customizations. There's no way to know which skills are outdated.

**Problem 2 — No removal command:** There's no CLI command to remove a skill. Users must manually delete the canonical directory (`.agents/skills/<name>/`), then delete provider view copies/symlinks, then clean up the sync manifest (`.oat/sync/manifest.json`). This is error-prone and undiscoverable.

This project adds three features that complete the skill lifecycle:
1. **Skill versioning**: semver `version` field in SKILL.md frontmatter + version-aware update detection in `oat init tools`
2. **Skill removal**: `oat remove skill <name>` and `oat remove skills --pack <pack>` with full provider view cleanup
3. **Doctor integration**: Surface outdated skills in `oat doctor` output

Backlog items: B14 (skill uninstall) + skill versioning (inbox item).

---

## Architecture Background

### Canonical → Provider Sync Model

OAT uses a **canonical source / provider view** architecture:

- **Canonical source**: `.agents/skills/<name>/SKILL.md` (+ optional scripts, docs). This is the single source of truth.
- **Provider views**: Generated copies or symlinks in provider-specific directories. Each provider adapter (`claude`, `cursor`, `codex`) defines `PathMapping[]` that map canonical paths to provider paths. For example, Claude maps `.agents/skills` → `.claude/skills`.
- **Sync manifest**: `.oat/sync/manifest.json` tracks which provider views are OAT-managed (vs. user-created). Only manifest-managed entries are safe to delete/update during sync or removal.
- **nativeRead mappings**: Some providers can read `.agents/` directly (e.g., Codex with `nativeRead: true`). These don't produce provider view copies and should be excluded from removal cleanup.

Key functions:
- `getSyncMappings(adapter, scope)` in `packages/cli/src/providers/shared/adapter.utils.ts` — returns sync-managed (non-nativeRead) path mappings for a provider
- `getConfigAwareAdapters(adapters, scopeRoot, config)` — returns active adapters based on `.oat/sync/config.json` enable/disable settings
- `removeEntry(manifest, canonicalPath, provider)` in `packages/cli/src/manifest/manager.ts` — removes a manifest entry

### Scopes

OAT commands operate in one of three scopes:
- **project**: The repo root (resolved via git or `.oat/` marker). Most skills live here.
- **user**: `~/.oat/` (user-level skills shared across repos). Ideas and utility packs can be installed here.
- **all** (default): Both project and user scopes. Commands like `oat doctor` iterate over concrete scopes via `resolveConcreteScopes()`.

### SKILL.md Frontmatter

Current frontmatter fields (all in `.agents/skills/oat-*/SKILL.md`):

```yaml
---
name: oat-project-new
description: Use when creating a new OAT project...
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---
```

No `version` field exists today. Frontmatter is parsed by `packages/cli/src/commands/shared/frontmatter.ts` (regex-based, no YAML library). Validation is in `packages/cli/src/validation/skills.ts` — currently requires `name`, `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`.

### CLI Command Conventions

All CLI commands follow these patterns (see `packages/cli/AGENTS.md`):

- **Dependency injection**: Each command defines a `Dependencies` interface, a `defaultDependencies()` factory, and a `createXxxCommand(overrides?)` function. Tests pass mock overrides. Example reference: `packages/cli/src/commands/doctor/index.ts`.
- **Dry-run by default**: Mutating commands show what they would do. `--apply` flag executes. Non-interactive mode never prompts — either applies or reports.
- **Exit codes**: 0 success, 1 actionable/user error, 2 system/runtime error.
- **Import aliases**: Use `@commands/...`, `@fs/...`, `@manifest/...`, `@providers/...`, `@shared/...`, `@app/...`, `@config/...`, `@engine/...`, `@errors/...`, `@ui/...`. Never use `../` or `src/` imports.
- **Logger**: Route output through `context.logger` (not `console.*`). Support `context.json` for machine-readable output.
- **Help snapshots**: `packages/cli/src/commands/help-snapshots.test.ts` contains inline snapshot assertions for all command help text. Adding a new command requires updating these.

### Copy-Helpers (Current State)

`packages/cli/src/commands/init/tools/shared/copy-helpers.ts` provides:

```typescript
type CopyStatus = 'copied' | 'updated' | 'skipped';

// Directory copy: exists + !force → 'skipped', exists + force → delete+recopy → 'updated', !exists → copy → 'copied'
async function copyDirWithStatus(source, destination, force): Promise<CopyStatus>

// File copy: same logic
async function copyFileWithStatus(source, destination, force): Promise<CopyStatus>
```

Each installer function (e.g., `installWorkflows()` in `install-workflows.ts`) loops over a const array of skill names, calls `copyDirWithStatus()`, and categorizes results into `copiedSkills`/`updatedSkills`/`skippedSkills` arrays.

---

## Design Decisions

- **Semver format** (not integer): `version: 1.0.0` communicates breaking vs. non-breaking changes. Standard convention. Validated by regex (`/^\d+\.\d+\.\d+$/`), no external library needed.
- **Missing version treated as 0.0.0**: Skills without a `version` field are always considered outdated relative to any versioned bundled skill. This ensures upgradability for existing installs.
- **Batch-with-opt-out UX for updates**: Interactive mode shows all outdated skills pre-checked; user can deselect specific skills. Better than per-skill prompts (too slow) or all-or-nothing (too coarse).
- **Non-interactive mode is report-only**: `oat init tools` in CI/scripted runs does NOT auto-update outdated skills. This preserves the current non-destructive behavior. Use `--force` to update in non-interactive contexts. This was flagged in code review — the original plan had non-interactive auto-update which would be a breaking behavior change.
- **Full removal (canonical + provider views)**: `oat remove skill` deletes canonical directory AND propagates deletion to all sync-managed provider views. Only manifest-managed entries are deleted; unmanaged/stray provider entries are warned about but not touched.
- **Scope-aware removal**: `oat remove` resolves concrete scopes (project, user, or both) and reports per-scope. In interactive mode, confirms when skill exists in multiple scopes. Dry-run default protects non-interactive mode.
- **Provider path resolution via getSyncMappings**: NOT a fictional `adapter.resolveViewPath()` — use the existing `getSyncMappings(adapter, scope)` which returns `PathMapping[]` filtered to `nativeRead === false`. Compute provider skill path as `join(scopeRoot, mapping.providerDir, skillName)`.
- **`oat remove skill` vs `oat remove skills`**: Singular removes one skill by name; plural removes a pack (`--pack ideas|workflows|utility`). Separate subcommands for clarity.

---

## Phase 1: Version Infrastructure

### 1.1 Add `version` field to frontmatter parsing

**Files:**
- `packages/cli/src/commands/shared/frontmatter.ts` — add `getSkillVersion()` helper
- `packages/cli/src/validation/skills.ts` — add optional `version` format validation

**Changes to `frontmatter.ts`:**
- Add function `getSkillVersion(skillDir: string): Promise<string | null>` that reads `SKILL.md` from the given directory, extracts frontmatter via existing `getFrontmatterBlock()`, returns the `version` field value or `null`
- Reuse existing `getFrontmatterField()` internally

**Changes to `skills.ts`:**
- After the existing required-field checks, add: if `version` key is present in frontmatter, validate it matches `/^\d+\.\d+\.\d+$/`
- Do NOT add `version` to the required fields list — only validate format when present
- Add a finding with message like `Frontmatter version must be valid semver (e.g., 1.0.0)` on failure

### 1.2 Add version comparison utility

**New file:** `packages/cli/src/commands/init/tools/shared/version.ts`

```typescript
export function parseVersion(version: string | null): [number, number, number]
export function compareVersions(installed: string | null, bundled: string | null): 'outdated' | 'current' | 'newer'
```

- `null`, empty string, or unparseable → treated as `[0, 0, 0]`
- `parseVersion`: split on `.`, parse each segment as integer, return tuple
- `compareVersions`: compare tuples element-wise (major, then minor, then patch)
  - bundled > installed → `'outdated'`
  - equal → `'current'`
  - installed > bundled → `'newer'`

### 1.3 Add `version: 1.0.0` to all bundled OAT skills

One-pass update to all bundled `oat-*` skills listed in `packages/cli/scripts/bundle-assets.sh`. Add `version: 1.0.0` after the `name:` line in each SKILL.md frontmatter block. Example result:

```yaml
---
name: oat-project-new
version: 1.0.0
description: Use when creating a new OAT project...
---
```

---

## Phase 2: Version-Aware `oat init tools`

### 2.1 Extend copy-helpers with version awareness

**File:** `packages/cli/src/commands/init/tools/shared/copy-helpers.ts`

Keep existing `CopyStatus` and functions unchanged. Add alongside:

```typescript
export type CopyStatusExtended = CopyStatus | 'outdated';

export interface CopyResult {
  status: CopyStatusExtended;
  installedVersion?: string | null;
  bundledVersion?: string | null;
}
```

New function `copyDirWithVersionCheck(source, destination, force): Promise<CopyResult>`:
- If destination doesn't exist → copy → `{ status: 'copied' }`
- If `force` → delete + recopy → `{ status: 'updated' }`
- If destination exists and `!force`:
  - Read `version` from both `source/SKILL.md` and `destination/SKILL.md` using `getSkillVersion()`
  - Compare using `compareVersions(installedVersion, bundledVersion)`
  - `'outdated'` → return `{ status: 'outdated', installedVersion, bundledVersion }` (do NOT copy yet — the orchestrator handles the update prompt)
  - `'current'` or `'newer'` → return `{ status: 'skipped' }`

### 2.2 Update installer functions

**Files:**
- `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`
- `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`
- `packages/cli/src/commands/init/tools/utility/install-utility.ts`

**Changes to each:**
- Add to result type: `outdatedSkills: Array<{ name: string; installed: string; bundled: string }>`
- Replace `copyDirWithStatus` → `copyDirWithVersionCheck` for skill directory copies only (keep `copyFileWithStatus` for templates, scripts, infra files, agents — these have no version field)
- When `result.status === 'outdated'`, push to `outdatedSkills` array instead of `skippedSkills`
- When `result.status === 'skipped'`, push to `skippedSkills` as before

### 2.3 Update `oat init tools` orchestrator with batch-with-opt-out UX

**File:** `packages/cli/src/commands/init/tools/index.ts`

After the three install functions return, aggregate outdated skills from all results:

1. Show summary grouped by status: new (copied), up-to-date (skipped), outdated (with version info)
2. If outdated skills exist **and interactive**: present `selectManyWithAbort` (from `packages/cli/src/commands/shared/shared.prompts.ts`) with all outdated skills pre-checked
3. User can deselect specific skills to skip updating
4. For selected skills: delete destination dir + recopy from source (same as force update)
5. **Non-interactive mode**: report outdated skills with guidance but do NOT auto-update

Interactive output:
```
Installed: oat-project-new (new)
Up to date: oat-project-spec (1.1.0)
Outdated:
  oat-project-discover  1.0.0 → 1.1.0
  oat-project-implement 1.0.0 → 1.2.0

? Update outdated skills? [arrows + space to toggle]
  ✓ oat-project-discover
  ✓ oat-project-implement
```

Non-interactive output:
```
Outdated (use --force to update):
  oat-project-discover  1.0.0 → 1.1.0
  oat-project-implement 1.0.0 → 1.2.0
```

---

## Phase 3: Skill Removal

### 3.1 Add `oat remove` command group

**New files:**
```
packages/cli/src/commands/remove/
  index.ts                        # Parent command: createRemoveCommand()
  skill/
    index.ts                      # Subcommand: oat remove skill <name>
    remove-skill.ts               # Core removal logic
    remove-skill.test.ts          # Unit tests
  skills/
    index.ts                      # Subcommand: oat remove skills --pack <pack>
    remove-skills.test.ts         # Unit tests
```

**Modify:** `packages/cli/src/commands/index.ts` — add `createRemoveCommand()` to `registerCommands()`.

**Update tests:**
- `packages/cli/src/commands/help-snapshots.test.ts` — update inline snapshots for new `remove` command in help output
- `packages/cli/src/commands/index.test.ts` — add registration test for `remove`

### 3.2 Scope semantics for removal

Default scope is `all` (from `packages/cli/src/app/command-context.ts`). The removal command must handle this explicitly:

- Resolve concrete scopes via `resolveConcreteScopes(context.scope)` (same pattern as doctor/sync)
- For each concrete scope, check if the skill exists at `<scopeRoot>/.agents/skills/<name>/`
- Report per-scope outcomes in output
- In interactive mode: if skill exists in multiple scopes, confirm before removing from each
- In non-interactive mode: dry-run default protects — shows what would be removed per scope without acting

### 3.3 Single skill removal: `oat remove skill <name>`

**Command:** `oat remove skill <name> [--apply]`

**Dependencies interface** (injectable for testing):
```typescript
interface RemoveSkillDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (scope: ConcreteScope, context: CommandContext) => Promise<string>;
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  saveManifest: (manifestPath: string, manifest: Manifest) => Promise<void>;
  loadSyncConfig: (configPath: string) => Promise<SyncConfig>;
  getAdapters: () => ProviderAdapter[];
  getConfigAwareAdapters: (adapters: ProviderAdapter[], scopeRoot: string, config: SyncConfig) => Promise<ConfigAwareAdaptersResult>;
  getSyncMappings: (adapter: ProviderAdapter, scope: Scope) => PathMapping[];
  pathExists: (path: string) => Promise<boolean>;
  removeDirectory: (path: string) => Promise<void>;
}
```

**Flow:**
1. Resolve concrete scopes from context
2. For each scope:
   a. Resolve scope root
   b. Check if `<scopeRoot>/.agents/skills/<name>/` exists — skip scope if not
   c. Load sync config from `<scopeRoot>/.oat/sync/config.json`
   d. Get active adapters via `getConfigAwareAdapters()`
   e. For each adapter, call `getSyncMappings(adapter, scope)` — filter to skill content type mappings
   f. For each mapping, compute provider skill path: `join(scopeRoot, mapping.providerDir, skillName)`
   g. Load manifest from `<scopeRoot>/.oat/sync/manifest.json`
   h. Check each provider path: has manifest entry (managed) vs exists-but-no-entry (unmanaged/stray)
3. **Dry-run (default):** Display per-scope what would be removed:
   - Canonical: `.agents/skills/<name>/`
   - Managed provider views: list each path
   - Unmanaged provider entries: warn (won't be deleted)
   - Manifest entries to be removed
4. **Apply:** Execute removal per scope:
   - Delete canonical directory via `removeDirectory()` (wraps `rm(path, { recursive: true, force: true })`)
   - Delete managed provider view directories
   - Warn about unmanaged provider entries (don't delete)
   - Update manifest: call `removeEntry(manifest, canonicalPath, provider)` for each managed entry, then `saveManifest()`

### 3.4 Pack-level removal: `oat remove skills --pack <pack>`

**Command:** `oat remove skills --pack <ideas|workflows|utility> [--apply]`

**Flow:**
1. Look up pack membership from existing constants:
   - `IDEA_SKILLS` from `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`
   - `WORKFLOW_SKILLS` from `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`
   - `UTILITY_SKILLS` from `packages/cli/src/commands/init/tools/utility/install-utility.ts`
2. Resolve concrete scopes
3. Filter to skills that actually exist in resolved scope(s)
4. If interactive and >3 skills: `confirmAction()` with count
5. Execute same removal logic per skill (reuse the core `removeSkill()` function from `remove-skill.ts`)
6. Aggregate and display summary: removed count, skipped count, warnings

---

## Phase 4: Doctor Integration

### 4.1 Add outdated skills check to `oat doctor`

**File:** `packages/cli/src/commands/doctor/index.ts`

**Changes:**
- Add `resolveAssetsRoot` and `checkSkillVersions` to `DoctorDependencies` interface
- Implement `checkSkillVersions(scopeRoot, assetsRoot)`:
  - Scan `<scopeRoot>/.agents/skills/oat-*/SKILL.md` for version fields using `getSkillVersion()` from `frontmatter.ts`
  - For each found skill, check if it exists in `<assetsRoot>/skills/<name>/SKILL.md` (bundled counterpart)
  - Compare versions using `compareVersions()` from `version.ts`
  - Collect outdated skills
- Add new `DoctorCheck` in `runChecksForScope()`:
  - Name: `${scope}:skill_versions`
  - Description: `Skill versions`
  - `pass` if no outdated skills, `warn` if any found
  - Message: `N skills outdated (run 'oat init tools' to update)` with skill names listed
  - Fix: `Run 'oat init tools' to update outdated skills.`

**Output example:**
```
project:skill_versions    Skill versions              warn
  3 skills outdated (run 'oat init tools' to update)
```

---

## Testing Strategy

Each phase includes unit tests alongside implementation:

**Phase 1:**
- `packages/cli/src/commands/init/tools/shared/version.test.ts`: `parseVersion` and `compareVersions` edge cases — null, empty, `0.0.0`, equal versions, newer/older, malformed strings
- `packages/cli/src/validation/skills.test.ts`: add cases for version format validation — valid semver passes, invalid format produces finding, missing field is OK
- `packages/cli/src/commands/shared/frontmatter.test.ts`: `getSkillVersion` — extracts version, returns null when missing, handles no frontmatter

**Phase 2:**
- `packages/cli/src/commands/init/tools/shared/copy-helpers.test.ts`: `copyDirWithVersionCheck` behavior matrix — new install, force update, outdated (bundled newer), current (same version), newer (installed > bundled), missing version field on either side
- `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts` (and ideas, utility): outdated detection populates `outdatedSkills` array correctly
- `packages/cli/src/commands/init/tools/index.test.ts`: orchestrator handles outdated skills — interactive prompt flow, non-interactive report-only, no outdated (skip prompt), `--force` bypasses version check

**Phase 3:**
- `packages/cli/src/commands/remove/skill/remove-skill.test.ts`: single skill removal — skill exists, skill not found, managed provider entries deleted, unmanaged entries warned, manifest updated, dry-run shows plan, apply executes, multi-scope behavior
- `packages/cli/src/commands/remove/skills/remove-skills.test.ts`: pack removal — valid pack name, invalid pack name, filters to existing skills, confirmation for large packs
- `packages/cli/src/commands/help-snapshots.test.ts`: update inline snapshots for `remove` in help output
- `packages/cli/src/commands/index.test.ts`: `remove` command registered

**Phase 4:**
- `packages/cli/src/commands/doctor/index.test.ts`: skill version check — no outdated (pass), some outdated (warn with list), no skills installed (pass), bundled asset not found for a skill (skip comparison)

## Key Files Reference

| File | Role |
|---|---|
| `packages/cli/src/commands/shared/frontmatter.ts` | Frontmatter parsing — add `getSkillVersion()` |
| `packages/cli/src/validation/skills.ts` | Skill validation — add version format check |
| `packages/cli/src/commands/init/tools/shared/copy-helpers.ts` | Copy logic — add `copyDirWithVersionCheck()` |
| `packages/cli/src/commands/init/tools/shared/version.ts` | **New:** version comparison utility |
| `packages/cli/src/commands/init/tools/index.ts` | Init tools orchestrator — add update UX |
| `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` | Workflow installer — use version check |
| `packages/cli/src/commands/init/tools/ideas/install-ideas.ts` | Ideas installer — use version check |
| `packages/cli/src/commands/init/tools/utility/install-utility.ts` | Utility installer — use version check |
| `packages/cli/src/commands/remove/` | **New:** remove command group |
| `packages/cli/src/commands/index.ts` | Command registration — add `remove` |
| `packages/cli/src/commands/doctor/index.ts` | Doctor — add version check |
| `packages/cli/src/providers/shared/adapter.types.ts` | `PathMapping`, `ProviderAdapter` interfaces |
| `packages/cli/src/providers/shared/adapter.utils.ts` | `getSyncMappings()`, `getConfigAwareAdapters()` |
| `packages/cli/src/manifest/manager.ts` | `loadManifest`, `saveManifest`, `removeEntry`, `findEntry` |
| `packages/cli/src/commands/shared/shared.prompts.ts` | `selectManyWithAbort` for batch-with-opt-out |
| `packages/cli/src/commands/help-snapshots.test.ts` | Help snapshot assertions — update for `remove` |
| `packages/cli/scripts/bundle-assets.sh` | Lists all bundled skills — reference for Phase 1.3 |

## Verification

After implementation, verify end-to-end:
1. `pnpm build && pnpm test` — all tests pass (including help snapshots)
2. `pnpm lint && pnpm type-check` — clean
3. Install skills to a test directory, manually downgrade a version in a SKILL.md, run `oat init tools` — should detect and offer update
4. Run `oat init tools --no-interactive` — should report outdated but NOT auto-update
5. `oat remove skill oat-idea-scratchpad` — dry-run should show what would be removed per scope
6. `oat remove skill oat-idea-scratchpad --apply` — should remove canonical + managed provider views + update manifest
7. `oat remove skills --pack ideas` — should list all idea skills and confirm before dry-run
8. `oat doctor` — should report outdated skills if present
