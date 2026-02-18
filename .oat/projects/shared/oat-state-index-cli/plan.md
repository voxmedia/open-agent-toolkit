---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-17
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["p04"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/.claude/plans/generic-seeking-meteor.md
oat_import_provider: claude
oat_generated: false
---

# Implementation Plan: oat-state-index-cli

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Migrate the last two shell scripts (`generate-oat-state.sh`, `generate-thin-index.sh`) to TypeScript CLI commands, then remove `.oat/scripts/` entirely.

**Architecture:** New `oat state refresh` and `oat index init` commands following established DI + factory pattern from prior CLI migrations (B12/B13). Shared utilities extracted to `commands/shared/`.

**Tech Stack:** TypeScript 5.8, Commander.js, Vitest, Node.js fs/child_process

**Commit Convention:** `feat({scope}): {description}` - e.g., `feat(p01-t01): add fileExists to fs/io`

## Planning Checklist

- [x] Confirmed HiL checkpoints with user
- [x] Set `oat_plan_hil_phases` in frontmatter

---

## Phase 1: Shared Infrastructure

Extract utilities needed by both new commands and already duplicated in the codebase.

### Task p01-t01: Add `fileExists` to `packages/cli/src/fs/io.ts`

**Files:**
- Modify: `packages/cli/src/fs/io.ts`
- Modify: `packages/cli/src/fs/index.ts`
- Modify: `packages/cli/src/commands/project/new/scaffold.ts`

**Step 1: Implement**

Add `fileExists(path: string): Promise<boolean>` to `packages/cli/src/fs/io.ts` — `stat` + `isFile`, catch → `false`. Export from `packages/cli/src/fs/index.ts`.

**Step 2: Refactor**

Update `scaffold.ts` to import `fileExists` from `@fs/io` and remove its local copy.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test` — existing scaffold tests must pass unchanged.
Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/fs/io.ts packages/cli/src/fs/index.ts packages/cli/src/commands/project/new/scaffold.ts
git commit -m "feat(p01-t01): add fileExists to fs/io and dedup from scaffold"
```

---

### Task p01-t02: Extract `resolveProjectsRoot` to shared module

**Files:**
- Create: `packages/cli/src/commands/shared/oat-paths.ts`
- Modify: `packages/cli/src/commands/project/new/scaffold.ts`

**Step 1: Implement**

Move `resolveProjectsRoot` from `scaffold.ts` to `packages/cli/src/commands/shared/oat-paths.ts` (identical signature). Update `scaffold.ts` to import from `@commands/shared/oat-paths`.

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test` — existing `scaffold.test.ts` tests cover this; all must pass.
Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/cli/src/commands/shared/oat-paths.ts packages/cli/src/commands/project/new/scaffold.ts
git commit -m "feat(p01-t02): extract resolveProjectsRoot to shared oat-paths"
```

---

### Task p01-t03: Create frontmatter parsing utilities

**Files:**
- Create: `packages/cli/src/commands/shared/frontmatter.ts`
- Create: `packages/cli/src/commands/shared/frontmatter.test.ts`

**Step 1: Write test (RED)**

Create `frontmatter.test.ts` with cases:
- `getFrontmatterBlock` — extracts between `---` markers; returns `null` if missing
- `getFrontmatterField` — extracts single field; strips inline comments; returns `null` if missing
- `parseFrontmatterField` — reads file + extracts; returns `''` for non-existent file; returns `''` for missing field

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/shared/frontmatter.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Create `frontmatter.ts` with:
- `getFrontmatterBlock(content: string): string | null`
- `getFrontmatterField(frontmatter: string, field: string): string | null`
- `parseFrontmatterField(filePath: string, field: string): Promise<string>` — never throws, returns `''`

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/shared/frontmatter.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/shared/frontmatter.ts packages/cli/src/commands/shared/frontmatter.test.ts
git commit -m "feat(p01-t03): add frontmatter parsing utilities"
```

---

## Phase 2: B14 — `oat state refresh`

Migrate `generate-oat-state.sh` (419 lines) to `oat state refresh` CLI command.

### Task p02-t01: Core logic — `generate.ts`

**Files:**
- Create: `packages/cli/src/commands/state/generate.ts`

**Step 1: Implement**

Translate shell functions 1:1 into TypeScript:

| Shell function | TS function | Notes |
|---|---|---|
| `resolve_projects_root` | reuse `oat-paths.ts` | Phase 1 |
| `has_any_projects` | `hasAnyProjects(repoRoot, projectsRoot)` | `readdir` + filter dirs |
| `read_active_project` | `readActiveProject(repoRoot, projectsRoot)` | Read `.oat/active-project`, resolve path vs name |
| `parse_frontmatter` | reuse `frontmatter.ts` | Phase 1 |
| `read_project_state` | `readProjectState(projectPath)` | ~8 frontmatter fields with defaults |
| `phase_in_hil_list` | `phaseInHilList(phase, listStr)` | Substring check |
| `read_knowledge_status` | `readKnowledgeStatus(repoRoot)` | Frontmatter from `project-index.md` |
| `calculate_staleness` | `calculateStaleness(...)` | JS `Date` eliminates macOS/Linux branching |
| `compute_next_step` | `computeNextStep(...)` | State machine → recommended skill |
| `list_available_projects` | `listAvailableProjects(repoRoot, projectsRoot)` | Dir listing + phase from each `state.md` |
| `generate_dashboard` | `buildDashboardMarkdown(...)` | Template literals |

Public API:
```ts
interface GenerateStateOptions {
  repoRoot: string;
  env?: NodeJS.ProcessEnv;
  today?: string;
  git?: { isGitRepo(root: string): boolean; diffFileCount(root: string, sha: string): number };
}
interface GenerateStateResult {
  dashboardPath: string;
  projectName: string | null;
  projectStatus: string;
  stalenessStatus: string;
  recommendedStep: string;
  recommendedReason: string;
}
export async function generateStateDashboard(options: GenerateStateOptions): Promise<GenerateStateResult>
```

Git operations injectable via interface (default uses `execSync`; tests inject mock).

**Best-effort git parity:** The shell script uses `|| true` and `2>/dev/null` for all git operations. The default `git` implementation must wrap every `execSync` in try/catch and return sensible defaults on failure (`isGitRepo → false`, `diffFileCount → 0`). `generateStateDashboard` must never throw due to missing/invalid git metadata.

**Step 2: Verify**

Run: `pnpm type-check`
Expected: No errors (logic tested in next task)

**Step 3: Commit**

```bash
git add packages/cli/src/commands/state/generate.ts
git commit -m "feat(p02-t01): add generateStateDashboard core logic"
```

---

### Task p02-t02: Core logic tests — `generate.test.ts`

**Files:**
- Create: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Write tests**

Real temp dirs, filesystem assertions:
- No projects / no active project → recommends `oat-project-new`
- Active project with frontmatter → all fields in dashboard
- Missing active-project → graceful degradation
- Active-project pointing to non-existent dir → `"directory missing"`
- Knowledge index + git diff → staleness thresholds (fresh/aging/stale)
- `computeNextStep` state machine for full/quick/import modes + HiL gating
- Multiple projects listed
- **Throwing git mock → dashboard still generates with degraded (but valid) output**

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/state/generate.test.ts`
Expected: All tests pass (GREEN — logic already implemented in p02-t01)

**Step 2: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/cli/src/commands/state/generate.test.ts
git commit -m "test(p02-t02): add generateStateDashboard tests"
```

---

### Task p02-t03: Command handler — `state/index.ts`

**Files:**
- Create: `packages/cli/src/commands/state/index.ts`

**Step 1: Implement**

Standard DI pattern: `createStateCommand()` → `createStateRefreshCommand(overrides)` with `Dependencies` interface, `buildCommandContext`, logger, exit codes. Text mode prints dashboard path + recommended step. JSON mode returns structured result.

**Step 2: Verify**

Run: `pnpm type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/cli/src/commands/state/index.ts
git commit -m "feat(p02-t03): add oat state refresh command handler"
```

---

### Task p02-t04: Command handler tests — `state/index.test.ts`

**Files:**
- Create: `packages/cli/src/commands/state/index.test.ts`

**Step 1: Write tests**

`createLoggerCapture()` + `vi.fn()` mock for `generateStateDashboard`:
- Text mode output format
- JSON mode output format
- Error case (exit code 1)

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/state/index.test.ts`
Expected: All tests pass

**Step 2: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/cli/src/commands/state/index.test.ts
git commit -m "test(p02-t04): add oat state refresh command handler tests"
```

---

### Task p02-t05: Register command + help snapshot

**Files:**
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Implement**

Add `import { createStateCommand } from './state'` + `program.addCommand(createStateCommand())` in `packages/cli/src/commands/index.ts`. Add `state refresh --help` snapshot to `help-snapshots.test.ts`.

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass including new snapshot
Run: `pnpm run cli -- state refresh --help`
Expected: Help output displayed

**Step 3: Commit**

```bash
git add packages/cli/src/commands/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p02-t05): register oat state refresh command and add help snapshot"
```

---

### Task p02-t06: Update `scaffold.ts` dashboard refresh seam

**Files:**
- Modify: `packages/cli/src/commands/project/new/scaffold.ts`

**Step 1: Implement**

Replace `defaultRefreshDashboard` (currently `spawnSync('bash', [script])`) with direct call to `generateStateDashboard({ repoRoot })`. Make `refreshDashboardCallback` type support async (`() => void | Promise<void>`), await it in the caller.

**Keep refresh non-fatal:** Wrap the `generateStateDashboard` call in try/catch that logs the error (via stderr/console.error) and continues, so that `oat project new` never fails after scaffold work has already completed. The scaffold result is returned successfully regardless of dashboard refresh outcome.

**Step 2: Write test (RED → GREEN)**

Add test in `scaffold.test.ts`: a throwing `refreshDashboardCallback` does not cause `scaffoldProject` to reject — scaffold result is still returned with `dashboardRefreshed: false`.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass, including existing scaffold tests
Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/scaffold.test.ts
git commit -m "feat(p02-t06): replace shell dashboard refresh with generateStateDashboard"
```

