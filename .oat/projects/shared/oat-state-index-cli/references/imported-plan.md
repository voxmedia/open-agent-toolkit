# Plan: Migrate B14 + B15 Shell Scripts to CLI Commands

## Context

Two shell scripts remain in `.oat/scripts/` — the last infrastructure debt from the original CLI consolidation roadmap:

- **B14** `generate-oat-state.sh` (419 lines) — generates `.oat/state.md` repo dashboard. Called from 6 skills + `scaffold.ts`.
- **B15** `generate-thin-index.sh` (201 lines) — generates `.oat/repo/knowledge/project-index.md` thin index. Called from 1 skill.

Completing both unlocks B16 (remove `.oat/scripts/` entirely). The two previous migrations (B12 `new-oat-project.ts`, B13 `validate-oat-skills.ts`) established clear patterns to follow.

## Command Naming

- B14: **`oat state refresh`** — top-level `state` group (dashboard covers full repo, not just one project)
- B15: **`oat index init`** — top-level `index` group, `init` subcommand for thin bootstrap

## Phases

### Phase 0: Shared Infrastructure

Extract utilities needed by both new commands and already duplicated in the codebase.

**0.1 — Add `fileExists` to `packages/cli/src/fs/io.ts`**
- Add `fileExists(path): Promise<boolean>` (stat + isFile, catch → false)
- Export from `packages/cli/src/fs/index.ts`
- Update `scaffold.ts` to import from `@fs/io` and remove its local copy

**0.2 — Extract `resolveProjectsRoot` to `packages/cli/src/commands/shared/oat-paths.ts`**
- Move from `scaffold.ts` to shared module (identical signature)
- Update `scaffold.ts` to import from `@commands/shared/oat-paths`
- Existing `scaffold.test.ts` tests already cover this — verify they pass after refactor

**0.3 — Create `packages/cli/src/commands/shared/frontmatter.ts`**
- `getFrontmatterBlock(content): string | null` — regex between `---` markers
- `getFrontmatterField(frontmatter, field): string | null` — extract single field, strip inline comments
- `parseFrontmatterField(filePath, field): Promise<string>` — read file + extract (never throws, returns `''`)
- Add `frontmatter.test.ts` with edge cases (missing field, no frontmatter, inline comments, non-existent file)

---

### Phase 1: B14 — `oat state refresh`

**1.1 — Core logic: `packages/cli/src/commands/state/generate.ts`**

Translates every function from the shell script 1:1:

| Shell function | TS function | Notes |
|---|---|---|
| `resolve_projects_root` | (reuse from `oat-paths.ts`) | Already extracted in Phase 0 |
| `has_any_projects` | `hasAnyProjects(repoRoot, projectsRoot)` | `readdir` + filter dirs |
| `read_active_project` | `readActiveProject(repoRoot, projectsRoot)` | Read `.oat/active-project`, resolve path vs name format |
| `parse_frontmatter` | (reuse from `frontmatter.ts`) | Already extracted in Phase 0 |
| `read_project_state` | `readProjectState(projectPath)` | ~8 frontmatter fields with defaults |
| `phase_in_hil_list` | `phaseInHilList(phase, listStr)` | Substring check on serialized YAML array |
| `read_knowledge_status` | `readKnowledgeStatus(repoRoot)` | Frontmatter from `project-index.md` |
| `calculate_staleness` | `calculateStaleness(...)` | JS `Date` eliminates macOS/Linux branching |
| `compute_next_step` | `computeNextStep(...)` | State machine → recommended skill |
| `list_available_projects` | `listAvailableProjects(repoRoot, projectsRoot)` | Dir listing + phase from each `state.md` |
| `generate_dashboard` | `buildDashboardMarkdown(...)` | Template literals instead of heredoc |

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

**Important — best-effort git parity:** The shell script uses `|| true` and `2>/dev/null` for all git operations so it degrades gracefully in detached HEAD, shallow clone, non-git, and non-standard environments. The default `git` implementation must wrap every `execSync` call in try/catch and return sensible defaults on failure (e.g., `isGitRepo → false`, `diffFileCount → 0`). `generateStateDashboard` must never throw due to missing or invalid git metadata. Add test cases that inject a throwing `git` mock and verify the dashboard still generates with degraded (but valid) output.

**1.2 — Tests: `packages/cli/src/commands/state/generate.test.ts`**

