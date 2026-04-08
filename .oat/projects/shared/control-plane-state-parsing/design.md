---
oat_status: complete
oat_ready_for: null
oat_last_updated: 2026-04-08
oat_generated: false
oat_template: false
---

# Design: control-plane-state-parsing

## Overview

This project introduces `packages/control-plane/` — a pure TypeScript library that reads OAT project artifacts from disk and returns structured, typed data. The library has no CLI, UI, or server dependencies. It takes file paths as input and returns typed objects as output.

The CLI imports the control plane and exposes its data through three new commands: `oat project status`, `oat project list`, and `oat config dump`. All support the existing `--json` flag convention. The control plane does not read OAT config files — the CLI resolves config and passes paths/values to the control plane functions. This keeps the dependency graph clean: CLI → control-plane (one direction only).

The key insight is separation of concerns: the control plane owns **state parsing + skill recommendation** (the "what"), while the CLI owns **config resolution + user-facing output** (the "how"). The control plane replaces the 5-8 file reads and grep/awk parsing that ~40 skills currently perform independently on every invocation.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  packages/cli/                                          │
│  ├── commands/project/status.ts  (new)                  │
│  ├── commands/project/list.ts    (new)                  │
│  ├── commands/config/dump.ts     (new)                  │
│  └── config/oat-config.ts        (existing)             │
│                                                         │
│  Resolves config, calls control plane, formats output   │
└───────────────────────┬─────────────────────────────────┘
                        │ imports
┌───────────────────────▼─────────────────────────────────┐
│  packages/control-plane/                                │
│  Pure TypeScript library — no CLI/UI/server deps        │
│                                                         │
│  ├── src/types.ts           Shared type definitions     │
│  ├── src/state/             State parsing modules       │
│  │   ├── parser.ts          state.md → ProjectState     │
│  │   ├── artifacts.ts       Artifact frontmatter scan   │
│  │   ├── tasks.ts           plan.md + impl.md progress  │
│  │   └── reviews.ts         reviews/ scan + plan table  │
│  ├── src/recommender/       Skill recommendation        │
│  │   ├── router.ts          Phase routing state machine │
│  │   └── boundary.ts        Boundary tier detection     │
│  └── src/index.ts           Public API                  │
└─────────────────────────────────────────────────────────┘
```

**Dependency direction:** CLI depends on control-plane via `workspace:*`. Control-plane has zero internal workspace dependencies. It depends only on `yaml` (for frontmatter parsing) and Node.js `fs`/`path` builtins.

## Component Design

### 1. Types (`src/types.ts`)

Core types derived from the March 15 design spec, updated per the April 3 audit:

```typescript
// Phase values — matches oat_phase frontmatter exactly
type Phase = 'discovery' | 'spec' | 'design' | 'plan' | 'implement';

// Status values — matches oat_phase_status exactly
type PhaseStatus = 'in_progress' | 'complete' | 'pr_open';

type WorkflowMode = 'spec-driven' | 'quick' | 'import';
type ExecutionMode = 'single-thread' | 'subagent-driven';
type Lifecycle = 'active' | 'paused';

type ArtifactType =
  | 'discovery'
  | 'spec'
  | 'design'
  | 'plan'
  | 'implementation'
  | 'summary';

interface ArtifactStatus {
  type: ArtifactType;
  exists: boolean;
  path: string;
  status: string | null; // oat_status value
  readyFor: string | null; // oat_ready_for value
  isTemplate: boolean; // oat_template value or heuristic
  boundaryTier: 1 | 2 | 3; // computed tier
}

interface TaskProgress {
  total: number; // total tasks in plan.md
  completed: number; // completed tasks in implementation.md
  currentTaskId: string | null; // oat_current_task_id from implementation.md
  phases: PhaseProgress[]; // per-phase breakdown
}

interface PhaseProgress {
  phaseId: string; // e.g. "p01", "p02", "p-rev1"
  name: string; // phase heading text
  total: number;
  completed: number;
  isRevision: boolean; // true for p-revN phases
}

