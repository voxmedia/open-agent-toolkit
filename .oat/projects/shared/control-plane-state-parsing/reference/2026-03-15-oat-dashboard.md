# OAT Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a project-aware control plane, dashboard server, and web UI for managing OAT workflows across repos, worktrees, and agent sessions.

**Architecture:** Three-layer stack — `@oat/control-plane` (pure TypeScript library) → `@oat/dashboard-server` (Hono HTTP + WebSocket) → `apps/dashboard-ui` (React + Tailwind). The control plane reads OAT markdown artifacts from disk and exposes typed APIs. The server wraps those APIs for the web client. A new `oat dashboard` CLI command starts everything.

**Tech Stack:** TypeScript 5.8, Vitest, Hono, React 19, Tailwind CSS 4, chokidar, Turborepo, pnpm workspaces.

**Spec:** `.superpowers/specs/2026-03-15-oat-dashboard-design.md`

---

## Chunk 1: Control Plane — Types and Project State

### Task 1: Package scaffold for `@oat/control-plane`

**Files:**

- Create: `packages/control-plane/package.json`
- Create: `packages/control-plane/tsconfig.json`
- Create: `packages/control-plane/src/index.ts`
- Create: `packages/control-plane/src/types.ts`

- [ ] **Step 1: Create `packages/control-plane/package.json`**

```json
{
  "name": "@oat/control-plane",
  "version": "0.1.0",
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
  "engines": {
    "node": ">=22.17.0"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "oxlint .",
    "format": "oxfmt --check .",
    "format:fix": "oxfmt --write .",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "yaml": "^2.8.2",
    "chokidar": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.8.3",
    "vitest": "^4.0.18"
  }
}
```

Note: `yaml` is used for parsing `state.md` frontmatter (same package used by `@oat/cli`). `chokidar` is for file watching (Task 5).

- [ ] **Step 2: Create `packages/control-plane/tsconfig.json`**

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

Note: No path aliases — use relative imports (`./projects/parser.js`) throughout. The package is small enough that relative imports are clean. This avoids needing `tsc-alias` in the build pipeline.

- [ ] **Step 3: Create `packages/control-plane/src/types.ts`**

All shared types from the spec — `Phase`, `PhaseStatus`, `WorkflowMode`, `ProjectState`, `ProjectLocation`, `DisplayState`, `ArtifactType`, `ArtifactInfo`, `PendingAction`, `FullState`, `SkillInfo`, `SkillRecommendation`, `AgentSession`, `DispatchOptions`.

Copy the interfaces directly from the spec at `.superpowers/specs/2026-03-15-oat-dashboard-design.md` lines 104–175 and 198–306.

- [ ] **Step 4: Create `packages/control-plane/src/index.ts`**

```typescript
export type {
  Phase,
  PhaseStatus,
  WorkflowMode,
  ProjectState,
  ProjectLocation,
  DisplayState,
  ArtifactType,
  ArtifactInfo,
  PendingAction,
  FullState,
  SkillInfo,
  SkillRecommendation,
  AgentSession,
  DispatchOptions,
} from './types.js';
```

- [ ] **Step 5: Add to pnpm workspace and verify build**

Run: `pnpm install && pnpm --filter @oat/control-plane build`
Expected: Clean compile, `dist/` contains `.js` and `.d.ts` files.

- [ ] **Step 6: Commit**

```bash
git add packages/control-plane/
git commit -m "feat(control-plane): scaffold package with shared types"
```

---

### Task 2: State.md frontmatter parser

**Files:**

- Create: `packages/control-plane/src/projects/parser.ts`
- Create: `packages/control-plane/src/projects/parser.test.ts`

This module parses `state.md` YAML frontmatter into typed `ProjectState` fields. It also checks for artifact file existence and reads `plan.md`/`implementation.md` to extract task progress.

**Reference:** Look at an existing `state.md` for the frontmatter format — e.g. `.oat/projects/shared/deep-research/state.md`. Key fields: `oat_phase`, `oat_phase_status`, `oat_workflow_mode`, `oat_blockers`, `oat_current_task`, `oat_hill_checkpoints`, `oat_hill_completed`, `oat_project_created`, `oat_project_completed`, `oat_project_state_updated`.

- [ ] **Step 1: Write failing test — parse state.md frontmatter**

```typescript
// packages/control-plane/src/projects/parser.test.ts
import { describe, expect, it } from 'vitest';
import { parseStateFrontmatter } from './parser.js';

describe('parseStateFrontmatter', () => {
  it('parses valid state.md content into structured fields', () => {
    const content = `---
oat_phase: implement
oat_phase_status: in_progress
oat_workflow_mode: quick
oat_blockers: []
oat_current_task: "task-3"
oat_hill_checkpoints: []
oat_hill_completed: []
oat_project_created: '2026-03-10T00:00:00.000Z'
oat_project_completed: null
oat_project_state_updated: '2026-03-15T00:00:00.000Z'
---

# Project Name
`;
    const result = parseStateFrontmatter(content);
    expect(result.phase).toBe('implement');
    expect(result.phaseStatus).toBe('in_progress');
    expect(result.workflowMode).toBe('quick');
    expect(result.blockers).toEqual([]);
    expect(result.timestamps.created).toBe('2026-03-10T00:00:00.000Z');
    expect(result.timestamps.completed).toBeUndefined();
  });

  it('handles spec-driven workflow with blockers', () => {
    const content = `---
oat_phase: design
oat_phase_status: complete
oat_workflow_mode: spec-driven
oat_blockers:
  - "waiting on API decision"
