---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-10
oat_generated: false
oat_template: false
---

# Design: brief-goal-workflow-modes

Lightweight design for a quick-mode project. It covers what the plan needs:
the mode-family seam, the phase-unit progress contract, the two templates,
the skill set, the goal state model and the staged delivery shape. The
alignment contracts themselves (F1–F9, G2–G3, F12–F13, C1–C6) are summarized
in `discovery.md` and detailed in
`.oat/repo/analysis/freestyle-brainstorm/consensus-proposal.md`.

## Overview

Two workflow modes join `spec-driven`, `quick`, `import` and `lite`:
`brief` (one delivery) and `goal` (many milestones). Both plan from one
authored artifact, `plan.md` titled "Project Brief", whose phases carry
intent and exit evidence instead of tasks. Everything that is identical
between the two branches on one predicate, `isBriefMode(mode)`; only
milestone routing, the delivery registry and terminal closeout branch on
`goal`.

The technical approach is additive and seam-first. The control plane learns
the new modes, a phase-unit progress contract and the family predicate first,
with every existing mode's behavior pinned by its current tests. The CLI then
scaffolds and validates the brief shape. Lifecycle skills and agent roles
gain brief-mode branches at the points where they read tasks today. Goal
lands last on top of that seam, and enters `WORKFLOW_MODES` only when its
resume, delivery, gate and closeout consumers ship (DR-260906).

The riskiest change is the parser contract: today a phase with no task
headings is dropped from progress, task totals come from `plan.md`, and
completion markers are read from `implementation.md` keyed by task ID. Brief
modes need a phase to count as one unit, completed by a phase-level status
line, with per-phase base and head commits replacing commit-message task
inference for review scope. That contract is gated on `isBriefMode` so no
existing mode changes behavior.

## Architecture

### System Context

OAT's lifecycle is a set of skills (Markdown contracts executed by the host
agent) over a control plane (TypeScript parsers and a recommender) and a CLI
(scaffold, validate, route, gate). The mode is read from `state.md`
frontmatter and shapes every consumer. The new modes touch all three layers
plus the templates, agent roles, docs and generated provider projections.

**Key Components:**

- **Mode registry and family predicate** (`packages/control-plane/src/types.ts`):
  `WORKFLOW_MODES` gains `brief` (v1) and `goal` (v1.5);
  `isBriefMode(mode)` is the single family seam.
- **Phase-unit progress contract** (`packages/control-plane/src/state/tasks.ts`
  and callers): taskless phases count as one unit; phase-level completion
  marker; per-phase base/head anchors; `oat_current_task_id` may hold a phase
  ID.
- **Router and dashboard routes** (`packages/control-plane/src/recommender/router.ts`,
  `packages/cli/src/commands/state/generate.ts`): a `BRIEF_ROUTES` table
  plus a `GOAL_ROUTES` table; summary prerequisite kept for both modes;
  goal milestone routing.
- **Scaffold and templates** (`packages/cli/src/commands/project/new/scaffold.ts`,
  `.oat/templates/plan-brief.md`, brief variant of `implementation.md`):
  `TEMPLATES_BY_MODE` and `STATE_TEMPLATE_BY_MODE` entries;
  `references/research/` created for brief modes; bundle inputs and pack
  manifest.
- **Brief validate-plan profile** (`packages/cli/src/commands/project/validate-plan/`):
  a profile mechanism replacing the hardcoded lite branch, with a `brief`
  profile and the existing lite rules preserved.
- **Promote** (`packages/cli/src/commands/project/promote/`): `brief → quick`
  alongside `lite → quick`.
- **Closeout invariant** (`closeout-check/closeout-invariant.ts`): brief
  modes follow the configured path; goal's `pr` step is satisfied by
  verified delivery coverage.
- **Entry and interview skills** (`.agents/skills/oat-project-brief`,
  `oat-project-goal`, shared `references/brief-contract.md`): readiness
  rounds with the design strand, one-pass brief, review ladder, single
  approval; goal adds milestone alignment and re-alignment.