interface ReviewStatus {
  scope: string; // "p01", "final", "spec", "design"
  type: string; // "code" or "artifact"
  status: string; // "pending" | "received" | ... | "passed"
  date: string;
  artifact: string;
}

interface ProjectState {
  name: string;
  path: string; // project directory (relative to repo root)
  phase: Phase;
  phaseStatus: PhaseStatus;
  workflowMode: WorkflowMode;
  executionMode: ExecutionMode;
  lifecycle: Lifecycle;
  pauseTimestamp: string | null;
  pauseReason: string | null;

  progress: TaskProgress;
  artifacts: ArtifactStatus[];
  reviews: ReviewStatus[];

  blockers: string[];
  hillCheckpoints: string[];
  hillCompleted: string[];

  prStatus: string | null; // null | ready | open | closed | merged
  prUrl: string | null;
  docsUpdated: string | null; // null | skipped | complete
  lastCommit: string | null;

  timestamps: {
    created: string;
    completed: string | null;
    stateUpdated: string;
  };

  recommendation: SkillRecommendation;
}

// Lighter version for list output
interface ProjectSummary {
  name: string;
  path: string;
  phase: Phase;
  phaseStatus: PhaseStatus;
  workflowMode: WorkflowMode;
  lifecycle: Lifecycle;
  progress: { completed: number; total: number };
  recommendation: { skill: string; reason: string };
}

interface SkillRecommendation {
  skill: string; // skill name to invoke
  reason: string; // human-readable explanation
  context?: string; // additional context (e.g. "code final" scope hint)
}

type BoundaryTier = 1 | 2 | 3;
```

### 2. State Parser (`src/state/parser.ts`)

**Responsibility:** Read `state.md` frontmatter and return a typed partial state object.

**Approach:** Read file content, extract the `---` delimited frontmatter block, parse it with `YAML.parse()` (from the `yaml` package). Map YAML keys to typed fields with defaults for missing values. Handle the JSON-encoded array fields (`oat_blockers`, `oat_hill_checkpoints`, `oat_hill_completed`) which may be stored as YAML arrays or JSON strings.

**Input:** Absolute path to the project directory.
**Output:** Parsed state fields (phase, status, mode, blockers, timestamps, etc.).

### 3. Artifact Scanner (`src/state/artifacts.ts`)

**Responsibility:** For each artifact type, check if the file exists, read its frontmatter, and compute boundary tier.

**Files checked:**

- `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `summary.md`

**Per artifact:** Read frontmatter fields `oat_status`, `oat_ready_for`, `oat_template`. Apply boundary tier detection (see Recommender section). Return `ArtifactStatus[]`.

### 4. Task Progress (`src/state/tasks.ts`)

**Responsibility:** Parse `plan.md` for task definitions and `implementation.md` for completion markers.

**Plan parsing:**

- Match heading pattern: `### Task pNN-tNN: {name}`
- Group by phase: `## Phase N: {name}` headings
- Detect revision phases: `p-revN` prefix

**Implementation parsing:**

- Match `**Status:** completed` markers per task section
- Read `oat_current_task_id` from frontmatter

**Output:** `TaskProgress` with per-phase breakdown.

### 5. Review Aggregation (`src/state/reviews.ts`)

**Two data sources:**

1. **Plan.md Reviews table** — Parse the markdown table under `## Reviews` heading. Extract scope, type, status, date, artifact columns. This is the authoritative record.

2. **reviews/ directory** — Scan for `.md` files (excluding `archived/` subdirectory). Their existence indicates unprocessed review feedback when not reflected in the table.

**Output:** `ReviewStatus[]` array combining both sources.

### 6. Skill Recommender (`src/recommender/router.ts`)

**Responsibility:** Given a fully parsed `ProjectState` (minus the recommendation field), compute the recommended next skill.

**This is a pure function with no I/O.** It receives the parsed state and returns a `SkillRecommendation`.

**Logic ported from `oat-project-next` skill:**