---

### Task p02-t07: Update 6 skills to use CLI command

**Files:**
- Modify: `.agents/skills/oat-project-clear-active/SKILL.md`
- Modify: `.agents/skills/oat-project-open/SKILL.md`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-progress/SKILL.md`
- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md`

**Step 1: Implement**

Replace all `bash .oat/scripts/generate-oat-state.sh` / `.oat/scripts/generate-oat-state.sh` references with `pnpm run cli -- state refresh` in each skill file.

| Skill | Current call | New call |
|---|---|---|
| `oat-project-clear-active` | `.oat/scripts/generate-oat-state.sh` | `pnpm run cli -- state refresh` |
| `oat-project-open` | `.oat/scripts/generate-oat-state.sh` | `pnpm run cli -- state refresh` |
| `oat-project-complete` | `.oat/scripts/generate-oat-state.sh` | `pnpm run cli -- state refresh` |
| `oat-project-quick-start` | `bash .oat/scripts/generate-oat-state.sh` | `pnpm run cli -- state refresh` |
| `oat-project-progress` | guarded `if [[ -f ... ]]` | `pnpm run cli -- state refresh` |
| `oat-repo-knowledge-index` | guarded `if [[ -f ... ]]` | `pnpm run cli -- state refresh` |

**Step 2: Verify**