- **Lifecycle skill branches**: implement (plan-and-resume, phase-execution,
  completion-and-closeout), review-provide, summary, pr-progress, pr-final,
  revise, complete, document, next, progress, plan, plan-writing, discover,
  brainstorm, autonomous, promote-spec-driven, import-plan, capture, docs,
  pjm-review-backlog, wave-execute.
- **Agent roles** (`.agents/agents/oat-phase-implementer.md`, `oat-reviewer.md`):
  brief-mode branch; projections regenerated with `oat sync --scope project`.
- **Docs and root AGENTS.md**: mode enumerations, lane diagrams, workflow
  options and heuristic.

### Component Diagram

```
state.md (oat_workflow_mode) ─┬─► control-plane parser ─► ProjectState.workflowMode
                              │        │
                              │        ├─► isBriefMode() ─┬─► tasks.ts phase-unit contract
                              │        │                  ├─► router BRIEF_ROUTES / GOAL_ROUTES
                              │        │                  └─► summary prerequisite (kept)
                              │        │
                              ▼        ▼
plan.md "Project Brief" ──► validate-plan (profile: brief) ──► oat-project-brief / oat-project-goal
   │ (plan-brief.md template, same frontmatter)                    │
   │                                                               ▼
   ├─► ## Phase pNN: Intent / Exit evidence / provisional  ──► oat-project-implement
   ├─► ## Milestones (goal)                                        │ F12 precedence, F13 task records
   └─► ## Reviews                                                  ▼
                                                      implementation.md (phase sections:
                                                        **Status:** completed, base/head,
                                                        ### Task pNN-tNN execution records)
                                                               │
                      oat-project-review-provide (scope = phase base..head)
                      oat-project-summary (phase-units + journal hash)
                      oat-project-pr-progress (goal: delivery prerequisites)
                      closeout-check (goal: delivery coverage satisfies `pr`)
```

### Data Flow

1. `oat project new --mode brief` scaffolds `state.md` (mode `brief`, phase
   `plan`, no HiLL checkpoints), `plan.md` from `plan-brief.md` with
   `oat_template: true`, `implementation.md` (brief variant),
   `references/research/.gitkeep`, `reviews/`, `pr/`, project log when
   configured.
2. `oat-project-brief` runs the interview, writes the brief in one pass,
   commits it, dispatches the plan artifact review, runs the configured plan
   gate, records the disposition in `## Reviews`, takes one user approval,
   sets `oat_status: complete` and `oat_ready_for: oat-project-implement`.
3. `oat-project-implement` resumes on the first incomplete phase-unit in
   document order. Phase start records executor, worktree, committing owner,
   parallelism assessment and the base commit. Execution follows F12.
   Task records are appended under the phase as work starts and closed at
   commit (F13). Phase end records head, verification, fresh reviewer
   disposition, gate results and the phase-level completion line.
4. Review scope for `pNN` resolves from the recorded base/head anchors; the
   commit-message grep remains a fallback for execution-record commits.
5. Summary and closeout key on completed phase-units and journal changes;
   the configured `postImplementSequence` runs unchanged.
6. Goal: after the milestone's phases are accepted, an integrated review of
   the delivery scope runs, `oat-project-pr-progress` opens the delivery and
   records it in `oat_deliveries`, learnings are captured, and the router
   routes a delivered milestone back to `oat-project-goal` for re-alignment,
   which amends the brief in place and appends the next milestone's phases.
   Terminal closeout runs when the user declares the goal met.

## Component Design

### Mode registry and family predicate

**Purpose:** declare the modes once and give consumers a single seam.

**Interfaces:**

```typescript
// packages/control-plane/src/types.ts
export const WORKFLOW_MODES = [
  'spec-driven',
  'quick',
  'import',
  'lite',
  'brief',
] as const; // + 'goal' in v1.5
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];
export const BRIEF_MODES = ['brief'] as const; // + 'goal' in v1.5
export type BriefMode = (typeof BRIEF_MODES)[number];
export function isBriefMode(
  mode: WorkflowMode | null | undefined,
): mode is BriefMode;
```

**Design Decisions:**

