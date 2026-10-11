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
alignment contracts (F1–F9, G2–G3, F12–F13, C1–C6) are summarized in
`discovery.md` and detailed in
`.oat/repo/analysis/freestyle-brainstorm/consensus-proposal.md`.

Revision 2 (2026-10-10) answers Astra's round-1 review: every blocking
objection now has a defined contract in the section named beside it.

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
- **Promote** (`promote/`), brief → quick with a migration table.
- **Closeout invariant** (`closeout-check/closeout-invariant.ts`), goal
  delivery coverage.
- **Entry and interview skills** (`oat-project-brief`, `oat-project-goal`,
  shared `references/brief-contract.md`).
- **Lifecycle skill branches** (listed with dispositions in "Surface
  dispositions").
- **Agent roles** (`oat-phase-implementer.md`, `oat-reviewer.md`),
  projections regenerated.
- **Docs and root AGENTS.md.**

### Component Diagram

```
state.md (oat_workflow_mode) ─► parser ─► ProjectState.workflowMode
                                   │
                                   ├─► isBriefMode() ─┬─► parseTaskProgress(plan, impl, {phaseUnits})
                                   │                  ├─► router: brief-unit guard, BRIEF_ROUTES / goal transitions
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
          pr-progress (goal: delivery registry)              closeout-check (goal: coverage predicate)
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
4. Review scope for `pNN` resolves from recorded anchors in document order;
   fallbacks are defined below and recorded in the artifact.
5. Summary and closeout key on the phase fingerprint and journal; the
   configured `postImplementSequence` runs unchanged.
6. Goal: when the current milestone's phase-units are accepted, an
   integrated review of the milestone scope runs, `oat-project-pr-progress`
   registers and opens the delivery, learnings are captured, and the router
   routes `delivered` back to `oat-project-goal` for re-alignment, which
   amends the brief in place, appends the next milestone's phases, repeats
   the review ladder for the amendment, and activates the next milestone.
   Terminal closeout runs only after the user declares the goal met.

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

### Phase-unit progress contract (answers Astra B1)

**Public types** (`types.ts`): `PhaseProgress` gains optional fields that
are present only when the phase-unit contract produced them, so the existing
task-mode shape and every `toEqual` pin are unchanged.

```typescript
export interface PhaseProgress {
  phaseId: string;
  name: string;
  total: number;
  completed: number;
  isRevision: boolean;
  unit?: 'phase'; // present only in brief modes
  provisional?: boolean; // present only in brief modes
  taskRecords?: { total: number; completed: number }; // display metadata, brief modes only
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
export function parseCompletedPhaseIds(
  implementationContent: string,
): Set<string>; // exported for tests
export function parseProvisionalPhaseIds(planContent: string): Set<string>;
```

**Both readers** (`project.ts:46` and `project.ts:122`) call
`parseTaskProgress(planContent, implementationContent, { phaseUnits: isBriefMode(parsedState.workflowMode) })`.
`parsedState.workflowMode` is already parsed before the call at both sites.

**Task mode (`phaseUnits: false`)**: byte-for-byte today's behavior:
`parsePhaseProgress` drops phases without a matching task heading,
`parseCompletedTaskIds` carries the current task across phase headings, and
the returned objects carry no new fields. A new test pins a _taskless phase
heading_ being dropped in task mode (the existing
`tasks.test.ts:453` fixture is heading-free and does not pin that).

**Brief mode (`phaseUnits: true`)**:

- Every `## Phase` heading is one unit: `total: 1` always, regardless of any
  task heading under it in `plan.md` (validate-plan warns on such headings;
  the parser ignores them for totals). Task headings in `plan.md` are
  reported only through `taskRecords` if present.
- `completed: 1` iff the normalized phase ID is in
  `parseCompletedPhaseIds(implementation)` **and** the phase is not
  provisional. Provisional overrides a completion marker.
- Revision phases (`p-revN`) use the existing normalization and the same
  unit rule.
- `taskRecords` counts `### Task` headings found under the matching phase
  heading in `implementation.md` and those with a strict completed line; it
  never feeds `total`/`completed`.
- `total`/`completed` at the top level sum phase-units.

**Phase completion marker grammar** (`parseCompletedPhaseIds`):

- Scan `implementation.md` line by line. A `## Phase …` heading (same
  grammar as the plan) opens phase ownership. Ownership **ends at the next
  line starting with `#`** (any heading, including `### Task`), not merely
  at the next phase heading. So a task's status line can never complete its
  enclosing phase.
- The marker is the exact line `**Status:** completed` (trimmed, nothing
  after `completed`; same strictness as the task marker at `tasks.ts:163`).
  Other values (`pending`, `in_progress`, `failed`) are not completion.
- Matching is on the normalized phase ID.

**Pointer interpretation** (`oat_current_task_id`, `tasks.ts:171-177` already
accepts any string): the control plane keeps returning the raw string. Resume
consumers in brief modes resolve it as: a task ID → its enclosing phase; a
phase ID (`pNN` or `p-revN`) → that phase; `null`, unknown, or a completed
unit → the first incomplete unit in document order within the active scope.
The dashboard displays the raw value. This rule lives in
`plan-and-resume.md` and `brief-contract.md`, not in the parser.

**Scope selection seam (v1, needed by goal)**: `tasks.ts` exports
`selectPhaseUnits(progress: TaskProgress, scope: readonly string[] | null): PhaseProgress[]`
returning the phases whose normalized ID is in `scope`, in document order
(`null` = all). The router guard and implement's resume take the active
scope through this helper so milestone scoping in v1.5 does not rewrite
phase-progress semantics.

### Router guard and routes (answers Astra B2, B7)

**Brief-unit guard** (`router.ts`, inserted before the
`phase === 'implement' && (complete | pr_open)` post-implementation branch at
`router.ts:103-107`):

```typescript
if (
  isBriefMode(state.workflowMode) &&
  state.lifecycle !== 'complete' &&
  hasIncompletePhaseUnit(state, activeScope(state))
) {
  return {
    skill: normalizeImplementationSkill('oat-project-implement', state),
    reason: 'Incomplete phase-units remain in the active scope',
  };
}
```

`hasIncompletePhaseUnit` counts ordinary and revision phases alike, and a
provisional phase is incomplete. The existing `lifecycle === 'complete'`
terminal exception is preserved. For brief, `activeScope` is `null` (all
phases). The existing revision-only reopen at `router.ts:325-330` remains
for task modes. `plan-and-resume.md:308-315` gains the brief-mode rule:
finalization starts when all phase-units in the active scope are accepted,
never when all task records are complete.

Priority in `recommendSkill` for brief modes, top to bottom: decomposition →
HiLL override (none by default) → brief-unit guard → generic
post-implementation (pending review artifacts, final review, summary, PR,
complete). `BRIEF_ROUTES`: `plan:in_progress:*` → `oat-project-brief`;
`plan:complete` → implement. Summary stays required (the lite exemption at
`router.ts:299-307` is not extended). `generate.ts` mirrors the table and the
parity test covers the new mode; help text lists `oat-project-brief`.

**Goal transition contract (v1.5)**: persisted fields in `state.md`:

```yaml
oat_milestone: m02
oat_milestone_status: implementing # aligning | implementing | reviewing | delivering | delivered
oat_goal_status: active # active | declared_met
oat_goal_outcome_audit: null # null | { disposition: met | met_with_deferrals, decided_at, deferrals: [] }
```

| From → To                     | Owner                                   | Prerequisite                                                                                                                     | Persisted write                                                   | Recovery route                        |
| ----------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| (new) → aligning              | `oat-project-goal`                      | scaffold                                                                                                                         | `oat_milestone: m01`, status `aligning`                           | `oat-project-goal`                    |
| aligning → implementing       | `oat-project-goal`                      | brief (or amendment) passed artifact review + milestone-scoped gate + approval; milestone phases concrete                        | status `implementing`, `oat_current_task_id` first unit           | `oat-project-goal`                    |
| implementing → reviewing      | implement                               | every phase-unit in the milestone scope accepted                                                                                 | status `reviewing`                                                | implement (guard)                     |
| reviewing → delivering        | review-provide                          | integrated review scope = milestone phases, `passed`, bound to anchors                                                           | status `delivering`, review row                                   | review-provide                        |
| delivering → delivered        | pr-progress                             | delivery registered with members and integrated review binding; endpoint agreed                                                  | `oat_deliveries` entry, status `delivered`, `oat_pr_*` projection | pr-progress (idempotent registration) |
| delivered → aligning (next)   | `oat-project-goal`                      | learnings captured; user chooses next milestone; allowed while previous delivery is `open` only if its agreed endpoint is `open` | `oat_milestone: m(N+1)`, status `aligning`                        | `oat-project-goal`                    |
| delivered → terminal closeout | user declaration via `oat-project-goal` | coverage predicate holds; outcome audit recorded                                                                                 | `oat_goal_status: declared_met`, `oat_goal_outcome_audit`         | implement closeout                    |

Router priority for goal: decomposition → HiLL override → pending actionable
review artifacts → goal transition table keyed on `oat_milestone_status`
(the brief-unit guard runs inside `implementing`, scope = current milestone)
→ generic post-implementation **only when `oat_goal_status: declared_met`**.
A `final` project-wide review is not searched while the goal is active; the
milestone's integrated review is the review of record for its delivery.
Re-alignment repeats the ladder: artifact review of the amended brief,
configured plan gate (milestone-scoped, see registry), one approval.
"Planning the next milestone while awaiting merge" means the amendment and
its ladder may run during `delivered`; "activating" is the write to
`implementing`, which requires the previous delivery to be at its agreed
endpoint.

### Scaffold and templates (answers non-blocking 1)

- `TEMPLATES_BY_MODE.brief = [state.md, plan-brief.md → plan.md, implementation-brief.md → implementation.md]`;
  goal identical.
- `STATE_TEMPLATE_BY_MODE.brief`: start `plan` / `in_progress`;
  `oat_hill_checkpoints: []` documented as "none" for brief modes in the
  state template comment; artifact bullets for brief, implementation,
  references.
- Create `references/research/.gitkeep` for brief modes (generalizing the
  import `references/.gitkeep` path).
- Re-add `oat_template: true` to the scaffolded brief as lite does.
- Register **both** `plan-brief.md` and `implementation-brief.md` in
  `bundle-inputs.mjs` and `pack-manifest.ts`; force-add both bundled copies
  as lite's was; extend the bundled-template floor test.

**`plan-brief.md`**: frontmatter identical to `plan.md` with
`oat_plan_source: brief` and `oat_template_name: plan-brief`; body
`# Project Brief`, Goal, Outcomes (numbered, each with intended evidence),
Approach (optional `### Design`), Constraints and Out of Scope, Decisions,
Known Unknowns, Delivery endpoint and authority, Milestones (goal only),
Phases, Parallelism, Reviews, Implementation Complete, References. The
goal template is the same file; `oat-project-goal` fills the Milestones
table and sets `oat_plan_source: goal`.

**Phase block grammar** (strict, fence-aware, validated):

```markdown
## Phase p01: Research the parser contract

**Intent:** one or more non-empty lines
**Exit evidence:** one or more non-empty lines
**Provisional:** no
```

`**Provisional:**` accepts `yes` or `no`; absent means `no`. Lines are
read with the same fence and indented-code exclusion as
`quick-plan-readiness.ts`, so examples never count.

**`implementation-brief.md`**: frontmatter `oat_current_task_id` (phase or
task ID); Progress Overview counting phase-units; per-phase section with the
strict marker lines below, summary prose, then execution-record task blocks;
orchestration-run markers and the dated log retained.

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

Marker lines carry a value and nothing else. `**Status:**` values:
`pending | in_progress | completed | failed | cancelled | no-change` (the last
three are terminal task dispositions; phases use the first four).
`**Base:**` and `**Head:**` are full SHAs. `**Executor:**` values:
`root | phase-implementer:<id> | worker:<id> | inline:<exception-ref>`.

### Plan profiles in validate-plan (answers Astra B3)

```typescript
// packages/cli/src/commands/project/validate-plan/profiles.ts
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

- `extractPhaseIds`: for `task` and `lite`, today's task-heading extraction
  (sorted, unchanged). For `brief` and `goal`: normalized phase IDs from
  `## Phase` headings in document order, including `p-revN`, fence-aware.
  Parallel-group validation receives this list, so taskless groups validate.
- `lite` profile: the existing three rules and failure behavior move
  unchanged (`validate-plan.ts:67-115`); dispatch stays mode-specific so no
  rule crosses profiles.
- `brief` rules (error codes): `brief-no-phases`, `brief-duplicate-phase`
  (normalized), `brief-phase-missing-intent`, `brief-phase-missing-exit-evidence`
  (empty or placeholder-only), `brief-provisional-invalid` (value not
  yes/no), `brief-first-phase-provisional`, `brief-malformed-phase-heading`
  (a `## Phase` line that fails the grammar), and warning
  `brief-task-headings-ignored`.
- `goal` rules, in addition: `goal-milestones-missing`,
  `goal-duplicate-milestone` (`mNN`), `goal-milestone-unknown-phase`,
  `goal-phase-in-multiple-milestones`, `goal-shipped-milestone-changed`
  (membership differs from a registered delivery's `scope` in
  `stateFrontmatter.oat_deliveries`), `goal-group-crosses-milestone`
  (a parallel group spanning milestones), and the existing checkpoint rule
  that groups never cross a HiLL checkpoint.
- `index.ts` passes the state frontmatter it already reads, resolves the
  profile, and replaces the direct `validateLitePlan` call with
  `validatePlanForProfile`.

### Review scope from anchors (answers Astra B5)

Resolution order in `oat-project-review-provide` for brief modes:

1. Explicit user input (`base_sha=`, `<sha1>..<sha2>`) — unchanged.
2. Guarded re-review narrowing (Step 3a) — unchanged.
3. **Anchor resolution.** Expand the requested scope to phase IDs in
   **document order** (no numeric `seq`): `pNN` → one; `pNN-pMM` → the
   contiguous run from `pNN` to `pMM` in document order (error if `pMM`
   precedes `pNN`); `final` → all accepted phases. Read each phase's
   `**Base:**` and `**Head:**`. Validate: both commits exist, base is an
   ancestor of head, and for multi-phase scopes each phase's base equals or
   is an ancestor of the previous phase's head. Range =
   `firstBase..lastHead`. Parallel-group phases record their head as the
   integration merge commit into the project branch, so integration and
   conflict-resolution changes are inside the range; the reviewer is told
   which commits are integration commits.
4. **Missing anchors** (a phase with no `**Base:**`/`**Head:**`): commit
   grep over `MERGE_BASE..HEAD` (not `HEAD~50`), where `MERGE_BASE` is the
   confirmed merge base; accepted only if the grep finds at least one commit
   per phase and every hit lies in the range. Record
   `scope_source: commit-grep` and `fallback_reason`.
5. **Invalid or contradictory anchors** (nonexistent SHA, base not an
   ancestor, phases out of order): stop and route to
   `oat-project-reconcile`; never silently narrow.
6. Otherwise the existing explicit-range / confirmed-merge-base fallback
   (`SKILL.md:446-457`).

Candidate head is captured by the implementer at phase end (`**Head:**`)
before review dispatch; the `## Reviews` row's `Reviewed Head` is written by
the review; after fixes, the fix commits advance `**Head:**` and the
re-review's `Reviewed Head` (base unchanged, per F5.3).

**Review artifact record** (frontmatter, in addition to today's
`oat_review_scope`, `oat_review_head_sha`, invocation and gate provenance):
`oat_review_requested_scope`, `oat_review_phase_ids` (ordered),
`oat_review_base_sha`, `oat_review_scope_source`
(`anchors | commit-grep | explicit | merge-base | narrowed`),
`oat_review_fallback_reason`, `oat_review_narrowed_from` (prior reviewed
head, when narrowed). `review-receive` preserves these cells as it does the
existing provenance.

### Reconcile and review-receive (answers Astra B4)

**`oat-project-reconcile`, brief-mode branch:** the task source is the
journal, not `plan.md`. Map commits to execution records by `(pNN-tNN)` in
the message, then to phases by anchors (`base..head`). Unmatched commits in
a phase's range are attached to the phase with a synthesized execution
record marked `**Executor:** reconciled`. Live handles (orchestration-run
markers) are checked before any record is closed. Reconcile closes task
records and may set a phase to `in_progress`; it **never** writes a phase
`**Status:** completed`, because committed tasks do not imply accepted
evidence. The pointer is set to the first incomplete unit.

**`oat-project-review-receive`, brief-mode branch:** fix work is recorded as
execution-record tasks under the reviewed phase in `implementation.md` (not
in `plan.md`), with the `(review)` prefix, `**Source review:**` filename
and finding IDs, and `**Status:** pending`. Receiving feedback with queued
fixes rewrites the phase's `**Status:**` from `completed` to `in_progress`
(acceptance is reopened), updates the Reviews event to `fixes_added` with
preserved provenance exactly as today, and sets `oat_current_task_id` to the
phase ID. For `final` or range scopes, the fixes go under the last phase in
the scope. The task-mode path is unchanged.

### Promote brief → quick (answers Astra B6)

| Brief phase state                                   | Migration                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accepted (`**Status:** completed`, not provisional) | Kept as `## Phase pNN:`; its execution records are copied into `plan.md` as `### Task pNN-tNN:` with the same IDs, so quick progress counts them and the journal's completed markers already match. If the phase has no records, synthesize `### Task pNN-t01` only if that ID is unused in the journal; otherwise the next free `tNN`; write its completed marker and commit reference in the journal from the phase anchors. |
| Active (`in_progress`)                              | Kept; existing records become tasks as above; remaining work is left for authoring.                                                                                                                                                                                                                                                                                                                                            |
| Pending or provisional                              | Kept as a phase with no tasks; dropped from progress until the quick-start resume authors tasks.                                                                                                                                                                                                                                                                                                                               |
| Extracted (goal only)                               | Promotion refused; see goal rules.                                                                                                                                                                                                                                                                                                                                                                                             |

Frontmatter after promotion: `plan.md` `oat_status: in_progress`,
`oat_ready_for: null`, `oat_template: true`, `oat_plan_source: brief`
(preserved); `state.md` `oat_workflow_mode: quick`, `oat_phase: plan`,
`oat_phase_status: in_progress`, `oat_ready_for: oat-project-quick-start`.
The quick-start resume path then authors tasks for remaining phases, runs
the plan artifact review, and takes approval of the **newly introduced
tasks**; historical `## Reviews` rows are kept and annotated
`(pre-promotion, brief)`. The brief's Outcomes, Decisions, Known Unknowns and
Delivery authority are rendered into `discovery.md` (as lite's sections are)
and the original brief is copied to `references/brief-archive.md`. Readiness
therefore fails until the resume completes, which is the intended safe
transition. Lite promotion (`promote.ts:311-325`, discovery-complete →
quick-start) is untouched. Goal promotion is allowed only at
`oat_milestone_status: delivered` with no open delivery and no extracted
phases pending; otherwise it refuses with the extraction hint.

### Delivery registry (answers Astra B8)

```yaml
oat_deliveries:
  - delivery_id: d01
    milestone: m01
    scope: [p01, p02, p03] # frozen on registration
    endpoint: merged # agreed endpoint: open | merged
    kind: pr # pr | stack (stack machinery is v2)
    status: registering # registering | open | at_endpoint | superseded
    corrects_delivery_id: null
    members:
      - url: https://…/pull/123
        base: <full sha>
        reviewed_head: <full sha>
        status: open # open | merged | closed
        disposition: pending # pending | accepted | superseded
    integrated_review:
      artifact: reviews/…-review-m01.md
      scope: [p01, p02, p03]
      bound_revisions: [{ member: 0, base: <sha>, head: <sha> }]
      disposition: passed # passed | stale | failed
    gate: # milestone-scoped implement exit gate record (gate-approval-record core)
      status: allowed
      disposition: passed
      reviewed_head: <sha>
      decided_at: …
oat_pr_status: open # projection of the latest member
oat_pr_url: https://…/pull/123
```

Rules:

- **Endpoint satisfaction:** `open` is satisfied when every member is
  `open` or `merged` with an accepted disposition; `merged` when every
  member is `merged`. `status: at_endpoint` is written when satisfied.
- **Review binding and freshness:** the integrated review is bound to the
  scope and to each member's `base`/`head` at review time. Any change to a
  member's head or base, or to the scope, sets `integrated_review.disposition:
stale`; delivery and closeout refuse until a re-review passes.
- **Milestone-scoped gates:** the implement exit gate record lives inside
  the delivery (`gate`), one generation per milestone; the project-level
  `oat_implement_exit_gate` is used only for terminal closeout. An earlier
  milestone's gate never satisfies a later one.
- **Idempotent registration:** `pr-progress` writes the entry with
  `status: registering` and no URL before `gh pr create`, commits, then
  updates it with the URL and `status: open`. On resume, a `registering`
  entry with no URL triggers a lookup by branch head; a found PR is attached,
  otherwise creation is retried. A delivery is never duplicated.
- **Corrections:** post-merge corrections are a new delivery with new phase
  IDs and `corrects_delivery_id`; the corrected delivery's disposition
  becomes `superseded` only if the correction replaces it, otherwise both
  remain accepted.
- **Coverage predicate** (`closeout-invariant.ts`, goal only): every
  delivery is `at_endpoint` with accepted members and a non-stale passed
  integrated review; every accepted, non-extracted phase appears in exactly
  one delivery scope; no `registering` entries remain. When it holds, the
  implement closeout records the snapshot `pr` step complete with
  `satisfied_by: delivery-coverage` and runs every other configured step
  (summary, document, retro) unchanged; `pr-final` runs only for accepted
  phases outside any delivery.
- **Summary refresh** at each milestone boundary uses the phase fingerprint
  below plus the milestone coverage set.

**Extraction (G3, manual in v1.5):** transferred phases get
`**Extracted to:** <project slug>` in the brief and `**Status:** extracted`
in the journal; progress reports them as `extracted` (neither incomplete nor
accepted) and the coverage predicate excludes them; the child project
records `oat_extracted_from: <goal slug>` and the transferred outcome text.
The outcome stays in the goal brief; at terminal closeout the outcome audit
requires each extracted phase's child to be `lifecycle: complete` or an
explicit deferral recorded as a scope decision. Extraction is not
`oat-project-split`, which removes executable parent artifacts; split stays
unchanged.

### Summary freshness (answers non-blocking 2)

`summary.md` stores `oat_summary_phase_fingerprint`, a stable hash of: the
ordered list of accepted phase IDs, each accepted phase's `**Head:**`, the
brief's Goal, Outcomes and Decisions sections (normalized whitespace), and,
for goal, the set of delivery IDs at endpoint. Refresh is required when the
fingerprint differs; the existing learnings and project-log triggers remain
independent. `oat_summary_last_task` is not written in brief modes.

### Entry and interview skills

**`oat-project-brief`** (new, `oat_gateable: true`): preflight and scaffold
(quick-start Steps 0–1 contract, mode `brief`); interview per F2 and C4
(readiness rounds, design strand, facts by sub-agents, decisions by the
user, stop criterion, Known Unknowns); write the brief in one pass; commit;
review ladder (shared Auto Artifact-Review Loop with target `plan`, dispatch
ladder and ceiling resolution, optional phase gate review setup, lifecycle
gate posture, configured gate with `maxAttempts`); record disposition in
`## Reviews`; one user approval; set ready-for implement; initialize the
journal; refresh dashboard; commit.

**`oat-project-goal`** (new, v1.5): the brief steps plus the Milestones
table, milestone state initialization, and the re-alignment entry when
invoked at `delivered` (delta interview; amend brief in place; append the
next milestone's phases; log the amendment; repeat the ladder; activate),
and the terminal declaration entry (outcome audit, deferrals as scope
decisions, `oat_goal_status: declared_met`).

**`references/brief-contract.md`** (shared): brief sections, phase grammar,
marker grammar, readiness criteria, review ladder, F12 precedence, F13
record shape, pointer interpretation, record ownership, anchor rules,
promotion and extraction rules. Named-skill call sites load it by path.

### Agent roles

`oat-phase-implementer.md`: `workflow_mode` accepts brief and goal; the
requirement source is the phase's Intent and Exit evidence plus the brief's
Outcomes, Constraints and Decisions; creates execution-record tasks (F13),
commits with `(pNN-tNN)`, records `**Base:**` and `**Head:**`, never
commits from a nested worker; the Task Outcomes table lists records.
`oat-reviewer.md`: brief-mode expected artifacts, plan review sources (brief
section list, no task requirement), code review scope from anchors with the
artifact record above. Projections regenerated with `oat sync --scope
project`. Both roles bump `version:`.

## Surface dispositions

Every surface in the recon inventories, with its disposition. "v1" and
"v1.5" name the owning delivery; "unchanged" means a test or review lens
confirms no change is needed; "deferred" names the backlog item.

| Surface                                                                                                   | Disposition                                                                             |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `types.ts` modes, predicate                                                                               | v1 (brief), v1.5 (goal)                                                                 |
| `parser.ts`, `project.ts` readers                                                                         | v1                                                                                      |
| `tasks.ts` phase-unit contract, `selectPhaseUnits`                                                        | v1                                                                                      |
| `router.ts` guard, `BRIEF_ROUTES`, summary kept                                                           | v1; goal transitions v1.5                                                               |
| `quick-plan-readiness.ts`                                                                                 | unchanged (quick only)                                                                  |
| `generate.ts` routes, help, dashboard                                                                     | v1; goal v1.5                                                                           |
| `closeout-invariant.ts`                                                                                   | v1 unchanged for brief; coverage predicate v1.5                                         |
| `scaffold.ts`, `new/index.ts`                                                                             | v1; goal v1.5                                                                           |
| `validate-plan/*` profiles                                                                                | v1; goal rules v1.5                                                                     |
| `promote/*`                                                                                               | v1                                                                                      |
| `split/*`                                                                                                 | unchanged (children stay quick); extraction is not split                                |
| `cleanup/project` repaired-state default                                                                  | unchanged                                                                               |
| `frontmatter.ts` `GATE_AWARE_SKILLS`, `pack-manifest.ts`, `bundle-inputs.mjs`                             | v1; goal v1.5                                                                           |
| `.oat/templates/plan-brief.md`, `implementation-brief.md`, `state.md` comment, `plan.md` comment          | v1                                                                                      |
| `control-plane/README.md`                                                                                 | v1                                                                                      |
| `.oat/scripts/generate-oat-state.sh`                                                                      | deferred: BL for the legacy router (no caller in the CLI path); confirm with grep in v1 |
| implement: `plan-and-resume.md`, `phase-execution.md`, `completion-and-closeout.md`                       | v1; goal closeout v1.5                                                                  |
| review-provide, review-receive, reconcile                                                                 | v1                                                                                      |
| summary, document, pr-final, revise, complete                                                             | v1                                                                                      |
| pr-progress                                                                                               | v1 (anchors scope); delivery registry v1.5                                              |
| next, progress, plan, plan-writing, discover, autonomous, capture, docs, pjm-review-backlog, wave-execute | v1 (mode lists, tables, prose); goal v1.5 where routing differs                         |
| quick-start, lite, import-plan, new, promote-spec-driven                                                  | v1 prose only (mode mentions, promotion hints)                                          |
| brainstorm `SKILL.md` and `references/destinations.md`                                                    | v1 (brief fold-back; add lite and import rows); goal routing v1.5                       |
| agent roles and projections                                                                               | v1; goal v1.5                                                                           |
| docs pages and lane diagrams, root `AGENTS.md`                                                            | v1; goal v1.5                                                                           |
| decision records, project summary, backlog                                                                | each delivery                                                                           |

## Error Handling

- **Unregistered or stale mode:** unknown mode parses to `null` →
  spec-driven; the brief entry skill asserts `oat_workflow_mode: brief`
  after scaffold and fails closed otherwise.
- **Missing anchors:** commit-grep fallback over the merge-base range with
  `scope_source` recorded; a missing head blocks the phase completion line.
- **Invalid anchors:** route to reconcile; never narrow silently.
- **Provisional phase at dispatch:** implement refuses until the phase is
  made concrete (Intent and Exit evidence written, `**Provisional:** no`).
- **Goal delivery without a fresh integrated review:** pr-progress refuses;
  closeout-check names the delivery and the staleness cause.
- **Interrupted delivery registration:** `registering` entry recovered by
  head lookup; never duplicated.
- **Promote mid-milestone or with extracted phases pending:** refused with
  the extraction hint.
- **Validation errors** per profile as listed.

## Testing Strategy

- **Control plane, public boundary:** through both readers in `project.ts`:
  taskless phases in brief mode count one unit; a journal-only completed
  task record leaves its phase pending; a provisional phase with a
  completion marker stays incomplete; reordered phase IDs resolve in
  document order; revision phases; stale, null, task and phase pointers;
  task mode unchanged (taskless phase heading dropped, marker ownership
  carried). Prove-it-can-fail once per clause.
- **Router:** behavioral assertions (route outcome, not switch syntax):
  incomplete ordinary brief work with stale `complete`/`pr_open` status
  routes to implement; terminal projects do not reopen; summary required
  for brief; goal transition rows each have a test, including re-alignment
  during an open delivery and declared-met closeout.
- **CLI validate-plan:** per-profile cases: taskless parallel groups,
  normalized duplicate IDs, revision IDs, malformed headings, fenced
  examples, each brief and goal error code, lite errors unchanged.
- **Scaffold, promote, generate, closeout-check, help snapshots,
  integration:** files and frontmatter per mode; bundled-template floor for
  both templates; promotion cases (accepted history preserved, ID collision,
  active phase, provisional phases, readiness fails until resume, lite
  path unchanged); goal coverage cases (stale gate, changed member revision,
  interrupted registration, correction, extraction, terminal closeout
  without a duplicate PR).
- **Review scope:** reordered phases, missing vs invalid anchors, more than
  50 commits, parallel integration commits, re-review narrowing provenance.
- **Skill contracts:** extend the lite contract blocks in `skills.test.ts`
  to brief and goal; named-skill load, review-skill, post-implement-sequence
  and project-start-preflight contract tests.
- **Real-artifact probe:** scaffold a brief project in a temp repo with the
  branch build, author a two-phase brief, write journal sections with
  anchors, and run `project status`, `validate-plan`, `state refresh` and
  a gate-review parse over it before review is requested.
- **Acceptance boundaries:** v1 acceptance before `goal` registration; v1.5
  acceptance exercises the complete milestone loop end to end.
- **Gates:** the full Definition of Done with real runs; `pnpm lint` and
  `pnpm format` because `.agents/skills` changes.

## Delivery Staging

- **v1 (brief) → progress PR:** registry, predicate, phase-unit contract,
  scope seam, router guard; CLI scaffold, templates, bundle, profiles,
  promote, routes, help; `oat-project-brief` and `brief-contract.md`;
  lifecycle skill branches including reconcile and review-receive; agent
  roles; docs, root AGENTS.md, decision records, version bumps.
- **v1.5 (goal) → final PR:** `goal` registration, transition contract and
  routes, delivery registry and coverage predicate, milestone-scoped gates,
  `oat-project-goal` with re-alignment and terminal declaration,
  pr-progress registration, brainstorm routing, manual extraction, docs and
  records.
- v2 items stay out.