Run: `rg 'generate-oat-state\.sh' .agents/` — should return zero hits.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-clear-active/SKILL.md .agents/skills/oat-project-open/SKILL.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-progress/SKILL.md .agents/skills/oat-repo-knowledge-index/SKILL.md
git commit -m "feat(p02-t07): update 6 skills to use oat state refresh CLI command"
```

---

### Task p02-t08: End-to-end smoke test

**Step 1: Verify**

Run: `pnpm run cli -- state refresh` → `.oat/state.md` regenerated with correct content
Run: `pnpm run cli -- state refresh --json` → JSON payload with status/fields
Run: `pnpm build && pnpm test` — full suite passes

**Step 2: Commit** (if any fixups needed)

---

## Phase 3: B15 — `oat index init`

Migrate `generate-thin-index.sh` (201 lines) to `oat index init` CLI command.

### Task p03-t01: Core logic — `thin-index.ts`

**Files:**
- Create: `packages/cli/src/commands/index-cmd/thin-index.ts`

**Step 1: Implement**

Directory named `index-cmd/` to avoid collision with `commands/index.ts` barrel.

Translate linear shell script blocks:

| Block | TS function | Notes |
|---|---|---|
| SHA resolution | `resolveHeadSha`, `resolveMergeBaseSha` | `execSync` with fallback chain; injectable; **must be non-throwing** |
| Repo name | `readRepoName(repoRoot)` | `readFile('package.json')` + JSON.parse, fallback `basename` |
| Directory tree | `getDirectoryTree(repoRoot)` | `readdir` recursive, depth ≤ 2, 7 exclusion patterns, max 200 |
| Package manager | `detectPackageManager(repoRoot)` | Sequential lockfile existence checks |
| Scripts | `extractScripts(repoRoot)` | Read `package.json` `.scripts` keys |
| Entry points | `findEntryPoints(repoRoot)` | `readdir` recursive, depth ≤ 4, 5 name patterns, max 50 |
| Config files | `detectConfigFiles(repoRoot)` | Check 18 hardcoded filenames |
| Test command | `extractTestCommand(repoRoot)` | `package.json` `.scripts.test`, Makefile fallback |
| Output | `buildThinIndexMarkdown(...)` | Template literals |

Public API:
```ts
interface GenerateThinIndexOptions {
  repoRoot: string;
  headSha?: string;
  mergeBaseSha?: string;
  today?: string;
  git?: { resolveHead(root: string): string; resolveMergeBase(root: string): string };
}
interface GenerateThinIndexResult {
  outputPath: string;
  repoName: string;
  packageManager: string;
  entryPointCount: number;
}
export async function generateThinIndex(options: GenerateThinIndexOptions): Promise<GenerateThinIndexResult>
```

**Best-effort git parity:** The shell script uses fallback chains (`git rev-parse HEAD || git log ... || echo unknown`). The default `git` implementation must wrap every `execSync` in try/catch and return `"unknown"` on failure. `generateThinIndex` must never throw due to missing/invalid git metadata.

**Step 2: Verify**

Run: `pnpm type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/cli/src/commands/index-cmd/thin-index.ts
git commit -m "feat(p03-t01): add generateThinIndex core logic"
```

---

### Task p03-t02: Core logic tests — `thin-index.test.ts`

**Files:**
- Create: `packages/cli/src/commands/index-cmd/thin-index.test.ts`

**Step 1: Write tests**

Real temp dirs:
- Provided SHAs appear in frontmatter
- Repo name from `package.json` vs basename fallback
- Package manager detection per lockfile type
- Directory tree excludes noise dirs, caps at 200
- Entry point detection at various depths
- Config file detection
- Output directory auto-created
- Output matches expected markdown structure
- **Throwing git mock → index still generates with `"unknown"` SHAs**

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/index-cmd/thin-index.test.ts`
Expected: All tests pass

