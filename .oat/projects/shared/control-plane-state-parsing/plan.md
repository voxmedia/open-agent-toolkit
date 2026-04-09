---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-09
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05']
oat_auto_review_at_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: control-plane-state-parsing

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Build a pure TypeScript control plane library (`packages/control-plane/`) that parses OAT project state from markdown artifacts into structured typed data, and expose it via CLI commands (`oat project status`, `oat project list`, `oat config dump`).

**Architecture:** `packages/control-plane/` (pure library, no CLI/UI deps) → imported by `packages/cli/` which adds three new commands. Control plane takes file paths as input, returns typed objects. CLI resolves config and passes paths in.

**Tech Stack:** TypeScript 5.8, Vitest, yaml (v2.8.2), Node.js fs/path builtins, commander (existing CLI framework)

**Commit Convention:** `feat({task-id}): {description}` - e.g., `feat(p01-t01): scaffold control-plane package`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (none — quick mode)
- [x] Set `oat_plan_hill_phases` in frontmatter (empty)

---

## Phase 1: Control Plane — Package and Types

### Task p01-t01: Scaffold `packages/control-plane/` package

**Files:**

- Create: `packages/control-plane/package.json`
- Create: `packages/control-plane/tsconfig.json`
- Create: `packages/control-plane/src/index.ts`
- Create: `packages/control-plane/src/types.ts`

**Step 1: Create `packages/control-plane/package.json`**

```json
{
  "name": "@open-agent-toolkit/control-plane",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "engines": { "node": ">=22.17.0" },
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "dev": "tsc --watch",
    "lint": "oxlint .",
    "format": "oxfmt --check .",
    "format:fix": "oxfmt .",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "yaml": "2.8.2"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.8.3",
    "vitest": "^4.0.18"
  }
}
```

**Step 2: Create `packages/control-plane/tsconfig.json`**

Extend root tsconfig. No path aliases — use relative imports throughout (package is small enough).

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
```

**Step 3: Create `packages/control-plane/src/types.ts`**

Define all shared types from the design: `Phase`, `PhaseStatus`, `WorkflowMode`, `ExecutionMode`, `Lifecycle`, `ArtifactType`, `ArtifactStatus`, `TaskProgress`, `PhaseProgress`, `ReviewStatus`, `ProjectState`, `ProjectSummary`, `SkillRecommendation`, `BoundaryTier`.

**Step 4: Create `packages/control-plane/src/index.ts`**

Re-export all types. Add placeholder exports for `getProjectState`, `listProjects`, `recommendSkill` (throw "not implemented" — filled in by later tasks).

**Step 5: Verify**

Run: `pnpm install && pnpm --filter @open-agent-toolkit/control-plane build && pnpm --filter @open-agent-toolkit/control-plane type-check`
Expected: Clean compile, `dist/` contains `.js` and `.d.ts` files.

**Step 6: Commit**

```bash
git add packages/control-plane/
git commit -m "feat(p01-t01): scaffold control-plane package with shared types"
```

---

### Task p01-t02: State.md frontmatter parser

**Files:**

- Create: `packages/control-plane/src/state/parser.ts`
- Create: `packages/control-plane/src/state/parser.test.ts`

**Step 1: Write test (RED)**

Test `parseStateFrontmatter(content: string)` with:

- Valid state.md content → returns typed fields (phase, phaseStatus, workflowMode, executionMode, lifecycle, blockers as array, hillCheckpoints as array, hillCompleted as array, timestamps, prStatus, prUrl, docsUpdated, lastCommit)
- Missing optional fields → returns null/defaults
- Blockers as YAML array vs JSON string → both parse correctly
- Malformed frontmatter → throws or returns defaults gracefully

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

- Extract frontmatter block between `---` delimiters
- Parse with `YAML.parse()` from `yaml` package
- Map YAML keys (`oat_phase`, `oat_phase_status`, etc.) to typed fields with defaults
- Handle `oat_blockers`/`oat_hill_checkpoints`/`oat_hill_completed` which may be YAML arrays, JSON strings, or the template placeholder `{ OAT_HILL_CHECKPOINTS }`
- Normalize `null` and `"null"` strings to actual null

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/control-plane/src/state/
git commit -m "feat(p01-t02): state.md frontmatter parser with YAML parsing"
```

