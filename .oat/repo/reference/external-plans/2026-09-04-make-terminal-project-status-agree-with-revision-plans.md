---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260901-make-terminal-project-status.md
oat_external_plan_commit: 6b9a15841dab949ed83fa174286396e063da721d
oat_external_plan_date: '2026-09-04'
oat_execution_status: READY
oat_backlog_items:
  - BL-260901-make-terminal-project-status
oat_issue_url: null
created: '2026-09-04T06:20:00Z'
---

# Make terminal project status agree with completed revision plans

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency and no overlap
> with any other plan's source files. Scope is the phase-heading dialect and
> a terminal guard in the recommender; the separate completion-format class
> (projects that never write `**Status:** completed` per task) is declared
> out of scope below.

## Outcome

A completed project whose plan mixes ordinary phases with corrective-revision
phases reports the correct completed-task totals, no current task, and a
recommendation that is not "resume `oat-project-implement`". The
control-plane task parser recognizes `## Phase p01:`, `## Phase 1:`, and
`## Phase p-rev1:` / `## Revision Phase p-rev1:` headings as one normalized
phase identity without ever attributing a task to another phase, and the
recommender consults the project's lifecycle before treating an incomplete
revision phase as work to resume. JSON and human status already read one
`ProjectState`, so they agree by construction once the values are right.

## Source and live evidence

- Source backlog item:
  [BL-260901-make-terminal-project-status — Make terminal project status agree with completed revision plans](../../pjm/backlog/items/BL-260901-make-terminal-project-status.md)
- Planned at: `origin/main` commit `6b9a15841dab949ed83fa174286396e063da721d` on `2026-09-04`.
- Verified evidence:
  - `packages/cli/src/commands/project/status.ts:47-57,110-160` — the CLI
    renders `getProjectState` from `@open-agent-toolkit/control-plane`; human
    and JSON output read the same `ProjectState`.
  - `packages/control-plane/src/state/tasks.ts:4` —
    `PHASE_HEADING_PATTERN = /^## Phase (\d+): (.+)$/` accepts bare digits only;
    `## Phase p01: …` matches nothing and the phase and its tasks are dropped.
  - `tasks.ts:6` — `LEGACY_REVISION_PHASE_HEADING_PATTERN` rejects
    `## Revision Phase p-rev1: …` (the dialect in
    `.oat/projects/archived/workflow-friction/plan.md:910,1172`).
  - `tasks.ts:82-87` — a task counts only when its heading dialect and phase
    id match the current phase; mismatches drop silently.
  - `tasks.ts:97-114` — completion is recognized only as
    `### Task <id>:` followed by `**Status:** completed`.
  - `packages/control-plane/src/recommender/router.ts:157-162`, `:222-228` —
    `hasIncompleteRevisionPhase` is checked first and returns
    `oat-project-implement` with "Revision work remains incomplete";
    `state.lifecycle` is parsed (`project.ts:58`) but never read by the
    recommender.
  - Reproduced read-only with the real parser: archived
    `subagent-implement-refactor` (seven `## Phase p0N:` headings plus two
    `## Phase p-revN:`) parses two phases, reports 0/6, and recommends implement; `retire-archived-synced-project`
    (canonical `## Phase N:` plus `## Phase p-rev1:`) reports 15/15 correctly.
  - `packages/cli/src/commands/project/validate-plan/validate-plan.ts:96-103`
    derives phase ids from task headings; an in-repo precedent for
    heading-independent phase derivation.
- Constraining decisions:
  [DR-260714-flexible-plan-task-bodies](../decisions/DR-260714-flexible-plan-task-bodies.md)
  favors tolerating task-body shapes that preserve stable ids.

## Dependencies

