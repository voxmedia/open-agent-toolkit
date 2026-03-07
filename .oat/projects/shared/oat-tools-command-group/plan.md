---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-07
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ["p05"]
oat_plan_source: spec-driven
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: oat-tools-command-group

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Introduce a unified `oat tools` command group with install, update, remove, list, outdated, and info subcommands, plus auto-sync after mutations.

**Architecture:** New `commands/tools/` module with scan engine + update engine as core logic, thin wrappers for install/remove delegating to existing code, and auto-sync integration via existing sync pipeline.

**Tech Stack:** TypeScript ESM, Commander.js, Vitest, pnpm workspace tooling.

**Commit Convention:** `feat(p{NN}-t{NN}): {description}`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Scan Engine + Read-Only Commands

### Task p01-t01: Create tools command group skeleton and register it

**Files:**
- Create: `packages/cli/src/commands/tools/index.ts`
- Modify: `packages/cli/src/commands/index.ts`

**Step 1: Write test (RED)**

Add help snapshot test for `oat tools --help` in `packages/cli/src/commands/help-snapshots.test.ts`.

Run: `pnpm --filter @oat/cli test -- --run src/commands/help-snapshots.test.ts`
Expected: Test fails (new snapshot doesn't exist yet)

**Step 2: Implement (GREEN)**

```typescript
// packages/cli/src/commands/tools/index.ts
import { Command } from 'commander';

export function createToolsCommand(): Command {
  return new Command('tools')
    .description('Manage OAT tool packs (install, update, remove, list)');
}
```

Register in `packages/cli/src/commands/index.ts`:
```typescript
import { createToolsCommand } from './tools';
// ... in registerCommands():
program.addCommand(createToolsCommand());
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/help-snapshots.test.ts`
Expected: Update snapshot, test passes

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/index.ts packages/cli/src/commands/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t01): create tools command group skeleton"
```

---

### Task p01-t02: Implement scan engine

**Files:**
- Create: `packages/cli/src/commands/tools/shared/scan-tools.ts`
- Create: `packages/cli/src/commands/tools/shared/scan-tools.test.ts`
- Create: `packages/cli/src/commands/tools/shared/types.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/tools/shared/scan-tools.test.ts
describe('scanTools', () => {
  it('finds installed skills with version and pack membership', async () => { /* ... */ });
  it('finds installed agents in project scope', async () => { /* ... */ });
  it('marks custom skills as pack=custom', async () => { /* ... */ });
  it('compares versions and sets correct status', async () => { /* ... */ });
  it('skips agents in user scope', async () => { /* ... */ });
  it('handles missing bundled asset gracefully (not-bundled)', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/shared/scan-tools.test.ts`
Expected: Tests fail

**Step 2: Implement (GREEN)**

Define types in `types.ts`:
```typescript
import type { ConcreteScope } from '@shared/types';

export type PackName = 'ideas' | 'workflows' | 'utility';

export interface ToolInfo {
  name: string;
  type: 'skill' | 'agent';
  scope: ConcreteScope;
  version: string | null;
  bundledVersion: string | null;
  pack: PackName | 'custom';
  status: 'current' | 'outdated' | 'newer' | 'not-bundled';
}
```

Implement `scanTools` in `scan-tools.ts`:
- Read directories under `.agents/skills/` in scope root
- For project scope, also read `.agents/agents/` for agent `.md` files
- For each tool, read version via `getSkillVersion` (skills) or `parseFrontmatterField` (agents)
- Determine pack membership by checking against `IDEA_SKILLS`, `WORKFLOW_SKILLS`, `UTILITY_SKILLS`, `WORKFLOW_AGENTS`
- Compare with bundled version from assets root
- Return `ToolInfo[]`

DI pattern: `ScanToolsDependencies` interface with defaults for filesystem and version operations.

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/shared/scan-tools.test.ts`
Expected: Tests pass

**Step 3: Refactor**

Extract pack-membership lookup into a helper function for reuse.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/shared/
git commit -m "feat(p01-t02): implement scan engine for installed tools"
```

---

### Task p01-t03: Implement `oat tools list` command

**Files:**
- Create: `packages/cli/src/commands/tools/list/index.ts`
- Create: `packages/cli/src/commands/tools/list/list-tools.ts`
- Create: `packages/cli/src/commands/tools/list/list-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/tools/list/list-tools.test.ts
describe('runListTools', () => {
  it('lists all tools across scopes with version and status', async () => { /* ... */ });
  it('filters by scope when --scope is specified', async () => { /* ... */ });
  it('outputs JSON when --json is set', async () => { /* ... */ });
  it('shows custom tools with pack=custom', async () => { /* ... */ });
  it('shows empty message when no tools installed', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/list/list-tools.test.ts`
Expected: Tests fail

**Step 2: Implement (GREEN)**

- Command factory: `createToolsListCommand()` → `Command('list')`
- Options: `--scope <scope>`, `--json`
- Handler calls `scanTools` for each concrete scope, collects results
- Text output: formatted table with columns: `name | type | version | pack | scope | status`
- JSON output: `{ tools: ToolInfo[] }`

Wire into `createToolsCommand()` via `.addCommand(createToolsListCommand())`.

Add help snapshot test for `oat tools list --help`.

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/list/list-tools.test.ts src/commands/help-snapshots.test.ts`
Expected: Tests pass

**Step 3: Refactor**

Extract table formatting into a shared formatter if needed.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/list/ packages/cli/src/commands/tools/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t03): implement oat tools list command"
```

---

### Task p01-t04: Implement `oat tools outdated` command

**Files:**
- Create: `packages/cli/src/commands/tools/outdated/index.ts`
- Create: `packages/cli/src/commands/tools/outdated/outdated-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('runOutdatedTools', () => {
  it('shows only outdated tools', async () => { /* ... */ });
  it('shows empty message when all tools are current', async () => { /* ... */ });
  it('outputs JSON when --json is set', async () => { /* ... */ });
  it('respects --scope filter', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/outdated/outdated-tools.test.ts`
Expected: Tests fail

**Step 2: Implement (GREEN)**

- Thin wrapper: uses `scanTools` then filters to `status === 'outdated'`
- Same table format as `list` but only outdated rows
- Shows installed version → bundled version
- Exit code 0 always (informational)

Wire into `createToolsCommand()`.

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/outdated/outdated-tools.test.ts src/commands/help-snapshots.test.ts`
Expected: Tests pass

**Step 3: Refactor**

None needed — filter + display.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/outdated/ packages/cli/src/commands/tools/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t04): implement oat tools outdated command"
```

---

### Task p01-t05: Implement `oat tools info <name>` command

**Files:**
- Create: `packages/cli/src/commands/tools/info/index.ts`
- Create: `packages/cli/src/commands/tools/info/info-tool.ts`
- Create: `packages/cli/src/commands/tools/info/info-tool.test.ts`
- Modify: `packages/cli/src/commands/tools/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('runInfoTool', () => {
  it('displays full details for an installed skill', async () => { /* ... */ });
  it('displays full details for an installed agent', async () => { /* ... */ });
  it('shows update available when outdated', async () => { /* ... */ });
  it('reports error when tool not found', async () => { /* ... */ });
  it('outputs JSON when --json is set', async () => { /* ... */ });
  it('searches across scopes when --scope is all', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/info/info-tool.test.ts`
Expected: Tests fail

**Step 2: Implement (GREEN)**

- Command: `oat tools info <name>` with required positional argument
- Options: `--scope <scope>`, `--json`
- Reads full frontmatter from SKILL.md (skills) or agent .md file
- Displays: name, type, version, pack, scope, status, description, argument-hint, allowed-tools, user-invocable
- For agents: name, version, description, tools, color
- Shows "Update available: X.Y.Z → A.B.C" when outdated
- Exit code 1 if tool not found

```typescript
interface ToolDetail extends ToolInfo {
  description: string | null;
  argumentHint: string | null;
  allowedTools: string | null;
  userInvocable: boolean;
}
```

Wire into `createToolsCommand()`.

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/info/info-tool.test.ts src/commands/help-snapshots.test.ts`
Expected: Tests pass

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/info/ packages/cli/src/commands/tools/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t05): implement oat tools info command"
```

---

## Phase 2: Update Engine + Auto-Sync

### Task p02-t01: Implement auto-sync helper

**Files:**
- Create: `packages/cli/src/commands/tools/shared/auto-sync.ts`
- Create: `packages/cli/src/commands/tools/shared/auto-sync.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('autoSync', () => {
  it('triggers sync apply for affected scopes', async () => { /* ... */ });
  it('catches sync failures and logs warning', async () => { /* ... */ });
  it('skips sync when no scopes provided', async () => { /* ... */ });
  it('includes sync result in return value', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/shared/auto-sync.test.ts`
Expected: Tests fail

**Step 2: Implement (GREEN)**

- Construct a `CommandContext` with `apply: true`, `interactive: false`, matching scope
- Call existing sync pipeline: reuse `computePlans` + `runSyncApply` from sync module
- Wrap in try/catch — sync failures logged as warnings, not thrown
- Return sync result for JSON output inclusion
- DI: `AutoSyncDependencies` interface with sync pipeline functions

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/shared/auto-sync.test.ts`
Expected: Tests pass

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/shared/auto-sync.ts packages/cli/src/commands/tools/shared/auto-sync.test.ts
git commit -m "feat(p02-t01): implement auto-sync helper for tool mutations"
```

---

### Task p02-t02: Implement update engine

**Files:**
- Create: `packages/cli/src/commands/tools/update/update-tools.ts`
- Create: `packages/cli/src/commands/tools/update/update-tools.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('updateTools', () => {
  it('updates a single outdated skill by name', async () => { /* ... */ });
  it('updates a single outdated agent by name', async () => { /* ... */ });
  it('reports current tool without copying', async () => { /* ... */ });
  it('reports newer tool without copying', async () => { /* ... */ });
  it('errors when tool name not found', async () => { /* ... */ });
  it('updates all outdated tools in a pack', async () => { /* ... */ });
  it('updates all outdated tools when --all', async () => { /* ... */ });
  it('dry-run reports without copying', async () => { /* ... */ });
  it('respects scope constraints (workflows project-only)', async () => { /* ... */ });
  it('copies skill directories with force=true', async () => { /* ... */ });
  it('copies agent files with force=true', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/update/update-tools.test.ts`
Expected: Tests fail

**Step 2: Implement (GREEN)**

Core logic:
1. Resolve target set from `UpdateTarget` (name → find in scan results; pack → filter by pack; all → everything)
2. Run `scanTools` for each concrete scope
3. Filter to targets that are `outdated`
4. If not dry-run: for skills, `copyDirWithStatus(source, dest, true)`; for agents, `copyFileWithStatus(source, dest, true)`
5. Return `UpdateResult` with categorized tools

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
```

DI: `UpdateToolsDependencies` interface including scan engine, copy helpers, scope/asset resolution.

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/update/update-tools.test.ts`
Expected: Tests pass

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/update/update-tools.ts packages/cli/src/commands/tools/update/update-tools.test.ts
git commit -m "feat(p02-t02): implement update engine for tools"
```

---

### Task p02-t03: Implement `oat tools update` command

**Files:**
- Create: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/tools/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Add help snapshot test for `oat tools update --help`.

Run: `pnpm --filter @oat/cli test -- --run src/commands/help-snapshots.test.ts`
Expected: Test fails

**Step 2: Implement (GREEN)**

- Command factory: `createToolsUpdateCommand()` → `Command('update')`
- Argument: `[name]` optional positional
- Options: `--pack <pack>`, `--all`, `--dry-run`, `--no-sync`, `--scope <scope>`, `--json`
- Validates mutual exclusion: exactly one of name, --pack, --all
- Calls `updateTools` engine
- If mutations occurred and not dry-run and not --no-sync: calls `autoSync`
- Text output: table of results + summary
- JSON output: `{ target, results: UpdateResult, sync?: SyncResult }`

Wire into `createToolsCommand()`.

Run: `pnpm --filter @oat/cli test -- --run src/commands/help-snapshots.test.ts`
Expected: Tests pass

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/update/index.ts packages/cli/src/commands/tools/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p02-t03): implement oat tools update command"
```

---

## Phase 3: Install + Remove Wrappers

### Task p03-t01: Implement `oat tools install` command

**Files:**
- Create: `packages/cli/src/commands/tools/install/index.ts`
- Modify: `packages/cli/src/commands/tools/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Add help snapshot test for `oat tools install --help`.

Run: `pnpm --filter @oat/cli test -- --run src/commands/help-snapshots.test.ts`
Expected: Test fails

**Step 2: Implement (GREEN)**

- Delegates to existing `runInitTools` logic from `commands/init/tools/`
- Same pack selection, scope handling, and install behavior
- After successful install (not dry-run): calls `autoSync`
- Option: `--no-sync` to skip auto-sync
- Reuses `InitToolsDependencies` interface with same defaults

Wire into `createToolsCommand()`.

Run: `pnpm --filter @oat/cli test -- --run src/commands/help-snapshots.test.ts`
Expected: Tests pass

**Step 3: Refactor**

Consider extracting `runInitTools` from `commands/init/tools/index.ts` into a shared location if the import path is awkward. Otherwise keep direct import.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/install/ packages/cli/src/commands/tools/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p03-t01): implement oat tools install command"
```

---

### Task p03-t02: Implement `oat tools remove` command

**Files:**
- Create: `packages/cli/src/commands/tools/remove/index.ts`
- Create: `packages/cli/src/commands/tools/remove/remove-tools.ts`
- Create: `packages/cli/src/commands/tools/remove/remove-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('runRemoveTools', () => {
  it('removes a single skill by name via runRemoveSkill', async () => { /* ... */ });
  it('removes a single agent by name by deleting its .md file', async () => { /* ... */ });
  it('removes all tools in a pack (skills via runRemoveSkill, agents via file deletion)', async () => { /* ... */ });
  it('removes all tools with --all (both skills and agents)', async () => { /* ... */ });
  it('dry-run previews removal without deleting', async () => { /* ... */ });
  it('triggers auto-sync after removal', async () => { /* ... */ });
  it('skips auto-sync when --no-sync', async () => { /* ... */ });
  it('cleans up agent provider views after agent removal', async () => { /* ... */ });
  it('errors when tool name not found in any scope', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/remove/remove-tools.test.ts`
Expected: Tests fail

**Step 2: Implement (GREEN)**

- Command: `oat tools remove [name]` with `--pack`, `--all`, `--dry-run`, `--no-sync`
- Use `scanTools` to resolve the target tool and determine its type (skill vs agent)
- **Skill removal:** delegates to `runRemoveSkill` with `apply = !dryRun`
- **Agent removal:** deletes the agent `.md` file from `.agents/agents/` in the scope root, then removes any synced provider-view files for that agent
- Pack: iterates pack members — skills through `runRemoveSkill`, agents through agent file deletion
- All: iterates all packs (both skill and agent members)
- After successful removals and not dry-run and not --no-sync: calls `autoSync`
- Validates mutual exclusion: exactly one of name, --pack, --all
- DI: `RemoveToolsDependencies` interface with scan engine, `runRemoveSkill`, file-system delete, and provider-view cleanup

Wire into `createToolsCommand()`.

Add help snapshot test.

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/remove/remove-tools.test.ts src/commands/help-snapshots.test.ts`
Expected: Tests pass

**Step 3: Refactor**

Extract agent removal helper if logic is reusable across single/pack/all paths.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/remove/ packages/cli/src/commands/tools/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p03-t02): implement oat tools remove command"
```

---

## Phase 4: Agent Versioning

### Task p04-t01: Add version frontmatter to bundled agents

**Files:**
- Modify: `.agents/agents/oat-codebase-mapper.md` (source of truth)
- Modify: `.agents/agents/oat-reviewer.md` (source of truth)

**Step 1: Write test (RED)**

No test needed — this is a content change. Verify by reading version after change.

**Step 2: Implement (GREEN)**

Add `version: 1.0.0` to frontmatter of both source agent files in `.agents/agents/`.

These are the source-of-truth files; `packages/cli/assets/agents/` is generated from them by `packages/cli/scripts/bundle-assets.sh`.

**Step 3: Verify asset regeneration**

Rebuild bundled assets and confirm the version frontmatter propagates:
```bash
pnpm --filter @oat/cli run bundle-assets
```
Check that `packages/cli/assets/agents/oat-codebase-mapper.md` and `packages/cli/assets/agents/oat-reviewer.md` now contain `version: 1.0.0` in their frontmatter.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/agents/ packages/cli/assets/agents/
git commit -m "feat(p04-t01): add version frontmatter to bundled agents"
```

---

### Task p04-t02: Generalize version reading for agents

**Files:**
- Modify: `packages/cli/src/commands/shared/frontmatter.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.ts`

**Step 1: Write test (RED)**

Add test case to existing frontmatter tests:
```typescript
it('reads version from agent .md file', async () => { /* ... */ });
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/shared/frontmatter.test.ts`
Expected: Test fails (if new function) or passes (if using existing parseFrontmatterField)

**Step 2: Implement (GREEN)**

Add `getAgentVersion` function:
- Reads `version` from the agent `.md` file directly via `parseFrontmatterField`
- Returns `string | null` matching `getSkillVersion` signature

Update scan engine to use version-based comparison for agents instead of always `not-bundled`.

Run: `pnpm --filter @oat/cli test -- --run src/commands/shared/frontmatter.test.ts src/commands/tools/shared/scan-tools.test.ts`
Expected: Tests pass

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/shared/frontmatter.ts packages/cli/src/commands/tools/shared/scan-tools.ts
git commit -m "feat(p04-t02): generalize version reading for agents"
```

---

## Phase 5: Final Integration

### Task p05-t01: Integration verification and snapshot updates

**Files:**
- Modify: `packages/cli/src/commands/help-snapshots.test.ts` (update any remaining snapshots)

**Step 1: Write test (RED)**

Run full test suite to identify any failures.

Run: `pnpm --filter @oat/cli test`
Expected: Note any failures

**Step 2: Implement (GREEN)**

Fix any snapshot mismatches or test issues found in step 1.

**Step 3: Refactor**

Review all new code for consistency with CLI conventions:
- Import paths use `./` for local, aliases for external
- No `console.*` calls
- Logger used throughout
- Exit codes correct

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm --filter @oat/cli test`
Expected: All pass (note: pre-existing `edge-cases.test.ts` failure is unrelated)

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(p05-t01): finalize oat tools integration and snapshots"
```

### Task p05-t02: (review) Fix project scope resolution in all tools subcommands

**Files:**
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.ts` (ScanToolsOptions)
- Modify: `packages/cli/src/commands/tools/update/update-tools.ts` (UpdateToolsDependencies)
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.ts` (RemoveToolsDependencies)
- Modify: `packages/cli/src/commands/tools/list/index.ts` (default deps)
- Modify: `packages/cli/src/commands/tools/outdated/index.ts` (default deps)
- Modify: `packages/cli/src/commands/tools/info/index.ts` (default deps)
- Modify: `packages/cli/src/commands/tools/update/index.ts` (default deps)
- Modify: `packages/cli/src/commands/tools/remove/index.ts` (default deps)

**Step 1: Understand the issue**

Review finding: `resolveScopeRoot('project', cwd, home)` returns `resolve(cwd)` which is wrong when invoked from a subdirectory. Existing commands use `resolveProjectRoot(context.cwd)` which walks up to the `.git` root. All tools subcommands have this bug.

**Step 2: Write test (RED)**

Add test to scan-tools or a shared test that verifies scope root resolution uses project root, not cwd.

**Step 3: Implement fix (GREEN)**

Make the `resolveScopeRoot` dependency async and update the default implementation in each command's index.ts to call `resolveProjectRoot(cwd)` for project scope. Update engine call sites to `await`.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test -- --run && pnpm type-check`
Expected: All pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/
git commit -m "fix(p05-t02): resolve project scope from repo root in tools commands"
```

---

### Task p05-t03: (review) Fix JSON early-return in update command

**Files:**
- Modify: `packages/cli/src/commands/tools/update/index.ts`

**Step 1: Understand the issue**

Review finding: The `--json` branch at line 96 returns immediately, skipping the `notInstalled` error check (exit code 1) and the `autoSync()` call.

**Step 2: Implement fix**

Move JSON output to after error handling and auto-sync. Only the output format should differ, not the behavioral semantics.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run && pnpm type-check`
Expected: All pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/update/index.ts
git commit -m "fix(p05-t03): preserve error handling and auto-sync in JSON mode for update"
```

---

### Task p05-t04: (review) Fix JSON early-return in remove command

**Files:**
- Modify: `packages/cli/src/commands/tools/remove/index.ts`

**Step 1: Understand the issue**

Review finding: Same pattern as update — JSON branch returns before error handling and auto-sync.

**Step 2: Implement fix**

Move JSON output to after error handling and auto-sync. Mirror the fix from p05-t03.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run && pnpm type-check`
Expected: All pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/remove/index.ts
git commit -m "fix(p05-t04): preserve error handling and auto-sync in JSON mode for remove"
```

### Task p05-t05: (review) Add auto-sync to oat tools install

**Files:**
- Modify: `packages/cli/src/commands/tools/install/index.ts`

**Step 1: Understand the issue**

Review finding: `oat tools install` reuses `createInitToolsCommand()` verbatim, inheriting the legacy behavior that prints manual sync reminders instead of auto-syncing. FR9 requires auto-sync after install, with a `--no-sync` escape hatch.

**Step 2: Implement fix**

Instead of just renaming the init tools command, wrap it to intercept completion and add auto-sync. The install command should:
1. Create the init tools command and add a `--no-sync` option
2. After successful install, determine which scopes were affected (project and/or user)
3. Call `autoSync()` for those scopes unless `--no-sync` is set

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run && pnpm type-check`
Expected: All pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/install/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "fix(p05-t05): add auto-sync to oat tools install"
```

---

### Task p05-t06: (review) Route agent scanning through DI and add positive test

**Files:**
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.test.ts`

**Step 1: Understand the issue**

Review finding: The scan engine uses the injected `deps.readdir` for skills but calls `node:fs/promises.readdir` directly for agents. The test asserts `[]` from a non-existent path instead of verifying real agent discovery.

**Step 2: Implement fix**

- Add a `readdirFiles` dependency to `ScanToolsDependencies` for reading agent files
- Route agent file listing through this dependency instead of calling `readdir` directly
- Add a positive test that proves agent discovery through the DI interface

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run src/commands/tools/shared/scan-tools.test.ts && pnpm type-check`
Expected: All pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/shared/scan-tools.ts packages/cli/src/commands/tools/shared/scan-tools.test.ts
git commit -m "fix(p05-t06): route agent scanning through DI and add positive test"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| p05 | code | pending | - | - |
| final | code | passed | 2026-03-07 | reviews/final-review-2026-03-07.md |
| plan | artifact | passed | 2026-03-07 | reviews/plan-review-2026-03-07.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1: 5 tasks - Scan engine, list, outdated, info commands
- Phase 2: 3 tasks - Auto-sync helper, update engine, update command
- Phase 3: 2 tasks - Install and remove wrappers
- Phase 4: 2 tasks - Agent versioning
- Phase 5: 6 tasks - Final integration verification + 5 review fix tasks

**Total: 18 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
