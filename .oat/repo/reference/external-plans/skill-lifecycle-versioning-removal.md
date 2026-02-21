# Skill Lifecycle: Versioning + Removal

## Context

`oat init tools` currently checks only file existence when installing skills. If a skill directory exists, it skips it -- users have no way to know their installed skills are outdated without using `--force` to blindly overwrite. Similarly, there's no CLI command to remove skills; users must manually delete directories and run sync.

This project adds two features that complete the skill lifecycle:
1. **Skill versioning**: `version` field in SKILL.md frontmatter + version-aware update detection in `oat init tools`
2. **Skill removal**: `oat remove skill <name>` and `oat remove skills --pack <pack>` with provider view cleanup
3. **Doctor integration**: Surface outdated skills in `oat doctor` output

Backlog items: B14 (skill uninstall) + skill versioning (inbox item).

---

## Phase 1: Version Infrastructure

### 1.1 Add `version` field to frontmatter parsing

**Files:**
- `packages/cli/src/commands/shared/frontmatter.ts` -- add `getSkillVersion()` helper
- `packages/cli/src/validation/skills.ts` -- add optional `version` format validation (valid semver when present)

**Changes to `frontmatter.ts`:**
- Add function `getSkillVersion(skillDir: string): Promise<string | null>` that reads SKILL.md, extracts frontmatter, returns `version` field value or `null`

**Changes to `skills.ts`:**
- Add validation: if `version` key is present, value must be valid semver (use regex, no external dependency needed: `/^\d+\.\d+\.\d+$/`)
- Do NOT require the field -- only validate format when present

### 1.2 Add version comparison utility

**New file:** `packages/cli/src/commands/init/tools/shared/version.ts`

```typescript
export function compareVersions(installed: string | null, bundled: string | null): 'outdated' | 'current' | 'newer'
export function parseVersion(version: string | null): [number, number, number]
```

- `null` or empty → treated as `[0, 0, 0]`
- Simple numeric comparison (major, minor, patch) -- no need for a semver library
- Returns `'outdated'` when bundled > installed, `'current'` when equal, `'newer'` when installed > bundled

### 1.3 Add `version: 1.0.0` to all bundled OAT skills

One-pass update to all bundled `oat-*` skills listed in `packages/cli/scripts/bundle-assets.sh`. Add `version: 1.0.0` after the `name:` line in each SKILL.md frontmatter block.

---

## Phase 2: Version-Aware `oat init tools`

### 2.1 Extend copy-helpers with version awareness

**File:** `packages/cli/src/commands/init/tools/shared/copy-helpers.ts`

Add new `CopyStatus` value: `'outdated'`

New type:
```typescript
export type CopyStatusExtended = CopyStatus | 'outdated';
export interface CopyResult {
  status: CopyStatusExtended;
  installedVersion?: string | null;
  bundledVersion?: string | null;
}
```

New function: `copyDirWithVersionCheck(source, destination, force): Promise<CopyResult>`
- If destination doesn't exist → copy → `{ status: 'copied' }`
- If `force` → delete + recopy → `{ status: 'updated' }`
- If destination exists: read both SKILL.md versions, compare
  - Bundled newer → `{ status: 'outdated', installedVersion, bundledVersion }`
  - Same or installed newer → `{ status: 'skipped' }`
  - Either missing version → treat as `0.0.0` (always outdated relative to a versioned bundled skill)

### 2.2 Update installer functions

**Files:**
- `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`
- `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`
- `packages/cli/src/commands/init/tools/utility/install-utility.ts`

**Changes:**
- Add `outdatedSkills: Array<{ name: string; installed: string; bundled: string }>` to result types
- Replace `copyDirWithStatus` → `copyDirWithVersionCheck` for skill directories (keep `copyFileWithStatus` for non-skill files like templates, scripts, infra)
- Collect outdated skills separately from skipped skills

### 2.3 Update `oat init tools` orchestrator with batch-with-opt-out UX

**File:** `packages/cli/src/commands/init/tools/index.ts`