| Type          | Dependency                                                                                  | Required state                                                                                                                   | Current state |
| ------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Soft boundary | `.agents/skills/oat-project-next/SKILL.md:356` duplicates the revision-resume rule in prose | Either leave both alone or update the prose and bump the skill in the same change; do not let CLI status and the skill disagree. | Unchanged.    |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                         | Affected | Files in common                             | Required update |
| --------------------------------------------- | -------- | ------------------------------------------- | --------------- |
| `review-plan-workflow` (draft PR #190) merges | No       | Only `packages/control-plane/package.json`. | None.           |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 6b9a15841dab949ed83fa174286396e063da721d..origin/main -- packages/control-plane/src/state packages/control-plane/src/recommender packages/control-plane/src/project.ts packages/control-plane/src/project.test.ts packages/control-plane/src/types.ts packages/cli/src/commands/project/status.ts packages/cli/src/commands/project/status.test.ts packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/validate-plan/validate-plan.ts .oat/templates/plan.md .oat/templates/implementation.md .agents/skills/oat-project-revise/SKILL.md .agents/skills/oat-project-next/SKILL.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If the heading patterns or the recommender ladder changed, re-anchor before
editing.

## Repository conventions

- Focused tests: from `packages/control-plane`,
  `pnpm exec vitest run src/state/tasks.test.ts src/recommender/router.test.ts src/project.test.ts`.
- Evidence-grade test run: `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  from the repository root; a cached `pnpm test` proves nothing.
- Implementation pattern: inline plan/implementation string pairs and full
  `toEqual` on `TaskProgress` as in `tasks.test.ts:94`.
- Shipped CLI behavior: five-package lockstep bump above current
  `origin/main` (`0.2.54` at planning).

## Scope

### In scope

- `packages/control-plane/src/state/tasks.ts` — widen the two heading
  patterns to accept `## Phase N:`, `## Phase pNN:`, `## Phase p-revN:`, and
  `## Revision Phase (p-rev)?N:`, normalizing to one declared phase id and one
  revision/ordinary kind; zero-pad ids in `parseTaskHeading` (`:163-192`) to
  match; keep the cross-phase guard at `:82-87` on the normalized values.
- `packages/control-plane/src/recommender/router.ts:154-162` — terminal
  guard: when `state.lifecycle === 'complete'` (or `currentTaskId` is null
  and the phase status is `complete`/`pr_open`; pick one rule and state it),
  do not return the revision-resume recommendation.
- Tests: `tasks.test.ts`, `router.test.ts`, `project.test.ts` (end-to-end
  fixture, acceptance criterion 4).
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- The completion-format class: projects whose `implementation.md` marks
  completion on the heading line or only in the Progress Overview table
  (`wave-skills-promotion` reports 1/41 for that reason). That is a contract
  change to `.oat/templates/implementation.md`; file it separately if wanted.
- `packages/cli/src/commands/project/status.ts` and its test — pure renderer
  with `getProjectState` mocked.
- `validate-plan.ts` — would change plan authoring rules.
- Archived project artifacts — evidence, never test inputs.

## Current state

`parseTaskProgress` (`tasks.ts:31-51`) is the sole producer of totals,
current task, and per-phase progress; `parsePhaseHeading` (`:124-161`) and
`parseTaskHeading` (`:163-192`) define three dialects. `ProjectState`,
`PhaseProgress`, and `TaskProgress` (`types.ts:15,44-56,88-112`) are stable
shapes; no consumer needs a new field. The recommender's post-implementation
ladder puts the revision check ahead of review, summary, and PR routing.

## Implementation steps

### 1. Lock current behavior

Add characterization cases to `tasks.test.ts` for the two dialects that
already work (`## Phase 1:` with `p01-t01`; `## Phase p-rev1:` with
`prev1-t01`).

**Verify:** `pnpm exec vitest run src/state/tasks.test.ts` → all pass, no
behavior change.

### 2. Widen heading recognition

Update `tasks.ts:4,6,124-161` so `1`, `p1`, `p01`, and `p-rev1` normalize
to one declared phase id, and update `parseTaskHeading` (`:163-192`) to
zero-pad ordinary ids the same way (it emits `p${digits}` unpadded today,
`:185-190`). Then normalize the dialect too: treat `## Phase p-revN:` and
`## Revision Phase p-revN:` as one revision kind so the `:82-87` guard compares
the normalized phase id plus a normalized revision/ordinary kind rather than
the raw heading spelling; otherwise `workflow-friction`'s
`## Revision Phase p-rev1:` heading with `### Task prev1-t01:` tasks still
drops every task. Keep a negative case proving a task whose id belongs to
another phase is still rejected.

**Verify:** same command → the `:94-127` negative expectations still hold;
`## Phase p01:` + `p01-t01`, `## Phase 1:` + `p1-t01`, and
`## Revision Phase p-rev1:` + `prev1-t01` cases pass.

### 3. Add the terminal guard

In `router.ts:154-162`, short-circuit the revision-resume branch for terminal
projects under the chosen rule; document the rule in a comment.

**Verify:** `pnpm exec vitest run src/recommender/router.test.ts` → the new
terminal case returns a non-implement skill;
`routes incomplete revision work back to implement` (`:198`) still passes for
`lifecycle: 'active'`.

### 4. Add the end-to-end fixture

In `project.test.ts` (temp-dir writer at `:100-130`) write two ordinary
phases and two `p-revN` phases, all `**Status:** completed`,
`oat_current_task_id: null`, `oat_lifecycle: complete`.

**Verify:** `pnpm exec vitest run src/project.test.ts` → `progress.completed
=== progress.total`, `currentTaskId === null`, recommendation is not
`oat-project-implement`.

### 5. Bump and gate

Bump the five packages above fresh `origin/main` (or leave that to the wave
fan-in); run the eight AGENTS.md gates in order with captured exit codes.

**Verify:** `HOME=$(mktemp -d) pnpm exec turbo run test --force` → exit 0 with
no `cache hit, replaying logs`; `git fetch origin main && pnpm release:check-versions`
→ exit 0.

## Test plan

- `tasks.test.ts` (pattern `:94`): `counts phases declared with padded phase
ids`; `counts revision phases declared as Revision Phase p-revN`; `keeps
rejecting a task id that belongs to a different phase`.
- `router.test.ts` (pattern `:198`, `makeState` at `:6`): `does not resume
implement for a terminal project whose revision phases are complete`;
  `still resumes implement when revision tasks remain and lifecycle is active`;
  blocked and partial cases if the guard keys on phase status.
- `project.test.ts`: `reports terminal totals for a plan with ordinary and
completed revision phases`.
- Regression proved: heading widening never reattributes tasks; the terminal
  guard never swallows a genuine revision resume.

## Done criteria

- [ ] All four heading dialects parse to one normalized phase id; the
      cross-phase guard has a negative test.
- [ ] Terminal projects never receive the revision-resume recommendation;
      active projects with remaining revision work still do.
- [ ] The end-to-end fixture passes; in-progress, blocked, partial, and
      revision-resume behavior is unchanged and covered.
- [ ] Lockstep bump and all gates pass on an uncached run; clean tree.

## STOP conditions

Stop and report instead of improvising when:

- the fix would require editing archived project artifacts;
- two heading spellings would normalize to different ids or collide;
- the completion-format class turns out to be required to satisfy criterion 1
  (then file it and stop here);
- the `oat-project-next` prose would disagree with the new guard and the
  skill bump is not budgeted; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, the task parser,
the recommender ladder, and the templates when substantial time passes, main
advances materially from `6b9a15841dab949ed83fa174286396e063da721d`, a plan-authoring change lands, or a
load-bearing claim cannot be reproduced.

## Review focus

- Normalization table for phase ids and its negative test.
- The exact terminal rule and its interaction with `oat-project-next`.
- Uncached test evidence.
