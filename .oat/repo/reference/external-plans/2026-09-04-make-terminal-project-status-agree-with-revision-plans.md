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
> **Execution status: READY.** No unsatisfied hard dependency. Scope is the
> phase-heading dialect, a lifecycle-keyed terminal guard in the recommender,
> and the matching guard in the `oat-project-next` skill router, whose
> version pin makes `packages/cli/src/validation/skills.test.ts` a shared
> write with two sibling W5 lanes (see Dependencies). The separate
> completion-format class (projects that never write `**Status:** completed`
> per task) is declared out of scope below.

## Outcome

A completed project whose plan mixes ordinary phases with corrective-revision
phases reports the correct completed-task totals, no current task, and a
recommendation that is not "resume `oat-project-implement`". The
control-plane task parser recognizes `## Phase p01:`, `## Phase 1:`, and
`## Phase p-rev1:` / `## Revision Phase p-rev1:` headings as one normalized
phase identity without ever attributing a task to another phase, and the
recommender treats `state.lifecycle === 'complete'` as terminal before
considering an incomplete revision phase as work to resume. The
`oat-project-next` skill router applies the same lifecycle guard to its
prose rule, so CLI status, the recommender, and the skill never disagree.
JSON and human status already read one `ProjectState`, so they agree by
construction once the values are right.

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
  - `.agents/skills/oat-project-next/SKILL.md:354-358` — Step 5.2 "Incomplete
    revision tasks" routes to `oat-project-implement` unconditionally whenever
    any `p-revN` task is not completed, with no lifecycle check; fixing only
    the recommender would make the CLI and the skill disagree on the
    already-visible `subagent-implement-refactor` case.
  - `packages/cli/src/validation/skills.test.ts:4003` — pins
    `oat-project-next` at `1.0.12`; the skill edit requires the pin update.
  - `review-skill-contracts.test.ts` and
    `post-implement-sequence-contracts.test.ts` — the existing contract
    tests that read `oat-project-next/SKILL.md`; the new routing case joins
    the former.
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

| Type          | Dependency                                                                                                                                                     | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Current state                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Soft ordering | W5 group 4 plan [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md)              | Runs before this plan; both write `packages/cli/src/validation/skills.test.ts` version pins (that plan: `oat-project-complete` at `:4002`; this plan: `oat-project-next` at `:4003`) and both add cases to `review-skill-contracts.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Pending (W5 group 4).                                                                                      |
| Soft ordering | W5 group 1 plan [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md) | Runs before this plan; both edit `.agents/skills/oat-project-next/SKILL.md` and its `:4003` version pin, so never in one parallel group. Re-anchor Step 5.2 after it lands.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Pending (W5 group 1).                                                                                      |
| Soft ordering | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                                     | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                          | Affected | Files in common                                                                                        | Required update                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `review-plan-workflow` (draft PR #190, head `63161897dd40a66e1b29cf19e286665895c40dde`) merges | Minor    | `packages/cli/src/validation/skills.test.ts` (version pins) and `packages/control-plane/package.json`. | Re-anchor the `:4003` pin against the merged file; `oat-project-next/SKILL.md` and the control-plane sources are not in the #190 diff. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 6b9a15841dab949ed83fa174286396e063da721d..origin/main -- packages/control-plane/src/state packages/control-plane/src/recommender packages/control-plane/src/project.ts packages/control-plane/src/project.test.ts packages/control-plane/src/types.ts packages/cli/src/commands/project/status.ts packages/cli/src/commands/project/status.test.ts packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/validate-plan/validate-plan.ts .oat/templates/plan.md .oat/templates/implementation.md .agents/skills/oat-project-revise/SKILL.md .agents/skills/oat-project-next/SKILL.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If the heading patterns, the recommender ladder, or `oat-project-next`
Step 5.2 changed, re-anchor before editing.

## Repository conventions

- Focused tests: from `packages/control-plane`,
  `pnpm exec vitest run src/state/tasks.test.ts src/recommender/router.test.ts src/project.test.ts`.
- Evidence-grade test run: `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  from the repository root; a cached `pnpm test` proves nothing.
- Implementation pattern: inline plan/implementation string pairs and full
  `toEqual` on `TaskProgress` as in `tasks.test.ts:94`.
- Shipped CLI behavior: five-package lockstep bump above current
  `origin/main` (`0.2.54` at planning), owned by the wave fan-in in lane
  mode (see Scope).
- Skill validation and bumps: `pnpm oat:validate-skills`,
  `pnpm run check:skill-bumps`, `pnpm format`; contract tests from
  `packages/cli`:
  `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts`.

## Scope

### In scope

- `packages/control-plane/src/state/tasks.ts` — widen the two heading
  patterns to accept `## Phase N:`, `## Phase pNN:`, `## Phase p-revN:`, and
  `## Revision Phase (p-rev)?N:`, normalizing to one declared phase id and one
  revision/ordinary kind; zero-pad ids in `parseTaskHeading` (`:163-192`) to
  match; keep the cross-phase guard at `:82-87` on the normalized values.
- `packages/control-plane/src/recommender/router.ts:154-162` — terminal
  guard keyed on exactly `state.lifecycle === 'complete'`: do not return the
  revision-resume recommendation for a complete lifecycle. A null current
  task with `complete`/`pr_open` phase status is **not** terminal: that
  state legitimately coexists with pending revision work and must keep
  routing to implement.