1. **HiLL gate override** — If current phase is in `hillCheckpoints` but not `hillCompleted`, route to current phase skill. Return early.

2. **Early phase routing** — Table-driven lookup keyed on `(workflowMode, phase, phaseStatus, boundaryTier)`. The tier comes from the current phase's artifact status.

3. **Post-implementation router** (when phase=implement and status=complete|pr_open) — 6-step priority cascade:
   - 5.1: Incomplete revision tasks → implement
   - 5.2: Unprocessed reviews → review-receive
   - 5.3: Final code review not passed → review-provide or review-receive
   - 5.4: Summary not done → summary
   - 5.5: PR not created → pr-final
   - 5.6: PR is open → complete

4. **Execution mode switch** — When routing to `oat-project-implement`, check `executionMode` and substitute `oat-project-subagent-implement` if subagent-driven.

### 7. Boundary Tier Detection (`src/recommender/boundary.ts`)

**Responsibility:** Given an artifact's frontmatter, classify readiness into tiers.

**Logic (first match wins):**

- **Tier 1:** `oat_status == "complete"` — artifact is done
- **Tier 2:** `oat_status == "in_progress"` AND `oat_template` is not true AND no template placeholder patterns detected
- **Tier 3:** `oat_template == true` OR template placeholders present OR file doesn't exist

**Template placeholder patterns** (fallback when `oat_template` field is missing):

- `{Project Name}` in title
- `{Copy of` in content
- `{Clear description` in content

### 8. Public API (`src/index.ts`)

```typescript
// Primary: full project state snapshot
export async function getProjectState(
  projectPath: string,
): Promise<ProjectState>;

// List: summary of all projects in a directory
export async function listProjects(
  projectsRoot: string,
): Promise<ProjectSummary[]>;

// Pure function: compute recommendation from state
export function recommendSkill(
  state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation;

// All types re-exported
export type { ProjectState, ProjectSummary, SkillRecommendation, ... };
```

### 9. CLI Commands (in `packages/cli/`)

Three new commands added to existing command groups:

**`oat project status [--json]`**

- Resolves active project from `config.local.json`
- Calls `getProjectState()` with the resolved path
- JSON output: full `ProjectState` object
- Text output: formatted summary table (phase, status, progress, recommendation)

**`oat project list [--json]`**

- Resolves projects root from config + env override
- Calls `listProjects()` with the resolved path
- JSON output: `ProjectSummary[]`
- Text output: table with name, phase, progress, recommendation

**`oat config dump [--json]`**

- Reads shared config, local config, user config, and env overrides
- Merges into a single resolved object with source attribution per key
- JSON output: `{ shared: OatConfig, local: OatLocalConfig, user: UserConfig, resolved: MergedConfig }`
- Text output: formatted key-value list with sources

## Testing Strategy

**Unit tests per module:**

- `parser.test.ts` — Parse various state.md frontmatter shapes (valid, missing fields, malformed YAML, JSON-encoded arrays)
- `artifacts.test.ts` — Tier detection with different frontmatter combinations, template placeholder detection
- `tasks.test.ts` — Task counting with various plan.md structures (single phase, multi-phase, revision phases, empty plan)
- `reviews.test.ts` — Table parsing, directory scanning, cross-referencing
- `router.test.ts` — Full routing table coverage: all workflow mode × phase × status × tier combinations, plus all 6 post-implementation steps
- `boundary.test.ts` — Tier classification with real-world frontmatter samples

**Integration test:**

- Set up a realistic `.oat/projects/shared/test-project/` fixture directory with all artifacts
- Call `getProjectState()` and verify the full output matches expected structure
- Call `recommendSkill()` on the parsed state and verify routing

**CLI command tests:**

- Test `oat project status --json` against fixture project
- Test `oat project list --json` with multiple projects in different states
- Test `oat config dump --json` with layered config files

**Test approach:** Vitest (already used across the monorepo). File-based fixtures for realistic artifact content. No mocking of the filesystem — tests use real temp directories with real files, matching how the control plane is used in production.