Real temp dirs, filesystem assertions:
- No projects / no active project → recommends `oat-project-new`
- Active project with frontmatter → all fields in dashboard
- Missing active-project → graceful degradation
- Active-project pointing to non-existent dir → `"directory missing"`
- Knowledge index + git diff → staleness thresholds (fresh/aging/stale)
- `computeNextStep` state machine for full/quick/import modes + HiL gating
- Multiple projects listed

**1.3 — Command handler: `packages/cli/src/commands/state/index.ts`**

Standard pattern: `createStateCommand()` → `createStateRefreshCommand(overrides)` with DI, logger, exit codes.

**1.4 — Command handler tests: `packages/cli/src/commands/state/index.test.ts`**

`createLoggerCapture()` + `vi.fn()` mock for `generateStateDashboard`. Text/JSON modes, error case.

**1.5 — Register: update `packages/cli/src/commands/index.ts`**

Add `import { createStateCommand } from './state'` + `program.addCommand(createStateCommand())`.

**1.6 — Update `scaffold.ts` seam**

Replace `defaultRefreshDashboard` (currently `spawnSync('bash', [script])`) with direct call to `generateStateDashboard({ repoRoot })`. Make `refreshDashboardCallback` type support async (`() => void | Promise<void>`), await it in the caller.

**Important — keep refresh non-fatal:** The current shell-based refresh is effectively best-effort (non-zero exit does not throw). The new implementation must preserve this: wrap the `generateStateDashboard` call in a try/catch that logs the error and continues, so that `oat project new` never fails after scaffold work has already completed. The scaffold result should be returned successfully regardless of whether the dashboard refresh succeeded. Add a test case in `scaffold.test.ts` that verifies a throwing `refreshDashboardCallback` does not cause `scaffoldProject` to reject.

**1.7 — Update 6 skills**

| Skill | Current call | New call |
|---|---|---|
| `oat-project-clear-active` (line 49) | `.oat/scripts/generate-oat-state.sh` | `pnpm run cli -- state refresh` |
| `oat-project-open` (line 94) | `.oat/scripts/generate-oat-state.sh` | `pnpm run cli -- state refresh` |
| `oat-project-complete` (line 178) | `.oat/scripts/generate-oat-state.sh` | `pnpm run cli -- state refresh` |
| `oat-project-quick-start` (line 142) | `bash .oat/scripts/generate-oat-state.sh` | `pnpm run cli -- state refresh` |
| `oat-project-progress` (lines 275-277) | guarded `if [[ -f ... ]]` | `pnpm run cli -- state refresh` |
| `oat-repo-knowledge-index` (lines 656-658) | guarded `if [[ -f ... ]]` | `pnpm run cli -- state refresh` |

**1.8 — Add help snapshot test**

Add `state refresh --help` snapshot to `help-snapshots.test.ts`.

---

### Phase 2: B15 — `oat index init`

**2.1 — Core logic: `packages/cli/src/commands/index-cmd/thin-index.ts`**

Directory named `index-cmd/` to avoid collision with `commands/index.ts` barrel.

Translates the linear shell script blocks:

| Block | TS function | Notes |
|---|---|---|
| SHA resolution | `resolveHeadSha`, `resolveMergeBaseSha` | `execSync` with fallback chain; injectable; **must be non-throwing** (see below) |
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

**Important — best-effort git parity:** The shell script uses fallback chains (`git rev-parse HEAD || git log ... || echo unknown`) so it never fails in detached HEAD, shallow clone, or non-git environments. The default `git` implementation must wrap every `execSync` call in try/catch and return `"unknown"` on failure. `generateThinIndex` must never throw due to missing or invalid git metadata. Add test cases that inject a throwing `git` mock and verify the index still generates with `"unknown"` SHAs.

**2.2 — Tests: `packages/cli/src/commands/index-cmd/thin-index.test.ts`**

Real temp dirs:
- Provided SHAs appear in frontmatter
- Repo name from `package.json` vs basename fallback
- Package manager detection per lockfile type
- Directory tree excludes noise dirs, caps at 200
- Entry point detection at various depths
- Config file detection
- Output directory auto-created
- Output matches expected markdown structure

**2.3 — Command handler: `packages/cli/src/commands/index-cmd/index.ts`**

`createIndexCommand()` → `createIndexInitCommand(overrides)`. Options: `--head-sha <sha>`, `--merge-base-sha <sha>`.