- `goal` is appended to both arrays in the goal phases, never earlier, so
  `--mode` choices (derived from `WORKFLOW_MODES`) cannot expose it before
  its consumers exist.
- No other `isXMode` helpers are introduced; existing `=== 'lite'` checks
  stay as they are.
- `Record<WorkflowMode, …>` maps (`TEMPLATES_BY_MODE`,
  `STATE_TEMPLATE_BY_MODE`) become type errors on registration, which is the
  intended forcing function for scaffold coverage.

### Phase-unit progress contract

**Purpose:** let a plan with no task headings report progress, resume and
finalize correctly without changing task-based modes.

**Responsibilities:**

- Count a taskless phase as `total: 1`, completed when `implementation.md`
  has a `**Status:** completed` line under the matching phase heading.
- Reset completion-marker ownership at every phase heading so a task's
  status line cannot leak into the next phase.
- Accept a phase ID in `oat_current_task_id`.
- Treat a provisional phase as incomplete.
- Expose per-phase base/head anchors from the journal.

**Interfaces:**

```typescript
// packages/control-plane/src/state/tasks.ts
export interface PhaseProgress {
  phaseId: string;
  name: string;
  total: number;
  completed: number;
  isRevision: boolean;
  unit: 'tasks' | 'phase'; // new: how total/completed were derived
  provisional?: boolean; // new: from plan.md "Provisional: yes"
}
export function parsePhaseProgress(
  planContent: string,
  completedTasks: Set<string>,
  options?: { phaseUnits: boolean },
): PhaseProgress[];
export function parseCompletedPhaseIds(
  implementationContent: string,
): Set<string>;
export function parsePhaseAnchors(
  implementationContent: string,
): Map<string, { base: string | null; head: string | null }>;
```

`parseTaskProgress` passes `phaseUnits: isBriefMode(mode)`; task-based modes
call with the default and keep the current drop-taskless behavior pinned by
`tasks.test.ts:453`. Completed phase IDs are read from phase-level status
lines only, matching on the normalized phase ID.

**Design Decisions:**

- The heading grammar is unchanged; brief modes add markers, not syntax.
- Task records under a brief phase are counted for display but never decide
  phase completion (F13: task completion is committed execution, phase
  completion is accepted evidence).
- `quick-plan-readiness.ts` is not reused for brief readiness; the brief
  entry skill records the review disposition and the router keys on
  `oat_status`/`oat_ready_for` as it does for spec-driven plans.

### Router and dashboard routes

**Purpose:** route brief and goal projects through every lifecycle boundary.

**Responsibilities:**

- `BRIEF_ROUTES`: `plan:in_progress:*` → `oat-project-brief`;
  `plan:complete` → `oat-project-implement`; post-implementation follows the
  shared sequence with summary kept.
- `GOAL_ROUTES` (v1.5): the same, plus `oat_milestone_status` routing:
  `aligning` → `oat-project-goal`, `implementing` → implement, `reviewing`
  → integrated review, `delivering` → `oat-project-pr-progress`,
  `delivered` → `oat-project-goal` (re-align) unless the user declared the
  goal met, in which case terminal closeout.
- `generate.ts` mirrors the same table (parity test already exists for the
  four modes); help text lists `oat-project-brief` and `oat-project-goal`.

**Design Decisions:** `getWorkflowRoutes` gets explicit `case 'brief'` and
`case 'goal'`; the `default` fall-through to spec-driven is left in place but
a test asserts every registered mode has a case.

### Scaffold and templates

**Purpose:** create a brief project with the right files and frontmatter.

**Responsibilities:**

- `TEMPLATES_BY_MODE.brief = [state, plan-brief→plan, implementation]`;
  goal identical plus milestone placeholders.
- `STATE_TEMPLATE_BY_MODE.brief`: start in `plan` / `in_progress`, hill
  checkpoints `[]` meaning none for brief modes (documented in the state
  template comment), artifact bullets for brief, implementation, references.
- Create `references/research/.gitkeep` for brief modes (import's existing
  `references/.gitkeep` path generalizes).
