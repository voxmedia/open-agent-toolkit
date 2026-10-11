---
oat_status: complete
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
alignment contracts (F1–F9, G2–G3, F12–F13, C1–C6) are summarized in
`discovery.md` and detailed in
`.oat/repo/analysis/freestyle-brainstorm/consensus-proposal.md`.

Revision 3 (2026-10-10) answers Astra's round-2 review; sections carry the
round-2 item they answer as "(R2-n)". Revision 3.1 applies Astra's round-3
changes (R3-n). Round-3 verdict: v1 (brief) ALIGNED WITH CHANGES, all
applied below; v1.5 (goal) NOT ALIGNED, with four objections carried into
the mandatory v1.5 plan-revision review (see "Carried to the v1.5 review").

## Overview

Two workflow modes join `spec-driven`, `quick`, `import` and `lite`:
`brief` (one delivery) and `goal` (many milestones). Both plan from one
authored artifact, `plan.md` titled "Project Brief", whose phases carry
intent and exit evidence instead of tasks. Everything identical between the
two branches on one predicate, `isBriefMode(mode)`; only milestone routing,
the delivery registry and terminal closeout branch on `goal`.

The approach is additive and seam-first. The control plane learns the new
modes, a phase-unit progress contract, a brief-mode routing guard and the
family predicate first, with every existing mode's behavior pinned by its
current tests. The CLI then scaffolds and validates the brief shape through
a plan-profile mechanism. Lifecycle skills and agent roles gain brief-mode
branches at the lines where they read tasks today, including reconcile and
review-receive. Goal lands last on the same seam and enters
`WORKFLOW_MODES` only when its resume, delivery, gate and closeout consumers
ship (DR-260906).

The riskiest change is the parser contract. Today a phase with no task
headings is dropped from progress, task totals come from `plan.md`, and
completion markers are read from `implementation.md` keyed by task ID. Brief
modes need a phase to count as one unit, completed by a phase-level status
line, with per-phase base and head commits replacing commit-message task
inference for review scope. That contract is selected by the mode at the
two project readers and is inert for every other mode.

## Architecture

### System Context

OAT's lifecycle is a set of skills (Markdown contracts executed by the host
agent) over a control plane (TypeScript parsers and a recommender) and a CLI
(scaffold, validate, route, gate). The mode is read from `state.md`
frontmatter and shapes every consumer. The new modes touch all three layers
plus templates, agent roles, docs and generated provider projections.

**Key Components:**

- **Mode registry and family predicate** (`packages/control-plane/src/types.ts`).
- **Phase-unit progress contract** (`packages/control-plane/src/state/tasks.ts`,
  `project.ts`, `types.ts`).
- **Router guard and routes** (`packages/control-plane/src/recommender/router.ts`,
  `packages/cli/src/commands/state/generate.ts`).
- **Scaffold and templates** (`scaffold.ts`, `.oat/templates/plan-brief.md`,
  `.oat/templates/implementation-brief.md`, bundle and pack registration).
- **Plan profiles in validate-plan** (`validate-plan/`).
- **Promote** (`promote/`) and the promoted-brief resume contract in
  quick-start and `quick-plan-readiness.ts`.
- **Closeout boundary** (`closeout-check/closeout-invariant.ts`,
  `closeout-check/index.ts`, `complete-state/index.ts`), goal coverage.
- **Entry and interview skills** (`oat-project-brief`, `oat-project-goal`,
  shared `references/brief-contract.md`).
- **Lifecycle skill branches** (see "Surface dispositions").
- **Agent roles** (`oat-phase-implementer.md`, `oat-reviewer.md`),
  projections regenerated.
- **Docs and root AGENTS.md.**

### Component Diagram

```
state.md (oat_workflow_mode) ─► parser ─► ProjectState.workflowMode
                                   │
                                   ├─► isBriefMode() ─┬─► parseTaskProgress(plan, impl, {phaseUnits})
                                   │                  ├─► router: brief-unit guard (implement only), BRIEF_ROUTES, goal transitions
                                   │                  └─► summary prerequisite (kept for brief modes)
                                   ▼
plan.md "Project Brief" ──► validate-plan (profile: brief | goal) ──► oat-project-brief / oat-project-goal
   │ (plan-brief.md, same frontmatter)                                   │
   ├─► ## Phase pNN: Intent / Exit evidence / Provisional                ▼
   ├─► ## Milestones (goal)                                   oat-project-implement
   └─► ## Reviews                                             F12 precedence, F13 task records
                                                                       │
                                        implementation-brief.md ◄──────┘
                                        (phase sections: Status, Base, Head, Executor,
                                         ### Task pNN-tNN execution records)
                                                 │
          review-provide (scope = anchors, document order)   summary (phase fingerprint)
          review-receive (fix records in journal)            reconcile (journal + git + handles)
          pr-progress (goal: delivery registry)              closeout boundary (goal: coverage predicate)
```

### Data Flow

1. `oat project new --mode brief` scaffolds `state.md` (mode `brief`, phase
   `plan`, `oat_hill_checkpoints: []`), `plan.md` from `plan-brief.md` with
   `oat_template: true`, `implementation.md` from `implementation-brief.md`,
   `references/research/.gitkeep`, `reviews/`, `pr/`, project log when
   configured.
2. `oat-project-brief` runs the interview, writes the brief in one pass,
   commits it, dispatches the plan artifact review, runs the configured plan
   gate, records the disposition in `## Reviews`, takes one user approval,
   sets `oat_status: complete` and `oat_ready_for: oat-project-implement`.