**2.4 — Command handler tests: `packages/cli/src/commands/index-cmd/index.test.ts`**

Standard mock pattern. Verify SHA options forwarded, text/JSON output, error handling.

**2.5 — Register: update `packages/cli/src/commands/index.ts`**

Add `import { createIndexCommand } from './index-cmd'` + `program.addCommand(createIndexCommand())`.

**2.6 — Update 1 skill**

`oat-repo-knowledge-index` (line 71): change `bash .oat/scripts/generate-thin-index.sh "$HEAD_SHA" "$MERGE_BASE_SHA"` to `pnpm run cli -- index init --head-sha "$HEAD_SHA" --merge-base-sha "$MERGE_BASE_SHA"`.

**2.7 — Add help snapshot test**

Add `index init --help` snapshot to `help-snapshots.test.ts`.

---

### Phase 3: Cleanup (B16)

**3.1 — Delete scripts**
- `rm .oat/scripts/generate-oat-state.sh`
- `rm .oat/scripts/generate-thin-index.sh`
- `rmdir .oat/scripts/`

**3.2 — Update reference docs**

Replace all remaining `.oat/scripts/` references with CLI command equivalents:
- `.oat/repo/reference/current-state.md`
- `docs/oat/reference/oat-directory-structure.md`
- `docs/oat/reference/file-locations.md`
- `.oat/repo/reference/decision-record.md`
- `.oat/repo/reference/roadmap.md`
- `.oat/repo/reference/deferred-phases.md`
- `.agents/skills/update-repo-reference/SKILL.md`
- `.claude/settings.local.json` — remove bash permission patterns for deleted scripts (if any)

Verify with `rg -n '\.oat/scripts/' .` after edits — should return zero hits outside backlog-completed.md and review archives.

**3.3 — Move B14, B15, B16 to completed archive in `backlog-completed.md`**

---

## Verification

After each phase:
- `pnpm build` — no compilation errors
- `pnpm test` — all tests pass (including existing scaffold tests)
- `pnpm lint` + `pnpm type-check` — clean

End-to-end smoke tests:
- `pnpm run cli -- state refresh` → `.oat/state.md` regenerated with correct content
- `pnpm run cli -- index init` → `.oat/repo/knowledge/project-index.md` regenerated
- `pnpm run cli -- state refresh --json` → JSON payload with status/fields
- `pnpm run cli -- index init --head-sha abc123 --merge-base-sha def456` → provided SHAs in frontmatter

## File Summary

**New files (11):**
```
packages/cli/src/commands/shared/oat-paths.ts
packages/cli/src/commands/shared/frontmatter.ts
packages/cli/src/commands/shared/frontmatter.test.ts
packages/cli/src/commands/state/generate.ts
packages/cli/src/commands/state/generate.test.ts
packages/cli/src/commands/state/index.ts
packages/cli/src/commands/state/index.test.ts
packages/cli/src/commands/index-cmd/thin-index.ts
packages/cli/src/commands/index-cmd/thin-index.test.ts
packages/cli/src/commands/index-cmd/index.ts
packages/cli/src/commands/index-cmd/index.test.ts
```

**Modified files (18):**
```
packages/cli/src/fs/io.ts                          (add fileExists)
packages/cli/src/fs/index.ts                       (export fileExists)
packages/cli/src/commands/index.ts                  (register state + index)
packages/cli/src/commands/project/new/scaffold.ts   (import shared utils, update seam)
packages/cli/src/commands/help-snapshots.test.ts    (add 2 snapshots)
.agents/skills/oat-project-clear-active/SKILL.md
.agents/skills/oat-project-open/SKILL.md
.agents/skills/oat-project-complete/SKILL.md
.agents/skills/oat-project-quick-start/SKILL.md
.agents/skills/oat-project-progress/SKILL.md
.agents/skills/oat-repo-knowledge-index/SKILL.md
.agents/skills/update-repo-reference/SKILL.md
docs/oat/reference/oat-directory-structure.md
docs/oat/reference/file-locations.md
.oat/repo/reference/current-state.md
.oat/repo/reference/decision-record.md
.oat/repo/reference/roadmap.md
.oat/repo/reference/deferred-phases.md
```

**Deleted files (2 + directory):**
```
.oat/scripts/generate-oat-state.sh
.oat/scripts/generate-thin-index.sh
.oat/scripts/                          (directory)
```