- Re-add `oat_template: true` to the scaffolded brief the way lite does.
- Register `plan-brief.md` in `bundle-inputs.mjs` and `pack-manifest.ts`;
  force-add the bundled copy as lite's was.

**`plan-brief.md` shape:** identical frontmatter to `plan.md` with
`oat_plan_source: brief` and `oat_template_name: plan-brief`; body `# Project
Brief`, then Goal, Outcomes (numbered, each with intended evidence),
Approach (optional `### Design`), Constraints and Out of Scope, Decisions,
Known Unknowns, Delivery endpoint and authority, Milestones (goal only,
table `mNN | name | delivery intent | phases`), Phases (`## Phase p01:` with
`**Intent:**`, `**Exit evidence:**`, `**Provisional:** no`), Parallelism,
Reviews, Implementation Complete, References.

**`implementation.md` brief variant:** same file name. Frontmatter
`oat_current_task_id` may be a phase ID. Progress Overview counts phase-units.
Each phase section: `**Status:**`, `**Base:**`, `**Head:**`, `**Executor:**`,
phase summary prose (verification, review disposition, authority changes,
deviations, next action), then execution-record `### Task pNN-tNN:` blocks
appended at work start. Orchestration-run markers and the dated log stay.

**Design Decisions:** one implementation template with a brief section
variant selected by scaffold (a `implementation-brief.md` template file)
rather than conditional blocks inside the shared template, matching the
plan-lite precedent of a separate file.

### Brief validate-plan profile

**Purpose:** validate brief shape without a second hardcoded branch.

**Interfaces:**

```typescript
// packages/cli/src/commands/project/validate-plan/profiles.ts
export type PlanProfile = 'task' | 'lite' | 'brief';
export function resolvePlanProfile(mode: WorkflowMode): PlanProfile;
export function validatePlanForProfile(
  content: string,
  profile: PlanProfile,
): ValidationIssue[];
```

Brief rules: at least one `## Phase pNN:` with `**Intent:**` and
`**Exit evidence:**`; unique normalized phase IDs (`brief-duplicate-phase`);
no `### Task` headings required (`brief-task-headings` is a warning, not an
error, since execution records never live in `plan.md`); parallel groups
allowed and validated by the existing group check; provisional phases
allowed after the first concrete one (`brief-first-phase-provisional`);
goal profile additionally requires `## Milestones` rows to reference
existing phase IDs (`goal-milestone-unknown-phase`). Lite rules move into
the `lite` profile unchanged.

### Promote

**Purpose:** `oat project promote --to quick` from a brief project.

**Responsibilities:** keep phases, `## Reviews` rows and approvals; write
`oat_workflow_mode: quick`, keep `oat_plan_source: brief`; render
`discovery.md` from the brief (Goal, Outcomes, Decisions, Constraints,
Known Unknowns); seed each phase with a placeholder task section so the
task-based readiness predicate can be satisfied by the quick-start resume
path. Goal promotes only when `oat_milestone_status` is `delivered` and no
delivery is open; otherwise it refuses with the extraction hint.

### Entry and interview skills

**`oat-project-brief`** (new, `oat_gateable: true`):

1. Preflight and scaffold (same contract as quick-start Steps 0–1, mode
   `brief`).
2. Interview per F2 and C4: readiness rounds, design strand, facts resolved
   by sub-agents, decisions by the user, stop criterion, Known Unknowns.
3. Write the brief in one pass; commit.
4. Review ladder: plan artifact review (shared Auto Artifact-Review Loop,
   target `plan`), dispatch ladder and ceiling resolution, optional phase
   gate review setup, lifecycle gate posture, configured gate (reruns per
   `maxAttempts`), record disposition in `## Reviews`.
5. One user approval of the reviewed brief; set ready-for implement;
   initialize `implementation.md`; refresh dashboard; commit.

**`oat-project-goal`** (new, v1.5): the brief skill's steps with a
milestone index, `oat_milestone`/`oat_milestone_status` initialization, and
a re-alignment entry when invoked on a delivered milestone: delta interview,
amend brief in place, append next milestone's phases, log the amendment,
set `aligning` → `implementing`.