3. `oat-project-implement` resumes on the first incomplete phase-unit in
   document order within the active scope (all phases in brief; the current
   milestone's phases in goal). A provisional phase is made concrete before
   dispatch. Phase start records executor, worktree, committing owner,
   parallelism assessment and `**Base:**`. Execution follows F12; task
   records are appended under the phase as work starts and closed at commit
   (F13). Phase end records `**Head:**`, verification, the fresh reviewer's
   disposition, gate results and the phase-level `**Status:** completed`.
4. Review scope for `pNN` resolves from recorded anchors in document order
   with the coverage rule below; fallbacks are recorded in the artifact.
5. Summary and closeout key on the phase fingerprint and journal; the
   configured `postImplementSequence` runs unchanged.
6. Goal: when the current milestone's phase-units are accepted, the
   milestone exit gate and the integrated review of the milestone scope
   run, `oat-project-pr-progress` registers and opens the delivery,
   learnings are captured, and the router routes `delivered` back to
   `oat-project-goal` for re-alignment, which amends the brief in place,
   appends the next milestone's phases, repeats the ladder for the
   amendment, and activates the next milestone. Terminal closeout runs
   after the user declares the goal met and the terminal delivery (if any)
   reaches its endpoint.

## Component Design

### Mode registry and family predicate

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

`goal` is appended to both arrays in the goal phases, never earlier, so
`--mode` choices cannot expose it before its consumers exist.
`Record<WorkflowMode, …>` maps become type errors on registration, which is
the intended forcing function for scaffold coverage. No other `isXMode`
helpers; existing `=== 'lite'` checks stay.

### Phase-unit progress contract (R2-8, non-blocking 1)

**Public types** (`types.ts`): optional fields present only when the
phase-unit contract produced them, so the task-mode shape and every
`toEqual` pin are unchanged.

```typescript
export interface PhaseProgress {
  phaseId: string;
  name: string;
  total: number;
  completed: number;
  isRevision: boolean;
  unit?: 'phase'; // brief modes only
  provisional?: boolean; // brief modes only
  extracted?: { to: string }; // brief modes only (goal extraction), see below
  taskRecords?: { total: number; completed: number }; // journal-only display metadata
}
export interface TaskProgress {
  total: number;
  completed: number;
  currentTaskId: string | null;
  phases: PhaseProgress[];
}
```

**Parser signature** (`tasks.ts`):

```typescript
export interface TaskProgressOptions {
  phaseUnits?: boolean;
} // default false
export function parseTaskProgress(
  planContent: string,
  implementationContent: string,
  options?: TaskProgressOptions,
): TaskProgress;
export function parsePhaseMarkers(implementationContent: string): Map<
  string,
  {
    status: PhaseStatus;
    base: string | null;
    head: string | null;
    extractedTo: string | null;
  }
>;
export function parseProvisionalPhaseIds(planContent: string): Set<string>;
export function selectPhaseUnits(
  progress: TaskProgress,
  scope: readonly string[] | null,
): PhaseProgress[];
```

**Both readers** (`project.ts:46`, `project.ts:122`) call
`parseTaskProgress(planContent, implementationContent, { phaseUnits: isBriefMode(parsedState.workflowMode) })`;
`parsedState.workflowMode` is parsed before both call sites.

**Task mode (`phaseUnits: false`)**: byte-for-byte today's behavior. A new
test pins a _taskless phase heading_ being dropped in task mode (the
existing `tasks.test.ts:453` fixture is heading-free).

**Brief mode (`phaseUnits: true`)**, per `## Phase` heading in `plan.md`,
evaluated in this precedence:

1. **Extracted**: journal marker `**Status:** extracted` with
   `**Extracted to:** <slug>` → `{ total: 0, completed: 0, extracted: { to } }`.
   Excluded from aggregate totals, from `selectPhaseUnits`, from resume and
   from finalization; identity (`phaseId`, `name`) retained for the outcome
   audit. An extracted marker without `**Extracted to:**` is invalid
   (reported as `pending`, validate-plan warns).
2. **Provisional** (`**Provisional:** yes` in the plan) → `{ total: 1, completed: 0, provisional: true }`
   regardless of any journal marker.
3. **Accepted**: journal `**Status:** completed` → `{ total: 1, completed: 1 }`.
4. Otherwise `{ total: 1, completed: 0 }`.

Task headings in `plan.md` never affect totals (validate-plan warns on
them). `taskRecords` counts `### Task` headings under the matching phase in
**`implementation.md`** only, with the strict completed line; it never feeds
`total`/`completed`. Revision phases use the existing normalization.

**Phase marker grammar** (`parsePhaseMarkers`): a `## Phase …` heading in
the journal opens phase ownership; ownership **ends at the next line
starting with `#`** (any heading, including `### Task`). Markers are exact
lines: `**Status:** <value>`, `**Base:** <full sha>`, `**Head:** <full
sha>`, `**Extracted to:** <slug>`. Phase status values:
`pending | in_progress | completed | failed | extracted`. Task status values
add `cancelled | no-change`. Executor values:
`root | phase-implementer:<id> | worker:<id> | inline:<exception-ref> | reconciled`.

**Pointer interpretation** (`oat_current_task_id` stays a raw string in the
parser): brief-mode resume consumers resolve a task ID to its phase, a phase
ID to itself, and `null`, unknown, extracted or accepted units to the first
incomplete unit in document order within the active scope. Documented in
`plan-and-resume.md` and `brief-contract.md`.

### Router guard and routes (R2-1)

**Brief-unit guard**, inserted in `recommendSkill` after `getHillOverride`
and conditioned on the implement phase so planning routes stay reachable:

```typescript
if (
  state.phase === 'implement' &&
  isBriefMode(state.workflowMode) &&
  state.lifecycle !== 'complete' &&
  hasIncompletePhaseUnit(selectPhaseUnits(state.progress, activeScope(state)))
) {
  return {
    skill: normalizeImplementationSkill('oat-project-implement', state),
    reason: 'Incomplete phase-units remain in the active scope',
  };
}
// existing: if (phase === 'implement' && (complete | pr_open)) return getPostImplementationRecommendation(state)
```

`hasIncompletePhaseUnit` counts ordinary and revision phases alike;
provisional is incomplete; extracted units are already excluded by
`selectPhaseUnits`. `activeScope` is `null` for brief. The existing
`lifecycle === 'complete'` exception is preserved and the task-mode
revision-only reopen at `router.ts:325-330` is untouched.

**Planning routes**: `BRIEF_ROUTES = { 'plan:in_progress:3': 'oat-project-brief', 'plan:in_progress:2': 'oat-project-brief', 'plan:complete:1': 'oat-project-implement', 'implement:in_progress:any': 'oat-project-implement' }`
(explicit tier keys, since the router performs exact lookup; unlike lite,
tier 2 stays with the entry skill because a brief is implementation-ready
only through its recorded review disposition and approval)
(goal: `oat-project-goal` for the plan rows). `CURRENT_PHASE_SKILLS` used by
`getHillOverride` (`router.ts:224`) becomes mode-aware: for brief modes the
`plan` phase maps to the entry skill, not `oat-project-plan`. Brief modes
default to no HiLL checkpoints, so this only matters when a user opts in.

Priority for brief: decomposition → HiLL override → brief-unit guard
(implement only) → generic post-implementation → early-phase routes
(`BRIEF_ROUTES`). Summary stays required. `generate.ts` mirrors the table
and the parity test covers the new mode; help text lists
`oat-project-brief`. `plan-and-resume.md:308-315` gains the brief-mode rule:
finalization starts when all phase-units in the active scope are accepted,
never when all task records are complete.

### Goal transition contract (R2-2, R2-6)

Persisted fields in `state.md` (v1.5):

```yaml
oat_milestone: m02
oat_milestone_status: implementing # aligning | implementing | reviewing | delivering | delivered
oat_goal_status: active # active | declared_met
oat_goal_outcome_audit: null # null | { disposition: met | met_with_deferrals, decided_at, deferrals: [...] }
oat_milestone_gates: # one entry per milestone; each carrier uses the gate-approval-record core
  m01:
    plan:
      {
        status: allowed,
        resolution: configured,
        disposition: passed,
        config_fingerprint: …,
        reviewed_head: …,
        decided_at: …,
      }
    exit:
      {
        status: allowed,
        resolution: no_gate,
        disposition: no_gate,
        config_fingerprint: null,
        reviewed_head: …,
        decided_at: …,
      }
```

Gate carriers: `plan` is the milestone-scoped plan gate for the brief or
its amendment, run by `oat-project-goal` (the same configured
`oat-project-brief`/`oat-project-goal` lifecycle gate as the brief entry)
and required `allowed` before activation. `exit` is the milestone-scoped
implement exit gate, run by implement's milestone closeout against the
milestone scope and required `allowed` before delivery. Both preserve the
existing core (`status`, `disposition`, `config_fingerprint`,
`reviewed_head`, `decided_at`) and the `no_gate` / `project_disabled`
outcomes; the project-level `oat_implement_exit_gate` is used only at
terminal closeout. A carrier is `stale` when its `reviewed_head` no longer
equals the milestone's aggregate head; stale carriers must be re-run.

**Router priority for goal** (inside `recommendSkill`, after HiLL override):

1. `oat_goal_status: declared_met` → terminal closeout routing (below),
   before any milestone dispatch.
2. Actionable review artifacts → `oat-project-review-receive` (unchanged).
3. Active milestone membership empty or unknown (no `## Milestones` row for
   `oat_milestone`, or a row with no phases) → `oat-project-goal`, reason
   `Active milestone has no phases`.
4. Milestone status table:

| Status       | Recommendation               | Context                                                          | Guard                                                                               |
| ------------ | ---------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| aligning     | `oat-project-goal`           | `align <mNN>`                                                    | plan carrier not `allowed` or brief not approved                                    |
| implementing | `oat-project-implement`      | `scope <phase ids>`                                              | incomplete unit in scope; otherwise implement's milestone closeout sets `reviewing` |
| reviewing    | `oat-project-review-provide` | `code <first>-<last>` (integrated review of the milestone scope) | exit carrier `allowed` and not stale required first; implement runs it              |
| delivering   | `oat-project-pr-progress`    | `deliver <mNN>`                                                  | integrated review `passed` and fresh                                                |
| delivered    | `oat-project-goal`           | `realign`                                                        | endpoint observed via refresh                                                       |

**Transition table** (owner, prerequisite, write, recovery):

| From → To                 | Owner                                 | Prerequisite                                                                            | Write                                  | Recovery                 |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------ |
| new → aligning            | `oat-project-goal`                    | scaffold                                                                                | `oat_milestone: m01`                   | `oat-project-goal`       |
| aligning → implementing   | `oat-project-goal`                    | artifact review passed; `plan` carrier `allowed`; approval; phases concrete             | status, pointer                        | `oat-project-goal`       |
| implementing → reviewing  | implement milestone closeout          | all units in scope accepted; `exit` carrier `allowed`                                   | status                                 | implement                |
| reviewing → delivering    | review-provide                        | integrated review `passed`, bound to anchors                                            | status, review row                     | review-provide           |
| reviewing → implementing  | review-receive                        | fixes queued from the integrated review                                                 | status, phase reopened, pointer        | implement                |
| delivering → implementing | review-receive                        | fixes queued from a delivery-time review                                                | as above                               | implement                |
| delivering → reviewing    | pr-progress or refresh                | integrated review or `exit` carrier `stale` (observed head moved)                       | status                                 | review-provide           |
| delivering → delivered    | pr-progress                           | delivery registered, members open, review fresh                                         | registry entry, status, `oat_pr_*`     | pr-progress (idempotent) |
| delivered → aligning      | `oat-project-goal`                    | learnings captured; previous delivery at its agreed endpoint, or endpoint `open` agreed | `oat_milestone: m(N+1)`, status        | `oat-project-goal`       |
| delivered → terminal      | `oat-project-goal` (user declaration) | outcome audit recorded                                                                  | `oat_goal_status: declared_met`, audit | closeout routing         |

**Endpoint refresh** is owned by a new CLI command,
`oat project delivery refresh --project <path>`, which queries the host
(`gh pr view <url> --json state,headRefOid,baseRefOid`) and writes each
member's `observed_head`, `observed_base` and `status`. It is run by
`pr-progress` before registration completes, by `oat-project-goal` on
entry at `delivered`, and by the closeout boundary before coverage is
evaluated. A member whose `observed_head` differs from `reviewed_head`
marks the integrated review `stale` and the `exit` carrier `stale`.

**Terminal closeout routing** (`declared_met`): accepted non-extracted
phases outside any delivery → `oat-project-pr-final`, which registers the
terminal delivery (`kind: pr`, scope = those phases) through the same
registration contract; then the coverage predicate must hold; then the
configured post-implement sequence runs with the snapshot `pr` step
recorded `satisfied_by: delivery-coverage`. Declaration and coverage are
therefore separate: declaration opens closeout, coverage completes it.

Re-alignment repeats the ladder (artifact review of the amended brief, the
`plan` carrier for the new milestone, one approval). "Planning the next
milestone while awaiting merge" means the amendment and its ladder may run
during `delivered`; "activating" is the write to `implementing`, which
requires the previous delivery at its agreed endpoint.

### Scaffold and templates

- `TEMPLATES_BY_MODE.brief = [state.md, plan-brief.md → plan.md, implementation-brief.md → implementation.md]`;
  goal identical.
- `STATE_TEMPLATE_BY_MODE.brief`: start `plan` / `in_progress`;
  `oat_hill_checkpoints: []` documented as "none" for brief modes.
- Create `references/research/.gitkeep` for brief modes.
- Re-add `oat_template: true` to the scaffolded brief as lite does.
- Register both templates in `bundle-inputs.mjs` and `pack-manifest.ts`;
  force-add both bundled copies; extend the bundled-template floor test.

**`plan-brief.md`**: frontmatter identical to `plan.md` with
`oat_plan_source: brief` and `oat_template_name: plan-brief`; body
`# Project Brief`, Goal, Outcomes (numbered, each with intended evidence),
Approach (optional `### Design`), Constraints and Out of Scope, Decisions,
Known Unknowns, Delivery endpoint and authority, Milestones (goal only),
Phases, Parallelism, Reviews, Implementation Complete, References.

**Phase block grammar** (strict, fence-aware):

```markdown
## Phase p01: Research the parser contract

**Intent:** one or more non-empty lines
**Exit evidence:** one or more non-empty lines
**Provisional:** no
```

`**Provisional:**` accepts `yes` or `no`; absent means `no`. Read with the
same fence and indented-code exclusion as `quick-plan-readiness.ts`.

**`implementation-brief.md`**: frontmatter `oat_current_task_id`; Progress
Overview counting phase-units; per-phase section with marker lines, summary
prose, then execution-record task blocks; orchestration-run markers and the
dated log retained.

```markdown
## Phase p01: Research the parser contract

**Status:** completed
**Base:** 531e86a0f4b2c7d9e1f3a5b7c9d1e3f5a7b9c1d3
**Head:** 9c0f3a1d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b
**Executor:** root

Summary prose: verification, review disposition, authority changes, deviations, next action.

### Task p01-t01: Pin taskless-phase behavior

**Status:** completed
**Commit:** 7a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
**Executor:** worker:w2

Intent, files, proof command, result.
```

### Plan profiles in validate-plan

```typescript
export type PlanProfile = 'task' | 'lite' | 'brief' | 'goal';
export function resolvePlanProfile(mode: WorkflowMode | null): PlanProfile;
export interface ValidationContext {
  profile: PlanProfile;
  workflowMode: WorkflowMode | null;
  stateFrontmatter: Record<string, unknown> | null;
}
export function extractPhaseIds(
  content: string,
  profile: PlanProfile,
): string[];
export function validatePlanForProfile(
  content: string,
  ctx: ValidationContext,
): ValidationIssue[];
```

- `extractPhaseIds`: `task`/`lite` keep today's sorted task-heading
  extraction; `brief`/`goal` return normalized `## Phase` heading IDs in
  document order including `p-revN`, fence-aware. Group validation
  receives this list.
- `lite` rules move unchanged (`validate-plan.ts:67-115`); dispatch is
  profile-specific.
- `brief` error codes: `brief-no-phases`, `brief-duplicate-phase`,
  `brief-phase-missing-intent`, `brief-phase-missing-exit-evidence`,
  `brief-provisional-invalid`, `brief-first-phase-provisional`,
  `brief-malformed-phase-heading`; warning `brief-task-headings-ignored`.
- `goal` adds: `goal-milestones-missing`, `goal-duplicate-milestone`,
  `goal-milestone-unknown-phase`, `goal-phase-in-multiple-milestones`,
  `goal-shipped-milestone-changed` (against `oat_deliveries[].scope`),
  `goal-group-crosses-milestone`, plus the existing checkpoint rule.
- `index.ts` passes the state frontmatter it already reads
  (`index.ts:82-95`) and replaces the direct lite call.

### Review scope from anchors (R2-3)

Resolution order in `oat-project-review-provide` for brief modes:

1. Explicit user input — unchanged.
2. Guarded re-review narrowing (Step 3a) — unchanged.
3. **Anchor resolution.** Expand the requested scope to phase IDs in
   document order (`pNN`; `pNN-pMM` as the contiguous run, error if `pMM`
   precedes `pNN`; `final` = all accepted non-extracted phases). Read each
   phase's `**Base:**` and `**Head:**` and apply, in order:
   - **Existence**: every base and head exists.
   - **Per-phase ancestry**: each base is an ancestor of its head.
   - **Aggregate head**: the aggregate head `H` is the head of the last
     phase in document order; **every** selected phase's head must be an
     ancestor of or equal to `H`. A phase head that `H` does not contain is
     a contradictory ordering (for example a later phase anchored `A..B`
     after an earlier `A..C`) and routes to reconcile.
   - **Sequential continuity**: for consecutive sequential phases, the next
     base must be equal to or a **descendant** of the previous head
     (bookkeeping commits between phases are allowed and are inside the
     range); a next base that is an ancestor of the previous head is
     contradictory.
   - **Parallel continuity**: phases in one declared group share a fork
     base (each base equals the group's fork commit, recorded at group
     start) and each head is the phase's integration merge commit on the
     project branch; the group's aggregate head is the last integration
     merge. Integration and conflict-resolution commits are inside the
     range and are listed to the reviewer as integration commits.
   - Range = `firstBase..H`. Coverage holds by construction: `H` contains
     every phase head, and every phase base is inside or at the start.
4. **Missing anchors** (any selected phase lacks `**Base:**` or
   `**Head:**`): the reviewed range is the **entire confirmed merge-base
   range** `MERGE_BASE..HEAD`; commit-grep by `(pNN-` is used only to label
   which commits belong to which phase, never to narrow. Record
   `scope_source: merge-base-range` and `fallback_reason: missing-anchors`.
5. **Invalid anchors** (any check in 3 fails): stop and route to
   `oat-project-reconcile`; never narrow silently.
6. Otherwise the existing explicit-range / confirmed-merge-base fallback.

Candidate head is captured at phase end (`**Head:**`) before review
dispatch; the `## Reviews` row's `Reviewed Head` is written by the review.

**Late-fix rule (R3-1).** Fix commits may advance a phase's `**Head:**`
(base unchanged, F5.3) **only while no later phase has started** (no later
phase in document order has a `**Base:**`). Once a later phase has
started, corrections to an earlier phase are recorded as an appended
revision phase `## Phase p-revN:` with its own `**Base:**`/`**Head:**`
and a `**Corrects:** pNN` marker; the corrected phase keeps its original
anchors, and its `## Reviews` row is re-evaluated by the revision's review.
Revision phases take part in anchor resolution as ordinary later phases, so
aggregate containment and sequential continuity hold for the whole history.
`final` scope includes revision phases.

**Review artifact record**: in addition to today's provenance,
`oat_review_requested_scope`, `oat_review_phase_ids` (ordered),
`oat_review_base_sha`, `oat_review_scope_source`
(`anchors | merge-base-range | explicit | merge-base | narrowed`),
`oat_review_fallback_reason`, `oat_review_integration_commits`,
`oat_review_narrowed_from`. `review-receive` preserves these cells.

### Reconcile and review-receive

**`oat-project-reconcile`, brief-mode branch:** the task source is the
journal. Map commits to execution records by `(pNN-tNN)`, then to phases by
anchors. Unmatched commits in a phase's range get a synthesized record with
`**Executor:** reconciled`. Live handles are checked before any record is
closed. Reconcile closes task records and may set a phase to
`in_progress`; it never writes `completed` for a phase. Pointer → first
incomplete unit.

**`oat-project-review-receive`, brief-mode branch:** fix work is recorded as
execution-record tasks under the reviewed phase in `implementation.md`
(`(review)` prefix, `**Source review:**` filename and finding IDs,
`**Status:** pending`). Receiving queued fixes applies the late-fix rule: if no later phase has
started, the fixes go under the reviewed phase, whose `**Status:**` is
rewritten from `completed` to `in_progress`; otherwise review-receive
appends `## Phase p-revN:` (Intent: the findings; Exit evidence: the
re-review; `**Corrects:** pNN`) in both `plan.md` and the journal and
records the fixes under it. In both cases it updates the Reviews event to
`fixes_added` with preserved provenance, sets `oat_current_task_id` to the
phase (or revision phase) ID, and in goal mode writes `oat_milestone_status: implementing`
(from `reviewing` or `delivering`). For `final` or range scopes the fixes go
under the last phase in scope.

### Promote brief → quick (R2-4)

Migration by phase state and task-record disposition:

| Brief phase state      | Migration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted               | Kept as `## Phase pNN:`. Each **completed** execution record is copied into `plan.md` as `### Task pNN-tNN:` with the same ID (journal markers already satisfy quick progress). Records with `failed`, `cancelled` or `no-change` are **not** copied; they stay in the journal and the plan phase gets a `**Historical records:** pNN-tNN (cancelled), …` line. If the phase has no completed record, synthesize one `### Task pNN-tNN:` named `Accepted via phase evidence` at the next free ID, and write its completed marker and `**Commit:** <phase head>` in the journal. |
| Active (`in_progress`) | Completed records are copied as above; unfinished records (`pending`, `in_progress`) keep their IDs and become the first authored tasks of the phase during the promoted-brief resume; **no acceptance task is ever synthesized for an unaccepted phase** (synthesis belongs to the Accepted row only).                                                                                                                                                                                                                                                                         |
| Pending or provisional | Kept as a taskless phase; needs authored tasks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Extracted (goal)       | Promotion refused.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Frontmatter after promotion: `plan.md` `oat_status: in_progress`,
`oat_ready_for: null`, `oat_template: true`, `oat_plan_source: quick`,
`oat_promoted_from: brief`, `oat_promotion_pending_phases: [pNN, …]` (every
phase that still needs executable tasks: active, pending, provisional);
`state.md` `oat_workflow_mode: quick`, `oat_phase: plan`,
`oat_phase_status: in_progress`, `oat_ready_for: oat-project-quick-start`.
The brief's Outcomes, Decisions, Known Unknowns and Delivery authority are
rendered into `discovery.md`; the original brief is copied to
`references/brief-archive.md`; historical `## Reviews` rows are kept with their
cells untouched (Scope + Type + Artifact identity is load-bearing for
review-receive, implement bookkeeping and readiness), and one provenance line
is added under `## Reviews` stating that rows dated on or before the
promotion were recorded under workflow mode brief (revision 3.2, from the p04
review).

**Promoted-brief resume contract** (changes `oat-project-quick-start` and
`quick-plan-readiness.ts`): the readiness predicate gains clause 6,
`oat_promotion_pending_phases` absent or empty (new not-ready reason
`promotion-pending-phases`), mirrored in the bash guard. Quick-start Step 0.5
resume detects `oat_promoted_from: brief`, authors executable tasks for
every listed phase, removes each from the list as it is authored, runs the
plan artifact review and the configured gate on the whole plan, and takes
approval of the **newly introduced tasks** (historical tasks are presented
as already accepted). Step 3's provenance rule is unchanged
(`oat_plan_source: quick`), since the promotion already set it and
`oat_promoted_from` carries the origin. Lite promotion
(`promote.ts:311-325`) is untouched. Goal promotion requires
`oat_milestone_status: delivered`, no open delivery and no extracted phase
pending; otherwise it refuses with the extraction hint.

### Delivery registry and closeout boundary (R2-5, R2-6, R2-7, non-blocking 3)

```yaml
oat_deliveries:
  - delivery_id: d01
    milestone: m01
    scope: [p01, p02, p03] # frozen on registration
    endpoint: merged # agreed endpoint: open | merged
    kind: pr # pr | stack (stack machinery is v2)
    status: open # registering | open | at_endpoint | superseded
    superseded_by: null # dNN when status is superseded
    corrects_delivery_id: null # for corrections
    covers_scope_of: null # dNN whose coverage obligations this delivery inherits
    lookup: # persisted before creation for idempotent recovery
      repository: owner/name
      head_branch: feat/…
      head_sha_at_registration: <full sha>
    members:
      - url: https://…/pull/123
        base: <full sha>
        reviewed_head: <full sha>
        observed_head: <full sha> # written by `oat project delivery refresh`
        observed_base: <full sha>
        status: open # open | merged | closed
    integrated_review:
      artifact: reviews/…-review-m01.md
      scope: [p01, p02, p03]
      bound_revisions: [{ member: 0, base: <sha>, head: <sha> }]
      disposition: passed # passed | stale | failed
oat_pr_status: open # projection of the latest member
oat_pr_url: https://…/pull/123
```

Rules:

- **Endpoint satisfaction:** `open` is satisfied when every member is
  `open` or `merged`; `merged` when every member is `merged`; evaluated on
  `observed_*` after a refresh. Satisfied → `status: at_endpoint`.
- **Freshness:** `observed_head != reviewed_head` or `observed_base !=
base` for any member → `integrated_review.disposition: stale` and the
  milestone `exit` carrier `stale`; delivery and closeout refuse until a
  re-review and gate rerun pass.
- **Idempotent registration:** `pr-progress` writes the entry with
  `status: registering` and the `lookup` keys, commits, then creates the
  PR and updates the entry with the URL and `status: open`. On resume, a
  `registering` entry triggers `gh pr list --repo <repository> --head
<head_branch> --state all --json url,headRefOid`; exactly one match is
  attached; zero → create; more than one → stop and route to reconcile.
- **Supersession:** a correction that **replaces** a delivery that never
  reached its endpoint sets the original `status: superseded`,
  `superseded_by: dNN`, and the replacement's `covers_scope_of: d01`
  (inheriting the original's scope for coverage). A correction of a
  delivery that did reach its endpoint is additive: the original stays
  `at_endpoint` and the correction has its own new phase IDs. A
  `superseded_by` that does not resolve to a registered delivery is an
  invariant failure.
- **Coverage predicate** (goal only), evaluated at the closeout boundary:
  1. no `registering` entries;
  2. every delivery is `at_endpoint`, or `superseded` with a resolvable
     `superseded_by` whose target is `at_endpoint` and lists it in
     `covers_scope_of`;
  3. every `at_endpoint` delivery has a non-stale `passed` integrated
     review and an `allowed`, non-stale `exit` carrier for its milestone;
  4. every accepted, non-extracted phase (from the plan and journal)
     appears in exactly one delivery scope or inherited scope;
  5. every extracted phase's child project is `lifecycle: complete` or
     named in `oat_goal_outcome_audit.deferrals`.
- **Boundary inputs** (`closeout-invariant.ts:113` `EvaluateCloseoutOptions`
  gains `planContent`, `implementationContent` and
  `childLifecycles: Record<slug, string | null>`; `checkProjectCloseout` in
  `closeout-check/index.ts` loads `plan.md` and `implementation.md` beside
  `state.md` and, for each `**Extracted to:**` slug, that project's
  `state.md` lifecycle from the projects root). Both `closeout-check` and
  `complete-state` go through `checkProjectCloseout`, and the goal
  invariants are enforced before either the snapshot-success or the
  `not_required` return.
- **Snapshot `pr` step:** when execution of the configured sequence
  reaches the `pr` step's position and the predicate holds, implement's
  closeout records that step complete with `satisfied_by: delivery-coverage`
  (never earlier, so the completed-prefix invariant at
  `closeout-invariant.ts:189-212` holds) and runs every other configured
  step unchanged.

**Extraction (G3, manual in v1.5):** transferred phases get
`**Extracted to:** <slug>` in the brief and the journal marker pair
`**Status:** extracted` / `**Extracted to:** <slug>`; the child records
`oat_extracted_from: <goal slug>` and the transferred outcome text; the
outcome stays in the goal brief and the audit requires the child complete or
a recorded deferral. Extraction is not `oat-project-split`; split is
unchanged.

### Summary freshness (non-blocking 2)

`summary.md` stores `oat_summary_phase_fingerprint`, a stable hash of: the
ordered accepted phase IDs; for each accepted phase its `**Head:**`, its
`**Status:**` line and the latest `## Reviews` row disposition for that
phase; the brief's Goal, Outcomes and Decisions sections (normalized
whitespace); and, for goal, the delivery IDs at endpoint. Refresh is
required when the fingerprint differs; the existing learnings and
project-log triggers remain independent. `oat_summary_last_task` is not
written in brief modes.

### Entry and interview skills

**`oat-project-brief`** (new, `oat_gateable: true`): preflight and scaffold
(quick-start Steps 0–1 contract, mode `brief`); interview per F2 and C4;
write the brief in one pass; commit; review ladder (shared Auto
Artifact-Review Loop with target `plan`, dispatch ladder and ceiling
resolution, optional phase gate review setup, lifecycle gate posture,
configured gate with `maxAttempts`); record disposition in `## Reviews`;
one user approval; set ready-for implement; initialize the journal; refresh
dashboard; commit.

**`oat-project-goal`** (new, v1.5): the brief steps plus the Milestones
table, milestone state initialization, the `plan` carrier, the re-alignment
entry at `delivered` (refresh deliveries; delta interview; amend brief in
place; append the next milestone's phases; log; repeat the ladder;
activate), and the terminal declaration entry (outcome audit, deferrals as
scope decisions, `oat_goal_status: declared_met`).

**`references/brief-contract.md`** (shared): brief sections, phase and
marker grammar, readiness criteria, review ladder, F12 precedence, F13
record shape, pointer interpretation, record ownership, anchor rules,
promotion and extraction rules.

### Agent roles

`oat-phase-implementer.md`: `workflow_mode` accepts brief and goal; the
requirement source is the phase's Intent and Exit evidence plus the brief's
Outcomes, Constraints and Decisions; creates execution-record tasks (F13),
commits with `(pNN-tNN)`, records `**Base:**` and `**Head:**`, never
commits from a nested worker. `oat-reviewer.md`: brief-mode expected
artifacts, plan review sources, code review scope from anchors with the
artifact record above. Projections regenerated with `oat sync --scope
project`. Both roles bump `version:`.

## Surface dispositions

| Surface                                                                                                   | Disposition                                            |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `types.ts` modes, predicate                                                                               | v1 (brief), v1.5 (goal)                                |
| `parser.ts`, `project.ts` readers                                                                         | v1                                                     |
| `tasks.ts` phase-unit contract, markers, `selectPhaseUnits`; extraction fields                            | v1 (extraction parsing v1.5)                           |
| `router.ts` guard, `BRIEF_ROUTES`, mode-aware `CURRENT_PHASE_SKILLS`, summary kept                        | v1; goal priority and transitions v1.5                 |
| `quick-plan-readiness.ts`                                                                                 | v1 changed (clause 6, promotion-pending phases)        |
| `generate.ts` routes, help, dashboard                                                                     | v1; goal v1.5                                          |
| `closeout-invariant.ts`, `closeout-check/index.ts`, `complete-state/index.ts`                             | unchanged for brief; boundary inputs and coverage v1.5 |
| new `oat project delivery refresh`                                                                        | v1.5                                                   |
| `scaffold.ts`, `new/index.ts`                                                                             | v1; goal v1.5                                          |
| `validate-plan/*` profiles                                                                                | v1; goal rules v1.5                                    |
| `promote/*`                                                                                               | v1                                                     |
| `split/*`                                                                                                 | unchanged                                              |
| `cleanup/project` repaired-state default                                                                  | unchanged                                              |
| `frontmatter.ts` `GATE_AWARE_SKILLS`, `pack-manifest.ts`, `bundle-inputs.mjs`                             | v1; goal v1.5                                          |
| templates `plan-brief.md`, `implementation-brief.md`, `state.md` and `plan.md` comments                   | v1                                                     |
| `control-plane/README.md`                                                                                 | v1                                                     |
| `.oat/scripts/generate-oat-state.sh`                                                                      | deferred (backlog) after a v1 caller check             |
| implement references (`plan-and-resume`, `phase-execution`, `completion-and-closeout`)                    | v1; milestone closeout v1.5                            |
| review-provide, review-receive, reconcile                                                                 | v1; goal status writes v1.5                            |
| summary, document, pr-final, revise, complete                                                             | v1; terminal delivery registration in pr-final v1.5    |
| pr-progress                                                                                               | v1 (anchors scope); registry v1.5                      |
| quick-start                                                                                               | v1 changed (promoted-brief resume contract)            |
| next, progress, plan, plan-writing, discover, autonomous, capture, docs, pjm-review-backlog, wave-execute | v1 prose and tables; goal v1.5                         |
| lite, import-plan, new, promote-spec-driven                                                               | v1 prose only                                          |
| brainstorm `SKILL.md` and `references/destinations.md`                                                    | v1 (brief fold-back; lite and import rows); goal v1.5  |
| agent roles and projections                                                                               | v1; goal v1.5                                          |
| docs pages, lane diagrams, root `AGENTS.md`                                                               | v1; goal v1.5                                          |
| decision records, project summary, backlog                                                                | each delivery                                          |

## Carried to the v1.5 review

Astra's round-3 objections to the goal contracts, to be resolved in the
design and plan revision after the v1 progress PR and before any goal phase
executes. The v1 seam does not depend on their resolution.

1. **Review recovery owners.** `reviewing → delivering` must be written by
   review-receive on a clean receive (review-provide writes `received`,
   review-receive writes `passed`); missing or stale exit carriers route to
   implement's scoped milestone closeout before review-provide is
   recommended; recovery applies to older deliveries without moving the
   active milestone pointer.
2. **Bookkeeping-successor freshness.** Exact-head freshness rejects the
   workflow's own artifact and registration commits. Define a bounded
   successor contract for review and gate evidence: keep the actual
   reviewed SHA, verify ancestry to the published head, allow an explicit
   allowlist of bookkeeping-only paths between them, reject anything
   substantive; never relabel an unreviewed head as reviewed.
3. **Terminal boundary requires declaration.** The closeout boundary must
   require `declared_met`, a valid outcome audit, and a disposition for
   every remaining phase and outcome (accepted, validly extracted, or
   deferred/retired through the audit) before either success return, so a
   direct `complete-state` call cannot pass on coverage alone.
4. **Supersession chains.** Resolve acyclic replacement chains to the
   terminal delivery, compute the effective inherited scope there, count
   coverage once, and require review evidence bound to revisions containing
   the entire effective scope; reject cycles, missing links and mismatched
   review scope.

## Error Handling

- Unknown mode parses to `null` → spec-driven; the entry skill asserts the
  mode after scaffold and fails closed.
- Missing anchors → merge-base range with `scope_source` recorded; invalid
  anchors → reconcile; a missing head blocks the phase completion line.
- Provisional phase at dispatch → refused until concrete.
- Extracted marker without a target → treated as pending, validate warns.
- Goal: stale review or carrier → back to `reviewing`; empty milestone →
  `oat-project-goal`; ambiguous PR lookup → reconcile; dangling
  `superseded_by` → invariant failure; promote mid-milestone → refused.
- Validation errors per profile as listed.

## Testing Strategy

- **Control plane, public boundary** through both readers: taskless
  phases count one unit; journal-only completed task leaves the phase
  pending; provisional overrides completion; extracted excluded from totals
  and scope; reordered IDs resolve in document order; revision phases;
  stale, null, task, phase pointers; task mode unchanged. Prove-it-can-fail
  once per clause.
- **Router (behavioral):** unapproved brief in `plan:in_progress` with an
  incomplete phase routes to `oat-project-brief`, not implement; incomplete
  ordinary brief work with stale `complete`/`pr_open` routes to implement;
  terminal projects do not reopen; summary required; goal: fixes after the
  integrated review route to implement, `declared_met` with `delivered`
  status routes to closeout, empty milestone routes to goal, each
  transition row.
- **Review scope:** worked counterexamples: decreasing heads (`A..C` then
  `A..B`) rejected; bookkeeping commits between sequential phases accepted;
  parallel integration; missing vs invalid anchors; more than 50 commits;
  re-review narrowing provenance.
- **CLI validate-plan:** per-profile cases including taskless parallel
  groups, normalized duplicates, revision IDs, malformed headings, fenced
  examples, every error code, lite unchanged.
- **Promotion:** accepted history with completed records, cancelled and
  no-change records preserved not fabricated, synthesized acceptance task,
  ID collision, taskless future phases, readiness fails on pending phases
  until the resume clears them, lite path unchanged.
- **Closeout boundary (v1.5):** identical `state.md` with different
  journal or child facts yields different coverage; snapshot-present and
  unconfigured paths both enforce goal invariants; one end-to-end goal case
  combining extraction, changed member revision, stale milestone gate,
  correction supersession and terminal coverage without a duplicate PR.
- **Scaffold, generate, help snapshots, integration:** per-mode files and
  frontmatter; bundled-template floor for both templates; routes and
  parity.
- **Skill contracts:** extend the lite contract blocks in `skills.test.ts`
  to brief and goal; named-skill load, review-skill,
  post-implement-sequence and project-start-preflight contract tests.
- **Real-artifact probe:** scaffold a brief project in a temp repo with the
  branch build, author a two-phase brief, write journal sections with
  anchors, run `project status`, `validate-plan`, `state refresh` and a
  gate-review parse before review is requested.
- **Acceptance boundaries:** v1 before `goal` registration; v1.5 exercises
  the complete milestone loop.
- **Gates:** the full Definition of Done with real runs; `pnpm lint` and
  `pnpm format` because `.agents/skills` changes.

## Delivery Staging

- **v1 (brief) → progress PR:** registry, predicate, phase-unit contract
  and markers, scope seam, router guard and mode-aware HiLL map; CLI
  scaffold, templates, bundle, profiles, promote and the promoted-brief
  resume contract, routes, help; `oat-project-brief` and
  `brief-contract.md`; lifecycle skill branches including reconcile and
  review-receive; agent roles; docs, root AGENTS.md, decision records,
  version bumps.
- **v1.5 (goal) → final PR:** `goal` registration, transition contract,
  gate carriers, delivery registry, refresh command, closeout boundary
  inputs and coverage predicate, `oat-project-goal`, pr-progress
  registration, pr-final terminal delivery, extraction parsing, brainstorm
  routing, docs and records. The v1.5 contracts are re-reviewed by Astra at
  the plan-revision boundary after the progress PR, before any goal phase
  executes.
- v2 items stay out.