oat_current_task: null
oat_hill_checkpoints:
  - discovery
  - spec
oat_hill_completed:
  - discovery
oat_project_created: '2026-03-08T00:00:00.000Z'
oat_project_completed: null
oat_project_state_updated: '2026-03-14T00:00:00.000Z'
---
`;
    const result = parseStateFrontmatter(content);
    expect(result.phase).toBe('design');
    expect(result.phaseStatus).toBe('complete');
    expect(result.workflowMode).toBe('spec-driven');
    expect(result.blockers).toEqual(['waiting on API decision']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @oat/control-plane test -- src/projects/parser.test.ts`
Expected: FAIL — `parseStateFrontmatter` not found.

- [ ] **Step 3: Implement `parseStateFrontmatter`**

```typescript
// packages/control-plane/src/projects/parser.ts

interface ParsedStateFrontmatter {
  phase: Phase;
  phaseStatus: PhaseStatus;
  workflowMode: WorkflowMode;
  blockers: string[];
  currentTask: string | null;
  hillCheckpoints: string[];
  hillCompleted: string[];
  timestamps: {
    created: string;
    completed?: string;
    stateUpdated: string;
  };
}
```

Parse the YAML frontmatter between `---` delimiters. Split content on `---`, take the middle section, parse with the `yaml` package (`import { parse } from 'yaml'` — same package already used by `@oat/cli`).

Extract each `oat_*` field and map to the typed interface. Handle `null` values for `oat_project_completed` (map to `undefined`). Handle arrays for `oat_blockers`, `oat_hill_checkpoints`, `oat_hill_completed`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @oat/control-plane test -- src/projects/parser.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test — parse task progress from plan.md**

Test `parseTaskProgress(planContent, implementationContent)` that extracts completed/total task counts.

Sample `plan.md` input (tasks are `### Task N:` headings with `- [ ]`/`- [x]` steps):

```markdown
### Task 1: Setup database

- [x] Step 1: Create schema
- [x] Step 2: Run migration

### Task 2: Build API

- [x] Step 1: Define routes
- [ ] Step 2: Implement handlers

### Task 3: Add tests

- [ ] Step 1: Write unit tests
```

Sample `implementation.md` input (current task marked in a status table):

```markdown
| Task                   | Status      |
| ---------------------- | ----------- |
| Task 1: Setup database | complete    |
| Task 2: Build API      | in-progress |
| Task 3: Add tests      | pending     |
```

Expected output: `{ completed: 1, total: 3, currentTask: 'Task 2: Build API' }`

The parser counts `### Task N:` headings as the total, checks implementation.md status table for completed count, and finds the `in-progress` row for currentTask.

- [ ] **Step 6: Implement `parseTaskProgress`**

- [ ] **Step 7: Run tests, verify pass**

Run: `pnpm --filter @oat/control-plane test -- src/projects/parser.test.ts`
Expected: All PASS

- [ ] **Step 8: Write failing test — `checkArtifacts` function**