**`references/brief-contract.md`** (shared by both): the brief sections,
phase shape, readiness criteria, review ladder, F12 execution precedence,
F13 task-record shape, record ownership, promotion and extraction rules.
Named-skill call sites load it by path.

### Lifecycle skill branches

Each existing skill gains a brief-mode branch at the exact lines the
inventory found. The load-bearing ones:

- **implement / plan-and-resume:** resume on the first incomplete
  phase-unit; provisional phases must be made concrete before dispatch
  (write Intent and Exit evidence, log it); HiLL bypass: brief modes read
  `oat_plan_hill_phases` with `[]` meaning none.
- **implement / phase-execution:** phase scope carries `workflow_mode:
brief|goal`, the phase intent and exit evidence as the requirement source,
  and the F12 precedence ladder; the phase-start record; task execution
  records; base/head capture; fresh reviewer per phase.
- **implement / completion-and-closeout:** completion audit against
  Outcomes; brief modes use the non-lite post-implement sequence
  normalization and approval algorithm; goal's terminal closeout.
- **review-provide:** when the mode is brief, resolve `pNN` scope from the
  journal anchors first, then fall back to commit grep; artifact review of
  the brief uses the brief section list as its requirement source.
- **summary:** prerequisite is at least one completed phase-unit; freshness
  compares `oat_summary_last_phase` plus a journal content hash instead of
  the highest task ID.
- **pr-progress:** scope `pNN` from anchors; goal adds delivery
  prerequisites (accepted phase evidence, integrated review of the delivery
  scope) and writes the `oat_deliveries` entry.
- **pr-final:** brief modes require summary like quick; reduced-assurance
  note names the brief.
- **revise:** in brief modes creates `## Phase p-revN:` with Intent and Exit
  evidence, no tasks; `oat_current_task_id: p-revN`.
- **next / progress / plan / plan-writing / discover:** route tables and
  mode gates list both modes; plan-writing documents the brief profile and
  `oat_plan_source: brief | goal`.
- **brainstorm:** fold-back routing by mode gains brief (target `plan.md`)
  and, for goal, "revise this delivery" vs "align next milestone";
  `references/destinations.md` is brought current (lite and import rows
  added).
- **autonomous:** mode selection table and route table include brief; goal
  excluded from autonomous selection in v1.5.

### Agent roles

**`oat-phase-implementer.md`:** `workflow_mode` accepts brief and goal; for
those, the requirement source is the phase's Intent and Exit evidence plus
the brief's Outcomes, Constraints and Decisions; the implementer creates
execution-record tasks (F13 shape), commits with `(pNN-tNN)`, records base
and head, and never commits from a nested worker. **`oat-reviewer.md`:**
brief-mode expected artifacts, plan review sources (brief section list,
no task requirement), code review scope from anchors. Projections are
regenerated, not edited. Both files bump their top-level `version:`.

## Data Models

### Brief frontmatter (plan.md)

Unchanged plan keys; `oat_plan_source: brief | goal`. Phase body markers:

```markdown
## Phase p01: Research the parser contract

**Intent:** …
**Exit evidence:** …
**Provisional:** no
```

### Journal phase section (implementation.md)

```markdown
## Phase p01: Research the parser contract

**Status:** completed # pending | in_progress | completed | failed
**Base:** 531e86a0f # commit before phase work
**Head:** 9c0f3a1d2 # reviewed head; fix reviews advance it
**Executor:** root | phase-implementer:<id> | inline:<exception-ref>
Summary prose: verification, review disposition, authority changes, deviations, next action.

### Task p01-t01: Pin taskless-phase behavior

**Status:** completed
**Commit:** 7a1b2c3d4
**Executor:** worker:w2
Intent / files / proof command / result.
```

### Goal state (state.md, v1.5)