**Step 2: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/cli/src/commands/index-cmd/thin-index.test.ts
git commit -m "test(p03-t02): add generateThinIndex tests"
```

---

### Task p03-t03: Command handler — `index-cmd/index.ts`

**Files:**
- Create: `packages/cli/src/commands/index-cmd/index.ts`

**Step 1: Implement**

`createIndexCommand()` → `createIndexInitCommand(overrides)`. Options: `--head-sha <sha>`, `--merge-base-sha <sha>`. Standard DI pattern with text/JSON output modes.

**Step 2: Verify**

Run: `pnpm type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/cli/src/commands/index-cmd/index.ts
git commit -m "feat(p03-t03): add oat index init command handler"
```

---

### Task p03-t04: Command handler tests — `index-cmd/index.test.ts`

**Files:**
- Create: `packages/cli/src/commands/index-cmd/index.test.ts`

**Step 1: Write tests**

Standard mock pattern. Verify SHA options forwarded, text/JSON output, error handling.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/index-cmd/index.test.ts`
Expected: All tests pass

**Step 2: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/cli/src/commands/index-cmd/index.test.ts
git commit -m "test(p03-t04): add oat index init command handler tests"
```

---

### Task p03-t05: Register command + help snapshot

**Files:**
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Implement**

Add `import { createIndexCommand } from './index-cmd'` + `program.addCommand(createIndexCommand())`. Add `index init --help` snapshot to `help-snapshots.test.ts`.

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass including new snapshot
Run: `pnpm run cli -- index init --help`
Expected: Help output displayed

**Step 3: Commit**

```bash
git add packages/cli/src/commands/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p03-t05): register oat index init command and add help snapshot"
```

---

### Task p03-t06: Update 1 skill to use CLI command

**Files:**
- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md`

**Step 1: Implement**

Change `bash .oat/scripts/generate-thin-index.sh "$HEAD_SHA" "$MERGE_BASE_SHA"` to `pnpm run cli -- index init --head-sha "$HEAD_SHA" --merge-base-sha "$MERGE_BASE_SHA"`.

**Step 2: Verify**

Run: `rg 'generate-thin-index\.sh' .agents/` — should return zero hits.

**Step 3: Commit**

```bash
git add .agents/skills/oat-repo-knowledge-index/SKILL.md
git commit -m "feat(p03-t06): update oat-repo-knowledge-index skill to use CLI command"
```