- `.agents/skills/oat-project-next/SKILL.md:354-358` — Step 5.2 gains the
  same guard ("when `oat_lifecycle` is `complete`, revision phases are
  historical; do not route to implement"); `version:` bump.
- `packages/cli/src/validation/skills.test.ts:4003` — `oat-project-next`
  version pin update.
- `review-skill-contracts.test.ts` — one new case pinning the Step 5.2
  guard sentence and its paired terminal/active wording.
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
- Other `oat-project-next` routing steps (5.1, 5.3 onward) and
  `post-implement-sequence-contracts.test.ts`; only Step 5.2 changes.
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

In `router.ts:154-162`, short-circuit the revision-resume branch when
`state.lifecycle === 'complete'`; document in a comment that lifecycle, not
phase status or a null current task, is the terminal signal, because an
active project with `currentTaskId === null` and a `complete`/`pr_open`
phase status may still own pending revision tasks.

**Verify:** `pnpm exec vitest run src/recommender/router.test.ts` → the new
terminal case (lifecycle `complete`, revision counts incomplete or stale)
returns a non-implement skill; the new active case (lifecycle `active`,
`currentTaskId: null`, phase status `complete` then `pr_open`, one
incomplete revision task) still returns `oat-project-implement`;
`routes incomplete revision work back to implement` (`:198`) still passes.
Then neutralize the guard (revert the `lifecycle` check), confirm the
terminal case fails, restore it, and record that in the commit message.

### 4. Add the end-to-end fixture

In `project.test.ts` (temp-dir writer at `:100-130`) write two ordinary
phases and two `p-revN` phases, all `**Status:** completed`,
`oat_current_task_id: null`, `oat_lifecycle: complete`. Derive every heading
fixture in this plan from the captured real plans (copy the exact heading
lines from `.oat/projects/archived/subagent-implement-refactor/plan.md` and
`.oat/projects/archived/workflow-friction/plan.md:910,1172` into the inline
fixture strings) and record that provenance in a comment above each fixture;
never read or mutate the archives from the tests.

**Verify:** `pnpm exec vitest run src/project.test.ts` → `progress.completed
=== progress.total`, `currentTaskId === null`, recommendation is not
`oat-project-implement`.

### 5. Apply the same guard in the `oat-project-next` router

Edit Step 5.2 (`SKILL.md:354-358`): before grepping for `p-revN` tasks, read
`oat_lifecycle` from `state.md`; when it is `complete`, skip the
revision-resume route and fall through (revision phases are historical for a
completed project). Keep the active-lifecycle behavior byte-for-byte. Add a
`review-skill-contracts.test.ts` case that pins the guard sentence and
asserts the active-lifecycle route text is still present; bump the skill
`version:` and update the `:4003` pin.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts`
→ pass; `pnpm oat:validate-skills` → exit 0.

### 6. Gate

**Verify (lane mode, the default under the execution program):** the
`oat-project-next` `version:` bump and its `:4003` pin are in place; run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes, plus `pnpm lint`,
`pnpm format`, and `pnpm oat:validate-skills` because this plan changes
`.agents/skills`; `HOME=$(mktemp -d) pnpm exec turbo run test --force` →
exit 0 with no `cache hit, replaying logs`. Do not edit lockstep release
files or run `pnpm release:check-versions` / `pnpm release:validate`; the
wave fan-in owns the lockstep bump and the full definition-of-done sequence.
**Standalone mode only:** bump the five public packages above freshly
fetched `origin/main` and run the eight AGENTS.md gates in order.

## Test plan

- `tasks.test.ts` (pattern `:94`): `counts phases declared with padded phase
ids`; `counts revision phases declared as Revision Phase p-revN`; `keeps
rejecting a task id that belongs to a different phase`.
- `router.test.ts` (pattern `:198`, `makeState` at `:6`): `does not resume
implement for a complete-lifecycle project even when revision counts are
incomplete or stale` (the guard must be exercised: give the fixture an
  incomplete revision phase so the pre-fix router would return implement);
  `still resumes implement when revision tasks remain and lifecycle is active`;
  `keeps revision routing for an active project with a null current task and
complete or pr_open phase status`.
- `review-skill-contracts.test.ts`: `oat-project-next skips revision resume
for a complete lifecycle and keeps it for an active one`.
- `project.test.ts`: `reports terminal totals for a plan with ordinary and
completed revision phases`.
- Regression proved: heading widening never reattributes tasks; the terminal
  guard never swallows a genuine revision resume; neutralizing the guard
  makes the terminal router case fail (recorded in the commit).

## Done criteria

- [ ] All four heading dialects parse to one normalized phase id; the
      cross-phase guard has a negative test.
- [ ] Complete-lifecycle projects never receive the revision-resume
      recommendation from the recommender or from `oat-project-next` Step
      5.2; active projects with remaining revision work still do, including
      the null-current-task case.
- [ ] The end-to-end fixture passes with provenance-commented headings;
      in-progress, blocked, partial, and revision-resume behavior is
      unchanged and covered.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass on an uncached run and no lockstep
      release file is edited. Standalone mode: one lockstep bump and all
      eight gates pass.

## STOP conditions

Stop and report instead of improvising when:

- the fix would require editing archived project artifacts;
- two heading spellings would normalize to different ids or collide;
- the completion-format class turns out to be required to satisfy criterion 1
  (then file it and stop here);
- the `oat-project-next` Step 5.2 edit would need to change any other
  routing step, or the quick-route plan's Step 5.2 changes have not landed
  and the same lines are being edited concurrently; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, the task parser,
the recommender ladder, and the templates when substantial time passes, main
advances materially from `6b9a15841dab949ed83fa174286396e063da721d`, a plan-authoring change lands, or a
load-bearing claim cannot be reproduced.

## Review focus

- Normalization table for phase ids and its negative test.
- The terminal rule is exactly `lifecycle === 'complete'`, applied
  identically in the recommender and in `oat-project-next` Step 5.2.
- Uncached test evidence.