```yaml
oat_milestone: m02
oat_milestone_status: implementing # aligning | implementing | reviewing | delivering | delivered
oat_deliveries:
  - delivery_id: d01
    milestone: m01
    scope: [p01, p02, p03]
    endpoint: merged # open | merged
    kind: pr # pr | stack (stack machinery is v2)
    corrects_delivery_id: null
    members:
      - {
          url: …,
          base: <sha>,
          reviewed_head: <sha>,
          status: merged,
          disposition: accepted,
        }
    integrated_review:
      { reviewed_head: <sha>, artifact: reviews/…, disposition: passed }
oat_pr_status: merged # compatibility projection of the latest member
oat_pr_url: …
```

### Delivery and phase-unit interfaces

```typescript
export interface Delivery {
  deliveryId: string;
  milestone: string;
  scope: string[];
  endpoint: 'open' | 'merged';
  kind: 'pr' | 'stack';
  correctsDeliveryId: string | null;
  members: DeliveryMember[];
  integratedReview: ReviewEvidence | null;
}
```

## Error Handling

- **Unregistered or stale mode:** parsing an unknown mode still yields
  `null` → spec-driven; the brief entry skill asserts
  `oat_workflow_mode: brief` after scaffold and fails closed otherwise.
- **Missing anchors:** review scope for a brief phase with no `**Base:**`
  falls back to commit grep and records `scope-source: commit-grep` in the
  review artifact; a missing head blocks the phase-level completion line.
- **Provisional phase at dispatch:** implement refuses to dispatch a phase
  whose `**Provisional:** yes` is still set; it must be made concrete first.
- **Goal delivery without integrated review:** pr-progress refuses to open
  the delivery; closeout-check reports which delivery lacks coverage.
- **Promote goal mid-milestone:** refuses with the extraction hint.
- **Duplicate phase IDs / unknown milestone phase:** validate-plan errors.

## Testing Strategy

- **Control plane:** extend `parser.test.ts` (modes list), `tasks.test.ts`
  (phase-unit counting under `phaseUnits`, marker ownership reset, phase ID
  in `oat_current_task_id`, provisional handling, anchors), `router.test.ts`
  (brief and goal route tables, summary kept, milestone routing). Existing
  lite/quick/import/spec-driven assertions stay untouched as the regression
  net. Prove-it-can-fail once per new contract clause: neutralize the guard,
  watch the test break, restore, report.
- **CLI:** `scaffold.test.ts` (files and frontmatter per mode, bundled
  template floor), `validate-plan` tests per profile (lite rules unchanged,
  brief positives and each error code, goal milestone rule), `promote` tests
  (brief → quick, goal refusal), `generate.test.ts` (routes, help text,
  parity with `recommendSkill`), `closeout-check` tests (goal delivery
  coverage), `help-snapshots` and `commands.integration` end-to-end
  scaffold + route for both modes.
- **Skill contracts:** extend `skills.test.ts` lite-mode contract blocks to
  brief and goal (entry surfaces list them; any line pairing quick with
  spec-driven and lite mentions brief; `GATE_AWARE_SKILLS` matches
  `oat_gateable`); `named-skill-load-contract`, `review-skill-contracts`,
  `post-implement-sequence-contracts`, `project-start-preflight-contracts`.
- **Real-artifact probe:** scaffold a brief project in a temp repo with the
  branch build, author a two-phase brief, write journal sections, and run
  `project status`, `validate-plan`, `state refresh` and `gate review`
  parsing over it before review is requested.
- **Gates:** the full Definition of Done list with real (non-cached) runs;
  `pnpm lint` and `pnpm format` because `.agents/skills` changes.

## Delivery Staging

- **v1 (brief) → progress PR:** control-plane registry, predicate and
  phase-unit contract; CLI scaffold, templates, bundle, validate profiles,
  promote, routes, help; `oat-project-brief` and `brief-contract.md`;
  lifecycle skill and agent-role branches; docs, root AGENTS.md, decision
  records, version bumps.
- **v1.5 (goal) → final PR:** `goal` registration, goal state model and
  routes, closeout replacement contract, `oat-project-goal` with
  re-alignment, pr-progress delivery enforcement, brainstorm routing,
  manual extraction, docs and records.
- v2 items stay out.