---

### Task p01-t03: Artifact scanner and boundary tier detection

**Files:**

- Create: `packages/control-plane/src/state/artifacts.ts`
- Create: `packages/control-plane/src/state/artifacts.test.ts`
- Create: `packages/control-plane/src/recommender/boundary.ts`
- Create: `packages/control-plane/src/recommender/boundary.test.ts`

**Step 1: Write test (RED)**

Test `detectBoundaryTier(frontmatter, content)`:

- `oat_status: complete` + `oat_ready_for` present → Tier 1
- `oat_status: complete` + no `oat_ready_for` → Tier 1
- `oat_status: in_progress` + `oat_template: false` + no placeholders → Tier 2
- `oat_template: true` → Tier 3
- Missing `oat_template` + placeholder `{Project Name}` present → Tier 3
- File doesn't exist → Tier 3

Test `scanArtifacts(projectPath)`:

- Project directory with all 6 artifact files → returns 6 `ArtifactStatus` entries with correct tiers
- Project with only state.md and discovery.md → missing artifacts get `exists: false`, tier 3

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

`boundary.ts`:

- Pure function: `detectBoundaryTier(frontmatter: Record<string, unknown>, content: string): BoundaryTier`
- Tier 1: `oat_status === "complete"`
- Tier 2: `oat_status === "in_progress"` AND `oat_template` is not true AND no template placeholders
- Tier 3: everything else
- Template placeholder patterns: `{Project Name}`, `{Copy of`, `{Clear description`

`artifacts.ts`:

- For each of the 6 artifact types, construct file path, check existence, read frontmatter if exists, call `detectBoundaryTier()`
- Return `ArtifactStatus[]`

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/control-plane/src/state/artifacts.ts packages/control-plane/src/state/artifacts.test.ts packages/control-plane/src/recommender/
git commit -m "feat(p01-t03): artifact scanner with boundary tier detection"
```

---

### Task p01-t04: Task progress parser

**Files:**

- Create: `packages/control-plane/src/state/tasks.ts`
- Create: `packages/control-plane/src/state/tasks.test.ts`

**Step 1: Write test (RED)**

Test `parseTaskProgress(planContent, implContent)`:

- Plan with 2 phases, 5 tasks total; impl with 3 completed → `{ total: 5, completed: 3, phases: [...] }`
- Plan with revision phase (`p-rev1`) → `isRevision: true` on that phase entry
- Empty/template plan → `{ total: 0, completed: 0 }`
- Implementation frontmatter `oat_current_task_id: p01-t03` → parsed as `currentTaskId`

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Plan parsing:

- Match phase headings: `/^## Phase \d+: (.+)$/m` or `/^## (Revision Phase .+)$/m`
- Match task headings: `/^### Task (p\d+-t\d+|p-rev\d+-t\d+): (.+)$/m`
- Group tasks under their phase heading
- Detect revision phases by `p-rev` prefix in task IDs

Implementation parsing:

- Match task sections and look for `**Status:** completed` within each
- Parse `oat_current_task_id` from frontmatter

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/control-plane/src/state/tasks.ts packages/control-plane/src/state/tasks.test.ts
git commit -m "feat(p01-t04): task progress parser for plan.md and implementation.md"
```

---

### Task p01-t05: Review status aggregator

**Files:**

- Create: `packages/control-plane/src/state/reviews.ts`
- Create: `packages/control-plane/src/state/reviews.test.ts`

**Step 1: Write test (RED)**

Test `parseReviewTable(planContent)`:

- Plan with Reviews table containing 5 rows → returns 5 `ReviewStatus` entries
- No Reviews section → returns empty array

Test `scanUnprocessedReviews(projectPath)`:

- reviews/ directory with 2 `.md` files → returns 2 file paths
- reviews/ with `archived/` subdirectory → excludes archived files
- No reviews/ directory → returns empty array

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

`parseReviewTable`:

- Find `## Reviews` section in plan content
- Parse markdown table rows after the header
- Extract scope, type, status, date, artifact columns

`scanUnprocessedReviews`:

- Read reviews/ directory entries
- Filter to `.md` files, exclude `archived/` subdirectory
- Return file paths

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/control-plane/src/state/reviews.ts packages/control-plane/src/state/reviews.test.ts
git commit -m "feat(p01-t05): review status aggregator from plan table and reviews directory"
```

---

## Phase 2: Skill Recommender

### Task p02-t01: Phase routing state machine

**Files:**

- Create: `packages/control-plane/src/recommender/router.ts`
- Create: `packages/control-plane/src/recommender/router.test.ts`

**Step 1: Write test (RED)**

Test `recommendSkill(state)` — pure function, no I/O.

Early phase routing tests (cover all workflow mode × phase × status × tier combos from design):

- Spec-driven, discovery, in_progress, tier 3 → `oat-project-discover`
- Spec-driven, discovery, in_progress, tier 2 → `oat-project-spec`
- Spec-driven, discovery, complete, tier 1 → `oat-project-spec`
- Quick, discovery, complete, tier 1 → `oat-project-plan`
- Import, plan, in_progress, tier 3 → `oat-project-import-plan`
- Plan complete → `oat-project-implement`
- (Cover all rows from the three routing tables in the design)

HiLL gating tests:

- Phase in hillCheckpoints but not hillCompleted → routes to current phase skill
- Phase in both → normal routing

Execution mode tests:

- When routing to implement and executionMode is `subagent-driven` → `oat-project-subagent-implement`

Post-implementation router tests (6 steps):

- Incomplete revision tasks → implement
- Unprocessed reviews exist → review-receive
- Final code review pending → review-provide with "code final" context
- Final code review fixes_completed → review-provide
- Final code review other non-passed status → review-receive
- Final code review passed, summary not done → summary
- Summary done, PR not created → pr-final
- PR is open → complete

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Port routing logic from `oat-project-next` skill:

1. HiLL gate override check (first)
2. Early phase routing table (keyed on workflowMode × phase × phaseStatus × boundaryTier)
3. Post-implementation 6-step cascade (phase=implement, status=complete|pr_open)
4. Execution mode substitution (implement → subagent-implement when applicable)

The function signature:

```typescript
export function recommendSkill(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation;
```

All inputs are already-parsed state — no file reads.

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts
git commit -m "feat(p02-t01): skill recommender with full routing state machine"
```

---

## Phase 3: Public API and Integration

### Task p03-t01: Wire up `getProjectState` and `listProjects`

**Files:**

- Create: `packages/control-plane/src/project.ts`
- Create: `packages/control-plane/src/project.test.ts`
- Modify: `packages/control-plane/src/index.ts`

**Step 1: Write test (RED)**

Test `getProjectState(projectPath)`:

- Create a temp directory with realistic state.md, plan.md, implementation.md, discovery.md, reviews/ directory
- Call `getProjectState()` → returns full `ProjectState` with all fields populated, including computed recommendation

Test `listProjects(projectsRoot)`:

- Create a temp directory with 3 project subdirectories in different phases
- Call `listProjects()` → returns 3 `ProjectSummary` entries sorted by name
- Directory with no projects → returns empty array

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

`getProjectState(projectPath)`:

1. Call `parseStateFrontmatter()` on `{projectPath}/state.md`
2. Call `scanArtifacts(projectPath)` for all artifact statuses
3. Call `parseTaskProgress()` on plan.md + implementation.md content
4. Call `parseReviewTable()` on plan.md content + `scanUnprocessedReviews()`
5. Assemble partial state object
6. Call `recommendSkill(state)` to compute recommendation
7. Return complete `ProjectState`

`listProjects(projectsRoot)`:

1. Read directory entries under projectsRoot
2. Filter to directories containing `state.md`
3. For each, call a lightweight version that parses only state.md + task counts
4. Return `ProjectSummary[]`

Update `src/index.ts` to export the real functions (replace placeholders from p01-t01).

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane build && pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
Expected: No errors. Build succeeds. Exports are correct.

**Step 4: Commit**

```bash
git add packages/control-plane/
git commit -m "feat(p03-t01): wire up getProjectState and listProjects public API"
```

---

## Phase 4: CLI Commands

### Task p04-t01: Add `@open-agent-toolkit/control-plane` dependency to CLI

**Files:**

- Modify: `packages/cli/package.json`

**Step 1: Add workspace dependency**

Add `"@open-agent-toolkit/control-plane": "workspace:*"` to `dependencies` in `packages/cli/package.json`.

**Step 2: Verify**

Run: `pnpm install && pnpm build`
Expected: Clean build across both packages. Turborepo handles build ordering.

**Step 3: Commit**

```bash
git add packages/cli/package.json pnpm-lock.yaml
git commit -m "feat(p04-t01): add control-plane workspace dependency to CLI"
```

---

### Task p04-t02: `oat project status` command

**Files:**

- Create: `packages/cli/src/commands/project/status.ts`
- Create: `packages/cli/src/commands/project/status.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

Test the command handler:

- With active project set → calls `getProjectState()`, outputs JSON with full ProjectState
- With no active project set → outputs error JSON with status "unset"
- With `--json` flag → outputs valid JSON to stdout
- Without `--json` flag → outputs formatted text summary

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Follow existing command patterns (see `state/index.ts` for reference):

1. Create `createProjectStatusCommand()` returning a commander `Command`
2. Use `buildCommandContext()` + `readGlobalOptions()` for context
3. Resolve active project using `resolveActiveProject()` from `@config/oat-config`
4. Call `getProjectState()` from `@open-agent-toolkit/control-plane` with the resolved absolute path
5. JSON output: `context.logger.json({ status: 'ok', project: result })`
6. Text output: formatted table with key fields (phase, status, progress, recommendation, etc.)

Register in `packages/cli/src/commands/project/index.ts`.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

Run manual test: `pnpm run cli -- project status --json`
Expected: Returns JSON with current project state

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/
git commit -m "feat(p04-t02): oat project status command with JSON output"
```

---

### Task p04-t03: `oat project list` command

**Files:**

- Create: `packages/cli/src/commands/project/list.ts`
- Create: `packages/cli/src/commands/project/list.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

Test the command handler:

- Multiple projects in projects root → outputs JSON array of ProjectSummary
- No projects → outputs empty array
- JSON flag → valid JSON output

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/list.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

1. Resolve projects root using `resolveProjectsRoot()` from `@commands/shared/oat-paths`
2. Call `listProjects()` from control plane with absolute path
3. JSON output: `{ status: 'ok', projects: [...] }`
4. Text output: table with columns: name, phase, status, progress, recommendation

Register in `packages/cli/src/commands/project/index.ts`.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/list.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

Run manual test: `pnpm run cli -- project list --json`
Expected: Returns JSON array of all projects with summary state

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/
git commit -m "feat(p04-t03): oat project list command with JSON output"
```

---

### Task p04-t04: Config resolution utility and `oat config dump` command

**Files:**

- Create: `packages/cli/src/config/resolve.ts`
- Create: `packages/cli/src/config/resolve.test.ts`
- Create: `packages/cli/src/commands/config/dump.ts`
- Create: `packages/cli/src/commands/config/dump.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`

**Context:** The follow-up `workflow-friction` project will add `workflow.*` preference keys to OatConfig/OatLocalConfig/UserConfig and needs 3-layer resolution with per-key source attribution. The merge logic built here must be reusable — the dump command is a thin consumer, not the owner of the merge logic.

**Step 1: Write test for `resolveEffectiveConfig` (RED)**

Test the resolution utility (`packages/cli/src/config/resolve.test.ts`):

- All three config surfaces present → returns `shared`, `local`, `user`, and `resolved` sections
- Per-key source attribution: `resolved` is a `Record<string, { value: unknown; source: 'shared' | 'local' | 'user' | 'env' | 'default' }>` where each key tracks its winning source
- Precedence: local overrides shared, user provides fallback for keys not in shared/local (e.g., `activeIdea`)
- Env overrides: `OAT_PROJECTS_ROOT` overrides `projects.root` with source `'env'`
- Missing config files → defaults used, source is `'default'`
- Generic key walking: adding a new top-level key to the interfaces should be resolved without changes to the merge logic (test with a hypothetical key)
- Nested keys flattened to dot notation in resolved output (e.g., `projects.root`, `documentation.tooling`, `archive.s3Uri`)

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/config/resolve.test.ts`
Expected: Tests fail (RED)

**Step 2: Implement `resolveEffectiveConfig` (GREEN)**

Create `packages/cli/src/config/resolve.ts`:

```typescript
interface ResolvedKeyEntry {
  value: unknown;
  source: 'shared' | 'local' | 'user' | 'env' | 'default';
}

interface ResolvedConfig {
  shared: OatConfig;
  local: OatLocalConfig;
  user: UserConfig;
  resolved: Record<string, ResolvedKeyEntry>;
}

export async function resolveEffectiveConfig(
  repoRoot: string,
  userConfigDir: string,
  env?: NodeJS.ProcessEnv,
): Promise<ResolvedConfig>;
```

Implementation approach:

1. Read all three config surfaces using existing `readOatConfig()`, `readOatLocalConfig()`, `readUserConfig()`
2. Flatten each surface's keys to dot-notation entries (generic walk, not hardcoded per-key)
3. Apply precedence: for each key, local > shared > user, tracking which surface won
4. Apply env overrides for known env-mapped keys (`OAT_PROJECTS_ROOT` → `projects.root`, `OAT_WORKTREES_ROOT` → `worktrees.root`), source becomes `'env'`
5. Keys with no value from any source get source `'default'` with the framework default
6. Return the three raw surfaces plus the resolved per-key map

The merge is generic: it walks all keys present across the three surfaces rather than hardcoding known keys. Adding new top-level keys (e.g., `workflow.*`) to the config interfaces will be resolved automatically without changes to this function.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/config/resolve.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Write test for dump command (RED)**

Test the command handler (`packages/cli/src/commands/config/dump.test.ts`):

- JSON output includes `shared`, `local`, `user`, and `resolved` sections
- `resolved` section has per-key source attribution
- Missing config files → defaults are used with `'default'` source

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/config/dump.test.ts`
Expected: Tests fail (RED)

**Step 4: Implement dump command (GREEN)**

The command is a thin wrapper:

1. Call `resolveEffectiveConfig(repoRoot, userConfigDir, env)`
2. JSON output: `{ status: 'ok', ...result }`
3. Text output: key-value list grouped by source

Register in config command index.

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/config/dump.test.ts`
Expected: Tests pass (GREEN)

**Step 5: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

Run manual test: `pnpm run cli -- config dump --json`
Expected: Returns merged config JSON with per-key source attribution

**Step 6: Commit**

```bash
git add packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts packages/cli/src/commands/config/
git commit -m "feat(p04-t04): config resolution utility and oat config dump command"
```

---

## Phase 5: Final Verification

### Task p05-t01: Full build, test suite, and release validation

**Files:**

- Modify: `packages/cli/assets/public-package-versions.json` (version bump)
- Possibly modify: other publishable package version files if lockstep requires it

**Note:** Phase 4 modifies `packages/cli/` which is a publishable package (`@open-agent-toolkit/cli`). Per AGENTS.md, any PR that changes shipped functionality in a publishable package must include lockstep public package version bumps and pass `pnpm release:validate`.

**Step 1: Bump public package versions**

Bump versions in lockstep across all publishable packages per repo convention. Check `packages/cli/assets/public-package-versions.json` and any other versioning files.

**Step 2: Run full workspace build**

Run: `pnpm build`
Expected: All packages build successfully, including control-plane → CLI dependency chain

**Step 3: Run full test suite**

Run: `pnpm test`
Expected: All tests pass across both packages

**Step 4: Run lint and type-check**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Run release validation**

Run: `pnpm release:validate`
Expected: Passes — version bumps are correct, publishable packages are consistent

**Step 6: Manual smoke test**

Run:

```bash
pnpm run cli -- project status --json
pnpm run cli -- project list --json
pnpm run cli -- config dump --json
```

Expected: All three commands return valid JSON with correct data for the current repo state

**Step 7: Commit**

```bash
git add packages/
git commit -m "chore(p05-t01): version bumps, release validation, and final verification"
```

---

## Phase 6: Review Fixes

### Task p06-t01: (review) Parse lifecycle state fields from `state.md`

**Files:**

- Modify: `packages/control-plane/src/types.ts`
- Modify: `packages/control-plane/src/state/parser.ts`
- Modify: `packages/control-plane/src/state/parser.test.ts`
- Modify: `packages/control-plane/src/project.ts`
- Modify: `packages/control-plane/src/project.test.ts`

**Step 1: Understand the issue**

Review finding: The control plane never parses lifecycle state from `state.md`, so completed or paused projects are always reported as active with null pause metadata.
Location: `packages/control-plane/src/state/parser.ts`, `packages/control-plane/src/project.ts`

**Step 2: Implement fix**

Update the parser and project assembly to honor the lifecycle contract:

1. Extend the parsed state model to include `oat_lifecycle`, `oat_pause_timestamp`, and `oat_pause_reason` when present.
2. Normalize lifecycle values so active/completed/paused state is represented consistently in the returned project state.
3. Stop hardcoding `lifecycle`, `pauseTimestamp`, and `pauseReason` in `getProjectState()` / `listProjects()` and instead source them from parsed frontmatter with safe defaults.
4. Add regression coverage for completed/paused project state so downstream consumers can distinguish active vs completed/paused projects correctly.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Parser and integration tests pass, including lifecycle-state coverage

Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check && pnpm --filter @open-agent-toolkit/control-plane build`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/src/project.ts packages/control-plane/src/project.test.ts
git commit -m "fix(p06-t01): parse lifecycle state in control plane"
```

---

### Task p06-t02: (review) Return repo-relative project paths from control-plane state

**Files:**

- Modify: `packages/control-plane/src/project.ts`
- Modify: `packages/control-plane/src/project.test.ts`
- Modify: `packages/cli/src/commands/project/status.test.ts`
- Modify: `packages/cli/src/commands/project/list.test.ts`

**Step 1: Understand the issue**

Review finding: `ProjectState.path` and `ProjectSummary.path` are returned as absolute filesystem paths even though the design defines them as repo-relative paths.
Location: `packages/control-plane/src/project.ts`, `packages/cli/src/commands/project/status.ts`, `packages/cli/src/commands/project/list.ts`

**Step 2: Implement fix**

Align the returned path contract with the design:

1. Ensure the control-plane project state surfaces repo-relative project paths rather than machine-specific absolute paths.
2. Keep filesystem reads working for both `getProjectState()` and `listProjects()` while separating internal read paths from outward-facing `path` values.
3. Update command-level expectations so `project status --json` and `project list --json` expose stable repo-relative paths.
4. Add regression coverage for absolute-input path handling so callers can still pass absolute paths without leaking them in output.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane test`
Expected: Project-state integration tests pass with repo-relative path expectations

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts src/commands/project/list.test.ts`
Expected: Command tests pass with repo-relative JSON output expectations

Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/control-plane/src/project.ts packages/control-plane/src/project.test.ts packages/cli/src/commands/project/status.test.ts packages/cli/src/commands/project/list.test.ts
git commit -m "fix(p06-t02): return repo-relative project paths"
```

---

## Reviews

| Scope | Type     | Status      | Date       | Artifact                                            |
| ----- | -------- | ----------- | ---------- | --------------------------------------------------- |
| p01   | code     | pending     | -          | -                                                   |
| p02   | code     | pending     | -          | -                                                   |
| p03   | code     | pending     | -          | -                                                   |
| p04   | code     | pending     | -          | -                                                   |
| final | code     | fixes_added | 2026-04-09 | reviews/archived/final-review-2026-04-09.md         |
| plan  | artifact | passed      | 2026-04-09 | reviews/archived/artifact-plan-review-2026-04-09.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

_This section will be updated during implementation as phases are completed._

**Plan summary:**

- Phase 1: 5 tasks — Package scaffold, state parser, artifact scanner, task progress parser, review aggregator
- Phase 2: 1 task — Skill recommender with full routing state machine
- Phase 3: 1 task — Public API wiring and integration tests
- Phase 4: 4 tasks — CLI dependency, project status command, project list command, config dump command (with reusable resolution utility)
- Phase 5: 1 task — Version bumps, release validation, and final verification
- Phase 6: 2 tasks — Review fixes for lifecycle parsing and repo-relative project path output

**Total: 14 tasks**

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Prior art: `reference/2026-04-03-control-plane-current-state.md`
- March 15 design spec: `reference/2026-03-15-oat-dashboard-design.md`
- March 15 delta audit: `reference/2026-04-03-march15-design-audit.md`