---

### Task p03-t07: End-to-end smoke test

**Step 1: Verify**

Run: `pnpm run cli -- index init` → `.oat/repo/knowledge/project-index.md` regenerated
Run: `pnpm run cli -- index init --head-sha abc123 --merge-base-sha def456` → provided SHAs in frontmatter
Run: `pnpm build && pnpm test` — full suite passes

**Step 2: Commit** (if any fixups needed)

---

## Phase 4: Cleanup (B16)

Remove `.oat/scripts/` directory and update all remaining references.

### Task p04-t01: Delete shell scripts and directory

**Files:**
- Delete: `.oat/scripts/generate-oat-state.sh`
- Delete: `.oat/scripts/generate-thin-index.sh`
- Delete: `.oat/scripts/` (directory)

**Step 1: Implement**

```bash
rm .oat/scripts/generate-oat-state.sh
rm .oat/scripts/generate-thin-index.sh
rmdir .oat/scripts/
```

**Step 2: Verify**

Run: `ls .oat/scripts/` — should not exist.

**Step 3: Commit**

```bash
git rm .oat/scripts/generate-oat-state.sh .oat/scripts/generate-thin-index.sh
git commit -m "chore(p04-t01): remove migrated shell scripts and .oat/scripts/ directory"
```

---

### Task p04-t02: Update all reference docs

**Files:**
- Modify: `.oat/repo/reference/current-state.md`
- Modify: `docs/oat/reference/oat-directory-structure.md`
- Modify: `docs/oat/reference/file-locations.md`
- Modify: `.oat/repo/reference/decision-record.md`
- Modify: `.oat/repo/reference/roadmap.md`
- Modify: `.oat/repo/reference/deferred-phases.md`
- Modify: `.agents/skills/update-repo-reference/SKILL.md`
- Modify: `.claude/settings.local.json` (remove bash permission patterns for deleted scripts, if any)

**Step 1: Implement**

Replace all `.oat/scripts/` references with CLI command equivalents across all listed files. Remove entries for deleted scripts; add entries for new CLI commands where appropriate.

**Step 2: Verify**

Run: `rg -n '\.oat/scripts/' .` — should return zero hits outside `backlog-completed.md`, review archives, and project artifacts in `.oat/projects/`.

**Step 3: Commit**

```bash
git add .oat/repo/reference/current-state.md docs/oat/reference/oat-directory-structure.md docs/oat/reference/file-locations.md .oat/repo/reference/decision-record.md .oat/repo/reference/roadmap.md .oat/repo/reference/deferred-phases.md .agents/skills/update-repo-reference/SKILL.md .claude/settings.local.json
git commit -m "docs(p04-t02): replace .oat/scripts/ references with CLI commands"
```

---

### Task p04-t03: Move B14, B15, B16 to completed archive

**Files:**
- Modify: `.oat/repo/reference/backlog.md`
- Modify: `.oat/repo/reference/backlog-completed.md`

**Step 1: Implement**

Move B14, B15, B16 entries from active backlog to `backlog-completed.md` with outcomes and PR links.

**Step 2: Verify**

Run: `rg 'B14|B15|B16' .oat/repo/reference/backlog.md` — should return zero hits for these item identifiers.

**Step 3: Commit**

```bash
git add .oat/repo/reference/backlog.md .oat/repo/reference/backlog-completed.md
git commit -m "chore(p04-t03): move B14, B15, B16 to completed archive"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| final | code | received | 2026-02-18 | reviews/final-review-2026-02-18.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1: 3 tasks - Shared infrastructure (fileExists, resolveProjectsRoot, frontmatter)
- Phase 2: 8 tasks - B14 oat state refresh (core logic, tests, handler, registration, scaffold seam, skill updates, smoke test)
- Phase 3: 7 tasks - B15 oat index init (core logic, tests, handler, registration, skill update, smoke test)
- Phase 4: 3 tasks - B16 cleanup (delete scripts, update docs, archive backlog)

**Total: 21 tasks**

Ready for code review and merge.

---

## References

- Imported Source: `references/imported-plan.md`
- Prior migrations pattern: `packages/cli/src/commands/project/new/` (B12), `packages/cli/src/commands/internal/validate-oat-skills.ts` (B13)
- Shell scripts: `.oat/scripts/generate-oat-state.sh`, `.oat/scripts/generate-thin-index.sh`
