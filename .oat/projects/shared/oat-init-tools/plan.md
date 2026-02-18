---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-18
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["p06"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/.claude/plans/reactive-tickling-peacock.md
oat_import_provider: claude
oat_generated: true
oat_template: false
---

# Implementation Plan: oat-init-tools

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Enable `oat init tools` to distribute OAT skills, agents, templates, and scripts into any git repo via CLI subcommands (`ideas`, `workflows`, `utility`), with scope-aware installation and interactive selection.

**Architecture:** Build-time asset bundling into `packages/cli/assets/`, runtime resolution via `import.meta.url`, Commander group command with 3 subcommands + interactive all-skills installer.

**Tech Stack:** TypeScript, Commander.js, @inquirer/prompts, Node.js fs APIs

**Commit Convention:** `feat(pNN-tNN): description` - e.g., `feat(p01-t01): add asset bundling script`

## Planning Checklist

- [x] Confirmed HiL checkpoints with user
- [x] Set `oat_plan_hil_phases` in frontmatter

---

## Phase 1: Build Infrastructure

Foundation: asset bundling pipeline and shared utilities that all subsequent phases depend on.

### Task p01-t01: Create asset bundling script

**Files:**
- Create: `packages/cli/scripts/bundle-assets.sh`

**Step 1: Write test (RED)**

```bash
# Manual verification — no automated test for build scripts
# Verify script copies all expected assets
```

Run: N/A (build script, verified in Step 4)
Expected: N/A

**Step 2: Implement (GREEN)**

Create `packages/cli/scripts/bundle-assets.sh`:
- `set -euo pipefail` at top
- Resolve `$REPO_ROOT` (script dir → `../../..`) and `$ASSETS` (`packages/cli/assets`)
- `rm -rf "$ASSETS" && mkdir -p "$ASSETS/skills"`
- Copy all 25 skill directories: 4 `oat-idea-*`, 18 `oat-project-*`, `oat-repo-knowledge-index`, `oat-worktree-bootstrap`, `oat-review-provide` via `cp -R`
- Copy 2 agent files to `$ASSETS/agents/`
- Copy 6 project templates + `ideas/` template dir to `$ASSETS/templates/`
- Conditional copy for scripts: `[ -f ... ] && cp ...` (optional at bundle time)

**Step 3: Refactor**

Verify script is idempotent (rm + recreate pattern).

**Step 4: Verify**

Run: `bash packages/cli/scripts/bundle-assets.sh && ls -la packages/cli/assets/skills/ | wc -l`
Expected: 25 skill directories present, agents and templates populated

**Step 5: Commit**

```bash
git add packages/cli/scripts/bundle-assets.sh
git commit -m "feat(p01-t01): add asset bundling script"
```

---

### Task p01-t02: Integrate bundling into build pipeline

**Files:**
- Modify: `packages/cli/package.json`
- Modify: `turbo.json`
- Modify: `.gitignore`

**Step 1: Write test (RED)**

```bash
# Verify build runs bundling before tsc
pnpm build 2>&1 | head -5
```

Run: `pnpm build`
Expected: Build fails initially (no changes yet)

**Step 2: Implement (GREEN)**

- `packages/cli/package.json`: update `"build"` to `"bash scripts/bundle-assets.sh && tsc && tsc-alias"`
- `turbo.json`: add `"assets/**"` to build outputs
- `.gitignore`: add `packages/cli/assets/` entry

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm build && ls packages/cli/assets/skills/oat-idea-new/SKILL.md`
Expected: File exists, build succeeds

**Step 5: Commit**

```bash
git add packages/cli/package.json turbo.json .gitignore
git commit -m "feat(p01-t02): integrate asset bundling into build pipeline"
```

---

### Task p01-t03: Add resolveAssetsRoot() utility

**Files:**
- Create: `packages/cli/src/fs/assets.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/fs/assets.test.ts
import { describe, it, expect } from 'vitest';
import { resolveAssetsRoot } from './assets';

describe('resolveAssetsRoot', () => {
  it('resolves to packages/cli/assets/', async () => {
    const root = await resolveAssetsRoot();
    expect(root).toMatch(/packages\/cli\/assets$/);
  });
});
```

Run: `pnpm --filter @oat/cli test src/fs/assets.test.ts`
Expected: Test fails (RED) — module doesn't exist

**Step 2: Implement (GREEN)**

Create `packages/cli/src/fs/assets.ts`:
- `resolveAssetsRoot()` using `import.meta.url` → `fileURLToPath` → walk up 2 levels to `packages/cli/` → join `assets`
- Validate with `stat()`, throw `CliError` if missing

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test src/fs/assets.test.ts && pnpm lint && pnpm type-check`
Expected: Test passes, no lint/type errors

**Step 5: Commit**

```bash
git add packages/cli/src/fs/assets.ts packages/cli/src/fs/assets.test.ts
git commit -m "feat(p01-t03): add resolveAssetsRoot utility"
```

---

### Task p01-t04: Add fileExists() and dirExists() to shared FS utils

**Files:**
- Modify: `packages/cli/src/fs/io.ts`

**Step 1: Write test (RED)**

```typescript
// Add to existing io tests or create packages/cli/src/fs/io.test.ts
import { describe, it, expect } from 'vitest';
import { fileExists, dirExists } from './io';

describe('fileExists', () => {
  it('returns true for existing file', async () => {
    expect(await fileExists('package.json')).toBe(true);
  });
  it('returns false for missing file', async () => {
    expect(await fileExists('nonexistent.xyz')).toBe(false);
  });
});

describe('dirExists', () => {
  it('returns true for existing directory', async () => {
    expect(await dirExists('src')).toBe(true);
  });
  it('returns false for missing directory', async () => {
    expect(await dirExists('nonexistent-dir')).toBe(false);
  });
});
```

Run: `pnpm --filter @oat/cli test src/fs/io.test.ts`
Expected: Test fails (RED) — functions don't exist

**Step 2: Implement (GREEN)**

Modify `packages/cli/src/fs/io.ts`:
- Add `stat` to `node:fs/promises` import
- Add `fileExists(path)` and `dirExists(path)` exports

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test src/fs/io.test.ts && pnpm type-check`
Expected: Tests pass, no type errors

**Step 5: Commit**

```bash
git add packages/cli/src/fs/io.ts packages/cli/src/fs/io.test.ts
git commit -m "feat(p01-t04): add fileExists and dirExists utilities"
```

---

## Phase 2: Ideas Pack

Install logic and Commander layer for `oat init tools ideas`.

### Task p02-t01: Implement ideas install pure logic

**Files:**
- Create: `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/init/tools/ideas/install-ideas.test.ts
// Integration tests using real temp directories
describe('installIdeas', () => {
  it('copies all 4 skills, 2 infra files, 2 templates on fresh install', async () => { /* ... */ });
  it('skips all items on idempotent re-run', async () => { /* ... */ });
  it('copies only absent items on partial state', async () => { /* ... */ });
  it('overwrites existing items when force=true, tracking in updated[]', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test src/commands/init/tools/ideas/install-ideas.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Create `install-ideas.ts`:
- Constants: `IDEA_SKILLS = ['oat-idea-new', 'oat-idea-ideate', 'oat-idea-summarize', 'oat-idea-scratchpad']`
- Constants: `INFRA_FILES` (backlog.md, scratchpad.md from `ideas/ideas-backlog.md`, `ideas/ideas-scratchpad.md`)
- Constants: `RUNTIME_TEMPLATES` (idea-discovery.md, idea-summary.md from `ideas/`)
- `installIdeas({ assetsRoot, targetRoot, force? })` using `dirExists`/`fileExists`, `copyDirectory`/`copySingleFile` from `@fs/io`
- Return `InstallIdeasResult` with `copied*[]`, `updated*[]`, `skipped*[]` arrays

**Step 3: Refactor**

Extract shared copy-with-skip pattern if useful for workflows.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/ideas/install-ideas.test.ts && pnpm type-check`
Expected: All tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/ideas/install-ideas.ts packages/cli/src/commands/init/tools/ideas/install-ideas.test.ts
git commit -m "feat(p02-t01): implement ideas install pure logic"
```

---

### Task p02-t02: Implement ideas Commander layer

**Files:**
- Create: `packages/cli/src/commands/init/tools/ideas/index.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/init/tools/ideas/index.test.ts
// DI harness tests following init/index.test.ts pattern
describe('createInitToolsIdeasCommand', () => {
  it('forwards correct args to installIdeas', async () => { /* ... */ });
  it('default scope (all) resolves as project', async () => { /* ... */ });
  it('--scope user installs to home directory', async () => { /* ... */ });
  it('--scope project installs to project root', async () => { /* ... */ });
  it('--force with interactive confirms before overwriting', async () => { /* ... */ });
  it('text output shows counts and sync reminder', async () => { /* ... */ });
  it('json output emits full result', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test src/commands/init/tools/ideas/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Create `index.ts`:
- `createInitToolsIdeasCommand(overrides?)` with `--force` option
- DI: `buildCommandContext`, `resolveProjectRoot`, `resolveScopeRoot`, `resolveAssetsRoot`, `installIdeas`, `confirmAction`
- Scope: `all` → project, `project` → project, `user` → home
- Report: text counts + scope + sync reminder; JSON full result

**Step 3: Refactor**

Ensure report format matches existing CLI patterns.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/ideas/ && pnpm type-check`
Expected: All tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/ideas/index.ts packages/cli/src/commands/init/tools/ideas/index.test.ts
git commit -m "feat(p02-t02): implement ideas Commander layer"
```

---

## Phase 3: Workflows Pack

Install logic and Commander layer for `oat init tools workflows`.

### Task p03-t01: Implement workflows install pure logic

**Files:**
- Create: `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts
describe('installWorkflows', () => {
  it('copies all 20 skills, 2 agents, 6 templates, 2 scripts on fresh install', async () => { /* ... */ });
  it('preserves script chmod 0o755', async () => { /* ... */ });
  it('writes .oat/projects-root when absent, does not overwrite when present', async () => { /* ... */ });
  it('gracefully skips missing source scripts', async () => { /* ... */ });
  it('skips all on idempotent re-run', async () => { /* ... */ });
  it('overwrites with force=true, tracking updated[]', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test src/commands/init/tools/workflows/install-workflows.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Create `install-workflows.ts`:
- Constants: 20 `WORKFLOW_SKILLS[]`, 2 `WORKFLOW_AGENTS[]`, 6 `WORKFLOW_TEMPLATES[]`, 2 `WORKFLOW_SCRIPTS[]`
- `installWorkflows({ assetsRoot, targetRoot, force? })`
- Script handling: `chmod(dest, 0o755)` after copy, skip if source absent
- Config: write `.oat/projects-root` default if absent, never force-overwrite
- Return `InstallWorkflowsResult`

**Step 3: Refactor**

Consider extracting shared copy utilities used by both ideas and workflows.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/workflows/install-workflows.test.ts && pnpm type-check`
Expected: All tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/workflows/install-workflows.ts packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts
git commit -m "feat(p03-t01): implement workflows install pure logic"
```

---

### Task p03-t02: Implement workflows Commander layer

**Files:**
- Create: `packages/cli/src/commands/init/tools/workflows/index.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/init/tools/workflows/index.test.ts
describe('createInitToolsWorkflowsCommand', () => {
  it('default scope (all) resolves as project', async () => { /* ... */ });
  it('--scope user rejected with error', async () => { /* ... */ });
  it('--force with interactive confirms before overwriting', async () => { /* ... */ });
  it('text + JSON output shapes', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test src/commands/init/tools/workflows/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Create `index.ts`:
- `createInitToolsWorkflowsCommand(overrides?)` with `--force` option
- Scope: `all` → project, `project` → works, `user` → reject with error
- Report: per-category counts + sync reminder

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/workflows/ && pnpm type-check`
Expected: All tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/workflows/index.ts packages/cli/src/commands/init/tools/workflows/index.test.ts
git commit -m "feat(p03-t02): implement workflows Commander layer"
```

---

## Phase 4: Utility Pack + Tools Group + Wiring

Utility pack, interactive all-skills installer, and final `oat init` integration.

### Task p04-t01: Implement utility install pure logic + Commander layer

**Files:**
- Create: `packages/cli/src/commands/init/tools/utility/install-utility.ts`
- Create: `packages/cli/src/commands/init/tools/utility/index.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/init/tools/utility/install-utility.test.ts
describe('installUtility', () => {
  it('copies oat-review-provide at project scope', async () => { /* ... */ });
  it('copies oat-review-provide at user scope', async () => { /* ... */ });
  it('skips on idempotent re-run', async () => { /* ... */ });
  it('installs only selected skills from skills array', async () => { /* ... */ });
});

// packages/cli/src/commands/init/tools/utility/index.test.ts
describe('createInitToolsUtilityCommand', () => {
  it('interactive mode shows multi-select with all checked', async () => { /* ... */ });
  it('non-interactive installs all utility skills', async () => { /* ... */ });
  it('--scope user works', async () => { /* ... */ });
  it('--scope project works', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test src/commands/init/tools/utility/`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

`install-utility.ts`:
- Constants: `UTILITY_SKILLS = ['oat-review-provide']`
- `installUtility({ assetsRoot, targetRoot, skills, force? })` — `skills` param allows partial installs from interactive selection
- Return `InstallUtilityResult`

`index.ts`:
- `createInitToolsUtilityCommand(overrides?)`
- Interactive: `selectManyWithAbort` from `@commands/shared/shared.prompts` — all checked by default
- Non-interactive: install all
- Scope: `all` → project, `project` → works, `user` → works

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/utility/ && pnpm type-check`
Expected: All tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/utility/
git commit -m "feat(p04-t01): implement utility install logic and Commander layer"
```

---

### Task p04-t02: Implement tools group command with interactive installer

**Files:**
- Create: `packages/cli/src/commands/init/tools/index.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/init/tools/index.test.ts
describe('createInitToolsCommand', () => {
  it('registers ideas, workflows, utility subcommands', async () => { /* ... */ });
  it('bare oat init tools in interactive mode shows grouped skill list', async () => { /* ... */ });
  it('non-interactive installs everything to project scope', async () => { /* ... */ });
  it('handles scope conflicts for mixed project-only and user-eligible packs', async () => { /* ... */ });
});
```

Run: `pnpm --filter @oat/cli test src/commands/init/tools/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Create `index.ts`:
- `createInitToolsCommand(overrides?)`
- `.addCommand()` for ideas, workflows, utility
- Bare `.action()`: interactive installer using `selectManyWithAbort` with pack group headers + scope badges `[project]` / `[project|user]`
- All skills checked by default
- Scope prompt if selection includes user-eligible skills
- Delegates to `installIdeas`, `installWorkflows`, `installUtility`
- Non-interactive: everything to project scope

**Step 3: Refactor**

None needed.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/index.test.ts && pnpm type-check`
Expected: All tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p04-t02): implement tools group command with interactive installer"
```

---

### Task p04-t03: Wire tools into oat init

**Files:**
- Modify: `packages/cli/src/commands/init/index.ts`

**Step 1: Write test (RED)**

```typescript
// Add to packages/cli/src/commands/init/index.test.ts
it('bare oat init still works (regression)', async () => { /* ... */ });
it('oat init tools is a registered subcommand', async () => { /* ... */ });
```

Run: `pnpm --filter @oat/cli test src/commands/init/index.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Modify `packages/cli/src/commands/init/index.ts`:
- Add `import { createInitToolsCommand } from './tools'`
- Add `.addCommand(createInitToolsCommand())` to the init command builder

**Step 3: Refactor**

Update description to mention tool packs.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/ && pnpm type-check`
Expected: All tests pass, including regression

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/index.ts packages/cli/src/commands/init/index.test.ts
git commit -m "feat(p04-t03): wire tools subcommand into oat init"
```

---

## Phase 5: Idea Skill Updates

Companion fix to make idea skills work correctly at user scope after `oat init tools ideas --scope user`.

### Task p05-t01: Add level-relative template paths to idea skills

**Files:**
- Modify: `.agents/skills/oat-idea-new/SKILL.md`
- Modify: `.agents/skills/oat-idea-ideate/SKILL.md`
- Modify: `.agents/skills/oat-idea-summarize/SKILL.md`
- Modify: `.agents/skills/oat-idea-scratchpad/SKILL.md`

**Step 1: Write test (RED)**

Manual verification — skill files are markdown, not code. Verify by reading updated files.

**Step 2: Implement (GREEN)**

Add `TEMPLATES_ROOT` variable to level-resolution tables:
- Project: `.oat/templates/ideas`
- User: `~/.oat/templates/ideas`

Replace hardcoded `.oat/templates/ideas/` references with `{TEMPLATES_ROOT}/` in all 4 skill files.

**Step 3: Refactor**

Ensure variable table formatting is consistent.

**Step 4: Verify**

Run: `grep -r 'TEMPLATES_ROOT' .agents/skills/oat-idea-*/SKILL.md | wc -l`
Expected: All 4 skills reference `TEMPLATES_ROOT`; no hardcoded `.oat/templates/ideas/` remains (except in the variable table definition)

**Step 5: Commit**

```bash
git add .agents/skills/oat-idea-*/SKILL.md
git commit -m "feat(p05-t01): add level-relative template paths to idea skills"
```

---

### Task p05-t02: Add dual-level prompt chain to idea skills

**Files:**
- Modify: `.agents/skills/oat-idea-new/SKILL.md`
- Modify: `.agents/skills/oat-idea-ideate/SKILL.md`
- Modify: `.agents/skills/oat-idea-summarize/SKILL.md`
- Modify: `.agents/skills/oat-idea-scratchpad/SKILL.md`

**Step 1: Write test (RED)**

Manual verification — agent-executed skill, not code.

**Step 2: Implement (GREEN)**

Update level-resolution chain in all 4 skills to add new rule 4:

```
1. If $ARGUMENTS contains --global → user level
2. If .oat/active-idea exists and points to valid dir → project level
3. If ~/.oat/active-idea exists and points to valid dir → user level
4. If BOTH .oat/ideas/ AND ~/.oat/ideas/ exist →
     ASK: "Ideas exist at both project and user level. Where should this idea go?"
     Options: "Project (.oat/ideas/)" / "Global (~/.oat/ideas/)"
5. If .oat/ideas/ exists → project level
6. If ~/.oat/ideas/ exists → user level
7. Otherwise → ask: "Project-level or global (user-level) ideas?"
```

**Step 3: Refactor**

Ensure rule numbering and formatting is consistent across all 4 skills.

**Step 4: Verify**

Run: `grep -c 'BOTH.*ideas.*AND.*ideas' .agents/skills/oat-idea-*/SKILL.md`
Expected: All 4 skills contain the new rule 4

**Step 5: Commit**

```bash
git add .agents/skills/oat-idea-*/SKILL.md
git commit -m "feat(p05-t02): add dual-level prompt chain to idea skills"
```

---

## Phase 6: End-to-End Verification

Final integration testing and manual verification.

### Task p06-t01: Run full test suite and manual verification

**Files:**
- No new files

**Step 1: Write test (RED)**

N/A — this is the final verification pass.

**Step 2: Implement (GREEN)**

Run all verification steps from the imported plan's verification section:
1. `pnpm build` — assets populated
2. `pnpm run cli -- init --help` — shows `tools`
3. `pnpm run cli -- init tools --help` — shows `ideas`, `workflows`, `utility`
4. `pnpm run cli -- init` — base init unchanged
5. Manual smoke test in temp git repo for all subcommands
6. `pnpm --filter @oat/cli test` — full test suite
7. `pnpm type-check && pnpm lint` — clean

**Step 3: Refactor**

Fix any issues found during verification.

**Step 4: Verify**

Run: `pnpm type-check && pnpm lint && pnpm --filter @oat/cli test`
Expected: All clean

**Step 5: Commit**

Any final fixes committed individually.

---

## Phase 7: Review Fixes (Final)

Address findings from `reviews/final-review-2026-02-17.md` before re-review.

### Task p07-t01: (review) Add utility --force interactive confirmation

**Files:**
- Modify: `packages/cli/src/commands/init/tools/utility/index.ts`

**Step 1: Understand the issue**

Review finding: utility command path lacks the interactive confirmation behavior used by ideas/workflows when `--force` is provided.
Location: `packages/cli/src/commands/init/tools/utility/index.ts`

**Step 2: Implement fix**

Add a `confirmAction` dependency to utility command DI and gate overwrite with an interactive confirmation prompt before invoking `installUtility`.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/utility/index.test.ts`
Expected: utility command tests pass and force-confirm behavior is enforced.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/utility/index.ts
git commit -m "fix(p07-t01): add utility force confirmation prompt"
```

---

### Task p07-t02: (review) Add utility command --force confirmation tests

**Files:**
- Modify: `packages/cli/src/commands/init/tools/utility/index.test.ts`

**Step 1: Understand the issue**

Review finding: utility command has no explicit tests for interactive `--force` confirmation behavior.
Location: `packages/cli/src/commands/init/tools/utility/index.test.ts`

**Step 2: Implement fix**

Add tests covering:
- confirm prompt is called for interactive `--force`
- decline path skips installer and exits cleanly
- accept path proceeds to installer

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/utility/index.test.ts`
Expected: new tests fail before fix and pass after implementation.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/utility/index.test.ts
git commit -m "test(p07-t02): cover utility force confirmation flow"
```

---

### Task p07-t03: (review) Extract shared installer copy helpers

**Files:**
- Create: `packages/cli/src/commands/init/tools/shared/copy-helpers.ts`
- Modify: `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`
- Modify: `packages/cli/src/commands/init/tools/utility/install-utility.ts`

**Step 1: Understand the issue**

Review finding: copy/exists helper logic is duplicated across ideas/workflows/utility installer modules.
Location: `packages/cli/src/commands/init/tools/{ideas,workflows,utility}`

**Step 2: Implement fix**

Create shared helpers for path existence, directory copy-with-status, and file copy-with-status. Reuse them in all three installer modules.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/{ideas,workflows,utility}/`
Expected: installer behavior remains unchanged and tests pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/copy-helpers.ts packages/cli/src/commands/init/tools/ideas/install-ideas.ts packages/cli/src/commands/init/tools/workflows/install-workflows.ts packages/cli/src/commands/init/tools/utility/install-utility.ts
git commit -m "refactor(p07-t03): extract shared installer copy helpers"
```

---

### Task p07-t04: (review) Standardize copy helper naming in installer modules

**Files:**
- Modify: `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`

**Step 1: Understand the issue**

Review finding: helper naming differs between ideas/workflows for equivalent behaviors.
Location: `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`, `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`

**Step 2: Implement fix**

Use shared helper function names consistently in both modules and remove naming drift.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/{ideas,workflows}/`
Expected: tests pass with standardized helper usage.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/ideas/install-ideas.ts packages/cli/src/commands/init/tools/workflows/install-workflows.ts
git commit -m "refactor(p07-t04): standardize installer helper naming"
```

---

### Task p07-t05: (review) Re-export copySingleFile from fs barrel

**Files:**
- Modify: `packages/cli/src/fs/index.ts`

**Step 1: Understand the issue**

Review finding: `copySingleFile` is exported by `io.ts` but missing from barrel export.
Location: `packages/cli/src/fs/index.ts`

**Step 2: Implement fix**

Add `copySingleFile` to the `@fs` barrel re-exports.

**Step 3: Verify**

Run: `pnpm type-check && pnpm --filter @oat/cli test src/fs/io.test.ts`
Expected: type-check and fs tests pass.

**Step 4: Commit**

```bash
git add packages/cli/src/fs/index.ts
git commit -m "fix(p07-t05): re-export copySingleFile from fs barrel"
```

---

### Task p07-t06: (review) Add utility installer force-overwrite tests

**Files:**
- Modify: `packages/cli/src/commands/init/tools/utility/install-utility.test.ts`

**Step 1: Understand the issue**

Review finding: utility installer tests do not cover `force=true` overwrite behavior.
Location: `packages/cli/src/commands/init/tools/utility/install-utility.test.ts`

**Step 2: Implement fix**

Add an overwrite test that validates:
- existing skill content is replaced when `force=true`
- installer reports overwritten entries in `updatedSkills`

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/utility/install-utility.test.ts`
Expected: new overwrite test passes.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/utility/install-utility.test.ts
git commit -m "test(p07-t06): add force-overwrite coverage for utility installer"
```

---

### Task p07-t07: (review) Add cancellation test for bare init tools flow

**Files:**
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Understand the issue**

Review finding: no explicit negative test for interactive cancellation when selecting packs in bare `oat init tools`.
Location: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 2: Implement fix**

Add a test with `selectManyWithAbort` returning `null` and assert no installs run plus user-facing cancellation/no-selection messaging.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/index.test.ts`
Expected: cancellation path is covered and passing.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.test.ts
git commit -m "test(p07-t07): cover cancellation path for init tools"
```

---

### Task p07-t08: (review) Restrict bundled optional scripts to explicit allowlist

**Files:**
- Modify: `packages/cli/scripts/bundle-assets.sh`

**Step 1: Understand the issue**

Review finding: wildcard script copy can bundle unintended files from `.oat/scripts/`.
Location: `packages/cli/scripts/bundle-assets.sh`

**Step 2: Implement fix**

Replace wildcard copy with explicit conditional copies for `generate-oat-state.sh` and `generate-thin-index.sh`.

**Step 3: Verify**

Run: `bash packages/cli/scripts/bundle-assets.sh && ls -la packages/cli/assets/scripts/`
Expected: only expected script assets are bundled when present.

**Step 4: Commit**

```bash
git add packages/cli/scripts/bundle-assets.sh
git commit -m "fix(p07-t08): restrict bundled optional scripts to allowlist"
```

---

### Task p07-t09: (review) Add dedicated tests for shared copy helpers

**Files:**
- Create: `packages/cli/src/commands/init/tools/shared/copy-helpers.test.ts`

**Step 1: Understand the issue**

Review finding: shared helper module has only transitive coverage and lacks direct unit tests.
Location: `packages/cli/src/commands/init/tools/shared/copy-helpers.ts`

**Step 2: Implement fix**

Add focused unit tests that directly validate:
- `pathExists` returns expected values for missing/files/directories
- `copyDirWithStatus` status transitions (`copied`, `skipped`, `updated`)
- `copyFileWithStatus` status transitions (`copied`, `skipped`, `updated`)

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test src/commands/init/tools/shared/copy-helpers.test.ts`
Expected: dedicated helper tests pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/copy-helpers.test.ts
git commit -m "test(p07-t09): add dedicated coverage for shared copy helpers"
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
| p06 | code | pending | - | - |
| final | code | passed | 2026-02-18 | reviews/final-review-2026-02-17-v2.md (user-reviewed p07-t09) |
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
- Phase 1: 4 tasks - Build infrastructure (bundling, assets, FS utils)
- Phase 2: 2 tasks - Ideas pack (install logic + Commander)
- Phase 3: 2 tasks - Workflows pack (install logic + Commander)
- Phase 4: 3 tasks - Utility pack + tools group + init wiring
- Phase 5: 2 tasks - Idea skill updates (template paths + dual-level prompts)
- Phase 6: 1 task - End-to-end verification
- Phase 7: 9 tasks - Final review fixes (important + minor findings)

**Total: 23 tasks**

Final review passed; ready for PR preparation.

---

## References

- Imported Source: `references/imported-plan.md`
- Design: N/A (import mode — no design artifact)
- Spec: N/A (import mode — no spec artifact)
- Discovery: N/A (import mode)