Test `checkArtifacts(projectDir)` that checks which artifact files exist (`discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `reviews/`) and returns a `Map<ArtifactType, ArtifactInfo>`. Use `fs.stat` to get `lastModified`.

- [ ] **Step 9: Implement `checkArtifacts`**

- [ ] **Step 10: Run tests, verify pass**

- [ ] **Step 11: Commit**

```bash
git add packages/control-plane/src/projects/
git commit -m "feat(control-plane): state.md parser, task progress, artifact checker"
```

---

### Task 3: Project scanner — discover projects across repos and worktrees

**Files:**

- Create: `packages/control-plane/src/projects/scanner.ts`
- Create: `packages/control-plane/src/projects/scanner.test.ts`

This module discovers OAT projects by scanning repo root paths and their worktrees.

- [ ] **Step 1: Write failing test — `listWorktrees`**

Test that `listWorktrees(repoPath)` runs `git worktree list --porcelain` and parses the output into `{ path: string; branch: string; isMain: boolean }[]`.

Mock `child_process.execFile` to return known porcelain output:

```
worktree /Users/me/Code/repo
HEAD abc123
branch refs/heads/main

worktree /Users/me/Code/repo/.worktrees/feature
HEAD def456
branch refs/heads/feature-branch
```

- [ ] **Step 2: Implement `listWorktrees`**

- [ ] **Step 3: Run test, verify pass**

- [ ] **Step 4: Write failing test — `scanForProjects`**

Test that `scanForProjects(repoPath)` reads `.oat/projects/` directory structure and returns discovered project entries with `{ name, scope, path }`. It should find projects under all scopes (e.g. `shared/`, `local/`).

Use a temp directory fixture with a mock `.oat/projects/shared/my-project/state.md`.

- [ ] **Step 5: Implement `scanForProjects`**

Read `.oat/projects/` directory. For each scope directory, for each project directory within it, check if `state.md` exists. If yes, return it as a discovered project.

- [ ] **Step 6: Run test, verify pass**

- [ ] **Step 7: Write failing test — `discoverAllProjects`**

Test the top-level function that ties it together: given repo roots, list worktrees for each, scan for projects in each worktree, deduplicate by `repo:scope:name`, merge locations.

- [ ] **Step 8: Implement `discoverAllProjects`**

Calls `listWorktrees` for each repo, then `scanForProjects` for each worktree path, then `parseStateFrontmatter` + `checkArtifacts` + `parseTaskProgress` for each discovered project. Deduplicates by building the `id` (`repo:scope:name`) and merging `ProjectLocation` arrays.

- [ ] **Step 9: Run all tests, verify pass**

Run: `pnpm --filter @oat/control-plane test`
Expected: All PASS

- [ ] **Step 10: Commit**

```bash
git add packages/control-plane/src/projects/
git commit -m "feat(control-plane): project scanner with worktree discovery"
```

---

### Task 4: Pending action detection and lifecycle

**Files:**

- Create: `packages/control-plane/src/projects/lifecycle.ts`
- Create: `packages/control-plane/src/projects/lifecycle.test.ts`

- [ ] **Step 1: Write failing test — `detectPendingActions`**

Test scenarios:

- Review artifact exists in `reviews/` with no `received` counterpart → `review-pending`
- `oat_blockers` non-empty → `blocked-task`
- HiLL checkpoint reached (in `hillCompleted` but action needed) → `hill-checkpoint`
- Phase complete but next phase not started → `approval-needed`

- [ ] **Step 2: Implement `detectPendingActions`**

Takes parsed state + artifact info, returns `PendingAction[]`.

- [ ] **Step 3: Write failing test — `computeDisplayState`**

Test that `computeDisplayState(projectState)` returns the correct `DisplayState`:

- Phase `implement`, status `in_progress` → `{ kind: 'in-phase', phase: 'implement' }`
- Phase `design`, status `complete`, review artifact exists → `{ kind: 'reviewing', phase: 'design' }`
- `oat_project_completed` set → `{ kind: 'complete' }`

- [ ] **Step 4: Implement `computeDisplayState`**

- [ ] **Step 5: Run tests, verify pass**

- [ ] **Step 6: Commit**

```bash
git add packages/control-plane/src/projects/
git commit -m "feat(control-plane): pending action detection and display state"
```

---

### Task 5: File watcher

**Files:**

- Create: `packages/control-plane/src/projects/watcher.ts`
- Create: `packages/control-plane/src/projects/watcher.test.ts`
- Modify: `packages/control-plane/package.json` (add chokidar dependency)

- [ ] **Step 1: Add chokidar dependency**

```bash
cd packages/control-plane && pnpm add chokidar
```

- [ ] **Step 2: Write failing test — `ProjectWatcher` emits events**

Test that `ProjectWatcher` watches `.oat/projects/` directories and emits `project-updated` when a `state.md` file changes. Use a temp directory, create the watcher, write a file, assert the event fires.

- [ ] **Step 3: Implement `ProjectWatcher`**

```typescript
// EventEmitter-based watcher
export class ProjectWatcher extends EventEmitter {
  constructor(repoPaths: string[]) { ... }
  start(): void { ... }  // starts chokidar watchers
  stop(): void { ... }   // closes all watchers
}
```

Watch `<repo>/.oat/projects/**/state.md` and `<repo>/.oat/projects/**/implementation.md` and `<repo>/.oat/projects/**/reviews/*.md`. On change, re-parse the affected project and emit `project-updated` with the new `ProjectState`. Debounce changes by 500ms to avoid rapid-fire events during writes.

- [ ] **Step 4: Run test, verify pass**

- [ ] **Step 5: Commit**

```bash
git add packages/control-plane/
git commit -m "feat(control-plane): file watcher for project state changes"
```

---

### Task 6: Export project modules from control plane index

**Files:**

- Modify: `packages/control-plane/src/index.ts`

- [ ] **Step 1: Update index.ts to export project modules**

```typescript
export type { ... } from './types.js';
export { parseStateFrontmatter, parseTaskProgress, checkArtifacts } from './projects/parser.js';
export { listWorktrees, scanForProjects, discoverAllProjects } from './projects/scanner.js';
export { detectPendingActions, computeDisplayState } from './projects/lifecycle.js';
export { ProjectWatcher } from './projects/watcher.js';
```

- [ ] **Step 2: Run full build and tests**

Run: `pnpm --filter @oat/control-plane build && pnpm --filter @oat/control-plane test`
Expected: All PASS, clean build.

- [ ] **Step 3: Commit**

```bash
git add packages/control-plane/src/index.ts
git commit -m "feat(control-plane): export project modules from package index"
```

---

## Chunk 2: Control Plane — Skills and Sessions

### Task 7: Skill registry

**Files:**

- Create: `packages/control-plane/src/skills/registry.ts`
- Create: `packages/control-plane/src/skills/registry.test.ts`

- [ ] **Step 1: Write failing test — `loadSkillRegistry`**

Test that `loadSkillRegistry(agentsSkillsDir)` reads `.agents/skills/` directory, parses each `SKILL.md` frontmatter, and returns `SkillInfo[]`. Use the actual `.agents/skills/` directory structure as reference — skill dirs contain `SKILL.md` with YAML frontmatter including `name`, `description`, `version`, `user-invocable`, `argument-hint`.

Test cases:

- Parses a skill with all fields
- Infers category from name prefix (`oat-project-` → lifecycle, `oat-*review*` → review, else utility)
- Filters to `userInvocable: true` skills only when requested

- [ ] **Step 2: Implement `loadSkillRegistry`**

Read directory entries under the skills dir. For each, read `SKILL.md`, extract YAML frontmatter, map to `SkillInfo`. Category inference: check name starts with `oat-project-` → `lifecycle`, name contains `review` → `review`, else `utility`.

- [ ] **Step 3: Run test, verify pass**

- [ ] **Step 4: Commit**

```bash
git add packages/control-plane/src/skills/
git commit -m "feat(control-plane): skill registry with frontmatter parsing"
```

---

### Task 8: Skill recommender

**Files:**

- Create: `packages/control-plane/src/skills/recommender.ts`
- Create: `packages/control-plane/src/skills/recommender.test.ts`

- [ ] **Step 1: Write failing tests — recommendation matrix**

Test each row from the spec's recommendation table. Example test cases:

```typescript
it('recommends oat-project-implement when plan is complete', () => {
  const state = makeProjectState({ phase: 'plan', phaseStatus: 'complete' });
  const skills = makeSkillRegistry();
  const recs = recommend(state, skills);
  expect(recs[0]?.skill.name).toBe('oat-project-implement');
  expect(recs[0]?.priority).toBe('primary');
});

it('recommends review-provide with artifact design args when design complete', () => {
  const state = makeProjectState({ phase: 'design', phaseStatus: 'complete' });
  const skills = makeSkillRegistry();
  const recs = recommend(state, skills);
  expect(recs[0]?.skill.name).toBe('oat-project-review-provide');
  expect(recs[0]?.suggestedArgs).toBe('artifact design');
});

it('recommends spec after discovery for spec-driven workflow', () => {
  const state = makeProjectState({
    phase: 'discovery',
    phaseStatus: 'complete',
    workflowMode: 'spec-driven',
  });
  const skills = makeSkillRegistry();
  const recs = recommend(state, skills);
  expect(recs[0]?.skill.name).toBe('oat-project-spec');
});

it('recommends design after discovery for quick workflow', () => {
  const state = makeProjectState({
    phase: 'discovery',
    phaseStatus: 'complete',
    workflowMode: 'quick',
  });
  const skills = makeSkillRegistry();
  const recs = recommend(state, skills);
  expect(recs[0]?.skill.name).toBe('oat-project-design');
});

it('returns no primary recommendation when phase is in_progress', () => {
  const state = makeProjectState({
    phase: 'design',
    phaseStatus: 'in_progress',
  });
  const skills = makeSkillRegistry();
  const recs = recommend(state, skills);
  const primary = recs.filter((r) => r.priority === 'primary');
  expect(primary).toHaveLength(0);
});

it('appends review-receive as secondary when review artifact pending', () => {
  const state = makeProjectState({
    phase: 'design',
    phaseStatus: 'complete',
    pendingActions: [{ type: 'review-pending', description: 'design review' }],
  });
  const skills = makeSkillRegistry();
  const recs = recommend(state, skills);
  const secondary = recs.filter((r) => r.priority === 'secondary');
  expect(
    secondary.some((r) => r.skill.name === 'oat-project-review-receive'),
  ).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `recommend`**

Implement the recommendation matrix from the spec table. The function takes `ProjectState` and `SkillInfo[]`, finds matching skills by name, and returns `SkillRecommendation[]` sorted by priority.

- [ ] **Step 4: Run tests, verify pass**

- [ ] **Step 5: Commit**

```bash
git add packages/control-plane/src/skills/
git commit -m "feat(control-plane): skill recommender with full recommendation matrix"
```

---

### Task 9: Session detector

**Files:**

- Create: `packages/control-plane/src/sessions/detector.ts`
- Create: `packages/control-plane/src/sessions/detector.test.ts`

- [ ] **Step 1: Write failing test — `detectSessions`**

Test that `detectSessions()` returns `AgentSession[]` by:

- Parsing `ps` output to find `claude` and `codex` processes
- Extracting PIDs and matching to repo paths via cwd detection

Mock `child_process.execFile` for both `ps` and `lsof` (macOS cwd detection).

- [ ] **Step 2: Implement `detectSessions`**

```typescript
export async function detectSessions(): Promise<AgentSession[]>;
```

Run `ps -eo pid,comm` to find processes matching `claude` or `codex`. For each PID, run `lsof -p PID -Fn` and look for `cwd` entries (type `n` with `cwd` file descriptor) to determine working directory. Match cwd to known repo paths. Return sessions with `status: 'unknown'` (process detection alone can't determine working/idle).

- [ ] **Step 3: Run test, verify pass**

- [ ] **Step 4: Commit**

```bash
git add packages/control-plane/src/sessions/
git commit -m "feat(control-plane): agent session detection via process scanning"
```

---

### Task 10: Zellij integration

**Files:**

- Create: `packages/control-plane/src/sessions/zellij.ts`
- Create: `packages/control-plane/src/sessions/zellij.test.ts`

- [ ] **Step 1: Write failing test — `isZellijAvailable`**

Test that `isZellijAvailable()` returns `true` when `ZELLIJ` env var is set or `zellij` is in PATH.

- [ ] **Step 2: Write failing test — `listZellijPanes`**

Test that `listZellijPanes()` parses `zellij action dump-layout` output and returns pane info.

- [ ] **Step 3: Write failing test — `writeToPane`**

Test that `writeToPane(paneId, text)` calls `zellij action write-chars --pane-id <id> "<text>"`.

- [ ] **Step 4: Write failing test — `runInNewPane`**

Test that `runInNewPane(command)` calls `zellij run -- <command>`.

- [ ] **Step 5: Implement all Zellij functions**

All functions shell out to `zellij` CLI via `child_process.execFile`. The functions are thin wrappers — no complex logic, just correct command construction and output parsing.

- [ ] **Step 6: Run tests, verify all pass**

- [ ] **Step 7: Commit**

```bash
git add packages/control-plane/src/sessions/
git commit -m "feat(control-plane): zellij CLI integration for pane management"
```

---

### Task 11: Session launcher (dispatch)

**Files:**

- Create: `packages/control-plane/src/sessions/launcher.ts`
- Create: `packages/control-plane/src/sessions/launcher.test.ts`

- [ ] **Step 1: Write failing test — `buildLaunchCommand`**

Test that `buildLaunchCommand(options: DispatchOptions)` constructs the correct `&&`-chained shell command.

```typescript
it('builds command for new worktree with setup and skill', () => {
  const cmd = buildLaunchCommand({
    runtime: 'claude',
    repo: '/Users/me/Code/repo',
    isolation: 'new-worktree',
    worktreeOptions: { baseBranch: 'main', branchName: 'oat/feature' },
    setupScript: 'pnpm run worktree:init',
    skill: { name: 'oat-project-implement', args: undefined },
  });
  expect(cmd).toBe(
    'git worktree add /Users/me/Code/repo/.worktrees/oat/feature -b oat/feature main' +
      ' && cd /Users/me/Code/repo/.worktrees/oat/feature' +
      ' && pnpm run worktree:init' +
      ' && claude -p "/oat-project-implement"',
  );
});

it('builds command for current branch with no skill', () => {
  const cmd = buildLaunchCommand({
    runtime: 'codex',
    repo: '/Users/me/Code/repo',
    isolation: 'current-branch',
  });
  expect(cmd).toBe('cd /Users/me/Code/repo && codex');
});
```

- [ ] **Step 2: Implement `buildLaunchCommand`**

- [ ] **Step 3: Write failing test — `dispatchToExisting`**

Test that dispatching to an existing session calls `writeToPane` with the formatted skill command.

- [ ] **Step 4: Implement `dispatchToExisting`**

- [ ] **Step 5: Write failing test — `launchNewSession`**

Test that launching a new session calls `runInNewPane` with the built command.

- [ ] **Step 6: Implement `launchNewSession`**

- [ ] **Step 7: Run tests, verify all pass**

- [ ] **Step 8: Commit**

```bash
git add packages/control-plane/src/sessions/
git commit -m "feat(control-plane): session launcher with dispatch pipeline"
```

---

### Task 12: Worktree manager

**Files:**

- Create: `packages/control-plane/src/sessions/worktree.ts`
- Create: `packages/control-plane/src/sessions/worktree.test.ts`

- [ ] **Step 1: Write failing test — `createWorktree`**

Test that `createWorktree(repo, baseBranch, branchName)` runs the correct git command and returns the worktree path. The path convention is `<repo>/.worktrees/<branchName>`.

- [ ] **Step 2: Implement `createWorktree`**

- [ ] **Step 3: Write failing test — `removeWorktree`**

- [ ] **Step 4: Implement `removeWorktree`**

- [ ] **Step 5: Run tests, verify pass**

- [ ] **Step 6: Commit**

```bash
git add packages/control-plane/src/sessions/
git commit -m "feat(control-plane): worktree manager for create/remove operations"
```

---

### Task 13: Final control plane exports and integration test

**Files:**

- Modify: `packages/control-plane/src/index.ts`
- Create: `packages/control-plane/src/integration.test.ts`

- [ ] **Step 1: Update index.ts with all exports**

Add exports for skills and sessions modules.

- [ ] **Step 2: Write integration test**

Test the full flow: given a mock repo directory with `.oat/projects/shared/test-project/` containing `state.md`, `plan.md`, and `implementation.md`:

- `discoverAllProjects` finds it
- `recommend` returns appropriate skills
- `detectPendingActions` returns correct pending items
- `computeDisplayState` returns correct state

Use a temp directory with fixture files.

- [ ] **Step 3: Run integration test, verify pass**

- [ ] **Step 4: Run full test suite and build**

Run: `pnpm --filter @oat/control-plane build && pnpm --filter @oat/control-plane test`
Expected: All pass, clean build.

- [ ] **Step 5: Commit**

```bash
git add packages/control-plane/
git commit -m "feat(control-plane): complete package with integration tests"
```

---

## Chunk 3: Dashboard Server

### Task 14: Package scaffold for `@oat/dashboard-server`

**Files:**

- Create: `packages/dashboard-server/package.json`
- Create: `packages/dashboard-server/tsconfig.json`
- Create: `packages/dashboard-server/src/index.ts`

- [ ] **Step 1: Create `packages/dashboard-server/package.json`**

```json
{
  "name": "@oat/dashboard-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "engines": {
    "node": ">=22.17.0"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "lint": "oxlint .",
    "format": "oxfmt --check .",
    "format:fix": "oxfmt --write .",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@oat/control-plane": "workspace:*",
    "hono": "^4.0.0",
    "@hono/node-server": "^1.0.0",
    "ws": "^8.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/ws": "^8.0.0",
    "typescript": "^5.8.3",
    "vitest": "^4.0.18",
    "tsx": "^4.21.0"
  }
}
```

Note: Uses `ws` directly for WebSocket instead of `@hono/node-ws` — simpler to wire into a Node HTTP server alongside Hono. The `ws` library attaches to the same HTTP server that Hono uses via `@hono/node-server`.

- [ ] **Step 2: Create tsconfig.json**

Same pattern as control-plane — extends root, outputs to `dist/`.

- [ ] **Step 3: Create minimal `src/index.ts`**

```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) => c.json({ status: 'ok' }));

serve({ fetch: app.fetch, port: 7400 }, (info) => {
  console.log(`OAT Dashboard running at http://localhost:${info.port}`);
});
```

- [ ] **Step 4: Install deps and verify**

Run: `pnpm install && pnpm --filter @oat/dashboard-server build`

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard-server/
git commit -m "feat(dashboard-server): scaffold package with Hono server"
```

---

### Task 15a: Read-only API endpoints (projects, skills, sessions, worktrees)

**Files:**

- Create: `packages/dashboard-server/src/control-plane-instance.ts`
- Create: `packages/dashboard-server/src/api.ts`
- Create: `packages/dashboard-server/src/api.test.ts`
- Modify: `packages/dashboard-server/src/index.ts`

- [ ] **Step 1: Define `ControlPlaneInstance` interface**

```typescript
// packages/dashboard-server/src/control-plane-instance.ts
// Aggregates all control plane functions into a single object for DI
export interface ControlPlaneInstance {
  discoverProjects(): Promise<ProjectState[]>;
  getProject(id: string): Promise<ProjectState | undefined>;
  getArtifacts(id: string): Promise<Map<ArtifactType, ArtifactInfo>>;
  loadSkills(): Promise<SkillInfo[]>;
  recommend(project: ProjectState, skills: SkillInfo[]): SkillRecommendation[];
  detectSessions(): Promise<AgentSession[]>;
  listWorktrees(repo: string): Promise<WorktreeInfo[]>;
}
```

- [ ] **Step 2: Write failing tests for GET endpoints**

Use Hono's test client (`app.request()`) with a mock `ControlPlaneInstance`. Test that:

- `GET /api/projects` returns the array from `discoverProjects()`
- `GET /api/projects/:id` returns a single project or 404
- `GET /api/skills` returns skills array
- `GET /api/skills/recommendations/:project` calls recommend with correct project
- `GET /api/sessions` returns sessions array
- `GET /api/worktrees/:repo` returns worktrees

- [ ] **Step 3: Implement read-only routes**

```typescript
export function createApiRoutes(cp: ControlPlaneInstance): Hono {
  const api = new Hono();
  api.get('/projects', async (c) => c.json(await cp.discoverProjects()));
  api.get('/projects/:id', async (c) => { ... });
  // ... etc
  return api;
}
```

- [ ] **Step 4: Run tests, verify pass**

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard-server/src/
git commit -m "feat(dashboard-server): read-only API endpoints for projects, skills, sessions"
```

---

### Task 15b: Dispatch and action API endpoints

**Files:**

- Modify: `packages/dashboard-server/src/api.ts`
- Modify: `packages/dashboard-server/src/api.test.ts`

- [ ] **Step 1: Write failing test — POST /api/sessions/dispatch**

Test two cases: dispatch to existing session (calls `dispatchToExisting`) and launch new session (calls `launchNewSession`). Test error cases: missing fields returns 400, Zellij not available returns 503.

- [ ] **Step 2: Implement dispatch endpoint**

Parse request body as `DispatchOptions`. If `targetSession` is provided, call `dispatchToExisting`. Otherwise call `launchNewSession`. Return `{ ok: true }` on success, `{ ok: false, error: "..." }` on failure.

- [ ] **Step 3: Write failing test — POST /api/open-file**

Test that it validates the file path is within a known repo/project directory before executing. Test that it rejects paths outside known repos.

- [ ] **Step 4: Implement open-file endpoint**

Validate that the requested path starts with one of the configured repo roots. If valid, shell out to `open` (macOS, detected via `process.platform === 'darwin'`) or `xdg-open` (Linux). Return `{ ok: true }`.

- [ ] **Step 5: Write failing test — GET/PUT /api/config**

- [ ] **Step 6: Implement config endpoints**

GET reads `~/.oat/dashboard.json`, PUT writes it.

- [ ] **Step 7: Run all API tests, verify pass**

- [ ] **Step 8: Commit**

```bash
git add packages/dashboard-server/src/
git commit -m "feat(dashboard-server): dispatch, open-file, and config API endpoints"
```

---

### Task 16: WebSocket for live updates

**Files:**

- Create: `packages/dashboard-server/src/ws.ts`
- Create: `packages/dashboard-server/src/ws.test.ts`
- Modify: `packages/dashboard-server/src/index.ts`

- [ ] **Step 1: Write failing test — connection sends full state**

Test that on WebSocket connect, the server sends a `connection-established` event with `FullState`.

- [ ] **Step 2: Implement WebSocket handler**

Use the `ws` library attached to the same Node HTTP server. On connection, send `connection-established` with current `FullState`. Subscribe to `ProjectWatcher` events and forward as `project-updated` events.

For session polling: maintain a `Map<string, AgentSession>` keyed by `pid`. Every 5 seconds, call `detectSessions()` and diff against previous state:

- New PIDs → emit `session-started`
- Missing PIDs → emit `session-ended`
- Same PID but different `status` → emit `session-activity`

```typescript
// Wiring pattern:
import { WebSocketServer } from 'ws';
import { serve } from '@hono/node-server';

const server = serve({ fetch: app.fetch, port });
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => { ... });
```

- [ ] **Step 3: Run test, verify pass**

- [ ] **Step 4: Wire everything together in `src/index.ts`**

Initialize control plane, create API routes, set up WebSocket, start watcher, start server.

- [ ] **Step 5: Integration test — start server, connect WebSocket, verify events**

- [ ] **Step 6: Commit**

```bash
git add packages/dashboard-server/
git commit -m "feat(dashboard-server): WebSocket with live project and session updates"
```

---

### Task 17: Dashboard config loading

**Files:**

- Create: `packages/dashboard-server/src/config.ts`
- Create: `packages/dashboard-server/src/config.test.ts`

- [ ] **Step 1: Write failing test — `loadDashboardConfig`**

Test that it reads `~/.oat/dashboard.json`, expands `~` in repo paths, and returns typed config. Test fallback when file doesn't exist (returns default config with CWD as sole repo).

- [ ] **Step 2: Implement `loadDashboardConfig`**

- [ ] **Step 3: Run test, verify pass**

- [ ] **Step 4: Write failing test — `loadRepoConfig`**

Test that `loadRepoConfig(repoPath)` reads `.oat/config.json` and extracts the `dashboard` section (`setupScript`, `branchPrefix`). Test fallback when the key doesn't exist (returns `undefined` for both fields).

- [ ] **Step 5: Implement `loadRepoConfig`**

Read `.oat/config.json`, parse JSON, return `dashboard` section if present. This data is used by the dispatch flow to pre-fill setup script and branch name prefix.

- [ ] **Step 6: Run tests, verify pass**

- [ ] **Step 7: Commit**

```bash
git add packages/dashboard-server/src/
git commit -m "feat(dashboard-server): dashboard and per-repo config loading"
```

---

## Chunk 4: Web UI

> **Testing approach for UI:** UI components in this chunk are verified visually during development rather than with automated component tests. The `api.ts` and hooks (`useWebSocket`, `useDashboard`) are tested in Task 19. Component-level tests (e.g. with React Testing Library) are deferred — the control plane and server layers carry the automated test coverage for v1.

### Task 18: Scaffold `apps/dashboard-ui`

**Files:**

- Create: `apps/dashboard-ui/package.json`
- Create: `apps/dashboard-ui/tsconfig.json`
- Create: `apps/dashboard-ui/index.html`
- Create: `apps/dashboard-ui/src/main.tsx`
- Create: `apps/dashboard-ui/vite.config.ts`
- Create: `apps/dashboard-ui/tailwind.config.ts` (or CSS import for Tailwind 4)

- [ ] **Step 1: Scaffold with Vite React template structure**

```json
{
  "name": "dashboard-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

Configure build output to `dist/`, proxy `/api` and `/ws` to `localhost:7400` during dev.

- [ ] **Step 3: Create `index.html` and `src/main.tsx`**

Minimal React app that renders "OAT Dashboard" text.

- [ ] **Step 4: Verify dev server works**

Run: `pnpm --filter dashboard-ui dev`
Expected: Vite dev server starts, shows the placeholder page.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard-ui/
git commit -m "feat(dashboard-ui): scaffold React + Vite + Tailwind app"
```

---

### Task 19: API client and WebSocket hook

**Files:**

- Create: `apps/dashboard-ui/src/api.ts`
- Create: `apps/dashboard-ui/src/hooks/useWebSocket.ts`
- Create: `apps/dashboard-ui/src/hooks/useDashboard.ts`

- [ ] **Step 1: Create `api.ts`**

Typed fetch wrappers for each REST endpoint. Returns typed responses matching the control plane interfaces.

```typescript
export async function fetchProjects(): Promise<ProjectState[]> {
  const res = await fetch('/api/projects');
  return res.json();
}

export async function dispatchSession(
  options: DispatchOptions,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/sessions/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  return res.json();
}
// ... etc for all endpoints
```

- [ ] **Step 2: Write test for `useWebSocket` hook**

Test with a mock WebSocket server: verify it reconnects on disconnect, replaces state on `connection-established`, and merges on update events.

- [ ] **Step 3: Implement `useWebSocket` hook**

Connects to `ws://localhost:7400/ws`. On `connection-established`, sets full state. On other events, merges into state. Reconnects with exponential backoff on disconnect (1s, 2s, 4s, max 30s).

- [ ] **Step 4: Create `useDashboard` hook**

Combines the WebSocket state with API calls. Provides `{ projects, sessions, selectedProject, dispatch, openFile }` to components.

- [ ] **Step 5: Run hook tests, verify pass**

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard-ui/src/
git commit -m "feat(dashboard-ui): API client and WebSocket state hooks"
```

---

### Task 20: Project List sidebar

**Files:**

- Create: `apps/dashboard-ui/src/views/ProjectList.tsx`
- Modify: `apps/dashboard-ui/src/main.tsx`

- [ ] **Step 1: Implement `ProjectList` component**

Renders list of projects from `useDashboard().projects`, grouped by repo. Each item shows:

- Project name (bold)
- Phase + progress (e.g. "implement · 3/7")
- Pending action badge (amber dot with count)
- Selected state (highlighted background)

Click sets `selectedProject` in the dashboard context.

- [ ] **Step 2: Wire into main layout**

Three-column CSS grid layout in `main.tsx`. Left column renders `ProjectList`.

- [ ] **Step 3: Verify visually**

Run dev server, check that the sidebar renders with mock data or data from a running dashboard server.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard-ui/src/
git commit -m "feat(dashboard-ui): project list sidebar component"
```

---

### Task 21: Project Detail center panel

**Files:**

- Create: `apps/dashboard-ui/src/views/ProjectDetail.tsx`

- [ ] **Step 1: Implement `ProjectDetail` component**

Renders for the selected project:

- Header: name, repo, path, phase badge
- Progress bar: filled proportional to `progress.completed / progress.total`
- Pending Actions: amber cards with description and "Open" button (calls `POST /api/open-file`)
- Recommended Next: skill cards from `/api/skills/recommendations/:project`, each with name, reason, editable suggested args. Click opens dispatch modal.
- Artifacts grid: cards for each artifact type showing existence, last modified. Click calls open-file.

- [ ] **Step 2: Wire into main layout center column**

- [ ] **Step 3: Verify visually**

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard-ui/src/
git commit -m "feat(dashboard-ui): project detail center panel"
```

---

### Task 22: Session Panel right sidebar

**Files:**

- Create: `apps/dashboard-ui/src/views/SessionPanel.tsx`

- [ ] **Step 1: Implement `SessionPanel` component**

Renders active sessions from `useDashboard().sessions`:

- Each session card: runtime icon, repo/worktree label, status dot (green/gray), duration, Zellij pane ref
- "New Session" button at bottom

- [ ] **Step 2: Wire into main layout right column**

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard-ui/src/
git commit -m "feat(dashboard-ui): session panel sidebar"
```

---

### Task 23: Dispatch Modal

**Files:**

- Create: `apps/dashboard-ui/src/views/DispatchModal.tsx`

This is the most complex UI component. Two modes: send to existing, launch new.

- [ ] **Step 1: Implement "Send to existing" mode**

- Session selector dropdown (populated from `useDashboard().sessions`)
- Skill quick-pick chips (from recommendations)
- Free-form prompt textarea fallback
- "Send to Session" button calls `dispatchSession` API

- [ ] **Step 2: Implement "Launch new session" mode**

- Skill/Prompt tabs
- Skill picker dropdown with editable argument field below
- Agent selector (Claude Code / Codex CLI)
- Isolation mode selector (Current branch / New worktree)
- Collapsible Advanced options: base branch input, branch name input (auto-generated default), setup script toggle
- Pipeline preview at bottom (text showing the `&&`-chained steps)
- "Create Session" button calls `dispatchSession` API

- [ ] **Step 3: Wire modal open/close to session panel and skill cards**

- [ ] **Step 4: Verify full dispatch flow visually**

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard-ui/src/
git commit -m "feat(dashboard-ui): dispatch modal with send-to-existing and launch-new modes"
```

---

## Chunk 5: CLI Integration and Final Assembly

### Task 24: `oat dashboard` CLI command

**Files:**

- Create: `packages/cli/src/commands/dashboard/index.ts`
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/package.json` (add `@oat/dashboard-server` dependency)

- [ ] **Step 1: Create `createDashboardCommand`**

Uses the simpler command pattern (no DI) since this command orchestrates server startup rather than testable business logic:

```typescript
export function createDashboardCommand(): Command {
  const cmd = new Command('dashboard')
    .description('Start the OAT dashboard server and web UI')
    .option('-p, --port <port>', 'Port to listen on', '7400')
    .option('--no-open', 'Do not open browser automatically');

  cmd
    .command('init')
    .description('Create ~/.oat/dashboard.json interactively')
    .action(async () => {
      // Scan common paths for .oat/ directories
      // Prompt user to select repos
      // Write ~/.oat/dashboard.json
    });

  cmd.action(async (options) => {
    // Load config from ~/.oat/dashboard.json (fallback to CWD)
    // Initialize control plane with repo paths
    // Start dashboard server
    // Open browser if --no-open not set (use `open` on macOS)
  });

  return cmd;
}
```

- [ ] **Step 2: Register in `commands/index.ts`**

Add `program.addCommand(createDashboardCommand())`.

- [ ] **Step 3: Test manually**

Run: `pnpm run cli -- dashboard`
Expected: Server starts, browser opens to the dashboard.

Run: `pnpm run cli -- dashboard init`
Expected: Interactive prompts for repo selection, writes config file.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): add 'oat dashboard' and 'oat dashboard init' commands"
```

---

### Task 25: Static file serving for built UI

**Files:**

- Modify: `packages/dashboard-server/src/index.ts`

- [ ] **Step 1: Add static file serving**

Serve `apps/dashboard-ui/dist/` as static files at `/`. For any non-API, non-WS request that doesn't match a static file, serve `index.html` (SPA fallback).

Use Hono's `serveStatic` middleware. The path to the dist directory is passed as config when the server is initialized.

- [ ] **Step 2: Update Turborepo pipeline**

Add a custom pipeline entry in `turbo.json` so the server build waits for the UI build (they aren't package.json dependencies, so `^build` won't catch it):

```json
{
  "@oat/dashboard-server#build": {
    "dependsOn": ["dashboard-ui#build", "^build"],
    "outputs": ["dist/**"]
  }
}
```

- [ ] **Step 3: Test full flow**

Run: `pnpm build && pnpm run cli -- dashboard`
Expected: Dashboard serves at localhost, shows project state from the current repo.

- [ ] **Step 4: Commit**

```bash
git add packages/dashboard-server/ turbo.json
git commit -m "feat(dashboard-server): serve built dashboard UI as static files"
```

---

### Task 26: End-to-end smoke test

**Files:**

- Create: `packages/dashboard-server/src/e2e.test.ts`

- [ ] **Step 1: Write E2E test**

Start the server programmatically pointing at a temp repo directory with a fixture OAT project. Verify:

- `GET /api/projects` returns the fixture project
- `GET /api/skills` returns skills
- `GET /api/skills/recommendations/:project` returns recommendations
- WebSocket connects and receives `connection-established`

- [ ] **Step 2: Run test, verify pass**

- [ ] **Step 3: Run full monorepo build and test**

Run: `pnpm build && pnpm test && pnpm lint && pnpm type-check`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add packages/dashboard-server/
git commit -m "test(dashboard-server): end-to-end smoke test"
```