After install functions return, check for outdated skills:
1. Show summary: new skills (copied), up-to-date (skipped), outdated (with version info)
2. If outdated skills exist and interactive: present `selectManyWithAbort` prompt with all outdated skills pre-checked
3. User can deselect specific skills to skip updating
4. Update selected skills (delete + recopy)
5. **Non-interactive mode: report outdated skills but do NOT auto-update** (preserves current non-destructive behavior; require `--force` to update in non-interactive contexts)

Output format:
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

Non-interactive output (no auto-update):
```
Outdated (use --force to update):
  oat-project-discover  1.0.0 → 1.1.0
  oat-project-implement 1.0.0 → 1.2.0
```

---

## Phase 3: Skill Removal

### 3.1 Add `oat remove` command group

**New files:**
- `packages/cli/src/commands/remove/index.ts` -- parent command registration
- `packages/cli/src/commands/remove/skill/index.ts` -- single skill removal
- `packages/cli/src/commands/remove/skill/remove-skill.ts` -- removal logic
- `packages/cli/src/commands/remove/skills/index.ts` -- pack-level removal

**Registration:** Add `createRemoveCommand()` to `packages/cli/src/commands/index.ts`

**Test registration:** Update `packages/cli/src/commands/help-snapshots.test.ts` inline snapshots and `packages/cli/src/commands/index.test.ts` for the new `remove` command group.

### 3.2 Scope semantics for removal

**Default scope behavior (`--scope all`):**
- Resolve concrete scopes via `resolveConcreteScopes()` (same as doctor/sync)
- For each concrete scope, check if the skill exists and report per-scope outcomes
- In interactive mode: if skill exists in multiple scopes, confirm before removing from each
- In non-interactive mode: report what would be removed per scope (dry-run default protects here)

### 3.3 Single skill removal: `oat remove skill <name>`

**Command:** `oat remove skill <name> [--apply]`

**Flow:**
1. Resolve concrete scopes from context
2. For each scope, resolve `<scopeRoot>/.agents/skills/<name>/`
3. Skip scopes where skill doesn't exist
4. Resolve provider views using `getSyncMappings()` from `packages/cli/src/providers/shared/adapter.utils.ts`:
   - Get active adapters via `getConfigAwareAdapters()` (from `adapter.utils.ts:27`)
   - For each adapter, call `getSyncMappings(adapter, scope)` (from `adapter.utils.ts:70`)
   - Filter to mappings where `contentType === 'skill'` and `nativeRead === false` (sync-managed only; `getSyncMappings` already filters nativeRead)
   - Compute provider skill path: `join(scopeRoot, mapping.providerDir, skillName)`
5. Load manifest, find all entries where `canonicalPath` matches `.agents/skills/<name>` for each provider
6. **Dry-run (default):** Display what would be removed per scope:
   - Canonical: `.agents/skills/<name>/`
   - Provider views: list each provider path (note managed vs unmanaged)
   - Manifest entries to be removed
7. **Apply:** Execute removal:
   - Delete canonical directory
   - Delete managed provider view entries only
   - Warn about unmanaged provider entries (don't delete, tell user)
   - Update manifest via `removeEntry()` (from `packages/cli/src/manifest/manager.ts:120`) and `saveManifest()` (from `manager.ts:80`)

**Dependencies interface** follows established pattern (injectable for testing):
```typescript
interface RemoveSkillDependencies {
  buildCommandContext, resolveScopeRoot, loadManifest, saveManifest,
  loadSyncConfig, getAdapters, getConfigAwareAdapters, getSyncMappings,
  pathExists, removeDirectory
}
```

### 3.4 Pack-level removal: `oat remove skills --pack <pack>`

**Command:** `oat remove skills --pack <ideas|workflows|utility> [--apply]`

**Flow:**
1. Look up pack membership from existing constants:
   - `IDEA_SKILLS` (from `install-ideas.ts:7`)
   - `WORKFLOW_SKILLS` (from `install-workflows.ts:9`)
   - `UTILITY_SKILLS` (from `install-utility.ts`)
2. Filter to skills that actually exist in resolved scope(s)
3. Interactive confirmation if >3 skills
4. Execute same removal logic per skill (reuse `removeSkill()`)
5. Summary output

---

## Phase 4: Doctor Integration

### 4.1 Add outdated skills check to `oat doctor`

**File:** `packages/cli/src/commands/doctor/index.ts`

**Changes:**
- Add new dependency: `checkSkillVersions(scopeRoot, assetsRoot): Promise<OutdatedSkillInfo[]>`
- Add `resolveAssetsRoot` to `DoctorDependencies` interface
- Add new check in `runChecksForScope()`:
  - Scan `.agents/skills/oat-*/SKILL.md` for version fields (reuse `getSkillVersion()` from `frontmatter.ts`)
  - Compare against bundled asset versions (from `resolveAssetsRoot()`)
  - Report as `warn` if outdated skills found, `pass` if all current
  - Include fix message: `Run 'oat init tools' to update`

**Output:**
```
project:skill_versions    Skill versions              warn
  3 skills outdated (run 'oat init tools' to update)
```

---

## Testing Strategy

Each phase includes unit tests alongside implementation:

**Phase 1:**
- `version.test.ts`: version comparison edge cases (null, 0.0.0, equal, newer, older, malformed)
- `skills.test.ts`: version format validation (valid semver passes, invalid fails, missing field ok)
- `frontmatter.test.ts`: `getSkillVersion` extraction

**Phase 2:**
- `copy-helpers.test.ts`: `copyDirWithVersionCheck` behavior matrix (new, force, outdated, current, missing version)
- `install-workflows.test.ts` (and ideas/utility): outdated detection and result collection
- `init/tools/index.test.ts`: orchestrator batch-with-opt-out flow (interactive + non-interactive paths, non-interactive report-only behavior)

**Phase 3:**
- `remove-skill.test.ts`: single skill removal (exists/not-exists, managed/unmanaged provider entries, dry-run/apply, multi-scope behavior)
- `remove-skills.test.ts`: pack removal with filtering
- `help-snapshots.test.ts`: update inline snapshots for new `remove` command
- `index.test.ts`: command registration for `remove`

**Phase 4:**
- `doctor/index.test.ts`: outdated skills check (none outdated, some outdated, no skills installed)

## Key Files Reference

| File | Role |
|---|---|
| `packages/cli/src/commands/shared/frontmatter.ts` | Frontmatter parsing (add `getSkillVersion`) |
| `packages/cli/src/validation/skills.ts` | Skill validation (add version format check) |
| `packages/cli/src/commands/init/tools/shared/copy-helpers.ts` | Copy logic (add version-aware variant) |
| `packages/cli/src/commands/init/tools/shared/version.ts` | **New:** version comparison utility |
| `packages/cli/src/commands/init/tools/index.ts` | Init tools orchestrator (add update UX) |
| `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` | Workflow installer (use version check) |
| `packages/cli/src/commands/init/tools/ideas/install-ideas.ts` | Ideas installer (use version check) |
| `packages/cli/src/commands/init/tools/utility/install-utility.ts` | Utility installer (use version check) |
| `packages/cli/src/commands/remove/` | **New:** remove command group |
| `packages/cli/src/commands/index.ts` | Command registration (add remove) |
| `packages/cli/src/commands/doctor/index.ts` | Doctor (add version check) |
| `packages/cli/src/providers/shared/adapter.types.ts` | `PathMapping`, `ProviderAdapter` interfaces |
| `packages/cli/src/providers/shared/adapter.utils.ts` | `getSyncMappings()`, `getConfigAwareAdapters()` |
| `packages/cli/src/manifest/manager.ts` | `loadManifest`, `saveManifest`, `removeEntry`, `findEntry` |
| `packages/cli/src/commands/shared/shared.prompts.ts` | `selectManyWithAbort` for batch-with-opt-out |
| `packages/cli/src/commands/help-snapshots.test.ts` | Help snapshot assertions (update for remove) |

## Verification

After implementation, verify end-to-end:
1. `pnpm build && pnpm test` -- all tests pass (including help snapshots)
2. `pnpm lint && pnpm type-check` -- clean
3. Install skills to a test directory, manually downgrade a version, run `oat init tools` -- should detect and offer update
4. Run `oat init tools` with `--no-interactive` -- should report outdated but NOT auto-update
5. `oat remove skill oat-idea-scratchpad` -- dry-run should show what would be removed per scope
6. `oat remove skill oat-idea-scratchpad --apply` -- should remove canonical + managed provider views
7. `oat doctor` -- should report outdated skills if present
