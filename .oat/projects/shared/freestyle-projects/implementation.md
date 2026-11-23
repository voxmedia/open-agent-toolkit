---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-22
oat_current_task_id: p08-t05
oat_generated: false
oat_template: false
---

# Implementation: freestyle-projects

**Started:** 2026-11-21
**Last Updated:** 2026-11-22

> This journal records execution of the Project Brief in `plan.md` and is used
> to resume interrupted sessions.
>
> Conventions:
>
> - Progress counts phase-units: each `## Phase pNN:` in `plan.md` is one unit,
>   accepted only by the exact line `**Status:** completed` in its section here.
>   A provisional phase never counts as complete.
> - `oat_current_task_id` points at the **next unit to do**: a phase ID (`p02`)
>   or an open execution record (`p02-t03`). Set it to `null` when every phase
>   is accepted.
> - Marker lines are exact, one per line, directly under the phase heading:
>   `**Status:** pending | in_progress | completed | failed | extracted`,
>   `**Base:** <full SHA>`, `**Head:** <full SHA>`, and
>   `**Executor:** root | phase-implementer:<id> | worker:<id> | inline:<exception-ref> | reconciled`.
>   `**Status:** extracted` always pairs with `**Extracted to:** <slug>` naming
>   the linked project; without it the phase reads as `pending`.
>   Phase ownership ends at the next heading, so a task record's status is never
>   read as its phase's status.
> - `### Task pNN-tNN:` blocks are execution records, opened when work starts
>   and closed at commit with the SHA or a terminal status
>   (`completed | failed | cancelled | no-change`). They never change phase totals.
> - Reviews are **not** units. Track review status in `plan.md` under `## Reviews`.

## Progress Overview

| Phase | Status   | Units | Accepted |
| ----- | -------- | ----- | -------- |
| p01   | complete | 1     | 1/1      |
| p02   | complete | 1     | 1/1      |
| p03   | complete | 1     | 1/1      |
| p04   | complete | 1     | 1/1      |
| p05   | complete | 1     | 1/1      |
| p07   | complete | 1     | 1/1      |
| p10   | complete | 1     | 1/1      |
| p08   | complete | 1     | 1/1      |
| p09   | pending  | 1     | 0/1      |

**Total:** 7/9 phases accepted

---

## Phase p01: Mode recognition and opt-outs

**Status:** completed
**Base:** f6e8b9c92a3870fea4580480116e67c2bf503f82
**Executor:** phase-implementer:freestyle-projects-p01-implementation-1
**Head:** 8220a9dab90b0c1e7bd2d5f56994c0128fcd7862

Phase verification at `8220a9dab`: `pnpm test:evidence` exit 0 (12 tasks, 0 cached; cli 9734, control-plane 325, docs packages 85 passed), `pnpm build`, `pnpm check`, `pnpm type-check`, `pnpm lint`, `pnpm format`, `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts` and `pnpm oat:validate-skills` each exit 0. Recovery 1/10: the first forced run failed the `project new --help` inline snapshot (stale `--mode` choices from `012945d67`); `8220a9dab` updated it and passed the focused test and the forced suite again on the committed head. Branch-build scratch projects in shared, local and synced scopes passed `oat project check-state`, listed and showed as freestyle with no recommendation, completed through `complete-state` and archived; all were removed.

Worktree: the orchestrator checkout on `feat/freestyle-projects`; committing owner: the phase implementer. Parallelism assessment: rung 3 (one phase implementer). Rung 1 does not apply: no parallel group is declared. Rung 2 does not apply: the inventory, the `WORKFLOW_MODES` member and its consumers share types, fixtures and the mode parser, so no two slices pass the independence test. Rung 4 does not apply: the phase adds a new mode surface across many consumers.

**Workflow Mode Change Inventory**

Enumerated before code changes (2026-11-21) by searching `WORKFLOW_MODES`,
`WorkflowMode`, `workflowMode`, `oat_workflow_mode`, `'spec-driven'`,
`oat_phase` and `isBriefMode` across `packages/`, `.oat/templates`,
`.oat/scripts`, `tools/`, `.agents/` and `apps/oat-docs/docs`. Disposition is
`handled` (p01 changes it, with the record that does), `opted out` (no change:
the consumer reads no mode or already refuses freestyle correctly), or the later
phase that owns it.

| #   | Consumer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Disposition                                                                                                                 | Expected proof                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | `control-plane/src/types.ts` `WORKFLOW_MODES`, `WorkflowMode`, `isBriefMode`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | handled (p01-t01)                                                                                                           | `freestyle` member; `isBriefMode('freestyle')` is false; scaffold and parser tests                                                                                                                    |
| 2   | `control-plane/src/state/parser.ts` `oat_workflow_mode` normalization                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | handled (p01-t01)                                                                                                           | parser test: `freestyle` normalizes; unknown modes still read null                                                                                                                                    |
| 3   | `cli project new --mode` choices (`new/index.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | handled (p01-t01)                                                                                                           | command test: `--mode freestyle` accepted and passed to the scaffold                                                                                                                                  |
| 4   | `cli new/scaffold.ts` `TEMPLATES_BY_MODE`, `STATE_TEMPLATE_BY_MODE`, `ensureStructure`, brief/goal plan rendering, review-row pruning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | handled (p01-t01)                                                                                                           | scaffold test: freestyle writes only `state.md` with `oat_workflow_mode: freestyle` and no lifecycle fields; spec-driven and brief scaffolds unchanged                                                |
| 5   | Bundled template set (`.oat/templates`, `scripts/bundle-inputs.mjs`, `tools/shared/pack-manifest.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | handled (p01-t01)                                                                                                           | new `state-freestyle.md` in the bundle inputs and the workflows pack; bundle-consistency tests                                                                                                        |
| 6   | `control-plane/src/project.ts` `getProjectState`/`listProjects` (phase/status/mode defaults, progress, goal fields)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | handled (p01-t02)                                                                                                           | project tests: freestyle reads `workflowMode: freestyle`, `phase: null`, `phaseStatus: null`, empty progress, no goal fields; a spec-driven fixture without `oat_phase` still defaults to `discovery` |
| 7   | `control-plane/src/recommender/router.ts` `recommendSkill` and route tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | handled (p01-t02)                                                                                                           | router test: freestyle returns `skill: 'none'` in every phase/lifecycle shape, before the decomposition, HiLL and goal branches; existing-mode routes unchanged                                       |
| 8   | `cli project list` table and JSON                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | handled (p01-t02)                                                                                                           | list test: freestyle row shows `freestyle` in PHASE, `—` in PROGRESS, `none`; existing rows unchanged; scratch project listed                                                                         |
| 9   | `cli project status` text and JSON                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | handled (p01-t02); paths in p02                                                                                             | status test: `Mode: freestyle`, no lifecycle phase/progress lines, `Recommendation: none`; existing modes unchanged; p02 adds the `AGENTS.md` and `shape.md` paths                                    |
| 10  | `cli state/generate.ts` dashboard (`oat state refresh`): summary table, `computeNextStep`, Available Projects                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | handled (p01-t03)                                                                                                           | generate tests: freestyle summary shows Mode only, next step `none`, project list line names `freestyle`; spec-driven and goal dashboards unchanged                                                   |
| 11  | `cli project validate-plan` (`index.ts`, `profiles.ts` `resolvePlanProfile` falls back to the task profile)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | handled (p01-t04)                                                                                                           | command test: freestyle skips plan profiles and parallel-group checks with exit 0, with or without `plan.md`; a task-mode plan still fails as before                                                  |
| 12  | `cli closeout-check/closeout-invariant.ts` `evaluateCloseout` (spec-driven default, snapshot requirement)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | handled (p01-t04)                                                                                                           | invariant test: freestyle is `not_required` even when autonomous or configured; the same inputs on spec-driven stay `incomplete`                                                                      |
| 13  | `cli project complete-state` (closeout plus the journal-missing guard and completion journal evaluator)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | handled (p01-t04)                                                                                                           | command test: a freestyle project with `plan.md` and no journal completes; spec-driven with the same files still refuses `journal-missing`                                                            |
| 14  | `cli journal-check/evaluator.ts` `workflowModeOf` spec-driven default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | handled (p01-t04), minimal opt-out                                                                                          | evaluator test: freestyle returns `ok` with no lifecycle rule findings; the coverage report, missing-file reporting and command-level file requirements (`journal-check/index.ts:72-88`) are p03      |
| 15  | `cli cleanup/project` lifecycle-complete inference from a passed final review row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | handled (p01-t04)                                                                                                           | cleanup test: a freestyle project whose `plan.md` has a passed `final` row is not marked complete; spec-driven still is                                                                               |
| 16  | `cli project archive` (shared, local; synced → `refs/oat/completed/*`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | opted out (reads no mode)                                                                                                   | no `oat_workflow_mode`/`oat_phase` read in `archive/`, `sync/`, `push/`, `pull/`, `migrate/`; scratch completion and archive of a shared freestyle project with the branch build                      |
| 17  | `cli validation/project-state.ts`, `cli project check-state`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | opted out (mode-independent)                                                                                                | scaffold asserts the freestyle state validates; scratch `check-state` passes                                                                                                                          |
| 18  | `cli project promote` (`promote.ts:433-457`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | opted out (already refuses)                                                                                                 | freestyle is refused as `not-lite` (or `project-unreadable` without `plan.md`); promotion is out of scope; covered by p01-t04 test                                                                    |
| 19  | `cli project delivery check/evidence`, `cli gate/convergence.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | opted out (goal-only)                                                                                                       | both branch on `goal` and refuse or skip every other mode                                                                                                                                             |
| 20  | `cli projects/split` (`seed-children.ts`, `write-parent.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | opted out (writes `quick` only)                                                                                             | split produces quick projects and reads no source mode                                                                                                                                                |
| 21  | `cli shared/frontmatter.ts` field list, `review/head-ancestry.ts`, `project dispatch*`, `project links`, `open`, `pause`, `scope`, `prune`, `push`, `pull`, `migrate`, `sync`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | opted out (mode-independent)                                                                                                | no mode read; scope behavior per scope is p02's scratch evidence (Outcome 1)                                                                                                                          |
| 22  | `cli project complete-discovery`, `cli project set-mode`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | opted out                                                                                                                   | complete-discovery acts only on an existing `discovery.md`; set-mode is a deprecated no-op                                                                                                            |
| 23  | `cli project log` append/check/synthesize/rollup (by path, event entries)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | handled (p03-t01)                                                                                                           | p03 log tests over freestyle fixtures                                                                                                                                                                 |
| 24  | `cli project journal check` command (file requirements, coverage report)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | handled (p03-t02)                                                                                                           | p03 journal-check tests with both files, neither, plan only and journal only                                                                                                                          |
| 25  | `.oat/scripts/generate-oat-state.sh` (legacy shell dashboard, bundled)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | opted out (legacy)                                                                                                          | no in-repo caller; it already lacks lite, brief and goal routes; `oat state refresh` (row 10) is the dashboard                                                                                        |
| 26  | `tools/smoke/runner/preflight.mjs` quick-fixture assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | opted out                                                                                                                   | asserts the smoke fixture's own `quick` mode only                                                                                                                                                     |
| 27  | Project `AGENTS.md`, `shape.md`, creation output naming both, `status` naming both paths, `oat-project-freestyle`, `oat-brainstorm` freestyle route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | p02                                                                                                                         | p02 exit evidence                                                                                                                                                                                     |
| 28  | `.oat/templates/state.md` mode comment (`# spec-driven \| handled (p04-t01)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ...`)                                                                                                                       | p04                                                                                                                                                                                                   | comment lists `freestyle` |
| 29  | Skills mentioning `oat_workflow_mode` (27 files): `oat-brainstorm` (SKILL, references/dogfood-results), `oat-project-autonomous`, `oat-project-brief` (SKILL, references/brief-contract), `oat-project-capture`, `oat-project-complete` (SKILL, tests/prepare-completion-branch.test.mjs), `oat-project-discover`, `oat-project-document`, `oat-project-goal`, `oat-project-implement` (references/completion-and-closeout, phase-execution, plan-and-resume), `oat-project-import-plan`, `oat-project-lite`, `oat-project-next`, `oat-project-plan-writing`, `oat-project-plan`, `oat-project-pr-final`, `oat-project-pr-progress`, `oat-project-progress`, `oat-project-promote-spec-driven`, `oat-project-quick-start`, `oat-project-review-receive`, `oat-project-revise`, `oat-project-summary`                                                                                                                                                            | handled (p04-t01; `oat-project-import-plan` opt-out corrected to a stop in p04-t06); per-file dispositions in those records | each names freestyle correctly or routes it to nothing; skill validation, contract tests and `check:skill-bumps`                                                                                      |
| 30  | Agent contracts `.agents/agents/oat-reviewer.md`, `oat-phase-implementer.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | handled (p04-t01, bumps p04 release record)                                                                                 | `version:` bumps; mode lists name freestyle or exclude it explicitly                                                                                                                                  |
| 31  | Docs pages that list modes (24): `reference/cli-reference`, `reference/oat-directory-structure`, `reference/project-artifacts`, `reference/project-state-machine`, `skills/brainstorm`, `skills/index`, `workflows/advanced/autonomy`, `workflows/advanced/dispatch-ceiling`, `workflows/advanced/workflow-gates`, `workflows/approvals-and-automation`, `workflows/choose-workflow`, `workflows/ideas/index`, `workflows/ideas/lifecycle`, `workflows/projects/closeout/closeout-skills`, `workflows/projects/closeout/pr-flow`, `workflows/projects/execution/execution-skills`, `workflows/projects/execution/implementation-execution`, `workflows/projects/execution/picking-up-projects`, `workflows/projects/lifecycle`, `workflows/projects/planning/hill-checkpoints`, `workflows/projects/planning/planning-skills`, `workflows/projects/planning/starting-projects`, `workflows/projects/reviews/index`, `workflows/projects/reviews/review-flavors` | handled (p04-t02)                                                                                                           | `build:docs`, docs-index freshness, fresh-context docs review                                                                                                                                         |
| 32  | Root `AGENTS.md` Workflow Options and Recommendation Heuristic; root `README.md`; `packages/cli/README.md`; CLI help prose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | handled (p04-t03)                                                                                                           | instructions and READMEs name freestyle; `--mode` choices already come from `WORKFLOW_MODES`                                                                                                          |
| 33  | `packages/control-plane/README.md` `WORKFLOW_MODES` list and `ProjectState.phase` nullability                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | handled (p01-t02)                                                                                                           | README states the public type change, per the package `AGENTS.md` completion check                                                                                                                    |
| 34  | Provider views, skill bumps, lockstep version bump                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | handled (p04-t04)                                                                                                           | `oat sync --scope all` with the branch build; `check:skill-bumps`, `release:check-versions`, `release:validate`                                                                                       |
| 35  | `oat state refresh` dashboard "Quick Commands" list (`packages/cli/src/commands/state/generate.ts`), a hard-coded skill list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | p02                                                                                                                         | adds `oat-project-freestyle` once the skill exists; added after the p01 review (L1)                                                                                                                   |

Record mapping as executed: rows 1-7 and 33 landed in p01-t01 (the exhaustive scaffold maps and the router's all-mode test tie the mode member, the scaffold and control-plane recognition into one commit); rows 8-10 in p01-t02; rows 11-15 and 18 in p01-t03. The `p01-t02`/`p01-t03`/`p01-t04` labels in the Disposition column above predate that merge; there is no p01-t04.

### Task p01-t01: Add the freestyle mode, its bare scaffold and control-plane recognition

**Status:** completed
**Commit:** 012945d67e70b7d413ca8fd2241e26938ba379aa
**Executor:** phase-implementer:freestyle-projects-p01-implementation-1

- Intent: add `freestyle` to `WORKFLOW_MODES`; recognize it in both control-plane readers before the spec-driven and discovery defaults (`phase: null`, `phaseStatus: null`, empty progress); route it to `skill: 'none'` before every lifecycle branch; add the bare scaffold (freestyle entries in `TEMPLATES_BY_MODE` and `STATE_TEMPLATE_BY_MODE`, minimal `state-freestyle.md` in the bundle and the workflows pack). Inventory rows 1-7 and 33. These ride one commit because the exhaustive scaffold maps and the router's all-mode test fail the moment the member exists.
- Files: `packages/control-plane/src/{types.ts,project.ts,project.test.ts,recommender/router.ts,recommender/router.test.ts,state/parser.test.ts}`, `packages/control-plane/README.md`, `packages/cli/src/commands/project/new/{scaffold.ts,scaffold.test.ts,index.test.ts}`, `packages/cli/scripts/bundle-inputs.mjs`, `packages/cli/src/commands/tools/shared/pack-manifest.ts`, `.oat/templates/state-freestyle.md`
- Proof: control-plane `check`, `type-check`, `test` (325 passed); CLI `type-check`, `check`, `lint`; `vitest run src/commands/project src/commands/state src/commands/cleanup src/validation` (2389 passed) and `src/commands/project/new src/commands/tools src/commands/init/tools src/release` (1871 passed) under `scripts/with-isolated-home.sh`, after `pnpm build` refreshed the bundled assets.
- Can-fail: neutralizing the router guard failed the freestyle router test and the all-mode tier-3 test; neutralizing the reader recognition failed the freestyle reader test; mapping freestyle to the lifecycle templates failed both freestyle scaffold tests. Each guard was restored.
- Decision: `ProjectState.phase`/`phaseStatus` and `ProjectSummary.phase`/`phaseStatus` widen to `| null`, null only for freestyle, so JSON consumers never read a fabricated `discovery` phase; `recommendSkill` applies the readers' defaults to a lifecycle-mode input that arrives without a phase.

### Task p01-t02: Show freestyle in list, status and the dashboard with no recommendation

**Status:** completed
**Commit:** 7fa0dbd60d2669911ccff3f6efa60c29b834ac89
**Executor:** phase-implementer:freestyle-projects-p01-implementation-1

- Intent: inventory rows 8-10. `oat project list` shows `freestyle` in PHASE, `—` in PROGRESS and `none`; `oat project status` prints `Mode: freestyle (no lifecycle workflow)` instead of the phase, progress and current-task lines; the `oat state refresh` dashboard shows only the Mode row (plus Lifecycle when not active), recommends `none` with the router's exact reason, and lists the project as `freestyle`.
- Files: `packages/cli/src/commands/project/{list.ts,list.test.ts,status.ts,status.test.ts}`, `packages/cli/src/commands/state/{generate.ts,generate.test.ts}`; mechanically widened to `packages/control-plane/src/{recommender/router.ts,index.ts}` and `packages/control-plane/README.md` to export `freestyleRecommendation()`, following the `quickPlanNotReadyReason` precedent so the dashboard and the router cannot disagree.
- Proof: CLI `check`, `type-check`; `vitest run src/commands/state src/commands/project/list.test.ts src/commands/project/status.test.ts src/commands/project/list.integration.test.ts` (116 passed) under an isolated `HOME`; control-plane `check`, `type-check`, `test` (325 passed). Each changed view also asserts an unchanged lifecycle row, line or table beside the freestyle one.
- Can-fail: neutralizing the three freestyle branches failed exactly the three freestyle view tests; restored.
- Decision: a paused freestyle project that is still the active project keeps the dashboard's mode-independent `oat project open` resume step, as pull is accepted for a synced checkout; every other freestyle dashboard route is `none`.

### Task p01-t03: Opt freestyle out of plan validation, closeout, completion and cleanup lifecycle checks

**Status:** completed
**Commit:** f73974a266f283a7c7ed36965f76be60038d6c42
**Executor:** phase-implementer:freestyle-projects-p01-implementation-1

- Intent: inventory rows 11-15 and 18. `validate-plan` recognizes freestyle from `state.md` before reading `plan.md` and reports `{ valid: true, skipped: 'freestyle' }` (exit 0) with or without a plan; `evaluateCloseout` returns `not_required` for freestyle before the goal, snapshot and lite/autonomous/configured branches, and `closeout-check` says why; `complete-state` skips both journal guards for freestyle; the journal evaluator returns `ok` with no findings for freestyle (minimal opt-out; p03 owns the coverage report and the command's file requirements); `oat cleanup project` never infers completion for freestyle from a passed `final` review row; promotion keeps refusing freestyle as `not-lite`.
- Files: `packages/cli/src/commands/project/validate-plan/{index.ts,index.test.ts}`, `packages/cli/src/commands/project/closeout-check/{closeout-invariant.ts,index.ts}`, `packages/cli/src/commands/project/complete-state/{index.ts,index.test.ts,journal.test.ts}`, `packages/cli/src/commands/project/journal-check/{evaluator.ts,evaluator.test.ts}`, `packages/cli/src/commands/cleanup/project/{project.ts,project.utils.ts,project.test.ts}`, `packages/cli/src/commands/project/promote/promote.test.ts`
- Proof: `vitest run src/commands/project/validate-plan src/commands/project/closeout-check src/commands/project/complete-state src/commands/project/journal-check src/commands/cleanup` (314 passed) and the promote freestyle test under an isolated `HOME`; CLI `check`, `type-check`. Every freestyle test sits beside an existing-mode control on the same path (task-mode plan still fails, quick still needs its snapshot, spec-driven still refuses `journal-missing` and the negative journal variant, spec-driven still gets the cleanup update).
- Can-fail: neutralizing each of the five guards failed exactly its freestyle tests (validate-plan 2, closeout 2, complete-state 1, evaluator 1, cleanup 1); restored. The complete-state "journal every lifecycle rule would refuse" case stays green with the complete-state guard neutralized because the evaluator opt-out also covers it.
- Commit note: the first attempt was refused by commitlint (header over 100 characters) before any commit; retried with a shorter header under the same identity.

- Review: `freestyle-projects-p01-review-1` (oat-reviewer, claude-opus-5-5 high) on `e47e3efce..8220a9dab`, ledger head `2bc23b3f6`: pass, 0 critical, 0 high, 0 medium, 2 low. L1 (dashboard Quick Commands list missing from the inventory) folded as inventory row 35, owned by p02; L2 (paused freestyle dashboard resume step versus "recommends nothing") recorded under Deviations. Both bookkeeping, no code change. Artifact `reviews/p01-code-review-2026-11-21T204635Z.md` (local-only).

### Recovery Event freestyle-projects-p01-recovery-1

- Phase/task: p01 / p01-t01
- Original request: freestyle-projects-p01-implementation-1
- Original commit: 012945d67e70b7d413ca8fd2241e26938ba379aa
- Defect class: test
- Discovered by: pnpm test:evidence (packages/cli src/commands/help-snapshots.test.ts > project new --help matches snapshot)
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: 8220a9dab90b0c1e7bd2d5f56994c0128fcd7862
- Verification: focused snapshot test (71/71) and `pnpm test:evidence` (exit 0, 0 cached) before the commit and again on committed HEAD `8220a9dab`
- Reason: the `project new --help` inline snapshot still listed the old `--mode` choices after t01 added `freestyle`; mechanical snapshot update in an in-phase test file. Root validated the event, the unchanged original commit and the two-file recovery diff, and cleared the `completed` marker (`used_attempts: 1` kept).

---

## Phase p02: Project AGENTS.md, shape.md and the shaping skill

**Status:** completed
**Base:** 8f44e379bf69fe9e4e5e401a42aaf9ea335dc34a
**Executor:** phase-implementer:freestyle-projects-p02-implementation-1
**Head:** 539e419e891bdbacf1993cb88e4ce23444eaba32

Phase verification at `df0f6cadf` on a clean tree (only the ignored-by-convention `references/` and `reviews/` untracked): `pnpm test:evidence` exit 0 (12 tasks, 0 cached, `oat-docs#build` force-executed; cli 9765, control-plane 325, docs packages 85 passed), `pnpm build`, `pnpm check` (every `check` task a cache miss), `pnpm type-check`, `pnpm lint`, `pnpm format`, `pnpm test:smoke` (165), `pnpm test:skills` (754), `pnpm test:scripts` (7), `pnpm oat:validate-skills` (69 OK), `pnpm build:docs`, and the docs-index freshness step (`generate-index`, then `git diff --exit-code -- apps/oat-docs/index.md`) each exit 0; `turbo run type-check lint format --force` exit 0 (21 tasks, 0 cached). Recovery 3/10: recovery 1 (`189f05edf`, synced status file paths), recovery 2 (`9751e3a2f`, kickoff leftover check) and recovery 3 (`b4a42cd0f`, brainstorm destinations freestyle exceptions), each passing its focused and phase-relevant checks before and after its commit; root cleared recovery 3's `completed` marker in `c1b54e9d9`. The docs skill-catalog gate that failed the first verification is closed by p02-t05, and the unpulled synced `status` reading by p02-t06. `origin/main` gained `23cb59a6a` (#425) and `a5c28dca2` (#426) since the branch base; neither touches a file this branch changes.

Late fix p02-t07 (review round 1, M1 and L1–L4) at `539e419e8`: skill-prose contract tests (`src/commands/init/tools/shared src/validation`, 1301 passed), scaffold/status/list/integration tests (186), `pnpm oat:validate-skills`, `pnpm test:skills` (754), `pnpm lint`, `pnpm format` and `pnpm check` each exit 0.

Worktree: the orchestrator checkout on `feat/freestyle-projects`; committing owner: the phase implementer. Parallelism assessment: rung 3 (one phase implementer). Rung 1 does not apply: `oat_plan_parallel_groups` is `[]`. Rung 2 does not apply: the scaffold, its two OAT-owned templates, the `new`/`status` output and the skill's references all describe the same AGENTS.md and shape.md section contract and share the scaffold tests and the bundle inputs, so no two slices pass the independence test. Rung 4 does not apply: the phase adds a new skill and new scaffolded files. Main drift since the branch base (`git fetch origin main`): `23cb59a6a` (#425) touches none of p02's planned paths; its package versions matter only at p04.

### Task p02-t01: Scaffold the project AGENTS.md and shape.md and name them in new and status

**Status:** completed
**Commit:** 78ffeb3a2231cf51d319bf795eee511271eb5932
**Executor:** phase-implementer:freestyle-projects-p02-implementation-1

- Intent: inventory row 27 (scaffold half). Add the OAT-owned `project-agents.md` and the `shape.md` templates (bundle inputs and workflows pack), scaffold them for freestyle as `AGENTS.md` and `shape.md` without template frontmatter, have `oat project new` name both files and direct the user to `oat-project-freestyle` (text, plus `projectFiles` and `nextSkill` in JSON), and have `oat project status` name both paths for freestyle (text `Rules:`/`Shape:` lines, JSON `projectFiles`).
- Files: `.oat/templates/{project-agents.md,shape.md}`, `packages/cli/scripts/bundle-inputs.mjs`, `packages/cli/src/commands/tools/shared/pack-manifest.ts`, `packages/cli/src/commands/project/new/{scaffold.ts,scaffold.test.ts,index.ts}`, `packages/cli/src/commands/project/{status.ts,status.test.ts}`, `packages/cli/src/commands/commands.integration.test.ts` (the real `oat project new --mode freestyle` output assertion; `new/index.test.ts` mocks the scaffold, so it was not changed).
- Proof: `pnpm build`; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project src/commands/state src/commands/template src/commands/init src/validation src/commands/tools src/release src/commands/commands.integration.test.ts` (170 files, 4296 passed); CLI `check` and `type-check` exit 0. Bundle-tier scaffold tests under an isolated `HOME` in shared (committed scaffold holds exactly the three files), local (uncommitted) and synced (read back from `refs/oat/projects/<slug>` in the origin) assert: the first line says to read `shape.md`; `## Where records live` has a bullet per scope and names `oat project scope <project-path> --format value`; no frontmatter, `oat_template` or CLAUDE.md pointer; `shape.md` headings are exactly the eight topics plus Project log and Undecided, every topic ends `_Not yet shaped._`, `**Last shaped:** not yet shaped`. Control: a spec-driven scaffold writes neither file; a brief `new --json` carries no `projectFiles`/`nextSkill`; quick `status` prints no `Rules:`/`Shape:` and no `projectFiles`.
- Can-fail: dropping the two map entries failed the five freestyle scaffold tests; keeping template frontmatter failed the three per-scope tests; disabling the creation output failed the integration test; disabling the status paths failed the freestyle status test; rewriting the bundled `local` bullet failed the per-scope assertion with `records rule for local`. Each was restored.
- Decision: templates are named `project-agents.md` (the `<location>-agents.md` family: `repo-agents`, `pjm-agents`, `reference-agents`) and `shape.md`; both drop their template-marker frontmatter at scaffold so `AGENTS.md`'s first line is the read-`shape.md` instruction. The pre-existing `template-heading-literals` guard caught `shape.md` quoting its own headings in prose before commit; the prose names them without `##`.

### Task p02-t02: Add the oat-project-freestyle skill with its kickoff and reshape references

**Status:** completed
**Commit:** 5f4689889f58791ae4809772e285ea15b8f719f6
**Executor:** phase-implementer:freestyle-projects-p02-implementation-1

- Intent: inventory row 27 (skill half). Add `oat-project-freestyle` 1.0.0 (create through `oat project new --mode freestyle` in a user-chosen scope, or resume; read `AGENTS.md` then `shape.md`; resume at the first topic not yet shaped or at a detour's `**Shaping resumes at:**` line; check `## Undecided` and reshape checkpoints; no commit or push except as the commit agreement says) with `references/kickoff.md` (shaping guard, the eight topics, the brainstorm detour record, document starting points, adaptation rules with a leftover-instruction `grep`, the reviews discovery rule) and `references/reshape.md` (triggers, edit only affected sections, keep review intent, `Last shaped:`, effective point, `decision` log append accepting `skipped`); register it in the bundle and the workflows pack.
- Files: `.agents/skills/oat-project-freestyle/{SKILL.md,references/kickoff.md,references/reshape.md}`, `packages/cli/scripts/bundle-inputs.mjs`, `packages/cli/src/commands/tools/shared/pack-manifest.ts`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts`, `packages/cli/src/validation/named-skill-load-contract.test.ts` (one `non-executing` row: the kickoff adaptation rule quotes `oat-project-implement`/`oat-project-plan` template lines as text to strip).
- Proof: `pnpm oat:validate-skills` (69 oat-\* skills OK); `pnpm build`; `vitest run src/commands/init/tools/shared src/validation src/commands/tools` (72 files, 1842 passed) and the full CLI suite (451 files, 9756 passed) under `scripts/with-isolated-home.sh`; `pnpm lint`, `pnpm format`, CLI `check` exit 0. Contract tests pin the `AGENTS.md` headings (Project files, Single writer, Where records live, Records commands, Shaping and reshaping) and first line, the `shape.md` headings (eight topics, Project log, Undecided), the kickoff topic walk against the template order, every backticked `## heading` the skill names, the shared markers, the reshape pointer, and the eight starting-point templates, each resolved at the bundle tier with no repository or user tier.
- Can-fail: renaming a `shape.md` topic failed the heading pin and the named-heading check; renaming a kickoff topic failed the topic walk; dropping `plan-lite` from the table failed the starting-points list; removing the bundled `plan-lite.md` failed its resolve case. Each was restored.
- Decision: the skill's Step 1 reports a dirty tree but auto-commits nothing (no manifest auto-commit), so it is not enrolled in the `PROJECT_START_SKILLS` preflight contract, which requires that auto-commit; freestyle has no automatic commits. `oat-project-freestyle` is not gate-aware.

### Task p02-t03: Add the oat-brainstorm freestyle route and the freestyle Quick Command

**Status:** completed
**Commit:** 7bdb5c22c0031976d5b0f6cb99f8357d35c34dd9
**Executor:** phase-implementer:freestyle-projects-p02-implementation-1

- Intent: inventory rows 27 (brainstorm route) and 35. `oat-brainstorm` 1.3.11 → 1.4.0 (the one bump this PR needs; p04 must not bump it again unless it edits the skill after this commit, and then the PR still carries one bump): a freestyle active project has no fold-back (9h routes Related to 9j; the picker offers only the reference file), branch 9j reads `shape.md`'s `## Commits, PRs and merges` before its persistence block and commits and pushes nothing while that section is `_Not yet shaped._` or `Deferred:`, follows the agreement once shaped (a local project never commits), and hands back with a `Return to \`oat-project-freestyle\``prompt naming the topic on`**Shaping resumes at:**`. The `oat state refresh`Quick Commands list gains`oat-project-freestyle`.
- Files: `.agents/skills/oat-brainstorm/SKILL.md`, `packages/cli/src/commands/state/{generate.ts,generate.test.ts}`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts`
- Proof: `pnpm build`; `pnpm oat:validate-skills` (69 OK); `vitest run src/commands/init/tools/shared src/validation src/commands/state src/__tests__/skills src/commands/init/tools/brainstorm` (41 files, 1402 passed) under an isolated `HOME`; `pnpm lint`, `pnpm format`, CLI `check`, `type-check` exit 0. The synced-bookkeeping inventory anchors for branch 9j are unchanged (prose was added around the fenced block, not inside it).
- Can-fail: making 9j run the persistence block for freestyle and restoring fold-back failed the two route tests; removing the Quick Commands line failed the freestyle dashboard test and the goal-dashboard control. Restored.
- Record note: this record was written at close rather than opened before the edit; its scope matches the lookahead named in the phase start.

### Task p02-t04: Scratch-scope, migration, adaptation and Outcome 6 evidence

**Status:** no-change
**Executor:** phase-implementer:freestyle-projects-p02-implementation-1

- Intent: exit evidence 4-7 against the branch build (`node packages/cli/dist/index.js`, 0.3.51) in a scratch repository under an isolated `HOME`; no repository code change of its own. Its one defect (synced `status` named bare `AGENTS.md`/`shape.md`) was repaired as recovery 1 against p02-t01 (`189f05edffd0633f98155409dd461834f0cdc211`).
- Files: none in the repository. Gitignored evidence in `references/analysis/`: `p02-adapted-plan-brief.md`, `p02-outcome6-{a,b,c}-transcript.md`, `p02-outcome6-shape-after-{a,b,c}.md`.
- Evidence 4 (scopes): shared `fs-shared` scaffold commit holds exactly `state.md`, `AGENTS.md`, `shape.md`; local `fs-local` stays uncommitted and ignored; synced `fs-synced` published to `refs/oat/projects/fs-synced`. With the bare origin's HEAD set to `refs/heads/main`, a second clone before its first pull lists `fs-synced synced — — oat project pull`; after `oat project pull` it shows mode freestyle, recommendation none, and the Goal authored and pushed from the first clone. After recovery 1, `status` names `Rules:`/`Shape:` under the project folder in all three scopes.
- Evidence 5 (migration): `oat project migrate .oat/projects/shared/fs-shared --to synced` exit 0; `shape.md` and `AGENTS.md` are byte-identical before and after (sha256), and `oat project scope` reports `synced`, so the `AGENTS.md` synced records bullet applies.
- Evidence 6 (adaptation): `oat template resolve plan-brief` (bundle tier) copied raw had 18 leftover-grep hits; after kickoff rules 1-3 the grep was clean, but reading the document found two leftovers the rules and grep miss (the Commit Convention line and the strict phase-grammar paragraph), removed under rule 3's general clause. Defect recorded as direction-required event `freestyle-projects-p02-recovery-2` (no edit: the single `pending_attempt` slot still holds recovery 1's unsettled `completed` marker).
- Evidence 7 (Outcome 6, nested `general-purpose` workers on claude-opus-5-5 in the scratch repo, skills installed from the branch build, scripted user, no commits by workers): (a) `freestyle-projects-p02-outcome6-a` created `o6-dryrun` (shared, scaffold commit only), shaped Goal, detoured to `oat-brainstorm` with `result: pending` and a `**Shaping resumes at:**` line, the brainstorm wrote its reference file uncommitted because the commit agreement was unshaped and handed back, and shaping resumed at Documents with the line deleted; (b) `freestyle-projects-p02-outcome6-b`, a fresh session, resumed at Documents without re-asking Goal or Brainstorm (diff-verified) and shaped or deferred every remaining topic, Reviews as intent plus an observed mechanism, Commits deferred with an Undecided line; (c) `freestyle-projects-p02-outcome6-c` reshaped the review mechanism only: diff against the run (b) snapshot shows the Mechanism bullet replaced plus a `**Takes effect:**` bullet, intent unchanged, `**Last shaped:**` 2026-11-21 → 2026-11-24 (scripted date), and `oat project log append --category decision` returned `appended`. After all three runs the scratch repo's history is the scaffold commit only and origin is unchanged.
- Findings: run (a) found `oat-brainstorm/references/destinations.md` still describes the reference file and related→fold-back entries with no freestyle exception (SKILL.md branch 9j governs and was followed); recorded as direction-required event `freestyle-projects-p02-recovery-3`. Other noted ambiguities are in the phase report.

- Review round 1: `freestyle-projects-p02-review-1` (oat-reviewer, claude-opus-5-5 high) on `8f44e379b..df0f6cadf`, ledger head `022933b71`: 0 critical, 0 high, 1 medium, 6 low. Receive: M1 (a resume by name did not make the project active, so a brainstorm detour could write to another project; regression against the Shaping guard decision) and L1-L4 (consistency of p02's own prose) fixed through the original handle in fix mode as p02-t07 (`2ba0cb0a8`); L5 deferred (see Deferred Findings); L6 (stale recovery-3 marker sentence) fixed by root at Step 7b. Artifact `reviews/p02-code-review-2026-11-21T223516Z.md` (local-only).
- Review round 2: `freestyle-projects-p02-review-2` (fresh oat-reviewer, claude-opus-5-5 high) on the fix range `022933b71..539e419e8`: pass; M1 and L1-L4 resolved, each new contract test fails when its clause is reverted; 3 new low wording gaps in the rewritten Resume block, deferred to p04. Fix loops: 1. Artifact `reviews/p02-code-review-2026-11-21T225453Z.md` (local-only).

### Recovery Event freestyle-projects-p02-recovery-1

- Phase/task: p02 / p02-t01
- Original request: freestyle-projects-p02-implementation-1
- Original commit: 78ffeb3a2231cf51d319bf795eee511271eb5932
- Defect class: composition
- Discovered by: phase exit evidence 4 (`oat project status` on a branch-build scratch synced project named bare `AGENTS.md`/`shape.md`)
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: 189f05edffd0633f98155409dd461834f0cdc211
- Verification: focused status tests (28) and `src/commands/project`, `src/commands/state` plus integration (1982) passed before the commit and again on committed HEAD `189f05edf`; check and type-check exit 0; the full forced suite (9761) passed afterwards
- Reason: `project.path` is empty for synced projects (existing control-plane behavior), so freestyle status now joins the directory it read. Root validated the unchanged original commit and the three-file recovery diff and cleared the `completed` marker in `7110c84d9` (`used_attempts: 1` kept).

### Root direction after the first p02 report (BLOCKED before Head)

- Recovery events `freestyle-projects-p02-recovery-2` (kickoff adaptation list misses the Commit Convention line and the phase-grammar paragraph) and `-3` (`oat-brainstorm/references/destinations.md` lacks the freestyle exception) were reported direction-required only because the pending slot was occupied. Root authorizes both as phase-standing recovery attempts 2 and 3 under the same event IDs.
- Recovery event `freestyle-projects-p02-recovery-4` (docs skill-catalog gate: `Missing guide for oat-project-freestyle`) is resolved by a new execution record rather than a recovery: the minimal `apps/oat-docs/skill-docs.json` entry and guide anchor are brought forward from p04, because the gate fails for any phase that adds an eligible skill. p04 still owns the full docs pages. Recorded under Deviations.
- The unpulled synced `status` recommending a lifecycle step contradicts Outcome 1 ("a synced project not yet pulled into a checkout shows only the storage instruction to pull it, never a lifecycle recommendation") and sits in p02's exit evidence 4. Root authorizes a new execution record that makes `status` on an unpulled synced project show only the pull instruction, as `list` already does. This is mode-independent because no mode is known before the pull; materialized projects of every mode keep their current output.

### Task p02-t05: Bring the oat-project-freestyle docs guide anchor forward from p04

**Status:** completed
**Commit:** d60fc7e12e59677ad0632289e83dcfe08ee3b1cf
**Executor:** phase-implementer:freestyle-projects-p02-implementation-1

- Intent: root direction (recovery event 4 resolved as a record). The docs skill-catalog gate (`apps/oat-docs/scripts/skill-mapping.ts`) requires every eligible skill to have a `skill-docs.json` guide entry and a guide anchor with an `**Example scenario:**`. Add the minimal `oat-project-freestyle` entry (family Project entry, applicability none) and a `## oat-project-freestyle` section on `workflows/projects/planning/starting-projects.md`, the page that holds every Project entry skill; regenerate the committed catalog. p04 still writes the full pages (the page's situation table and intro are unchanged).
- Files: `apps/oat-docs/skill-docs.json`, `apps/oat-docs/docs/workflows/projects/planning/starting-projects.md`, `apps/oat-docs/docs/skills/index.md` (generated by `pnpm docs:skills:generate`). Nav sync produced no change; the regenerated `apps/oat-docs/index.md` is unchanged.
- Proof: `pnpm --filter oat-docs docs:skills:generate`, nav sync, `pnpm --filter oat-docs docs:validate` (0 errors; 776 warnings, the same count as before), `pnpm --filter oat-docs test` (93 passed), `pnpm --filter oat-docs check` exit 0, `pnpm build:docs` exit 0 (0 of 6 cached), the docs-index freshness step (`generate-index` then `git diff --exit-code -- apps/oat-docs/index.md`, exit 0); `pnpm build` and `vitest run src/commands/init/tools/shared src/validation src/release src/commands/docs src/commands/tools` (98 files, 2383 passed) under an isolated `HOME`.
- Can-fail: renaming the section's `**Example scenario:**` label failed `docs:skills:check` with `Missing example scenario workflows/projects/planning/starting-projects.md#oat-project-freestyle`; restored. Before this record the same gate failed with `Missing guide for oat-project-freestyle`.
- Record note: written at close; the scope is the root direction's item 2.

### Task p02-t06: Show only the pull instruction in status for an unpulled synced project

**Status:** completed
**Commit:** b9359a6fca056733ecce5b99156d87602f122145
**Executor:** phase-implementer:freestyle-projects-p02-implementation-1

- Intent: root direction item 3 (Outcome 1). `oat project status --project-path` on a synced project recorded on this branch but not pulled into this checkout showed the default spec-driven reading (`oat-project-discover`). It now shows only the storage instruction `list` gives: the same row (`kind: recorded-absent`, `recommendation: oat project pull`, `checkout absent`, terminal states included) under `project`, and in text `Project`, `Path`, `Scope: synced (checkout absent)`, `Recommendation`, `Reason`, `Hint: oat project pull <slug>`. Mode-independent: it applies only when the target folder does not exist, sits directly under the synced scope root, and has a synced record; every existing folder, and every path without a record, keeps its current output. The active-project branch is unchanged (a missing active path already errors).
- Files: `packages/cli/src/commands/project/list.ts` (extracts `projectListHint` and `classifyUnmaterializedSyncedRecord` from the table and the record loop without behavior change, exports `directoryExists`), `packages/cli/src/commands/project/status.ts`, `packages/cli/src/commands/project/status.test.ts` (the mocked harness injects a null resolver), `packages/cli/src/commands/project/list.integration.test.ts`.
- Proof: real-repository tests on the synced fixture: the unpulled status JSON equals `list --json`'s row for the same project, and the text output is exactly the six lines with no `oat-project-` or `Phase:`, for relative and absolute paths; controls: a materialized synced freestyle and a materialized synced spec-driven project (both with records), a shared quick project and an unrecorded synced path keep their current output. An absolute `--project-path` still never resolves the repository from the working directory (the existing test is unchanged): the repository is the one holding the path. `pnpm build`; `vitest run src/commands/project src/commands/state src/commands/commands.integration.test.ts src/commands/help-snapshots.test.ts` (69 files, 2055 passed) under an isolated `HOME`; CLI `check` and `type-check` exit 0.
- Can-fail: disabling the resolver failed the unpulled test (status payload differs from the list row); dropping the existing-folder guard failed the materialized control (`recorded-absent` instead of freestyle). Restored.
- Evidence 4 rerun (branch build 0.3.51, scratch bare origin with HEAD `refs/heads/main`, isolated `HOME`): clone a created `fs-synced` (freestyle, synced; scaffold commit holds the record) and pushed `main`; clone b before its first pull: `list` shows `fs-synced synced — — oat project pull oat project pull fs-synced`, and `status` (relative, absolute `--json`, `--field project.recommendation.skill`) shows only `oat project pull` with reason `checkout absent`; after `oat project pull fs-synced`: `list` shows `freestyle … none`, `status` shows `Mode: freestyle`, `Rules:`/`Shape:` and recommendation `none`. `Path:` is empty for the pulled synced project (existing control-plane behavior, unchanged). Transcript: `references/analysis/p02-t06-second-checkout-status.txt`.

### Recovery Event freestyle-projects-p02-recovery-2

- Phase/task: p02 / p02-t02
- Original request: freestyle-projects-p02-implementation-1
- Original commit: 5f4689889f58791ae4809772e285ea15b8f719f6
- Defect class: other
- Discovered by: phase exit evidence 6 (the plan-brief copy adapted by kickoff rules 1-3 and the rule-4 grep kept the Commit Convention line and the phase-grammar paragraph)
- Disposition: recovered
- Authorization: phase-standing (root direction in `3842bd129`)
- Attempt: 2/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: 9751e3a2f7f99f3758edfab3fe83d828ed4b31da
- Verification: new contract test plus `src/commands/init/tools/shared src/validation` (1295) passed before the commit and again on committed `9751e3a2f`; `oat:validate-skills`, `format:root`, CLI `check` exit 0; can-fail: removing the widening fails the new test
- Reason: kickoff rule 3 now lists the `**Commit Convention:**` line and plan-brief's phase-grammar paragraph, and the rule-4 grep matches them. Reservation `4b37dc26a`; marker settled inside attempt 3's reservation `2b4cde069`, as root directed.

### Recovery Event freestyle-projects-p02-recovery-3

- Phase/task: p02 / p02-t03
- Original request: freestyle-projects-p02-implementation-1
- Original commit: 7bdb5c22c0031976d5b0f6cb99f8357d35c34dd9
- Defect class: other
- Discovered by: Outcome 6 run (a), finding A8 (`oat-brainstorm/references/destinations.md` had no freestyle exception for the active-project fold-back and reference-file persistence entries)
- Disposition: recovered
- Authorization: phase-standing (root direction in `3842bd129`)
- Attempt: 3/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: b4a42cd0f8831f30d83f591650ef824d2d6371e4
- Verification: `src/commands/init/tools/shared src/validation src/__tests__/skills src/commands/init/tools/brainstorm` (1343) and `test:skills` (754) passed before the commit; 1343 again on committed `b4a42cd0f`; validate, `format:root`, CLI `check` exit 0; can-fail: reverting either clause fails its assertion
- Reason: the catalog now matches SKILL.md branches 9h and 9j (no fold-back for freestyle; `shape.md` decides persistence; no commit or push while commits are unshaped or deferred). No second `oat-brainstorm` bump (1.4.0). Root validated both events, the unchanged original commits and the three-file recovery diffs, and cleared attempt 3's `completed` marker (`used_attempts: 3` kept). Three attempts reached the elevated recovery-volume warning; all three were mechanical, in-phase fixes.

### Task p02-t07: Fix p02 review findings (M1, L1–L4)

**Status:** completed
**Commit:** 2ba0cb0a8c8b420e62b9d55a62523df92cef9e1f
**Executor:** phase-implementer:freestyle-projects-p02-implementation-1
**Source review:** p02-code-review-2026-11-21T223516Z.md (`freestyle-projects-p02-review-1`): M1, L1, L2, L3, L4

- Intent: M1 resume of a named project makes it the active project and sets `PROJECT_PATH` before any shaping or brainstorm handoff; L1 one resume-time trigger list in `SKILL.md` Step 2 and `reshape.md`; L2 the review-mechanism re-check rule in the scaffolded `AGENTS.md` and the `shape.md` Reviews prompt; L3 what a resuming session does with `result: pending`; L4 an unambiguous reshape pointer in `AGENTS.md`. L5 and L6 are root-owned.
- M1: `SKILL.md` Step 1 Resume resolves `{project-path}` (the active project, or the named folder under its scope root; ambiguous across scopes → ask; synced with no folder → `oat project pull <name>` and stop), confirms `oat_workflow_mode: freestyle`, then runs `PROJECT_PATH="{project-path}"`, `oat config set activeProject "$PROJECT_PATH"`, `PROJECT_PATH=$(oat config get activeProject)` before reading or shaping; Another mode now covers a named non-freestyle project and leaves the active project unchanged. Kickoff topic 2's detour first confirms `oat config get activeProject` prints this project. The new writer site is inventoried in `synced-bookkeeping-sites.json` (kind `write`, guard `PROJECT_PATH=$(oat config get activeProject)`), as the lifecycle-safety validator requires.
- L1: `SKILL.md` Step 2 item 2 and `reshape.md` both name "the reshape triggers to check on every resume": reached checkpoints, Undecided items that are due, agreements that stopped working; Step 2's reshape route points at that item. L2: the `shape.md` Reviews prompt and `AGENTS.md` `## Shaping and reshaping` say to re-check a review's mechanism when it comes due and, if unavailable, keep the intent, tell the user, log it (and reshape, in `AGENTS.md`). No heading changed. L3: `SKILL.md` Step 2 item 1 and the kickoff Shaping Guard tell a resuming session that `result: pending` means the detour never handed back: find the reference file in `brainstorming/` and record it with the user, or resume the brainstorm. L4: `AGENTS.md` names "the `oat-project-freestyle` skill's own `references/reshape.md` (in the installed skill's folder, not this project's `references/`)".
- Files: `.agents/skills/oat-project-freestyle/{SKILL.md,references/kickoff.md,references/reshape.md}`, `.oat/templates/{project-agents.md,shape.md}`, `packages/cli/src/validation/synced-bookkeeping-sites.json`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts` (five new contract tests), `packages/cli/src/commands/project/new/scaffold.test.ts` (the qualified reshape pointer).
- Proof: `pnpm build`; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation` (33 files, 1301 passed); scaffold, status, list-integration and commands-integration tests (5 files, 186 passed); `pnpm oat:validate-skills` (69 OK), `pnpm test:skills` (754), `pnpm lint`, `pnpm format`, `pnpm check` each exit 0. No version bumps: `oat-project-freestyle` is new at 1.0.0 and `oat-brainstorm` is untouched.
- Can-fail: each clause neutralized failed exactly its contract test (dropping the set-active line; dropping the detour active check; removing "stopped working" from Step 2; removing the kickoff pending rule; removing the `shape.md` re-check; restoring the old `AGENTS.md` pointer). Restored; 127 passed.

---

## Phase p03: Records commands

**Status:** completed
**Base:** 780af7710458118ac3103dddcd1711674dccbdc4
**Executor:** phase-implementer:freestyle-projects-p03-implementation-1
**Head:** 9b3b265b1ac4e5e6f7c41ed0180cfd03ba8eaeb1

Phase verification at `a95453772` on a clean tree (only the untracked `references/` and `reviews/`): `pnpm build`, `pnpm test:evidence` (12 tasks, 0 cached; cli 9810, control-plane 325, docs packages 85 passed; `oat-docs#build` force-executed), `pnpm test:smoke` (165), `pnpm test:skills` (754), `pnpm test:scripts` (7), `pnpm oat:validate-skills` (69 OK), `pnpm check`, `pnpm type-check`, `pnpm lint`, `pnpm format` (each CLI task a cache miss; unchanged packages replayed), `pnpm build:docs` (replays the `oat-docs#build` hash the forced run executed), and the docs-index freshness step (`generate-index`, then `git diff --exit-code -- apps/oat-docs/index.md`) each exit 0. Recovery attempts: 0/10. Inventory rows 23 (p03-t01) and 24 (p03-t02) are closed by this phase. Known Unknowns (a), (b) and (c) are settled in p03-t01.

Late fix p03-t04 (review round 1, L1–L4) at `9b3b265b1`: focused log, journal-check, complete-state and help-snapshot suites (15 files, 504 passed), CLI `check`, `type-check`, `lint`, `pnpm build` and `pnpm test:evidence` (12 tasks, 0 cached; cli 9826, control-plane 325 passed) each exit 0; no later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Worktree: the orchestrator checkout on `feat/freestyle-projects`; committing owner: the phase implementer. Parallelism assessment: rung 3 (one phase implementer). Rung 1 does not apply: `oat_plan_parallel_groups` is `[]`. Rung 2 does not apply: the log commands (append, check, synthesize) share the entry parser and its fixtures, and the journal-check coverage report shares the freestyle fixtures with them, so no two slices pass the independence test. Rung 4 does not apply: the phase changes an entry format and adds a report. Main drift since the branch base: `23cb59a6a` (#425) and `a5c28dca2` (#426) change only `packages/control-plane/package.json` among p03's paths, which matters at p04's version bump.

### Task p03-t01: Event fields on structural log entries and freestyle log coverage

**Status:** completed
**Commit:** eaa7352205c4d79f5eeb143184fc19172d763842
**Executor:** phase-implementer:freestyle-projects-p03-implementation-1

- Intent: inventory row 23 (closed). Structural entries accept an optional time of day (`--time`), subject (`--subject <id>`) and source project (`--source-project <name>`), written as a body head (`**Time:**`, `**Subject:**`, `**Source project:**`) above the one-line body, so the heading grammar and every existing reader stay unchanged; `parseProjectLogEntries` exposes `time`, `subject` and `sourceProject` on a structural entry only when its body opens with them. The flags are refused on judgment entries; subject and source project are one whitespace-free word. Log commands already resolve `--project <path>` from `state.md` alone, so no resolution change was needed; the tests prove it on freestyle fixtures with no active project.
- Decision (heading vs body head): the fields ride a body head, as judgment entries' `**Category:**`/`**Source:**`/`**Origin:**`/`**Recorded:**` do, rather than a new heading shape, because a time in the heading would make every existing `STRUCTURAL_HEADING_RE` reader (older CLIs, rollup's ledger scan, skills that grep headings) read new entries as grammar violations. A separate structural head reader keeps the judgment head's line set, so a judgment body opening with `**Subject:**` keeps its reading.
- Known Unknown (a), timestamp format, settled: the heading keeps its date-only UTC date; `--time` records `**Time:** HH:MM:SSZ`, the UTC time of day from the same clock reading as the heading date, so date and time name one ISO 8601 instant and never disagree (a 23:59:59.999Z append stays on its date). `--time` takes no value: an event's own time on another system (a forge merge time) belongs in the body.
- Known Unknown (b), rollup without `summary.md`, settled with no code change: `rollup` refuses with its existing message (`summary.md does not exist: <path>. Author the project summary before roll-up.`, exit 1), and `--summary-path` rolls a freestyle project's log into whatever document it chose during shaping. The message is shared by every mode, so it is unchanged (Constraint: existing modes unchanged).
- Known Unknown (c), events with `workflow.projectLog` false and no `project-log.md`, settled with no code change: `append` returns `skipped` (`reason: projectLog=false`, exit 0) and writes nothing, as for every mode; once the file exists the setting no longer skips. This matches the Reshaping decision (attempt the append, accept `skipped`; `shape.md` stands alone) and no contract source asks for more.
- Files: `packages/cli/src/commands/project/log/{grammar.ts,append.ts,check.ts}`, new `packages/cli/src/commands/project/log/freestyle.test.ts`, new fixture `packages/cli/src/commands/project/log/__tests__/fixtures/freestyle-projects-project-log.md` (byte copy of this project's committed log at `9318aa32b`, provenance header; the fixtures directory is formatter-ignored).
- Proof: `vitest run src/commands/project/log src/commands/help-snapshots.test.ts` (9 files, 368 passed) under `scripts/with-isolated-home.sh`; new tests: append/check/synthesize by path over freestyle fixtures with both, neither, plan only and journal only (exit 0 each; the documents are untouched and `project-log.md` is the only new file), rollup refusal and `--summary-path`, the exact event bytes and parsed fields, the midnight clock case, partial heads, keyed replay, refusals, and real-log parsing of the two committed real-derived fixtures (this project's log with four categorized judgment heads; the lite-workflow-mode log, sealed). Existing-mode control: a quick-mode structural append without event flags is byte-identical and parses to the same entry. CLI `check` and `type-check` exit 0. Archived corpus differential (local, untracked): `oat project log check --json` over all 57 local project logs (1022 structural entries) with the base build and again after `pnpm build` is byte-identical; the new parser finds no event fields and no grammar violations in 52 real logs (1082 entries).
- Can-fail: neutralizing head composition failed the three head-writing tests; dropping the parser fields failed the two parse tests; dropping the judgment refusal failed the `--time` refusal; local time instead of UTC failed the head and midnight tests; dropping the one-word rule failed both whitespace refusals; ignoring `--project` failed all four freestyle by-path variants at the first append (exit 1); a heading grammar with a time failed both real-log tests. Each restored (diffs empty).

### Task p03-t02: Journal check coverage report for freestyle

**Status:** completed
**Commit:** 915697c6584a170a1cd52da50d76bf95b09e2a6c
**Executor:** phase-implementer:freestyle-projects-p03-implementation-1

- Intent: inventory row 24 (closed); replaces p01-t03's minimal freestyle opt-out (`ok`, no findings) with the coverage report and the command's file requirements. `oat project journal check` reads `state.md` first; for a freestyle project only `state.md` is required, and `plan.md` and `implementation.md` are each optional. The result carries `coverage` (`missing`, `recognized`, `validated`, `skipped`, and per phase `id`, `heading`, `outcome`, `reason`, `message`, `sources` with file and line); text output prints the counts, the missing inputs ("reported, not an error"), `No phase records were validated.` when the count is zero, and one line per phase. Recognized phases are OAT phase headings (`pNN`, `p-revN`) in either document; a recognized phase with a journal section is validated; skip reasons are `journal-missing`, `no-journal-section`, `unrecognized-phase-id` (a `## Phase <id>:` heading with a project-native id such as `P7` or `A-1a`) and `out-of-scope` (`--at review --scope`, validated against the phases either document names). Validated phases are held to the record-consistency rules every mode shares (duplicate phase section, two phase statuses, duplicate record, two record statuses, a `completed` record without one commit SHA, a record outside its phase), which refuse with owner `shape.md`; no lifecycle rule, status vocabulary or plan-coverage rule applies. Every `--at` boundary gives the same freestyle result. Lifecycle modes keep their path and result shape exactly (no `coverage`; the same not-found errors).
- Files: `packages/cli/src/commands/project/journal-check/{types.ts,rules.ts,evaluator.ts,index.ts,evaluator.test.ts}`, new `packages/cli/src/commands/project/journal-check/freestyle.test.ts`. The `journal check` description gains one clause naming the freestyle report (help snapshot test passes; its assertions are substring checks).
- Proof: `vitest run src/commands/project/journal-check src/commands/project/complete-state` (6 files, 120 passed) and `vitest run src/commands/project src/commands/help-snapshots.test.ts src/commands/commands.integration.test.ts` (69 files, 2034 passed) under `scripts/with-isolated-home.sh`; CLI `check`, `type-check`, `lint` exit 0. New tests: the four fixtures (both, neither, plan only, journal only) at two boundaries, each asserting `missing`, the three counts, every phase's outcome and reason, exit 0 and no file created; exact sources and messages; exact text output for plan only and neither; scope at review and a scope naming no phase; four refusals owned by `shape.md` with coverage still reported; no rule on a skipped phase. Existing-mode controls on the same command path: a spec-driven-default project without `plan.md` or without `implementation.md` still fails with the unchanged not-found errors, and a lifecycle result has no `coverage`. p01-t03's evaluator test now also asserts the coverage it returns.
- Can-fail: turning freestyle routing off failed the ten missing-input and scope tests (lifecycle not-found exit 1); routing every mode through it failed the three existing-mode controls; dropping native-id detection failed nine count and text tests; validating with no journal failed the three plan-only tests; dropping the record rules failed the four refusals; dropping the zero-validated line failed both text tests; ignoring the scope failed the scope test. Each restored (diffs empty).
- Record note: opened at close; work ran in one session under the same handle.

### Task p03-t03: Branch-build records run on a scratch freestyle project

**Status:** no-change
**Executor:** phase-implementer:freestyle-projects-p03-implementation-1

- Intent: exit evidence 3. With the branch build (`node packages/cli/dist/index.js`, 0.3.51, after `pnpm build` at `22a7c271f`), in a scratch repository under `$TMPDIR` with an isolated `HOME`: create a shared freestyle project, append a judgment entry and a `merged` event with `--time`, `--subject` and `--source-project` by path, check, synthesize, check again, and run journal check as the project gains `plan.md` and `implementation.md`. No repository change.
- Files: none in the repository; transcript in gitignored `references/analysis/p03-t03-records-run.txt`.
- Run: `oat init --scope project` then `oat project new fs-records --mode freestyle --scope shared` (exit 0; scaffold commit holds `state.md`, `AGENTS.md`, `shape.md`). Every records command passed `--project .oat/projects/shared/fs-records`. Judgment append `appended`, `created: true`; event append `### 2026-11-21 · structural · orchestrator · merged` with body head `**Time:** 23:22:06Z`, `**Subject:** l07`, `**Source project:** fs-child` above the one-line body; the keyed replay returned `already-appended`; `log check --json` `synthesis_pending` with 1 structural and 1 friction entry and no grammar violations; `log synthesize` `synthesized`; `log check` `ok; entries: 2`. Journal check at `completion` with neither document: `0 phases recognized, 0 validated, 0 skipped`, `Missing: plan.md, implementation.md (reported, not an error)`, `No phase records were validated.`; after `oat template resolve plan-brief --output plan.md`: 2 recognized, 0 validated, 2 skipped `journal-missing`; after `oat template resolve implementation-brief --output implementation.md` plus a `## Phase L7:` section: 2 recognized, 2 validated, 1 skipped `unrecognized-phase-id`; with `plan.md` removed at `implement-preflight`: `Missing: plan.md`, 2 validated from the journal alone, L7 skipped. Every command exit 0. The scratch directory was removed (checked).
- Proof: the transcript's exit codes and outputs above.

### Task p03-t04: Fix p03 review findings (L1–L4)

**Status:** completed
**Commit:** c8e6f80a7a6d90dbee269ed2f38924b8379870a3
**Executor:** phase-implementer:freestyle-projects-p03-implementation-1
**Source review:** p03-code-review-2026-11-21T233055Z.md (`freestyle-projects-p03-review-1`): L1, L2, L3, L4

- Intent: fix all four low findings of review round 1 (root receive: regressions or inconsistencies within p03's own code) in one record, through the original handle in fix mode.
- L1 (`log/grammar.ts`): `parseProjectLogStructuralHead` is exactly as strict as the writer. Each field matches its written shape (`**Time:** HH:MM:SSZ`, `**Subject:**` and `**Source project:**` one whitespace-free word), at most once and in writing order (Time, Subject, Source project). The head counts only when a blank line and a non-empty body follow it; otherwise the whole body is body text with no head. The unused `PROJECT_LOG_TIME_OF_DAY_RE` export was removed (no other reference).
- L2 (`log/append.ts`): `--time` with a stray operand (`--time 10:00`) is refused: `--time takes no value (got 10:00); it records the append's own UTC time of day. Put an event's own time in --body.` (exit 1, nothing written). The refusal applies only when `--time` is present; `--time` stays a boolean flag, so help output is unchanged, and stray operands without `--time` are still accepted as before.
- L3 (`log/append.ts`): the smaller change, matching the documented contract. For a structural entry the idempotency key is checked against the caller's `--body` (and the replay scan derives its token from it), so a key in `--subject` or `--source-project` alone is refused with the existing message. Judgment entries keep the composed body, where a `--source` equal to the key is the documented way to satisfy the rule. In-tree callers: event flags are new in p03, so no existing caller relies on a head-only key; structural entries without event flags are unaffected (the caller's body was already the whole body). No help text changed.
- L4 (`journal-check/{evaluator.ts,types.ts}`): a `## Phase <id>:` heading whose id is an OAT phase id (`p01`, `p-rev1`, or bare digits as the shared reader accepts) and has no title is skipped with the new reason `untitled-phase-heading`, message `The heading "## Phase p01:" has no title, so it is not read as phase p01's section and its records are not validated; add a title after the colon.` Project-native ids keep `unrecognized-phase-id`.
- Files: `packages/cli/src/commands/project/log/{grammar.ts,append.ts,freestyle.test.ts}`, `packages/cli/src/commands/project/journal-check/{types.ts,evaluator.ts,freestyle.test.ts}`.
- Proof: `vitest run src/commands/project/log src/commands/project/journal-check src/commands/project/complete-state src/commands/help-snapshots.test.ts` (15 files, 504 passed; +16 tests) under `scripts/with-isolated-home.sh`; CLI `check`, `type-check`, `lint` exit 0; `pnpm build` exit 0; `pnpm test:evidence` exit 0 (12 tasks, 0 cached; cli 9826, control-plane 325 passed). New tests: the reviewer's repro (flagless `--body "**Subject:** fake rest"` parses with no event fields) and a written-event round-trip control; eight writer-strictness cases with no head (whitespace value, no blank line, no body, blank body, out of order, repeated, time without seconds, time without `Z`) and a partial head in order; `--time 10:00` refused plus the stray-operand-without-`--time` control; the head-only key refused plus the judgment `--source` key control (append then `already-appended`); the untitled `## Phase p01:` and `## Phase 2:` headings beside a native id. The earlier lenient assertion (a malformed time line followed by a subject still read the subject) now asserts no head. Branch-build replay of the reviewer's probes A, B, D and J2 in a scratch repo (removed): A refused exit 1, B stored with no event fields, D refused exit 1, J2 reports p01 `untitled-phase-heading`; transcript `references/analysis/p03-t04-review-probes.txt` (gitignored).
- Can-fail: a whitespace-tolerant subject failed the whitespace case; dropping the blank-line and body rules failed five no-head cases; dropping only the body rule failed the blank-body case; resetting the field order per line failed the out-of-order and repeated cases; a loose time failed three time cases; dropping the `--time` refusal failed its test; checking the key against the head plus body failed the head-only refusal; turning off untitled detection failed the L4 test. The repro is held by two independent guards (one-word value; blank line plus body), so neutralizing them together failed it. Each restored (diffs empty).

- Review: `freestyle-projects-p03-review-1` (oat-reviewer, claude-opus-5-5 high) on `780af7710..a95453772`, ledger head `484684daf`: pass, 0 critical, 0 high, 0 medium, 4 low (L1 head parser looser than the writer; L2 `--time` silently dropped a value; L3 idempotency-key rule vs its help text; L4 untitled phase heading misreported). All four are regressions inside p03's own code; fixed through the original handle in fix mode as p03-t04 (`c8e6f80a7`; 16 new tests, forced suite exit 0, each guard can fail). No re-review round: the fixes are Low and the m01 milestone review covers the range. Fix loops: 1. Artifact `reviews/p03-code-review-2026-11-21T233055Z.md` (local-only).

---

## Phase p04: m01 docs and release

**Status:** completed
**Base:** 91ba64a6e6313d21d30a85352809cdf828e5220f
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Head:** f617afb91f79ec61527da943817246f627be2c9d

Phase verification at `2d50c2888` on a clean tree (only the untracked `references/` and `reviews/`), in Definition of Done order with each exit code captured. The results:

- `pnpm check`: exit 0 (11 tasks, 0 cached).
- `pnpm type-check`: exit 0 (11 tasks, 5 cached).
- `pnpm test`: exit 0 (12 tasks, 5 cached; cli was a cache miss and executed).
- `pnpm build`: exit 0. The gate run replayed it from cache, so it was re-run with `turbo run build --force`: exit 0 (5 tasks, 0 cached).
- `pnpm run check:skill-bumps`: exit 0 (24 skills and agent roles), after `git fetch origin main`.
- `pnpm release:check-versions`: exit 0.
- `pnpm release:validate`: exit 0 (5 packages at 0.3.54).
- `pnpm build:docs`: exit 0. It was also replayed from cache and re-run with `--force`: exit 0 (6 tasks, 0 cached).
- The docs-index `generate-index` followed by `git diff --exit-code`: exit 0.
- Also exit 0: `pnpm lint`, `pnpm format`, `pnpm test:smoke` (165 passed), `pnpm test:skills` (754 passed), `pnpm test:scripts` (7 passed), `pnpm oat:validate-skills` (69 OK), and the isolated `vitest run src/commands/init/tools/shared src/validation` (33 files passed).

`pnpm test:evidence` executed (12 tasks, 0 cached) and exited 1 twice. Every non-cli package passed (control-plane 325 passed).

- First run: 6 cli failures. 5 were timeouts in `gate-hardening.integration` case 10 and in four `docs/literals` CLI-boundary tests; the sixth was a real-SIGINT timing assertion in `exact-path-commit`. Load average was about 69.
- No-edit rerun: 2 different timeouts, in `gate-hardening` case 4 and the `exact-path-commit` tilde-hooks test. Load was 20 to 27. cli 9828 of 9830 passed.
- The same three files run alone under an isolated `HOME` at `2d50c2888`: exit 0 (72 passed).

p04 changes no file those suites exercise; its only `packages/cli/src` edits are validation tests. I judged the failures to be host-load timeouts, not defects, made no edit and opened no recovery. A forced evidence run on an idle host is still owed.

Inventory: rows 28 to 32 and 34 are handled (p04-t01 to p04-t04). The post-merge re-check is p04-t05: it found 16 files with no freestyle mention. 14 are p04-t01 opt-outs, one more is opted out (`contributing/skills.md`), and one was fixed (`workflows/projects/index.md`). All four deferred items are closed (p04-t01 and p04-t02). Recovery: 1/10 used (`freestyle-projects-p04-recovery-1`, recovered). Its committed `completed` marker stays in `state.md` for root.

Late fix p04-t06 (review round 1: M1 to M3, L1 to L5) at `c20ef22d5`, recorded at `7d919db66`. The checks:

- Before the commit, each exit 0: the isolated skill-contract, validation, help-snapshot and log suites (42 files, 1689 passed), `oat:validate-skills`, `lint`, `format`, `check` and `type-check`.
- Forced `build` and forced docs build (0 cached each), `docs:validate`, docs-index freshness and `test:skills` (754 passed), each exit 0.
- After the commit, each exit 0: `check:skill-bumps` (25 checks), `release:check-versions` and `release:validate`.

The only CLI source change is the `--subject` help text, so `test:evidence` was not rerun, per root. No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Late fix p04-t07 (review round 2: M1, L1, L2; L3 no change) at `67c451c35`, recorded at `447cd3e2d`:

- Before the commit, each exit 0: the isolated skill-contract and validation suites (33 files, 1306 passed), `oat:validate-skills`, `lint`, `format`, `check`, `type-check`, forced `build` and docs build (0 cached each), `docs:validate`, docs-index freshness and `test:skills` (754 passed).
- After the commit, each exit 0: `check:skill-bumps` (25 checks), `release:check-versions` and `release:validate`.

No CLI source changed. The head advanced under the late-fix rule.

Late fix p04-t08 (review round 3: L1, docs wording) at `104563286`, made by root: `oxfmt --check` on the page, the docs app `check` (markdownlint, oxfmt, skill catalog) and docs-index freshness (`generate-index`, then `git diff --exit-code`) each exit 0. The head advanced under the late-fix rule.

Late fix p04-t09 (m01 milestone-exit review: H1 to H3, M1 to M7; H4 goes to the operator) at `58a164395`, recorded at `b560580cc`. The checks, each exit 0: the skill-prose contract run (1307 passed), the focused CLI suites (651), `oat:validate-skills`, `lint`, `format`, `check`, `type-check`, `pnpm test` (cli a cache miss, 9841 passed), forced `turbo run build`, `test:skills` (754), `test:smoke` (165), `build:docs` and docs-index freshness. After the commit: `check:skill-bumps` (29), `release:check-versions` and `release:validate`. One forced `pnpm test:evidence` ran with 0 of 12 cached and passed. No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Late fix p04-t10 (m01 review H4, new-hardening, operator-approved: "operator chose Fix in m01, 2026-11-22") at `6115f4234`, recorded at `8fa5b4f92`. The checks, each exit 0: the skill-prose contract run (1309 passed), `oat:validate-skills`, `lint`, `format`, `check` and `test:skills` (754). After the commit: `check:skill-bumps` (29), `release:check-versions` and `release:validate`. No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Late fix p04-t11 (m01 re-review round 2: R2-1 to R2-6, regressions of accepted requirements) at `d86cda984`, recorded at `b3336ccb3`. The checks, each exit 0: the isolated vitest run over shared, validation and the touched CLI dirs (1905 passed), control-plane vitest (325), `type-check`, `oat:validate-skills`, `lint`, `format`, `check`, `test:skills` (754), `pnpm build` and docs-index freshness. After the commit: `check:skill-bumps` (29), `release:check-versions` and `release:validate`. No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Late fix p04-t12 (m01 re-review round 3: R3-1 to R3-6; R3-1 a pre-existing shared-parser defect in every mode and R3-2 new-hardening, both operator-approved: "operator chose Fix in m01, 2026-11-22") at `1ee61581c`, recorded at `de3874abd`. The checks, each exit 0: `pnpm build`, the isolated vitest run over shared, validation and the touched CLI dirs (1676 passed), the full control-plane vitest (327), `type-check`, `oat:validate-skills`, `lint`, `format`, `check`, `test:skills` (754), `pnpm build:docs` and docs-index freshness. After the commit: `check:skill-bumps` (29), `release:check-versions` and `release:validate`. No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Late fix p04-t13 (m01 re-review round 4: R4-1 and R4-2, regressions of the accepted R3-5 fix; R4-3 deferred by root) at `cf699ae38`, recorded at `3e2e5a10c`. The checks, each exit 0: `pnpm build`, the skill-prose vitest (1314 passed), `oat:validate-skills`, `lint`, `format`, `check` and `test:skills` (754). After the commit: `check:skill-bumps` (29), `release:check-versions` and `release:validate`. No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Late fix p04-t14 (m01 re-review round 5: R5-1, a regression the R4-1 fallback introduced) at `2b11c7b1c`, recorded at `6d97810c3`. The checks, each exit 0: `pnpm build`, the skill-prose vitest (1314 passed), `oat:validate-skills`, `lint`, `format`, `check` and `test:skills` (754). After the commit: `check:skill-bumps` (29), `release:check-versions` and `release:validate`. No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Late fixes p04-t15, p04-t16, p04-t18 and p04-t20 (m01 integrated review `m01-integrated-review-2026-11-22T134403Z.md`: I-1, I-2 Resume half, I-4 and I-6, the operator-approved narrowed set; p04-t17 and p04-t19 are cancelled) at `e6c5b19ff`, `4295bb3c1`, `b997ca31c` and `903dfc12e`, recorded at `ad56c3c8f`, `0c689cdfd`, `299172710` and `1d70a44af`. The checks, each exit 0:

- The skill-prose vitest (1316 passed).
- The focused status, list-integration, freestyle and review-skill contract suites (165 passed).
- `oat:validate-skills`, `lint`, `format`, `check` (cli cache miss), `type-check` (cli cache miss) and `check:skill-bumps` (29).
- `pnpm test`: `turbo run test` passed, with cli (9863) and control-plane cache misses. Its `test:smoke` step failed twice in `tools/smoke/runner/cleanup.test.mjs`: the SIGTERM-during-provision and SIGTERM-during-drive timing cases. Nothing under `tools/smoke` changed in this range, so one rerun without edits followed: `test:smoke` passed 165 of 165, and the `test:skills` (754) and `test:scripts` (7) steps the `&&` chain had skipped also passed.

No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Late fix p04-t21 (m01 exit re-review round 7: R7-1, a regression the p04-t15 I-1 fix introduced) at `ed563906e`, recorded at `fb3224029`. The checks, each exit 0: `pnpm install --frozen-lockfile`, the skill-prose vitest (1316 passed), `oat:validate-skills`, `lint` and `format`. After the commit: `check:skill-bumps` (29), `release:check-versions` and `release:validate`. No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Late fixes p04-t22 to p04-t25 (m01 integrated review cycle 2 `m01-integrated-review-2026-11-22T152500Z.md`: J-1, J-2 case A, J-3 and J-4; J-2 case B deferred; the operator chose no further review rounds) at `fa8507b26`, `df598d4e2`, `53618bd9b` and `cc7404be1`, recorded at `e8e8c8a9a`, `b9ebf76d2`, `8da3b61d3` and `f617afb91`. The checks at `f617afb91`, each exit 0: `pnpm check`, `type-check`, `pnpm test:evidence` (12 tasks, 0 cached; cli 9871, control-plane 327, docs-config 22, docs-theme 25, docs-transforms 38 passed), `pnpm build`, `check:skill-bumps` (29), `release:check-versions` after `git fetch origin main`, `release:validate`, `build:docs`, docs-index freshness, `lint`, `format` and the skill-prose vitest (33 files, 1321 passed). `pnpm build` and `build:docs` replayed the cache: the forced `test:evidence` run had built every package, and `build:docs` had executed uncached for p04-t25 on the same docs content. No later phase has a `**Base:**`, so the head advanced under the late-fix rule.

Worktree: the orchestrator checkout on `feat/freestyle-projects`; committing owner: the phase implementer. Parallelism assessment: rung 3 (one phase implementer). Rung 1 does not apply: `oat_plan_parallel_groups` is `[]`. Rung 2 does not apply: the docs pages, skills, agent contracts and READMEs must describe one consistent freestyle contract, and the provider-view sync, skill bumps and lockstep versions are shared generated output, so no two slices pass the independence test. Rung 4 does not apply: the phase spans dozens of files and a release bump. Main drift: root merged `origin/main` (`23cb59a6a` #425, `a5c28dca2` #426; Cursor pins and ladder, skill edits in `oat-project-plan-writing` and `subagent-orchestration`, lockstep versions) in `91ba64a6e` with no conflict, so the lockstep bump lands above main's versions.

### Task p04-t01: Name freestyle in the mode-aware skills, agent contracts and templates

**Status:** completed
**Commit:** 4b0dfd3579c75509c9b3ee7c8ff73f3fb870321a
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1

- Intent: inventory rows 28, 29 and 30, deferred item 1 (p02 review round 2 L1-L3) and deferred item 3 (project `AGENTS.md` Records commands). Each mode-aware skill names freestyle or stops for it before any write, instead of reading it with the spec-driven default; the agent contracts name freestyle. Version bumps land in the release record.
- Row 28: `.oat/templates/state.md` mode comment lists `freestyle` (the freestyle scaffold itself uses `state-freestyle.md`).
- Row 29, handled: `oat-project-next` (Step 1 freestyle stop: invoke nothing, name `AGENTS.md`/`shape.md`; mode list; empty-projects entry list), `oat-project-progress` (mode lists, Freestyle mode display with `Next: none`, both entry lists), `oat-project-plan` (freestyle Stop), `oat-project-discover` (decline note, offer list, stop-and-route bullet), `oat-project-implement` `references/plan-and-resume.md` (new `### Freestyle Projects` stop before Step 1), `oat-project-autonomous` (route-table row: Stop), `oat-project-capture` (entry list), `oat-project-complete` (stop before Step 1.5 naming `complete-state` and `archive`), `oat-project-document`, `oat-project-summary`, `oat-project-revise`, `oat-project-pr-final`, `oat-project-pr-progress` (each stops before any write), `oat-project-review-receive` (stop, points to `oat-review-receive`), `oat-brainstorm` (success criterion: "any lifecycle mode" plus no fold-back for freestyle; no second bump, 1.4.0 already in this PR). Row 29, opted out: `oat-project-brief` (SKILL and `brief-contract.md`), `oat-project-goal`, `oat-project-lite`, `oat-project-quick-start`, `oat-project-import-plan` (each resumes only its own mode and otherwise creates a new project, so a freestyle active project is never resumed as theirs); `oat-project-promote-spec-driven` (accepts only quick or import); `oat-project-plan-writing` (loaded only by the lifecycle plan skills, which stop for freestyle); `oat-project-implement` `references/phase-execution.md` and `completion-and-closeout.md` (reached only after `plan-and-resume.md`, which now stops); `oat-brainstorm/references/dogfood-results.md` (historical record); `oat-project-complete/tests/prepare-completion-branch.test.mjs` (fixture of a lifecycle mode).
- Inventory re-check consumers found in this record (mode readers that use `WORKFLOW_MODE` or a mode-recommendation list, not matched by p01's tokens), handled: `oat-project-review-provide` (stop at the start of Step 1.6, before the artifact-baseline check; points to `oat-review-provide`), `oat-project-review-provide-remote` (stop before posting; points to `oat-review-provide-remote`), `oat-project-reconcile` (stop before any write), `oat-project-new` (scope statement lists `oat-project-freestyle`), `oat-docs` and `oat-pjm-review-backlog` (new-project recommendation lists). Opted out: `create-oat-skill` (example code), `oat-project-design/references/selective-review-pass.md` (example table), `oat-project-dispatch-subagents` (dispatched only by `oat-project-implement` and the review roots, which stop for freestyle), `oat-wave-execute` (template placeholder names).
- Row 30: `oat-reviewer` lists `freestyle` in `workflow_mode` and gains a Mode Contract entry (no lifecycle artifact expected; never a finding for a missing one); `oat-phase-implementer` says `freestyle` is never dispatched (an unrecognized mode). Top-level `version:` bumps land in the release record.
- Deferred item 1 (p02 round 2): L1 the Resume bullet says a named project wins even when another project is active; L2 the unpulled synced case names `oat project list` and its `oat project pull <name>` hint (`list.ts` `projectListHint`); L3 Success Criteria lists the three resume triggers from Step 2. No version bump (new at 1.0.0 in this PR).
- Deferred item 3: `.oat/templates/project-agents.md` Records commands gain the structural event flags (`--time`, `--subject <id>`, `--source-project <name>`, with `--structural --producer --ref`) and `oat project journal check --project <path>` (coverage counts and reasons; a missing file is reported, not an error). Headings unchanged.
- Files: `.oat/templates/{state.md,project-agents.md}`, `.agents/agents/{oat-reviewer.md,oat-phase-implementer.md}`, `.agents/skills/{oat-brainstorm,oat-docs,oat-pjm-review-backlog,oat-project-autonomous,oat-project-capture,oat-project-complete,oat-project-discover,oat-project-document,oat-project-freestyle,oat-project-new,oat-project-next,oat-project-plan,oat-project-pr-final,oat-project-pr-progress,oat-project-progress,oat-project-reconcile,oat-project-review-provide,oat-project-review-provide-remote,oat-project-review-receive,oat-project-revise,oat-project-summary}/SKILL.md`, `.agents/skills/oat-project-implement/references/plan-and-resume.md`, `packages/cli/src/validation/{skills.test.ts,named-skill-load-contract.test.ts}`.
- Proof: `pnpm build`; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/project/new src/commands/state src/__tests__/skills` (41 files, 1516 passed); `pnpm oat:validate-skills` (69 OK), `pnpm test:skills`, `pnpm lint`, `pnpm format` each exit 0. New `freestyle mode skill contracts` tests: freestyle exposed from the eight project-entry surfaces; the freestyle stop present in 16 lifecycle skill sites; both agent contracts name freestyle. The named-skill call-site matrix gains `oat-project-freestyle` on five existing rows and two new non-executing rows (next Step 1, plan Prerequisites); the two `oat-project-new` regexes in the brief and goal entry tests now read "Quick, lite, brief, goal, and freestyle projects".
- Can-fail: deleting the progress entry line, renaming `### Freestyle Projects` in `plan-and-resume.md`, and deleting the reviewer's freestyle bullet failed exactly the three new tests, each with its own file's assertion; restored.

### Task p04-t02: Describe freestyle in the docs pages that list modes

**Status:** completed
**Commit:** 00bcd45670fc883400eefea18ac5c1b5ed917ce7
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1

- Intent: inventory row 31 (the 24 pages that list modes), deferred item 2 (L5) and deferred item 4 (docs), describing only shipped behavior.
- Row 31, every page handled: `reference/cli-reference` (`--mode` list and the freestyle scaffold; freestyle `status` text and JSON; unpulled synced `status`; the L5 difference; `list` freestyle row; journal-check coverage report and skip reasons; log commands by path and the event flags), `reference/oat-directory-structure` and `reference/project-artifacts` (freestyle artifact rows; `plan.md` is canonical only for lifecycle modes), `reference/project-state-machine` (no phase state), `skills/brainstorm` (no fold-back; reference file; commit choice from `shape.md`; hand-back prompt), `skills/index` (Key Skills entry; the generated catalog row landed in p02-t05), `workflows/advanced/autonomy` (product-judgment stop), `dispatch-ceiling` (never asks), `workflow-gates` (`oat-project-freestyle` not gate-aware; no gate runs), `workflows/approvals-and-automation` (At a glance row; the "without asking" exception, keeping each scope's creation behavior), `workflows/choose-workflow` (description, mode list, mode table row, choosing bullet, "stays outside the lifecycle"), `workflows/ideas/index` and `ideas/lifecycle` (freestyle as a ready-to-build start), `closeout/closeout-skills` (no closeout sequence; `complete-state` and `archive`), `closeout/pr-flow` (neither PR skill applies), `execution/execution-skills` and `execution/implementation-execution` (implement stops), `execution/picking-up-projects` (freestyle status, list, next, progress, dashboard incl. the paused resume step; unpulled synced status; L5), `projects/lifecycle` (description; follows none of the map), `planning/hill-checkpoints` (no checkpoints), `planning/planning-skills` (discover declines; plan stops), `planning/starting-projects` (intro, situation table row, scope, knowledge index, active-project bullet, dirty-tree, dispatch policy, checkpoints), `reviews/index` (project reviews stop; ad-hoc skills), `reviews/review-flavors` (project review stops).
- Deferred item 2 (p02 review round 1 L5), decision: document the difference, no code change. `status` addresses one project, so an unparseable synced record is an error there (exit 1 with the parse error and `recordRecovery()`'s restore-from-trusted-Git instruction, `status.ts` catch at the action end), while `list` must keep listing every other project and degrades the same failure into a `recorded-invalid` row with the hint `restore record from Git` (`list.ts` `onInvalid`). Both name the same recovery and neither gives a lifecycle recommendation, so aligning would change an existing failure posture for every mode (Constraint: existing modes unchanged) without a contract source asking for it. Documented in `cli-reference.md` (status entry) and `picking-up-projects.md` (Discover and adopt).
- Deferred item 4: `project-log.md` gains the event head (fields, order, one-word rule, refusal on judgment entries, the exact rendered example from `log/freestyle.test.ts`, `--time` takes no value, the idempotency key in `--body`), logs by path on a freestyle project, and `skipped` when the log is disabled; `starting-projects.md` gains the situation-table row and intro around p02-t05's section; the unpulled synced `status` output (p02-t06) is in `cli-reference.md` and `picking-up-projects.md`; the paused-freestyle dashboard resume step (p01 review L2 deviation) is in `picking-up-projects.md`, where the router and dashboard are documented.
- Files: the 25 pages above under `apps/oat-docs/docs/` and the regenerated `apps/oat-docs/index.md` (two descriptions changed).
- Proof: `pnpm --filter oat-docs docs:validate` exit 0 (0 errors, 776 warnings, the baseline count; one new provenance warning from a `.oat/state.md` mention was removed by rewording), `pnpm --filter oat-docs check` exit 0 (markdownlint, `oxfmt --check`, catalog current at 74 skills), `pnpm --filter oat-docs test` exit 0, docs index regenerated with `generate-index`. `pnpm build:docs` and the docs-index freshness diff run in the phase verification.

### Task p04-t03: Name freestyle in the root instructions, READMEs and help prose

**Status:** completed
**Commit:** 1dc323d224c5d0fd5ac8a77f7a569a406a76ee97
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1

- Intent: inventory row 32.
- Root `AGENTS.md`: Workflow Options gain option 6, **Freestyle project** (`oat-project-freestyle`), and Import, Provider plan mode and No project renumber to 7, 8 and 9; the Recommendation Heuristic gains the freestyle line and its references renumber to match. No other file copies or cites this numbering (repository search for the option titles and `(#N)` references).
- `README.md`: the tracked-projects bullet names freestyle. `packages/cli/README.md`: the `status --json` entry states the freestyle payload (`project.workflowMode`, null `project.phase`, recommendation `none`, top-level `projectFiles`), and a new `journal check` entry states the freestyle coverage report.
- CLI help prose, opted out (no change): `oat project new --mode` choices come from `WORKFLOW_MODES` and already list `freestyle`; `oat project journal check` names the freestyle report (p03-t02); `oat project promote` ("lite, brief or settled goal") stays true because promotion refuses freestyle; no other command description lists modes (search of `.description(`, `.option(` and `addHelpText(` in `packages/cli/src`).
- Files: `AGENTS.md`, `README.md`, `packages/cli/README.md`.
- Proof: `oxfmt --check` on the three files exit 0; `vitest run src/release/public-package-contract.test.ts src/commands/help-snapshots.test.ts` under an isolated `HOME` (100 passed).

### Task p04-t04: Release: skill and agent bumps, lockstep versions, provider views

**Status:** completed
**Commit:** bb0132ec6aa89b248e676bf33c079f17eec26143
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1

- Intent: inventory row 34. One `metadata.version` bump per canonical skill changed in this phase that `origin/main` does not already exceed, the top-level `version:` bump for both changed agent contracts, the lockstep bump of the five public packages above `origin/main`, and provider views regenerated with the branch build.
- Skill bumps (`metadata.version`, old to new): `oat-docs` 1.0.7 to 1.0.8, `oat-pjm-review-backlog` 1.6.5 to 1.6.6, `oat-project-autonomous` 1.0.27 to 1.0.28, `oat-project-capture` 1.0.7 to 1.0.8, `oat-project-complete` 1.7.20 to 1.7.21, `oat-project-discover` 2.2.15 to 2.2.16, `oat-project-document` 1.8.16 to 1.8.17, `oat-project-implement` 2.3.30 to 2.3.31, `oat-project-new` 1.4.5 to 1.4.6, `oat-project-next` 1.1.9 to 1.1.10, `oat-project-plan` 1.4.23 to 1.4.24, `oat-project-pr-final` 1.6.19 to 1.6.20, `oat-project-pr-progress` 1.3.11 to 1.3.12, `oat-project-progress` 1.4.9 to 1.4.10, `oat-project-reconcile` 1.0.8 to 1.0.9, `oat-project-review-provide` 1.5.20 to 1.5.21, `oat-project-review-provide-remote` 1.1.10 to 1.1.11, `oat-project-review-receive` 1.6.18 to 1.6.19, `oat-project-revise` 1.0.9 to 1.0.10, `oat-project-summary` 1.5.11 to 1.5.12. Not bumped again: `oat-brainstorm` (1.4.0 already in this PR) and `oat-project-freestyle` (new at 1.0.0).
- Agent bumps (top-level `version:`): `oat-reviewer` 1.2.14 to 1.2.15, `oat-phase-implementer` 1.1.10 to 1.1.11.
- Lockstep: `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json` 0.3.53 to 0.3.54 (`origin/main` `a5c28dca2` is 0.3.53); `packages/cli/assets/public-package-versions.json` and `.oat/sync/manifest.json` `oatVersion` follow from `pnpm build` and the sync.
- Provider views: `pnpm build` then `node packages/cli/dist/index.js sync --scope project` regenerated 174 Codex and Cursor agent views for the two agent contracts and added the missing `.claude/skills/oat-project-freestyle` symlink with its manifest entry (the skill landed in p02 without a sync).
- Version pins: the exact-version assertions in `packages/cli/src/validation/skills.test.ts` (38 lines) and `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (2 lines) that read the bumped files now name the new versions; pins for unchanged files that share an old number (`oat-dispatch-subagents` 1.2.14, `oat-project-dispatch-subagents` 1.1.9) are untouched. The self-checking pin test (`keeps every version pinned in this file equal to the file it pins`) listed every stale pin before the update.
- Files: the 20 skills' `SKILL.md`, `.agents/agents/{oat-reviewer.md,oat-phase-implementer.md}`, the five `package.json`, `packages/cli/assets/public-package-versions.json`, `.oat/sync/manifest.json`, `.claude/skills/oat-project-freestyle`, 174 files under `.codex/agents/` and `.cursor/agents/`, the two test files (206 paths).
- Proof: `pnpm build` exit 0 (0 cached); sync exit 0; `vitest run src/release src/commands/init/tools/shared src/validation src/commands/sync bundle-consistency` under an isolated `HOME` exit 0 (41 files, 1487 passed; 20 failed before the pin update, all stale pins); `oxfmt --check` and `pnpm oat:validate-skills` (69 OK) exit 0. After the commit: `git fetch origin main`, `pnpm run check:skill-bumps` exit 0 (24 changed skills and agent roles validated) and `pnpm release:check-versions` exit 0.
- Can-fail: not applicable; the gates are existing checks, and the pin test failed on the stale pins before the update.

### Task p04-t05: Inventory re-check after the main merge

**Status:** completed
**Commit:** c80472951d5bf5c376910b77ca159d9405cb5175
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1

- Intent: re-run the inventory search on the committed tree after `91ba64a6e` merged `origin/main` (`23cb59a6a` #425, `a5c28dca2` #426), disposition every surface it finds, and fix any page that misstates freestyle.
- Search: files under `.agents/skills`, `.agents/agents`, `apps/oat-docs/docs`, `.oat/templates`, root `README.md`/`AGENTS.md` and `packages/*/README.md` matching `oat_workflow_mode`, `WORKFLOW_MODE`, a `brief ... goal` list or `` `goal` `` that do not mention freestyle, at `f6780a738`. 16 files: 14 are the p04-t01 opt-outs (`create-oat-skill`, `oat-brainstorm/references/dogfood-results.md`, `oat-project-brief` SKILL and `brief-contract.md`, `oat-project-complete/tests/prepare-completion-branch.test.mjs`, `oat-project-goal`, `oat-project-implement` `completion-and-closeout.md` and `phase-execution.md`, `oat-project-import-plan`, `oat-project-lite`, `oat-project-plan-writing` (also edited by #425; still loaded only by the lifecycle plan skills), `oat-project-promote-spec-driven`, `oat-project-quick-start`, `oat-wave-execute`). New: `contributing/skills.md` (opted out: it shows how a skill reads `project.workflowMode` and lists no modes) and `workflows/projects/index.md` (handled here: its artifact diagram called `plan.md` and `implementation.md` files every project has). `subagent-orchestration`, the other skill #425/#426 changed, does not read the mode. No other surface found.
- Fix: `workflows/projects/index.md` says the solid boxes are what every lifecycle project has and adds that a freestyle project runs none of the stages and holds `state.md`, `AGENTS.md`, `shape.md`, empty `reviews/` and `pr/`, and the documents `shape.md` lists (`scaffold.ts` `TEMPLATES_BY_MODE.freestyle` and `ensureStructure`). The diagram is unchanged.
- Files: `apps/oat-docs/docs/workflows/projects/index.md`.
- Proof: `pnpm --filter oat-docs docs:validate` exit 0 (0 errors, 776 warnings, the baseline), `pnpm --filter oat-docs check` exit 0, `generate-index` leaves `apps/oat-docs/index.md` unchanged.

### Recovery Event freestyle-projects-p04-recovery-1

- Phase/task: p04 / p04-t01
- Original request: freestyle-projects-p04-implementation-1
- Original commit: 4b0dfd3579c75509c9b3ee7c8ff73f3fb870321a
- Defect class: other
- Discovered by: the p04-t01 to p04-t02 transition check (the `oat-project-autonomous` route-table freestyle row said Stop without a boundary class)
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: 0701b54f7f7fa88a1aa3ef84188e113ab2a8aa55
- Verification: focused `skills.test.ts` blocks (11) and `src/commands/init/tools/shared src/validation` (1304) passed before the commit and again on committed HEAD
- Reason: mechanical wording fix in p04-t01's own skill file and its pinned test. Root validated the unchanged original commit and the three-file recovery diff, and cleared the `completed` marker (`used_attempts: 1` kept).

### Task p04-t06: Fix p04 review findings (M1–M3, L1–L5)

**Status:** completed
**Commit:** c20ef22d5d2d0490ed949ec36522e0d99098962c
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** `p04-code-review-2026-11-22T012937Z.md` (request `freestyle-projects-p04-review-1`, round 1): M1, M2, M3, L1, L2, L3, L4, L5

- Intent: fix the three medium and five low findings of p04 review round 1 (continuation of `freestyle-projects-p04-implementation-1`); every finding is a regression against an accepted requirement (Outcome 7, the out-of-scope promotion, the no-writes freestyle constraint) except L5 (bookkeeping).
- M1: `.oat/templates/project-agents.md` now documents `oat project journal check --at completion --project <project-path>`, and says that `--at` is required, that `completion` and `implement-preflight` give the same report, and that `review` also needs a `--scope`. `packages/cli/README.md` documents `--at <implement-preflight|review|completion>`. No other documented invocation lacked `--at` (repository search). Branch-build probe on a scratch freestyle project: the scaffolded `AGENTS.md` command exits 0 with the coverage report; without `--at` it exits 1; `--at review` with no `--scope` exits 1. New test `documented journal check commands` in `freestyle-contracts.test.ts` scans the template, the root and CLI READMEs, the root `AGENTS.md`, every skill and every docs page, and fails on any invocation without a valid `--at`. Headings unchanged.
- M2: `oat-project-import-plan` gains `### Freestyle Projects` before Step 0. It reads the mode of the active project, or of the existing project `--project` names, and stops before any write: before Step 0's sync-manifest commit, Step 0.5's active pointer and Step 3's `plan.md`. The stop says promotion from freestyle is not supported and points to `oat-project-clear-active` plus `--project <new-name>`. The row 29 opt-out in p04-t01 was wrong: it grouped import-plan with the entry skills that resume only their own mode, but import-plan writes into whichever project is active. Its Step 0.5 falls back to creating a project only when no valid active project exists, and Steps 3 and 5 rewrite `plan.md` and set `oat_workflow_mode: import`. That is the promotion the brief puts out of scope. Row 29's disposition now names this correction. `starting-projects.md` (intro and the import prerequisites) excludes freestyle. Bump 1.4.25 to 1.4.26 (first change in this PR). The named-skill matrix gains a non-executing row for the stop's `oat-project-clear-active` mention.
- M3: the freestyle stop in `oat-project-pr-progress` and `oat-project-pr-final` moved from Steps 2 and 1 to the end of Step 0. It reads the mode with `--project-path`, before Step 0.5 archives review files. In `oat-project-document` it moved from Step 2 to Step 0's validation, before Step 1 can invoke a PJM writer. Each skill keeps one stop. No extra bumps: all three were bumped once in p04-t04.
- L1: `oat-project-summary` stops at the end of Step 0, before Step 1's `implementation.md` check. `oat-project-reconcile` Step 0.5 resolves the mode first (item 1) and stops before the `plan.md` check (items renumbered 2 to 4). `oat-project-document` stops before its `plan.md`/`implementation.md` check (M3 placement). No extra bumps.
- New test `places each freestyle stop before the first step that writes or checks lifecycle artifacts` in `skills.test.ts` covers M2, M3 and L1. For pr-progress, pr-final, document, summary, reconcile and import-plan it asserts the stop text appears once and before each named later marker: the archive step, the artifact checks, the PJM step, the Step 0 preflight, the active-pointer write and Step 3. import-plan was also added to the stop-site list.
- L2: `cli-reference.md` (log entry) and `project-log.md` now say that `append`, `check` and `synthesize` need only `state.md`, and that `rollup` also needs `summary.md` or `--summary-path <path>` (`rollup.ts` summary check).
- L3: `cli-reference.md` scopes the status/list difference to a not-yet-pulled synced project read with `status --project-path` (`status.ts` `resolveUnpulledSyncedProject` returns null when the folder exists), and adds that a pulled project's `status` reads `state.md`. Branch-build probe on a scratch repo:
  - Corrupt `synced/zz1.json` with no folder: `status --project-path .oat/projects/synced/zz1` exits 1 with the parse error and the restore instruction. `list` exits 0 and shows `zz1  synced  —  —  none  restore record from Git`.
  - With the folder present, `status` exits 0 and reads `state.md`.
- L4: the event example in `project-log.md` uses `**Subject:** p03` and the body `Merged PR #12 into the integration branch.`. `--subject` reads "the phase or other id" in `project-log.md`, the template and the CLI help (`append.ts` option text and field comment). The `log/freestyle.test.ts` fixture keeps its own text. The help snapshots pass unchanged.
- L5: of the two copies of the `freestyle-projects-p04-recovery-1` event, the earlier one (between p04-t02 and p04-t03) was removed. Root's validation copy after p04-t05 is kept.
- Files: the six skills' `SKILL.md`, `.oat/templates/project-agents.md`, `packages/cli/README.md`, `packages/cli/src/commands/project/log/append.ts`, `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/workflows/projects/execution/project-log.md`, `apps/oat-docs/docs/workflows/projects/planning/starting-projects.md`, and three test files: `skills.test.ts`, `named-skill-load-contract.test.ts` and `freestyle-contracts.test.ts`. This journal (row 29 and L5).
- Proof, before the commit, each exit 0:
  - The isolated `vitest run src/commands/init/tools/shared src/validation src/commands/help-snapshots.test.ts src/commands/project/log` (42 files, 1689 passed).
  - `pnpm oat:validate-skills`, `pnpm lint`, `pnpm format`, `pnpm check` (5 of 11 cached), `pnpm type-check` (5 of 11 cached).
  - Forced `turbo run build` (0 cached) and forced docs build (0 cached).
  - `docs:validate` (0 errors, 776 warnings, the baseline); `generate-index` with `git diff --exit-code`; `pnpm test:skills` (754 passed).
  - Branch-build `sync --scope project` changed no view and left the manifest unchanged.
- Proof, after the commit, each exit 0: `git fetch origin main`, `pnpm run check:skill-bumps` (25 checks), `pnpm release:check-versions`, `pnpm release:validate`.
- Can-fail checks, each restored and byte-compared afterwards:
  - Removing `--at completion` from the template fails the new journal-check test, naming the template line.
  - Moving the pr-progress stop below Step 0.5 fails the ordering test: "stop before ### Step 0.5".
  - Moving the import-plan stop below Step 0 fails it: "stop before ### Step 0 (Preflight)".

### Task p04-t07: Fix p04 review round 2 findings (M1, L1, L2)

**Status:** completed
**Commit:** 67c451c354ce139fe0f88ede21933e44f57c73cd
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** `p04-code-review-2026-11-22T015923Z.md` (request `freestyle-projects-p04-review-2`, round 2): M1, L1, L2, L3

- Intent: close the prompted-name gaps in the import-plan, pr-progress, pr-final, summary and reconcile freestyle stops, and align the cli-reference `--at` wording. M1 is an incomplete fix of an accepted requirement (`plan.md` out-of-scope promotion; round-1 M2). L1 and L2 are wording promised by p04's own docs.
- M1: `oat-project-import-plan` Step 0.5 now reads the mode of an existing project named by `--project` or given when Step 0.5 asks. A freestyle mode stops before `oat config set activeProject`, so the pointer is not written and Steps 3 and 5 never run.
  - The `### Freestyle Projects` guard says Step 0.5 repeats the check, and its message now depends on what caused the stop. The active project gets the `oat-project-clear-active` advice; a `--project` or asked-for name gets "Pick a new project name for the import".
  - `starting-projects.md` now covers the existing project "you name with `--project` or when it asks".
  - The wording avoids the autonomy prompt-site trigger words (`prompt`, `choose`), so the HEAD prompt-site coverage table needs no new rows.
- L1: in `oat-project-pr-progress`, `oat-project-pr-final`, `oat-project-summary` and `oat-project-reconcile`, the asked-for name no longer goes to `activeProject` inside the ask bullet. Step 0 reads the named project's mode and stops first, then writes the pointer.
  - Reconcile's mode read and stop moved from Step 0.5 item 1 into Step 0. Step 0.5 items are renumbered 1 to 3, and `WORKFLOW_MODE` stays set for the brief and goal branches.
  - The pr-progress and pr-final stops now name the pointer as the first write they precede.
- L2: `cli-reference.md` (journal check entry) now says `implement-preflight` and `completion` give a freestyle project the same result, while `review` needs a `--scope` of phases those documents name and limits the report to it. This matches the template and README.
- L3: no_change_needed, as root directed. The duplicate block's removal was committed inside the reviewed range, so the review-boundary check passes. The removed copy's reservation commit is `7c207c4ab`, which is still in Git history.
- Test: the ordering test `places each freestyle stop before the first step that writes or checks lifecycle artifacts` now covers the pointer write.
  - The first `oat config set activeProject` is a later marker for pr-progress, pr-final, summary and reconcile.
  - import-plan's Step 0.5 stop must sit after `If no valid active project exists:` and before `oat config set activeProject "$TARGET_PROJECT_PATH"`.
- Files: the five skills' `SKILL.md`, `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/workflows/projects/planning/starting-projects.md`, `packages/cli/src/validation/skills.test.ts`. There are no new skill bumps: each skill was already bumped once in this PR.
- Proof before the commit, each exit 0:
  - The isolated `vitest run src/commands/init/tools/shared src/validation` (33 files, 1306 passed).
  - `oat:validate-skills`, `lint`, `format`, `check` (5 of 11 cached) and `type-check` (5 of 11 cached).
  - Forced `turbo run build` (0 cached) and forced docs build (0 cached).
  - `docs:validate` (0 errors, 776 warnings, the baseline), `generate-index` plus `git diff --exit-code`, and `test:skills` (754 passed).
  - The branch-build `sync --scope project` changed no view and left the manifest unchanged.
- Proof after the commit, each exit 0: `git fetch origin main`, `check:skill-bumps` (25 checks), `release:check-versions` and `release:validate`.
- Can-fail, each restored and byte-compared afterwards:
  - Putting the summary pointer write back before the mode read fails "stop before oat config set activeProject".
  - Removing import-plan's Step 0.5 stop sentence fails "import-plan prompted-name stop".

### Task p04-t08: Fix p04 review round 3 finding (L1)

**Status:** completed
**Commit:** 1045632864dd29b948d80a1e3aa85a853381c01f
**Executor:** root
**Source review:** `p04-code-review-2026-11-22T021641Z.md` (request `freestyle-projects-p04-review-3`, round 3): L1

- Intent: one-sentence docs wording fix. `starting-projects.md` said import "stops before writing anything" for a freestyle project; for a name given at Step 0.5's question, Step 0's sync-manifest commit or the user's "Commit now" choice may already have run. It now says import "stops before writing into the project or changing its mode". Root made the fix itself rather than resuming the phase implementer, because it is one sentence in one docs page (see the `Root-inline phase:` line under Orchestration Runs).
- Files: `apps/oat-docs/docs/workflows/projects/planning/starting-projects.md`.
- Proof: `pnpm exec oxfmt --check` on the page, `apps/oat-docs` `pnpm run check` and docs-index freshness each exit 0. No skill or package version changes: docs pages are already covered by this PR's lockstep bump. Not re-reviewed; the m01 milestone review covers it.

- Review round 1: `freestyle-projects-p04-review-1` (oat-reviewer, claude-opus-5-5 high) on `91ba64a6e..2d50c2888`, ledger head `7a98c9b19`: fixes required, 0 critical, 0 high, 3 medium, 5 low (M1 `journal check` documented without `--at`; M2 `oat-project-import-plan` still converted a freestyle project to import mode; M3 freestyle stops after writing steps in pr-progress, pr-final and document; L1 stops behind artifact checks; L2 `rollup` needs a summary; L3 corrupt synced record wording; L4 m02 lane wording; L5 duplicate recovery block). All fixed through the original handle in fix mode as p04-t06. Artifact `reviews/p04-code-review-2026-11-22T012937Z.md` (local-only).
- Review round 2: `freestyle-projects-p04-review-2` (fresh reviewer, same target) on `7a98c9b19..3b5f6f262`: fixes required, 0 critical, 0 high, 1 medium, 3 low (M1 import-plan did not check a project named at Step 0.5's question; L1 four skills wrote a named project to `activeProject` before reading its mode; L2 `cli-reference.md` `--at` wording; L3 the L5 removal deleted recorded journal lines inside the reviewed range, no change needed). M1, L1 and L2 fixed through the original handle as p04-t07. Artifact `reviews/p04-code-review-2026-11-22T015923Z.md` (local-only).
- Review round 3: `freestyle-projects-p04-review-3` (fresh reviewer, same target) on `3b5f6f262..1af188b5c`: pass, 0 critical, 0 high, 0 medium, 1 low (L1 `starting-projects.md` "stops before writing anything" overstated for a name given at the question). Fixed by root as p04-t08. Fix loops: 3 (two implementer fix rounds and one root fix). Artifact `reviews/p04-code-review-2026-11-22T021641Z.md` (local-only).

### Task p04-t09: Fix m01 milestone review findings (H1–H3, M1–M7)

**Status:** completed
**Commit:** 58a1643956a5ac72b11915b40be7364afb3c325b
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** `m01-code-review-2026-11-22T022415Z.md` (m01 milestone-exit review on `a5c28dca2..7c35a902e`): H1, H2, H3, M1, M2, M3, M4, M5, M6, M7 (H4 is new-hardening and goes to the operator; not fixed here)

- Intent: late fixes in p04 for the m01 milestone review. Each finding is reproduced before it is fixed; freestyle branches are additive and existing modes behave as before.
- Files: split and new commands, journal-check rules, log append, state generate, cleanup utils, their tests, and the quick-start, implement, design, spec and review-receive-remote skills plus `oat-project-freestyle/references/reshape.md`.
- Proof: focused suites, skill-prose contract run, the gate list, can-fail checks per fix.
- **H1:** `oat project split` refuses to convert an active detected freestyle parent before any scaffold or removal (`split/run.ts`, read through the parsed `state.md` mode); brief, goal and quick conversion tests pass unchanged.
- **H2:** `oat project new` refuses a same-scope rerun whose existing mode differs from the requested one when either side is freestyle, before any write and even with `--force` (`new/scaffold.ts`); same-mode reruns and the quick to spec-driven control are unchanged. quick-start gains a `### Freestyle Projects` stop before Step 0 for the active project or the named one, plus a Step 0.5 check before the scaffold for a name the user gives.
- **H3:** `oat-project-review-receive-remote` stops for a freestyle project right after Step 0 resolution, before validation, the PR fetch and any write, and points to `oat-review-receive-remote`.
- **M1:** the implement freestyle stop moved into `SKILL.md` Step 0, before the Route Loading Contract loads dispatch preflight, with a pointer-write guard for a named project; `plan-and-resume.md` keeps a one-line note. The entry line budget moved from 251 to 266 with a rationale comment.
- **M2:** `oat-project-design` and `oat-project-spec` stop for a freestyle project before Step 1, before any template copy, write or commit, with the same pointer-write guard.
- **M3:** freestyle journal-check selects records by the section that holds them: a record under a skipped section is not validated, and a record under a validated section is validated whatever phase its label names (`journal-check/rules.ts`).
- **M4:** the stored-entry idempotency scan skips a structural entry's parsed event head (`**Subject:**` and the other head fields) and reads its body; judgment entries, `**Source:**` included, are scanned whole as before (`log/append.ts`).
- **M5:** `reshape.md` mints `RESHAPE_ID` once per reshape decision as `reshape-{YYYYMMDDTHHMMSSZ}-{topic-slug}` and reuses it only to retry that decision's append.
- **M6:** the dashboard reads the parsed YAML mode for freestyle detection in both the active summary and available-project rows, so a quoted or commented `freestyle` value is recognized; lifecycle modes keep the existing reading (`state/generate.ts`, new `parseStateWorkflowMode`/`readStateWorkflowModeFile` in `shared/frontmatter.ts`).
- **M7:** `stateIsFreestyle` reads the parsed frontmatter only; a quick project with a fenced freestyle example keeps its completion repair (`cleanup/project/project.utils.ts`).
- **Not fixed:** H4 (new-hardening, routed to the operator).
- **Version bumps:** `oat-project-review-receive-remote` 1.5.6 to 1.5.7, `oat-project-design` 2.3.12 to 2.3.13, `oat-project-spec` 2.0.6 to 2.0.7, `oat-project-quick-start` 2.3.27 to 2.3.28; `oat-project-implement` (2.3.31) and `oat-project-freestyle` (new, 1.0.0) were already bumped in this PR. Test pins updated.
- **Docs:** `cli-reference.md` (the `project new` refusal), `planning/splitting.md` (the split refusal) and `execution/implementation-execution.md` (where implement stops) describe the new behavior.
- **Can-fail:** each CLI fix and each ordering assertion was neutralized, failed on its own clause, and was restored (details in the phase report).
- Reproduced before fixing:
  - M3 and M4: the new crossed-ID and event-head tests failed before the fix.
  - H2: the branch build in a scratch repo refused `project new fs1 --mode quick --force` over a freestyle `fs1` (exit 1, files unchanged), and the quick to spec-driven control still scaffolded.
  - H1, M1, M2, M5, M6 and M7: confirmed from the cited source lines.
- Proof before the commit, each exit 0:
  - The isolated `vitest run src/commands/init/tools/shared src/validation` (33 files, 1307 passed).
  - Focused split, new, journal-check, log, state and cleanup suites (28 files, 651 passed), rerun after formatting.
  - `oat:validate-skills`, `lint`, `format` and `check`, the last two rerun after formatting three files (cli `check` a cache miss), plus `type-check`.
  - `pnpm test` (cli a cache miss: 453 files, 9841 passed; smoke 165 passed).
  - Forced `turbo run build` (0 cached), `test:skills` (754 passed), `test:smoke` (165 passed) and `build:docs` (docs a cache miss).
  - `generate-index` plus `git diff --exit-code`.
  - The branch-build `sync --scope project` changed no view.
- Proof after the commit, each exit 0:
  - `git fetch origin main`, `check:skill-bumps` (29 checks), `release:check-versions` and `release:validate`.
  - One forced `pnpm test:evidence`: 0 of 12 cached, cli 9841 passed, load average 6.2 to 11.3.
- Can-fail, each restored:
  - M3: selecting records by label fails both crossed-ID tests.
  - M4: scanning the whole structural entry fails both event-head tests, while the judgment `**Source:**` control stays green.
  - M5: the date-only key fails the identity test.
  - Ordering assertions: moving each new stop after its markers, or dropping the quick-start named check or a pointer guard, fails the named clause. This was checked eight times, covering quick-start, implement, design, spec and review-receive-remote.
  - H1, H2, M6 and M7 were checked earlier in this record's work.

### Task p04-t10: Fix m01 review H4 (operator-approved hardening)

**Status:** completed
**Commit:** 6115f42340c2f1828a2c4524e67966ee404d4663
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** `m01-code-review-2026-11-22T022415Z.md` (m01 milestone-exit review on `a5c28dca2..7c35a902e`): H4
**Approval:** operator chose Fix in m01, 2026-11-22. Class new-hardening, operator-approved.

- Intent: in `oat-project-freestyle` Step 1, stop when the resume pointer write fails or the pointer does not name the intended project, and on creation stop when `oat project new` fails and use the path the scaffold reports instead of re-reading the old pointer.
- Files: `.agents/skills/oat-project-freestyle/SKILL.md`, `references/kickoff.md`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts`.
- Proof: executable contract tests against a stub `oat`, a clause-by-clause can-fail check, and the scoped gate list.
- **Resume:** Step 1 stops when `oat config set activeProject` fails, and stops unless `oat config get activeProject` then names the intended project. The two are compared as canonical directories, and an empty read counts as a mismatch. Nothing is read or shaped against the previous project.
- **Create:** Step 1 runs `oat project new ... --json`, stops on a nonzero exit, and takes `PROJECT_PATH` from the reported `projectPath`, never from a re-read of the pointer. It stops when that path has no `state.md`, or when the pointer does not name it.
- **References:** the `kickoff.md` brainstorm hand-off now defers to Step 1's guarded block and never hands off while the pointer names another project. `reshape.md` writes no pointer and runs no scaffold, so it is unchanged.
- **Inventory:** `synced-bookkeeping-sites.json` pairs the resume pointer write with the new `ACTIVE_PATH=` check in the same block.
- **Version:** no bump; `oat-project-freestyle` is new in this PR at 1.0.0.
- **Test:** `freestyle-contracts.test.ts` runs the extracted resume and create blocks against a stub `oat`. It covers a failed write, a stale pointer and a good resume, then a failed scaffold, a stale pointer after a scaffold and a good creation.
- **Can-fail:** four clauses were neutralized one at a time, and each failed its own assertion by its stderr message: ignoring the set exit, skipping the resume pointer check, ignoring the scaffold exit, and re-reading the pointer on creation. The file was then restored and byte-compared.
- Proof before the commit, each exit 0:
  - The isolated `vitest run src/commands/init/tools/shared src/validation` (33 files, 1309 passed).
  - `oat:validate-skills` (69 OK), `lint`, `format`, `check` (cli a cache miss) and `test:skills` (754 passed).
  - The branch-build `sync --scope project` (no changes).
- Proof after the commit, each exit 0: `git fetch origin main`, `check:skill-bumps` (29 checks), `release:check-versions` and `release:validate`.

### Task p04-t11: Fix m01 review round 2 (R2-1..R2-6)

**Status:** completed
**Commit:** d86cda9849c6ba7ae122d8b9a941532ebf5e478c
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** m01 Astra re-review round 2 on `7c35a902e..86048bad1`: R2-1 to R2-6, each verified against source by root. Class: regression of an accepted requirement (R2-5 and R2-6 regress the operator-approved H4 and the accepted M5).

- Intent: make every freestyle check read the mode as `oat project status` does, CRLF and padded values included. Read the implement mode before the synced pull. Resolve a missing quick-start name before Step 0's first commit. Decode the scaffold's `projectPath` as JSON. Make each `RESHAPE_ID` unique per decision.
- Files: `packages/control-plane/src/state/parser.ts` and `index.ts`, and the CLI freestyle checks (shared frontmatter, split, closeout-invariant, complete-state, journal-check, validate-plan) with their tests. Also the implement, quick-start and freestyle skills, `reshape.md`, and `implementation-execution.md`.
- Proof: regression and executable contract tests, a clause-by-clause can-fail check for each fix, and the scoped gate list.
- **R2-1 and R2-2:**
  - control-plane exports `parseStateWorkflowMode` and `isFreestyleState`, the reader `getProjectState` (and so `oat project status`) uses. It reads CRLF-tolerant frontmatter, trims the value and accepts known modes only.
  - The CLI's `parseStateWorkflowMode`/`readStateWorkflowModeFile` now delegate to it, and every freestyle check uses it: split, `project new`, the dashboard, `cleanup project`, closeout-invariant, complete-state, journal-check (index and evaluator) and validate-plan.
  - Lifecycle modes keep their existing reading.
- **R2-1 and R2-2 tests:**
  - A padded `" freestyle "` refuses the split and keeps `plan.md`.
  - A CRLF state.md is refused one step earlier by split's existing state validation (`is missing frontmatter`, unchanged for every mode) and is left untouched too.
  - CRLF tests cover the scaffold (same-mode rerun and mixed-mode refusal), the dashboard (CRLF and padded in the summary and rows, with a CRLF quick control) and `cleanup project` apply (CRLF freestyle state.md byte-identical, no second frontmatter block).
  - A CRLF state with a padded double-quoted value is not freestyle in either reader, because YAML rejects the quoted scalar before `\r`. Status and the checks agree.
- **R2-3:** implement Step 0 reads the mode before the synced pull: from the checkout when it is here, otherwise from the synced ref through an objects-only fetch and `git show <sha>:state.md`. A freestyle project stops before the pull, and the no-checkout case adds the `oat project pull <slug>` instruction. Other modes keep the arrival pull and the pinned arrival sentences. The entry line budget moved from 266 to 278, with a rationale comment.
- **R2-4:** quick-start resolves a missing name and description under Step 0.5's startup-input rules before Step 0, so the freestyle check runs before the manifest-only auto-commit. Step 0.5 reuses that input.
- **R2-5:** the freestyle create block decodes `projectPath` with `node` and `JSON.parse`, keeping the canonical-directory comparison.
- **R2-6:** `reshape.md` mints `RESHAPE_ID` in its own block as `reshape-<UTC second>-{topic-slug}-<8 hex from /dev/urandom>`, minted once. A retry re-runs only the append block.
- **Tests:**
  - New regression tests for each item.
  - An executable implement-arrival test runs Step 0's block against stub `oat`/`git`: freestyle with a checkout here, and freestyle read from the ref, both skip the pull, while quick pulls in both cases.
  - A quoted-path stub-`oat` create case.
  - A reshape mint test with a pinned `date`.
- **Can-fail**, each neutralized, failing on its own clause, then restored and byte-compared:
  - R2-1 and R2-2: the old raw reader behind the shared helper fails the padded split, CRLF scaffold, CRLF/padded dashboard and CRLF cleanup tests.
  - R2-3, three mutations: moving the in-block stop after the pull fails "the freestyle check precedes the pull"; dropping the ref read fails "freestyle read from the ref: no pull"; moving the prose stop after the block fails "stop before oat project pull".
  - R2-4: moving the name paragraph after Step 0 fails "name resolved before the first commit-capable step".
  - R2-5: sed decoding fails the quoted-path case.
  - R2-6: no suffix fails the identity pattern, and a constant suffix fails "second differs from first".
- **Version:** no new bump; implement, quick-start and freestyle are already bumped in this PR, and `check:skill-bumps` passed.
- Proof before the commit, each exit 0:
  - The isolated vitest run over `src/commands/init/tools/shared src/validation` plus split, new, journal-check, closeout-check, complete-state, validate-plan, status, state and cleanup (64 files, 1905 passed).
  - control-plane vitest (325 passed).
  - `type-check` (0 cached), `oat:validate-skills`, `lint`, `format`, `check` (cli and control-plane cache misses) and `test:skills` (754).
  - `pnpm build`: replayed the hashes that had just executed under `type-check`.
  - Docs-index freshness, and the branch-build sync (no changes).
- Proof after the commit, each exit 0: `git fetch origin main`, `check:skill-bumps` (29), `release:check-versions` and `release:validate`.

### Task p04-t12: Fix m01 review round 3 (R3-1..R3-6)

**Status:** completed
**Commit:** 1ee61581c4afda070c67de0e38f5ed2b4ba0b5e8
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** `m01-code-review-2026-11-22T050000Z.md`, m01 Astra re-review round 3 on `86048bad1..749557100`: R3-1 to R3-6, each verified against source by root. Approvals: R3-1 is a pre-existing shared-parser defect that affects every mode, and the operator chose Fix in m01, 2026-11-22. R3-2 is class new-hardening and operator-approved; the operator chose Fix in m01, 2026-11-22.

- Late fix: p04 is the last phase of m01 and no later phase has a `**Base:**`, so this record lands in p04 and advances its `**Head:**`.
- Intent: read a CRLF state whose last field is quoted, in every mode. Make implement arrival stop before the pull on a failed ref lookup or an unreadable ref mode, keep a configured fetch refspec from moving the local ref, and resolve the active project from the repository root. Resolve the quick-start named target at the scope `oat project new` uses. Keep CRLF freestyle state CRLF and freestyle through complete-state, pause and open.
- Files: control-plane `frontmatter.ts` and its tests, CLI shared `frontmatter.ts`, complete-state, open and pause with their tests, the scaffold, cleanup and split tests, the implement and quick-start skills, `skills.test.ts`, and `implementation-execution.md`.
- Proof: regression and executable tests, a can-fail check for each guard, and the scoped gate list plus the full control-plane vitest, `pnpm build:docs` and docs-index freshness.
- **R3-1:**
  - control-plane `FRONTMATTER_PATTERN` consumes `\r?\n` before the closing delimiter, so the last field of a CRLF block no longer keeps a `\r`. LF input matches exactly as before.
  - Tests:
    - control-plane: a CRLF block with a quoted last field, and an unquoted mode followed by a quoted timestamp.
    - A lifecycle (quick) CRLF state with a quoted last field.
    - The scaffold: a quick rerun refuses with `already exists as a freestyle project`, and a same-mode rerun leaves the bytes unchanged.
    - `cleanup project` apply leaves both variants byte-identical, with no second block.
- **R3-2:**
  - Implement Step 0 runs `git ls-remote --exit-code`. Exit 2 means an absent ref, and arrival continues as before.
  - Any other nonzero exit stops before the pull with `cannot look up refs/oat/projects/<slug> on origin`.
  - A ref whose mode cannot be read stops with `cannot read the mode of <slug> from origin`.
- **R3-3:** the ref read fetches with `--no-tags --refmap= --no-write-fetch-head`, so a configured `refs/oat/projects/*` refspec cannot move the local ref.
- **R3-4:** Step 0 changes to the repository root before any check on the repo-relative `activeProject`.
- **R3-5:** the quick-start guard and the Step 0.5 named check both read `NAMED_PATH`.
  - It comes from `oat config get projects.root` and `oat config get projects.defaultScope`, the CLI's effective values, env included, defaulting to synced.
  - It joins them the way `resolveScopeRoot` does: shared is the root itself, local and synced are its siblings.
  - `oat project list` reports only existing projects, so it cannot give the path for a new name.
- **R3-6:**
  - CLI `freestyleStateLineEndings` gives complete-state, pause and open an LF copy of a CRLF freestyle `state.md` and restores CRLF on write. The pause rollback restores the original bytes.
  - The result still reads as freestyle and complete. A CRLF lifecycle state still refuses with exit 1, as before.
  - Audit of the other freestyle-reachable `getFrontmatterBlock` callers, none changed:
    - promote refuses a CRLF state as unreadable and freestyle as not-lite.
    - prune and push read only the PR fields.
    - ref-sync `pullChildren` runs for coordination parents only.
    - The dashboard skips the HiLL read for freestyle.
  - The CRLF split case, which passed on base, is removed. Split's existing state validation refuses a CRLF parent for every mode before the freestyle check and before any write, so that validation is out of scope.
- **Tests:**
  - The implement arrival test is now a describe block with a stub `git` that honours `--exit-code` and `rev-parse`.
  - R3-2 injects exit 128 on the first `ls-remote` only, then covers exit 2 with a record, and an unreadable ref mode.
  - R3-4 runs from `src`.
  - R3-3 uses real git: a bare remote, a configured `+refs/oat/projects/*:refs/oat/projects/*` refspec, and a local ref one commit ahead.
  - R3-5 runs the extracted block against the built CLI in a temporary repository for local and the default synced scope, and checks that `oat project new` scaffolds a local name at `NAMED_PATH`.
  - The entry line budget moved from 278 to 296, with a rationale comment.
- **Can-fail**, each neutralized, failing on its own clause, then restored and byte-compared:
  - R3-1: the old pattern fails both control-plane tests and all four CLI CRLF tests.
  - R3-2: dropping the `LS_STATUS` branch fails on `expected 1`, and dropping `--exit-code` fails the absent-ref continuation.
  - R3-3: dropping `--refmap=` moves the local ref back to the published commit.
  - R3-4: dropping the `cd` fails the subdirectory case.
  - R3-5: a shared-only `NAMED_PATH` resolves `.oat/projects/shared/proj` instead of `local`, and the old Step 0.5 path fails the ordering check.
  - R3-6: a no-op helper fails all three CRLF freestyle tests.
- **Version:** no new bump; implement and quick-start are already bumped in this PR, and the lockstep public versions already cover control-plane.
- Proof before the commit, each exit 0:
  - `pnpm build` (0 cached).
  - The isolated vitest run over `src/commands/init/tools/shared src/validation` plus new, cleanup, complete-state, open, pause, split and state (55 files, 1676 passed).
  - control-plane vitest (14 files, 327 passed).
  - `type-check` (cli and control-plane cache misses), `oat:validate-skills`, `lint`, `test:skills` (754) and `pnpm build:docs` (docs cache miss).
  - `format` and `check` (cli cache miss): the first run found one unformatted test file. It was formatted, its tests were rerun (50 passed), and both passed.
  - Docs-index freshness, and the branch-build sync.
- Proof after the commit, each exit 0: `git fetch origin main`, `check:skill-bumps` (29), `release:check-versions` and `release:validate`.

### Task p04-t13: Fix m01 review round 4 (R4-1, R4-2)

**Status:** completed
**Commit:** cf699ae3850998e5bfa8e2968435f9ad697a1ccf
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** `m01-code-review-2026-11-22T055500Z.md`, m01 Astra re-review round 4 on `749557100..686d424bc`: R4-1 and R4-2, each verified against source by root. Class: regression of the accepted R3-5 fix. R4-3 is deferred by root (see Deferred Findings).

- Late fix: p04 is the last phase of m01 and no later phase has a `**Base:**`, so this record lands in p04 and advances its `**Head:**`.
- Intent: make the quick-start fallback from the active pointer to `NAMED_PATH` executable, and normalize the projects root as `resolveScopeRoot` does before taking its parent. Step 0.5's repeat of the check gets the same treatment.
- Files: `.agents/skills/oat-project-quick-start/SKILL.md` and `packages/cli/src/validation/skills.test.ts`.
- Proof: the published blocks run verbatim against the built CLI, a can-fail check per clause, and the scoped gate list.
- **R4-1:**
  - The pre-Step-0 block now runs `if [ -z "$TARGET_PATH" ] || [ ! -f "$TARGET_PATH/state.md" ]; then TARGET_PATH="$NAMED_PATH"; fi` before the status call.
  - Step 0.5's repeat is a self-contained executable block: it resolves `NAMED_PATH` again and reads the mode only when `$NAMED_PATH/state.md` exists, otherwise `null`.
- **R4-2:** `NAMED_PATH` comes from one `node -e` call that mirrors `resolveScopeRoot` and `canonicalizePath`.
  - A relative root resolves against `git rev-parse --show-toplevel`, and an absolute one is canonicalized.
  - Shared is that root; local and synced are its parent's sibling.
  - The result is repo-relative, as `oat project new` reports it.
  - `records/shared/.` with scope local now gives `records/local/proj`.
- **Test:** the R3-5 test is replaced with one that runs both published blocks verbatim; only `{project-name}` is bound, and a `printf` reads the result.
  - It uses the real built CLI for shared, local, synced (the unset default) and local under `records/shared/.`.
  - Each case has its own repository and origin, and the real `oat project new --mode freestyle` scaffolds there.
  - It runs with an unset and a stale active pointer. Both blocks must return the scaffolded path and `freestyle`.
- **Can-fail**, each neutralized, failing on its own clause, then restored and byte-compared:
  - The comment-only fallback fails on `shared, unset pointer: pre-Step-0 block` with `null`.
  - A fallback that only handles an unset pointer fails on `shared, stale pointer`.
  - Dropping normalization in the pre-Step-0 block fails on `records/shared/local/proj`, and dropping it in the Step 0.5 block fails that block the same way.
- **Version:** no new bump; quick-start is already bumped in this PR.
- Proof before the commit, each exit 0: `pnpm build` (0 cached), the skill-prose vitest over `src/commands/init/tools/shared src/validation` (33 files, 1314 passed), `oat:validate-skills`, `lint`, `format`, `check` (cli cache miss) and `test:skills` (754).
- Proof after the commit, each exit 0: `git fetch origin main`, `check:skill-bumps` (29), `release:check-versions` and `release:validate`.

### Task p04-t14: Fix m01 review round 5 (R5-1)

**Status:** completed
**Commit:** 2b11c7b1cc6b01ed4dec8879c4f493cebb645679
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** `m01-code-review-2026-11-22T063000Z.md`, m01 Astra re-review round 5 on `686d424bc..4a3b2be5c`: R5-1, verified against source by root. Class: regression introduced by the R4-1 fallback.

- Late fix: p04 is the last phase of m01 and no later phase has a `**Base:**`, so this record lands in p04 and advances its `**Head:**`.
- Intent: check the repo-relative `TARGET_PATH` and `NAMED_PATH` from the repository root in both quick-start freestyle blocks, so a run from a subdirectory keeps a valid active freestyle pointer and finds a named freestyle project.
- Files: `.agents/skills/oat-project-quick-start/SKILL.md` and `packages/cli/src/validation/skills.test.ts`.
- Proof: subdirectory cases in the verbatim-block test, a can-fail check per block, and the scoped gate list.
- **R5-1:** both quick-start freestyle blocks start with `cd "$(git rev-parse --show-toplevel)"`, with a refusal message: the pre-Step-0 guard and the Step 0.5 named check. Every `TARGET_PATH`/`NAMED_PATH` test then runs from the repository root, and absolute paths still resolve as before.
- **Test:** for each scope case (shared, local, synced default, and local under `records/shared/.`), the verbatim-block test now also runs from `repo/src`.
  - The pre-Step-0 block, with a valid repo-relative active freestyle pointer and an unused name, must return the active project and `freestyle`.
  - The Step 0.5 block, for the named freestyle project, must return its path and `freestyle`.
- **Can-fail**, each neutralized, failing on its own assertion, then restored and byte-compared:
  - Without the pre-Step-0 `cd`, `shared, subdirectory, active freestyle pointer: pre-Step-0 block` gets `.oat/projects/shared/unused`.
  - Without the Step 0.5 `cd`, `shared, subdirectory, named freestyle project: Step 0.5 block` gets `null`.
- **Version:** no new bump; quick-start is already bumped in this PR.
- Proof before the commit, each exit 0: `pnpm build` (0 cached), the skill-prose vitest (33 files, 1314 passed), `oat:validate-skills`, `lint`, `format`, `check` (cli cache miss) and `test:skills` (754).
- Proof after the commit, each exit 0: `git fetch origin main`, `check:skill-bumps` (29), `release:check-versions` and `release:validate`.

### Task p04-t15: (review) Keep synced brainstorm publication behind an explicit push agreement

**Status:** completed
**Commit:** e6c5b19ff31477de4ffb0e4e33a038957da580e2
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T134403Z.md (I-1)

Intent: `.agents/skills/oat-brainstorm/SKILL.md:841-853` enters the persistence block when the agreement allows a commit or a push, and the synced branch always runs `oat project push`, so a commit-only agreement publishes `refs/oat/projects/<slug>`. Distinguish permission to commit from permission to publish; with publication deferred, commit locally in the nested worktree and leave the remote ref unchanged. Class: accepted-requirement (plan.md Outcome 6, p02 Intent, Constraint: `shape.md` controls commits and pushes after creation).
Files: `.agents/skills/oat-brainstorm/SKILL.md`, its contract test.
Proof: a published-block test against a scratch origin where a commit-only agreement leaves the remote ref unchanged and a push agreement advances it; can-fail per clause.

- **I-1:** in 9j, committing and publishing are now separate permissions.
  - The block defaults `REFERENCE_PUBLISH` to `yes`, so every other mode and a freestyle agreement that publishes now still run `oat project push` unchanged.
  - A freestyle agreement that commits but does not publish now sets `REFERENCE_PUBLISH=no`. A synced project then commits only the reference file in its own checkout through the existing `oat --cwd "$ACTIVE_PROJECT" internal commit-paths`, takes `REFERENCE_COMMIT_SHA` from that checkout, and says the commit is not yet published.
  - `refs/oat/projects/<slug>` stays unchanged. A scratch check confirmed that a later `oat project pull` reports `up-to-date` and keeps the local commit, and that `oat project push` publishes it.
  - Shared and local scope keep their branch commit path; a local project still never commits. The inventory anchor for the push line is unchanged.
- **Test:** in `freestyle-contracts.test.ts`, the published 9j block runs verbatim, with the skill's own `parse_synced_push_receipt`, against a real synced freestyle project scaffolded by the built CLI and a bare scratch origin.
  - Commit-only: the commit lands in the project checkout, the tree is clean and the origin ref is unchanged.
  - Push agreement, `REFERENCE_PUBLISH` unset: the origin ref advances to the new commit.
  - Neither case makes a parent branch commit.
- **Can-fail**, each neutralized, failing on its own assertion, then restored and byte-compared:
  - Ignoring `REFERENCE_PUBLISH` in the synced branch fails `commit-only agreement: origin ref unchanged`.
  - Defaulting it to `no` fails `push agreement: origin ref advanced`.
- **Version:** no new bump; oat-brainstorm is already bumped in this PR.
- Proof before the commit, each exit 0: the skill-prose vitest over `src/commands/init/tools/shared src/validation` (33 files, 1315 passed), `oat:validate-skills`, and `oxfmt --check` and `oxlint` on the changed files.

### Task p04-t16: (review) Resolve the repository root in the freestyle Create and Resume blocks

**Status:** completed
**Commit:** 4295bb3c1e6fb194790eda2a736134825a28a6ea
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T134403Z.md (I-2)

Intent: `.agents/skills/oat-project-freestyle/SKILL.md:146` runs `oat project new` in the caller's directory (`project/new/index.ts:161` scaffolds at `context.cwd`), so a subdirectory run creates `<subdir>/.oat/...`; the resume check at `:120` compares two failed `cd` results as equal and continues. Establish the repository root before both Step 1 blocks and require each directory resolution to succeed before comparing. Class: accepted-requirement (plan.md Outcomes 1 and 6, p02 Intent, operator-approved target verification at p04-t10).
Files: `.agents/skills/oat-project-freestyle/SKILL.md`, its contract test.
Proof: verbatim-block tests from a real subdirectory with the built CLI for Create and Resume; can-fail per block.
**Narrowed (2026-11-22, operator):** Resume half only. Require each directory in the Step 1 Resume pointer check (~:120, added in p04-t10) to resolve to a non-empty path before comparing, and stop otherwise; class regression (the check passes on the failure it exists to catch). The Create half (scaffold relative to the current directory) is deferred; see Deferred Findings. Proof: the verbatim Resume block stops when neither path resolves (for example from a subdirectory) and still passes at the repository root; can-fail.

- **I-2 (Resume half, as narrowed):** the Step 1 Resume pointer check now resolves `ACTIVE_DIR` and `PROJECT_DIR` first. It stops with the existing message when the pointer is empty, either directory is empty, or the two differ, so two failed `cd` lookups no longer compare equal. The Create block is unchanged; its half is deferred.
- **Test:** in `freestyle-contracts.test.ts`, the verbatim Resume block runs against the stub `oat` in three cases.
  - From `src`, a subdirectory where neither repo-relative path resolves, it stops with exit 1 and the message.
  - With the project missing on both sides, it stops too.
  - At the repository root it still continues.
- **Can-fail:** restoring the old comparison fails `subdirectory: stop message`; the file was then restored and byte-compared. Either empty-directory check alone also catches two failed lookups, and when only one side resolves the inequality stops the run, so the pair is symmetric rather than load-bearing per half.
- **Version:** no new bump; oat-project-freestyle is new in this PR.
- Proof before the commit, each exit 0: the skill-prose vitest (33 files, 1316 passed), `oat:validate-skills`, and `oxfmt --check` and `oxlint` on the changed files.

### Task p04-t17: (review) Resolve the active project from the repository root in brainstorm detection

**Status:** cancelled
**Cancelled:** 2026-11-22, operator decision after root re-assessment: the detection check at `oat-brainstorm/SKILL.md:238` predates this branch (`417eb2e97`) and fails from a subdirectory in every mode, so it is not a freestyle defect. Moved to Deferred Findings and the follow-up issue.
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T134403Z.md (I-3)

Intent: `.agents/skills/oat-brainstorm/SKILL.md:238` tests the repo-relative `activeProject` against the current directory, so from a subdirectory `ACTIVE_PROJECT_VALID=false` and the freestyle handoff is skipped. Resolve against the repository root and keep the resolved path for writing the reference. Class: accepted-requirement (plan.md Outcome 6, p02 brainstorm detour).
Files: `.agents/skills/oat-brainstorm/SKILL.md`, its contract test.
Proof: the detection block selects the same project from the root and from a subdirectory; can-fail.

### Task p04-t18: (review) Show the pull instruction for an active unpulled synced project

**Status:** completed
**Commit:** b997ca31cf823a72522dbfc5d22d6cf776e5d68c
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T134403Z.md (I-4)

Intent: `packages/cli/src/commands/project/status.ts:312` returns the generic missing-project error before the unmaterialized synced-record classifier, so default `oat project status` reports `missing` where `--project-path` returns `oat project pull`. Try the classifier when the active path is missing; keep the error for genuinely missing projects. Class: accepted-requirement (plan.md Outcome 1).
Files: `packages/cli/src/commands/project/status.ts`, `status.test.ts`.
Proof: default and explicit status agree on a fresh clone with a valid record; a missing project without a record still errors; can-fail.

- **I-4:** when default `oat project status` finds the active project `missing` and the pointer has a path, it first tries `resolveUnpulledSyncedProject`, the classifier `--project-path` already uses, resolved against the repository root. A synced project recorded on this branch but not pulled now gets the same `oat project pull` row in JSON and text. A missing project with no record still returns `status: missing` with exit 1. `cli-reference.md` names the default status alongside `--project-path`.
- **Tests:** two real-repository cases in `status.test.ts`, each with the shared synced fixture's fresh clone and a real `.oat/config.local.json` pointer.
  - With a valid record, default `--json` status equals the explicit `--project-path` payload (`checkout: absent`, `oat project pull`), exits 0, and the text output carries `Hint: oat project pull synced-absent`.
  - An active project with no record keeps the `missing` error and exit 1.
- **Can-fail**, each neutralized, failing on its own test, then restored and byte-compared:
  - Disabling the classifier branch fails the record test with exit 1.
  - Letting that branch return without the error fails the no-record test, which gets no payload.
- Proof before the commit, each exit 0:
  - vitest over `status.test.ts` and `list.integration.test.ts` (2 files, 37 passed).
  - cli `tsc --noEmit`, the cli `lint` script, and `oxfmt --check` on the changed files.
  - markdownlint on `cli-reference.md`.

### Task p04-t19: (review) Read freestyle lifecycle in the dashboard from the parsed state

**Status:** cancelled
**Cancelled:** 2026-11-22, operator decision after root re-assessment: the LF-only lifecycle reader at `state/generate.ts:242` predates this branch (`11f41ae88`) for every mode, and a CRLF `state.md` is an unobserved failure mode; severity re-rated Low. Moved to Deferred Findings and the follow-up issue.
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T134403Z.md (I-5)

Intent: `packages/cli/src/commands/state/generate.ts:242` reads `oat_lifecycle` (and pause fields) with the LF-only reader while `:259` detects freestyle with the CRLF-aware parser, so a CRLF paused freestyle project loses its lifecycle row and `oat project open` next step. Read them from the same parsed state. Class: accepted-requirement (plan.md Outcome 1; accepted p01 L2 deviation).
Files: `packages/cli/src/commands/state/generate.ts`, `generate.test.ts`.
Proof: LF and CRLF paused freestyle render the same lifecycle row and next step; can-fail.

### Task p04-t20: (review) Limit the kickoff local-scope rule to project records

**Status:** completed
**Commit:** 903dfc12e1a8dd50e4d80ef2b4fcc5c91315478c
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T134403Z.md (I-6)

Intent: `.agents/skills/oat-project-freestyle/references/kickoff.md:184` says a local project "commits nothing, whatever this section says about code". Say that local-scope project records stay uncommitted and the agreed shape governs code commits. Class: accepted-requirement (plan.md Decisions "Records branch" and "Single writer", Outcome 7).
Files: `.agents/skills/oat-project-freestyle/references/kickoff.md` (and any pinned sentence test).
Proof: skill-prose vitest over `src/commands/init/tools/shared src/validation`.

- **I-6:** kickoff topic 6 now says that in a local project the project records stay uncommitted whatever the section says, and that the agreed shape still governs code commits. No test pinned the old sentence, and no doc repeats it.
- **Version:** no new bump; oat-project-freestyle is new in this PR.
- Proof before the commit, each exit 0: the skill-prose vitest (33 files, 1316 passed), `oat:validate-skills`, and `oxfmt` on the file.

### Task p04-t21: Fix m01 review round 7 (R7-1)

**Status:** completed
**Commit:** ed563906e00e09d62843a81cebc316108b42e5f2
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** `m01-code-review-2026-11-22T150000Z.md`, m01 exit re-review round 7 on `c14f3517e..7e8da0da6`: R7-1 (Medium), verified against the code by root. Class: regression introduced by the p04-t15 (I-1) fix.

- Late fix: p04 is the last phase of m01 and no later phase has a `**Base:**`, so this record lands in p04 and advances its `**Head:**`.
- **R7-1:** the 9j synced commit-only branch keyed only on `REFERENCE_PUBLISH`, so a `no` left in the shell by a freestyle run made a later synced quick run commit without publishing.
  - The push branch now runs for every synced project except `ACTIVE_PROJECT_MODE` `freestyle` with `REFERENCE_PUBLISH` `no`. Its push lines are byte-identical; only the condition changed.
  - The prose now says that only a freestyle project reads `REFERENCE_PUBLISH`, and that every other synced project publishes whatever it holds.
- **Test:** the 9j contract test in `freestyle-contracts.test.ts` now passes `ACTIVE_PROJECT_MODE` with every run and adds a synced quick project, scaffolded by the built CLI, run with `REFERENCE_PUBLISH=no`. Its origin ref advances to the pushed commit. The freestyle commit-only and push cases still pass.
- **Can-fail:** dropping the mode condition fails `synced quick with a stale REFERENCE_PUBLISH=no: origin ref advanced`, because the ref did not advance. The skill was then restored and byte-compared.
- **Version:** no new bump; oat-brainstorm is already bumped in this PR, and `check:skill-bumps` passed.
- Proof before the commit, each exit 0: `pnpm install --frozen-lockfile`, the isolated skill-prose vitest over `src/commands/init/tools/shared src/validation` (33 files, 1316 passed), `oat:validate-skills`, `lint` and `format`.
- Commit: the first attempt was rejected by commitlint (`header-max-length`, 102 characters). The retry under the same identity, with a shorter header, landed `ed563906e`.
- Proof after the commit, each exit 0: `git fetch origin main`, `check:skill-bumps` (29), `release:check-versions` and `release:validate`.

### Task p04-t22: (review) Read the mode before the synced pull in review-provide, complete and autonomous

**Status:** completed
**Commit:** fa8507b2639a96d23917abbdc13cbc1870c468c1
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T152500Z.md (J-1)

Intent: `oat-project-review-provide`, `oat-project-complete` and `oat-project-autonomous` run `oat project pull` in Step 0 before their freestyle stop, so a synced freestyle project with a remote ref and no discovery record gets an `adopt synced project` commit (review-provide) or a materialized checkout (complete, autonomous). Read the mode before the mutating arrival, following `oat-project-implement` Step 0 (checkout first, then the synced ref; a failed lookup stops), and give the `oat project pull <slug>` instruction for an unpulled freestyle project. Other modes keep the arrival pull unchanged. Class: accepted-requirement (plan.md Constraint: no automatic commits after creation; Outcome 1). Operator: fix in m01 with no further review rounds.
Files: the three skills, their contract tests.
Proof: executable Step 0 tests per skill (freestyle here, freestyle from the ref, quick control), can-fail per skill.

- **J-1:** each of the three skills now has a `**Freestyle projects.**` paragraph and a read-only mode-read block immediately before its existing synced arrival.
  - review-provide places it before its Step 0 pull, complete before the Step 1 synced archive entry (the executor that pulls), and autonomous before its Step 0 pull.
  - The block is the `oat-project-implement` Step 0 mode read, verbatim through its freestyle stop: repository-root `cd`, scope, the checkout's `state.md`, then the synced ref through `git ls-remote --exit-code`, an objects-only `--refmap=` fetch and `git show <sha>:state.md`. A failed lookup or an unreadable ref mode stops.
  - A freestyle project stops there, before the pull, with each skill's existing stop: review-provide's Step 1.6 routing to `oat-review-provide`, complete's end-of-step `complete-state`/`archive` message, and autonomous's Step 1 product-judgment boundary. With no checkout here, the stop adds "Run `oat project pull <slug>` to bring it here."
  - Every existing arrival block is byte-identical, so other modes keep their pull and the pinned arrival sentences; each skill diff is additions only. The inventory anchors and line budgets are unchanged and still pass.
  - `autonomy.md` and `reviews/index.md` now say that the stop comes before any synced pull.
- **Tests (`skills.test.ts`):** a new describe runs, for each skill, the mode-read block and then, unless it stopped, the unchanged arrival block, against stub `oat`, `git` (honouring `--exit-code`) and, for complete, `node` standing in for the synced archive-entry executor.
  - Cases: freestyle checkout here stops with no pull; freestyle read from the ref stops with no pull; a quick control with no checkout arrives; a quick checkout here arrives; a failed `ls-remote` (exit 128) stops with no pull.
  - The paragraph carries the pull instruction, and a byte-identity check confirms each arrival block still holds its original pull or entry line and no mode read.
  - The freestyle-stop ordering test adds the three skills: each stop comes before its pull or entry and its later steps.
- **Can-fail**, six mutations, each failing on its own behavioural clause, then restored and byte-compared:
  - Retargeting the freestyle comparison fails `<skill>: freestyle checkout here stops` in all three skills.
  - Dropping the synced-ref branch fails `<skill>: freestyle read from the ref: no pull` in all three skills.
  - A first mutation that deleted the stop lines tripped the block-shape assertion instead. The shape check was relaxed to `WORKFLOW_MODE=null` and the behavioural mutations above were run.
- **Version:** no new bump; review-provide (1.5.21), complete (1.7.21) and autonomous (1.0.28) are already above main in this PR.
- Proof before the commit, each exit 0: the skill-prose vitest over `src/commands/init/tools/shared src/validation` (33 files, 1320 passed), `oat:validate-skills`, `oxlint` and `oxfmt --check` on the changed files, and markdownlint on the two docs.

### Task p04-t23: (review) Give the pull instruction in the dashboard for an unpulled synced project

**Status:** completed
**Commit:** df598d4e2b6aa30099ed7e4012b7e74a26dda52a
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T152500Z.md (J-2 case A)

Intent: `state/generate.ts` (~:445) recommends `oat-project-open` and reports the directory missing for an active synced project not yet pulled, while `oat project status` gives `oat project pull <slug>`. Use the same unpulled-project resolution `status` uses (p04-t18) so the dashboard shows only the storage instruction. Class: accepted-requirement for freestyle (Outcome 1: the dashboard recommends nothing; an unpulled synced project shows only the storage instruction); the resolution is mode-agnostic, as in `status`. Case B (archived from another checkout) is deferred. Operator: fix A in m01 with no further review rounds.
Files: `packages/cli/src/commands/state/generate.ts`, its tests, docs if they describe the dashboard row.
Proof: dashboard tests for an unpulled synced project (freestyle and quick), a genuinely missing project unchanged, can-fail.

- **J-2 case A:** `resolveUnpulledSyncedProject` moved out of `status.ts` into `packages/cli/src/commands/project/unpulled-synced.ts`, with optional `env` and `gitRunner`. `status` and the dashboard call the same function.
  - When the active project's directory is missing and no terminal route applies, `generateStateDashboard` tries it. An active synced project recorded on this branch but not pulled here now shows `checkout absent` and the next step `oat project pull <slug>`, with status's reason, in every mode.
  - A project with no record keeps `directory missing` and `oat-project-open`.
  - If the classifier cannot read a record, the dashboard keeps the missing-directory row, so the commands that regenerate the dashboard do not start failing.
  - Case B, at the terminal-route block, is unchanged. `cli-reference.md` says the dashboard gives the same next step.
- **Tests (`generate.test.ts`):** a fresh-clone case for freestyle and for quick. A second clone scaffolds and publishes the synced project with the built CLI and pushes its record, and the first clone pulls the branch.
  - Default `oat project status` returns `oat project pull`; the dashboard's next step is `oat project pull proj` with the same reason and status `checkout absent`; the dashboard has no `oat-project-open` or `directory missing`.
  - An active synced project with no record and no ref keeps `directory missing` and `oat-project-open`.
- **Can-fail**, each neutralized, failing on its own test, then restored and byte-compared:
  - Disabling the dashboard branch fails both fresh-clone cases (`oat-project-open`).
  - Claiming the pull step without a record fails the no-record case (`oat project pull never-recorded`).
- Proof before the commit, each exit 0:
  - The cli build.
  - vitest over `src/commands/state`, project open, pause, new, cleanup, split, `status.test.ts` and `list.integration.test.ts` (21 files, 352 passed).
  - cli `tsc --noEmit`, the cli `lint` script, `oxfmt --check`, and markdownlint on `cli-reference.md`.

### Task p04-t24: (review) Add the synced push step to the freestyle closeout

**Status:** completed
**Commit:** 53618bd9b384f8252f6337cc599ff0945d18d945
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T152500Z.md (J-3)

Intent: the freestyle closeout guide (`closeout-skills.md:17`) and `oat-project-complete`'s freestyle stop (~:213) say `complete-state` then `archive`; for a synced project `archive` refuses until `oat project push` publishes the completed state. Add the synced-only push step between them, subject to the publication agreement in `shape.md`. Class: accepted-requirement (Outcome 7).
Files: the guide, the complete skill, any pinned sentence test.
Proof: skill-prose vitest; a branch-build scratch run of complete-state, push, archive on a synced freestyle project.

- **J-3:** the freestyle stop in `oat-project-complete` and the freestyle paragraph in `closeout-skills.md` now read: `oat project complete-state <project-path>` marks it complete; for a synced project, `oat project push <project-path>` then publishes the completed state, subject to the publication agreement in `shape.md`; and `oat project archive <project-path>` archives it. The guide adds that archive refuses a synced project with unpushed changes. No other page or skill repeats the freestyle complete-state and archive sequence (grep over `apps/oat-docs/docs` and `.agents/skills`); the `cli-reference.md` entries describe each command on its own.
- **Test (`skills.test.ts`):** a new case pins, at both sites, that the passage names `complete-state`, then the synced-only `push` with the `shape.md` publication clause, then `archive`.
- **Can-fail**, each neutralized, failing on its own clause, then restored:
  - Restoring the pre-fix complete skill fails at `push after complete-state` (push index -1).
  - Restoring the pre-fix guide fails at the same clause for `closeout-skills.md`.
  - Swapping push and archive in the skill fails at `archive after push`.
- **Scratch run** with the branch build (`packages/cli/dist/index.js`) on a synced freestyle project `demo` in a throwaway repository and bare remote: `complete-state` exit 0; `archive` before the push exit 1 ("Synced project demo is dirty; run oat project push demo before archiving."); `push` exit 0; `archive` exit 0, which moved the ref to `refs/oat/completed/demo`.
- Proof before the commit, each exit 0: skill-prose vitest (`src/commands/init/tools/shared src/validation`, 33 files, 1320 passed, before the new case; the new case passed on its own), `oat:validate-skills` (69 skills), `oxfmt`, markdownlint on the guide, and `oxlint` on the test file.

### Task p04-t25: (review) Name the freestyle exception in the import checklist line

**Status:** completed
**Commit:** cc7404be1dd7dad58f08e3cbf282ab98eb5301a2
**Executor:** phase-implementer:freestyle-projects-p04-implementation-1
**Source review:** reviews/archived/m01-integrated-review-2026-11-22T152500Z.md (J-4)

Intent: `starting-projects.md:103` says `oat-project-import-plan` writes into any active project whatever its mode; since `c20ef22d5` it stops for a freestyle project. Add the exception. Class: regression (the import guard made the line inaccurate).
Files: `apps/oat-docs/docs/workflows/projects/planning/starting-projects.md`.
Proof: `build:docs`, docs index freshness.

- **J-4:** the entry-skill list in `starting-projects.md` now says `oat-project-import-plan` writes into any active project except a freestyle one, and that with a freestyle project active, or named with `--project`, it stops before any write because OAT has no promotion from freestyle. This matches the skill's `### Freestyle Projects` stop from `c20ef22d5`. No other page or test repeats the old "whatever its mode" claim (grep over `apps/oat-docs/docs`, `.agents`, `packages`, `tools` and `scripts`).
- Proof before the commit, each exit 0: `oxfmt`, markdownlint on the page, `pnpm build:docs` (6 tasks, 0 cached, `oat-docs:build` cache miss, executed), and the docs index freshness check (`generate-index`, then `git diff --exit-code -- apps/oat-docs/index.md`, exit 0).
- No test: the change is one docs sentence with no behaviour behind it beyond the skill stop, whose `TARGET_MODE` freestyle stop `skills.test.ts` already pins.

---

## Phase p05: Linked projects

**Status:** completed
**Base:** 517d5e56699ad1dcba90239ecc8e3787fda3311d
**Executor:** phase-implementer:freestyle-projects-p05-implementation-1
**Head:** 352186e87a0aa1f8485484e31febafd2a995696b

Phase verification at the head (clean tree, isolated `HOME`): `pnpm check` exit 0 (cli `check` cache miss, executed); `pnpm type-check` exit 0 (cli cache miss); `pnpm test` exit 0 under `scripts/with-isolated-home.sh` (cli `test` cache miss, executed: 455 files, 9920 tests); `pnpm build` exit 0 (cache hit, inputs unchanged since the 351b80aba build); `pnpm lint` exit 0. Not run, owned by p08: `check:skill-bumps`, `release:*`, `build:docs`.

Renamed in plan.md at the m02 re-alignment: Orchestrator branch and linked projects.

Worktree: the project branch `feat/freestyle-projects-m02` in this checkout; committing owner: the phase implementer. Parallelism assessment: no declared parallel group (`oat_plan_parallel_groups: []`); root fan-out fails the independence test because the orchestrator-branch and linked-project slices share the freestyle state template, the project `AGENTS.md` template, `oat project status` and the kickoff reference; so one phase implementer (rung 3). The inline exception does not apply: p05 adds new commands and state fields.

### Task p05-t01: Record the orchestrator branch, claim it with orchestrator set, and show it in status

**Status:** completed
**Commit:** be0debe724e02cfd13cfbd6f29471036cedc1498
**Executor:** phase-implementer:freestyle-projects-p05-implementation-1

- Intent: Outcome 4 and the Orchestrator branch decision. `oat_orchestrator_branch` in the freestyle state template, set to the current branch by `oat project new` (empty for a linked child, empty off a branch); `oat project orchestrator set` (`--branch`, `--replace`) claiming an empty or absent value; the shared guard the record-writing commands use; the `status` line comparing the recorded branch with the current one.
- Files: `.oat/templates/state-freestyle.md`, `packages/cli/src/commands/project/orchestrator/*`, `packages/cli/src/commands/project/resolve-named-project.ts`, `packages/cli/src/commands/project/new/{scaffold.ts,index.ts}`, `packages/cli/src/commands/project/{status.ts,status.test.ts,index.ts}` and their tests.
- Proof: `pnpm --filter @open-agent-toolkit/cli build` (refreshes the bundled `state-freestyle.md`); `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project src/commands/help-snapshots.test.ts src/commands/index.test.ts src/commands/commands.integration.test.ts src/commands/template` (72 files, 2111 passed); CLI `type-check` and `check` exit 0. `orchestrator/orchestrator.test.ts` runs the real program in scratch git repositories at the bundle tier (isolated `HOME`): `new` records `main` for shared, local and synced (read back from `refs/oat/projects/<slug>` in the origin) and leaves a detached-HEAD project unclaimed (`''`); `orchestrator set` claims an unclaimed project and one whose `state.md` is the m01 shape with no field, refuses a different branch without `--replace` (state unchanged) and replaces with it, is a no-op on the same branch, records `--branch`, refuses a detached HEAD without it, defaults to the active project, and claims a synced project in its nested worktree without moving its published ref; `status` prints the recorded and current branch for shared and synced. `status.test.ts` covers the on-branch, lane, detached and unclaimed lines and JSON `orchestrator`. Existing-mode controls: a quick scaffold writes no field and `new --json` no `orchestratorBranch`; `orchestrator set` refuses a quick project with its state unchanged; quick `status` prints no branch lines and no `orchestrator` field. The m01 freestyle minimal-state pin in `scaffold.test.ts` gains `oat_orchestrator_branch: ''`; the `project` help snapshot gains `orchestrator`.
- Can-fail: replacing the `--replace` refusal with `if (false)` failed "refuses to replace a different recorded branch without --replace" on its exit code (expected 1, received 0); restored.
- Decisions: the field is read with the YAML scalar parser, so `''`, `null` and an absent field all read as unclaimed; values are written double-quoted (the template keeps oxfmt's `''`). `orchestrator set` writes `state.md` and bumps `oat_project_state_updated`, and commits or pushes nothing (no automatic commits). A project argument is a name or a path, as `oat project open` reads it (see p05-t02 for the Known Unknown). On a detached HEAD, `new` leaves the project unclaimed, `status` prints `Current branch: detached HEAD` and says the checkout is not the orchestrator, and `orchestrator set` needs `--branch`.

### Task p05-t02: Linked projects: new --link-to, linked add and ack, and open links in status

**Status:** completed
**Commit:** 1e4fe1c31f844b0cac4bd4ae6af04a1d3c6d4957
**Executor:** phase-implementer:freestyle-projects-p05-implementation-1

- Intent: Outcome 3 and the Linked projects decision. `oat project new <child> --mode freestyle --link-to <parent> --purpose <text>` scaffolds the child with `oat_linked_from: <parent>` and an empty orchestrator branch and opens a row (child name, path, scope, purpose, date) in the parent's own `linked-projects.md`; `oat project linked add <child> --purpose <text> [--project <parent>]` opens a row for an existing freestyle project, writing only the parent's file; `oat project linked ack <child> [--project <parent>]` moves the row to `## Closed` with the acknowledgment date, then attempts a structural log entry (`oat-project-linked · <child>`, `--time`, source project `<child>`); `status` on a freestyle parent prints one `Open linked project:` line per open row (JSON `linkedProjects.open`). All three writes are guarded by the parent's orchestrator branch (p05-t01's `assertOrchestratorCheckout`) and commit or push nothing for the parent.
- Files: `packages/cli/src/commands/project/linked/{ledger.ts,link.ts,index.ts,linked.test.ts}`, `packages/cli/src/commands/project/{index.ts,new/index.ts,status.ts,status.test.ts}`, `packages/cli/src/commands/help-snapshots.test.ts`.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project src/commands/help-snapshots.test.ts src/commands/index.test.ts src/commands/commands.integration.test.ts src/commands/template` (73 files, 2136 passed); `pnpm check`, CLI `type-check` exit 0. `linked/linked.test.ts` (25 tests, real program, scratch repositories with an origin, bundle tier under an isolated `HOME`): with the parent in shared, local and synced scope, `new --link-to` writes the child's `oat_linked_from` and `oat_orchestrator_branch: ''`, the parent's open row, and commits only the child's own scaffold (the shared parent's `linked-projects.md` stays untracked; the synced parent's published ref does not move); `status` flags the row until `linked ack`, which clears it; `linked add` writes only the parent row (the child's `state.md` is byte-identical) and refuses a second open row; with a log present `linked ack` appends a structural entry parsed as `producer: oat-project-linked`, `ref` and `sourceProject` the child, with a time; with `--no-project-log` at creation and `workflow.projectLog: false`, `linked ack` reports `skipped`, closes the row and leaves `project-log.md` absent. Guard, on shared and synced parents: off the recorded branch, on a detached HEAD and while unclaimed, `new --link-to`, `linked add` and `linked ack` each exit 1 with the reason, create no child and leave the ledger byte-identical; on the recorded branch all three exit 0. A malformed ledger is reported by `status` (`Linked projects: unreadable (...)`) and refused by `linked add`, never shown as no links; an unpulled synced parent is refused with the pull instruction. Existing-mode controls: `--link-to` with `--mode quick` is refused before any write; a quick child (`linked add`) and a quick parent (`new --link-to`) are refused; a plain quick `new` writes no ledger; `--purpose` without `--link-to` is refused; quick `status` prints no link lines (the p05-t01 control covers the same code path).
- Can-fail (the record-writing guard, one clause at a time): neutralizing the off-branch refusal failed the off-branch and detached-HEAD tests for both shared and synced parents on their exit code (expected 1, received 0); neutralizing the unclaimed refusal failed the unclaimed tests for both scopes on the refusal reason (the off-branch message ran instead of the unclaimed one). Each was restored.
- Known Unknown settled (name or path; cross-scope resolution): `--link-to`, `linked add`, `linked ack` and `--project` take a name or a path, read as `oat project open` reads its argument: absolute or containing `/` is a path, anything else a name looked up in the shared, local and synced scope roots of this checkout; a name in more than one scope is refused as ambiguous (pass a path); a synced project known only by its pointer is refused with `oat project pull <name>`, never pulled implicitly. What is recorded: the child's `oat_linked_from` holds the parent's name, and the parent's row holds the child's name, its path and scope at link time; `linked ack` matches the row by name (a path argument is reduced to its folder name), so it needs no copy of the child in this checkout, and a parent or child that later migrates between scopes keeps its name. Reasons: names are unique across scopes at creation (`assertCrossScopeSlugAvailable`), paths change on migration, and every other project command already accepts a name.
- Decisions: the ledger is CLI-written Markdown (`# Linked projects: <parent>`, `## Open` and `## Closed` tables), parsed by cell content so oxfmt re-padding is harmless; a purpose is one line with no `|`. A failed log append after the row closes is a warning with exit 0 (the brief says the entry is attempted); a `skipped` append is reported as the log being disabled. `--purpose` is required with `--link-to` and `linked add` because the row carries it. Output paths are repository-relative, like `new`'s other paths. Record note: this record was written at close; its scope is the second unit named at the phase start.

### Task p05-t03: AGENTS.md orchestrator-branch and linked-projects sections, kickoff claim and adoption, and the AGENTS.md refresh

**Status:** completed
**Commit:** 84bc243453a109c486cb3efcd8cf20e0aa9a7f53
**Executor:** phase-implementer:freestyle-projects-p05-implementation-1

- Intent: the AGENTS.md and skill half of p05. The project `AGENTS.md` template gains `## Orchestrator branch` (the lane self-test verbatim from the brief, `orchestrator set` with `--branch`/`--replace`, the guarded commands, and the same-branch limit) and `## Linked projects` (create with `new --link-to`/`linked add` and save the row by the parent's scope; the child is run by its own orchestrator session that claims it first and never writes the parent; check open links after every merge and on resume, then `linked ack`); `## Project files`, `## Single writer` (adds `linked-projects.md`, the claim, and "each project writes only its own records") and `## Records commands` follow. The kickoff reference gains a Before Shaping section: step 1 claims an unclaimed project (or stops a lane), step 2 opens a linked child with adopt-or-new (find the parent, pull a synced parent first, copy its `shape.md` as a snapshot, reset `## Goal`, rewrite `## Documents` as kinds, add an `**Adopted from:**` line naming the parent and its `Last shaped:` date, continue at the goal, then ask once whether adopted sections should differ). `SKILL.md` Step 2 claims first, then refreshes an older `AGENTS.md`, then routes a linked child to step 2.
- Files: `.oat/templates/project-agents.md`, `.agents/skills/oat-project-freestyle/{SKILL.md,references/kickoff.md}`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts`. No `metadata.version` bump: p08 owns bumps for m02.
- Proof: `pnpm --filter @open-agent-toolkit/cli build`; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/project/new src/commands/project/linked src/commands/project/orchestrator src/commands/template` (38 files, 1505 passed, bundle-tier scaffold tests included); `pnpm oat:validate-skills` (69 OK), `pnpm exec oxlint .agents/skills`, `pnpm check` exit 0. Contract tests pin the seven AGENTS.md headings in order, the lane self-test verbatim, the linked-projects and single-writer lines, the kickoff Before Shaping claim and adoption wording, and that SKILL.md's claim precedes its refresh; the refresh block is executed against a stub `oat template resolve` that copies the repository template: an AGENTS.md lacking the two new sections becomes byte-identical to what `scaffoldProject` writes, a current one is left untouched with no output, and a template that does not resolve stops with exit 1 and the file unchanged.
- Can-fail: forcing the refresh condition false (`if false; then`) failed the replacement test on its output (`expected '' to contain '## Orchestrator branch'`); restored.
- Known Unknown settled (how an existing project's AGENTS.md picks up later sections): the `oat-project-freestyle` skill re-renders it, keyed on headings. On every resume, after the claim, it resolves the current `project-agents` template with `oat template resolve` (repository, user, then bundle tier, as the scaffold does); when the project's `AGENTS.md` lacks any `##` heading the template has, it replaces the file whole, rendered as `oat project new` renders it (template frontmatter dropped, `{Project Name}` filled). Whole replacement, not section merging, because the file is OAT-owned and holds no project answers (those live in `shape.md`); no CLI command, because the skill already runs on every resume and the guarded commands' refusal names `oat project orchestrator set` for an orchestrator that has not resumed through the skill. The refreshed file is saved like the other records, by the commit agreement.
- Decision: the claim comes before any write, the refresh included, so a lane session stops before touching the project. Correction to p05-t02's record note: no units were named at the phase start; that record was written at close.

### Task p05-t04: Keep the parent active when new --link-to creates a child

**Status:** completed
**Commit:** 351b80abad00e89e284f31d8bee1d85e97160f80
**Executor:** phase-implementer:freestyle-projects-p05-implementation-1

- Intent: the scratch run (p05-t05) showed `oat project new <child> --link-to <parent>` repointing the parent's checkout at the child (`new` sets the active project by default), so the parent's orchestrator's next default-target command (`oat project log append`, `linked ack`, `orchestrator set`) would act on the child. The Linked projects decision says the parent creates the child but does not run it, and the Single writer decision keeps each project's records to its own orchestrator; with `--link-to`, `new` now leaves the active project unchanged.
- Files: `packages/cli/src/commands/project/new/index.ts`, `packages/cli/src/commands/project/linked/linked.test.ts`.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/linked src/commands/project/new` (150 passed); CLI `check` exit 0. The creation test in each parent scope asserts `.oat/config.local.json` still names the parent after `new --link-to`.
- Can-fail: restoring `setActive: options.setActive` failed the creation test in all three scopes on the pointer (`expected '.oat/projects/shared/child' to be '.oat/projects/shared/parent'`); restored.
- Classification: recorded as a new execution record inside the open phase, not as a post-commit recovery against p05-t02, because it changes the behavior of the new `--link-to` option (outside the recovery predicate's no-public-behavior-change rule) while staying within the Linked projects decision; no recovery attempt is consumed. The edit was made before this classification was written down.

### Task p05-t05: Parent/child scratch pair with the branch build

**Status:** no-change
**Executor:** phase-implementer:freestyle-projects-p05-implementation-1
**Handle:** freestyle-projects-p05-implementation-1 (this session)

- Intent: the scratch-pair exit evidence: a parent and a linked child in a throwaway repository under `$TMPDIR`, the child claimed by its own orchestrator session in a linked worktree on its own branch, its shaping opening with adopt-or-new and adopting the parent's shape, that worktree's guarded commands refusing for the parent, and the parent's `status` flagging the row until `linked ack`; plus the AGENTS.md refresh and claim on a project carrying m01-rendered files.
- Files: none in the repository; transcript in `references/analysis/p05-scratch-transcript.md` (gitignored).
- Proof: the transcript, branch build `node packages/cli/dist/index.js` built from `351b80abad00e89e284f31d8bee1d85e97160f80`.
- Setup: a throwaway repository under `$TMPDIR/oat-p05-scratch` with an isolated `HOME` and global Git config, `oat` on `PATH` as a wrapper for the branch build. Sessions were played by the implementer from the skill and template text, not by a fresh-context agent; user answers were scripted.
- Parent: `parent` created on `main` with the project log, shaped and committed; `oat_orchestrator_branch: "main"`.
- Creation: `oat project new child --mode freestyle --scope shared --link-to parent --purpose "Migrate the CSV importer"` wrote `oat_linked_from: "parent"` and `oat_orchestrator_branch: ""`, kept `parent` active (p05-t04), committed only the child's three scaffold files, and left the parent's `linked-projects.md` uncommitted; `status` showed `Open linked project: child (shared, .oat/projects/shared/child): ...`.
- Child session: in a linked worktree on `child-orch` branched from `main`, the SKILL.md Resume block made `child` active; `status` showed it unclaimed; the scripted user confirmed and `oat project orchestrator set` claimed `child-orch` (`this checkout is the orchestrator`); the refresh block was silent and left the current AGENTS.md byte-identical. Kickoff Before Shaping step 2 asked adopt or new; on adopt the parent's `shape.md` was copied, Goal reset, Documents rewritten as kinds, Last shaped set, and the `**Adopted from:** parent, last shaped 2026-11-20; adopted sections not yet confirmed.` line added; shaping resumed at Goal, then one confirmation changed only the Reviews effort and ended the line `adopted sections confirmed 2026-11-23.` (diff in the transcript).
- Guard in the child's worktree: `linked ack child --project parent`, `linked add child --project parent` and `new grandchild --link-to parent` each exit 1 (`this checkout is on branch child-orch, but project parent's orchestrator branch is main`); the parent's ledger hash is unchanged and no grandchild folder exists; the parent's `status` there says `this checkout is a lane` and still lists the open row.
- Acknowledge: the child's records committed on `child-orch` and merged into `main`; the parent's `status` on `main` still flagged the row; after reading the child's records, `oat project linked ack child` (active project) closed the row (`Acknowledged 2026-11-23`), appended `### 2026-11-23 · structural · oat-project-linked · child` with `**Source project:** child`, and `status` listed no open link; a second ack exits 1 (`has no open link`).
- Existing project: `legacy` with the m01 AGENTS.md (commit `1e0b473c6`) and no branch field read as unclaimed, and `linked add --project legacy` exit 1 as unclaimed with no ledger written; after `orchestrator set` claimed it, the SKILL.md refresh block printed the two missing headings and replaced AGENTS.md byte-identical to a fresh scaffold; a second run was silent; `oat project check-state` exit 0.

Known Unknown settled (how a shared child scaffolded on the parent's orchestrator branch reaches its own orchestrator's branch, and what `status` says on a detached HEAD; correcting line added at the p05 review receive, L1): a shared child's scaffold, and a synced child's pointer, are committed on the parent's orchestrator branch, so the child's orchestrator starts its own branch from there in its own worktree (pulling first for a synced child) and then claims it with `oat project orchestrator set` (`.oat/templates/project-agents.md` "Running one" bullet; p05-t05 scratch run section 3, `git worktree add -b child-orch ../child-wt main`). On a detached HEAD, `new` leaves the project unclaimed, `status` prints `Current branch: detached HEAD` and says the checkout is not the orchestrator, and `orchestrator set` needs `--branch` (p05-t01).

### Review Received: p05

- Review `freestyle-projects-p05-review-1` (Claude Opus 5.5 high, `oat-reviewer-claude-claude-opus-5-5-high`) on `517d5e566..352186e87`, artifact `reviews/archived/p05-code-review-2026-11-23T024113Z.md` (local-only): 0 critical, 0 high, 0 medium, 1 low; reconnaissance not attempted; the reviewer re-ran the focused p05 suites (236 passed) and a branch-build check of `new --link-to`, `linked ack` on and off branch and the open-link flag.
- L1 (Low): the Known Unknown on how a shared child reaches its own orchestrator's branch was answered in the shipped `project-agents.md` "Running one" bullet and the p05-t05 scratch run but not recorded as settled. Disposition: fixed at receive with an appended journal line (`15a4e1035`; its setext-heading formatting slip repaired at `37cebd3d0`, no recorded line rewritten).
- **Finding classes:** L1 bookkeeping (provenance wording: records existing evidence in the journal).
- Outcome: passed, bookkeeping-only fixes applied at receive; no fix round, no re-review. Root check after the phase report: `pnpm test:skills` exit 0 (the phase edited the `oat-project-freestyle` SKILL.md Step 2 block; m01 learning `freestyle-projects-learning-m01-02`).

---

## Phase p06: Records-branch warning

**Status:** pending

Retired at the m02 re-alignment (2026-11-22): the ancestry warning was dropped and the orchestrator branch moved into p05 (plan.md Decisions: Records branch, Orchestrator branch, m02 re-alignment). The ID is not reused; this stub stays because the journal is append-only.

---

## Phase p07: Lane ledger and reports

**Status:** completed
**Base:** df8268ad2bd2493a5230694bd7910b98dbe03bb0
**Executor:** phase-implementer:freestyle-projects-p07-implementation-1
**Head:** b65ebd8e3f12437e07b627a098b8e1c07c47a1d8

Phase verification at the head (clean tree but the gitignored `references/`, isolated `HOME`): `pnpm check` exit 0 (cli `check` and `build` cache miss, executed); `pnpm type-check` exit 0 (cli cache miss); `pnpm test` exit 0 under `scripts/with-isolated-home.sh` (cli `test` cache miss, executed: 457 files, 9967 tests; control-plane 327, docs packages 85); `pnpm build` exit 0 (cache hit replaying the `d58dc67` build `pnpm check` executed at this head, inputs unchanged); `pnpm lint` exit 0. No `.agents/skills` file changed, so `pnpm test:skills` was not required. Not run, owned by p08: `check:skill-bumps`, `release:*`, `build:docs`. Correction to p07-t05: the final scratch run's transcript shows sha256 `4f2b0576…` for both the filed report and the returned file; `91756e3d…` was an earlier run of the same script, whose report embedded different SHAs.

Worktree: the project branch `feat/freestyle-projects-m02` in this checkout; committing owner: the phase implementer. Parallelism assessment: no declared parallel group; p07 cannot run beside p10 because both edit the project `AGENTS.md` template and `lane-report.md`. Root fan-out fails the independence test because the ledger command, report filing, head-ahead check and `status` lane line share `lanes.md` handling, `oat project status` and the `AGENTS.md` template. So one phase implementer (rung 3). The inline exception does not apply: p07 adds a new command, a new template and new status output.

### Task p07-t01: The lane ledger and oat project lane set

**Status:** completed
**Commit:** cf9c095adff5d10e3d8bc26cb71ca2eb42cf8b42
**Executor:** phase-implementer:freestyle-projects-p07-implementation-1

- Intent: Outcome 5 and the Lane ledger, Dispatch, IDs, Lane reports (filing half) and Single writer decisions. `lanes.md` with `## Active` (one block per open lane, rewritten in place), `## Closed` (one line per merged or superseded lane) and `## History` (append-only, one line per update with an update ID), written only by `oat project lane set` with an atomic write; create, update, dispatch, steer, no-report, close and supersede; `--report <file>` filing the returned text verbatim into `lane-reports/<lane>-<dispatch>.md` with the pointer set in the same update; the orchestrator-branch guard.
- Files: `packages/cli/src/commands/project/lane/{ledger.ts,update.ts,set.ts,index.ts,ledger.test.ts,lane.test.ts}`, `packages/cli/src/commands/project/index.ts`, `packages/cli/src/commands/help-snapshots.test.ts` (the `project` help gains `lane`).
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/lane` (2 files, 30 passed) and `src/commands/help-snapshots.test.ts src/commands/index.test.ts src/commands/commands.integration.test.ts` (113 passed); CLI `check` and `type-check` exit 0. `ledger.test.ts` (pure, each case round-tripped through the rendered file): create (d01 open, state dispatched, one History line listing the fields), update in place with one History line per update, steer as a History line on the open dispatch with the block unchanged and refused once the dispatch closed, `--no-report` then `--dispatch` numbering d02 per lane and refused while d01 is open, report pointer `lane-reports/l01-d01.md` closing the dispatch, blocked with `waiting_on` and its clearing on unblock, merged moving the lane to Closed as one line and refusing later updates, superseded with `replaced_by` (and both refusals), History append-only across closures (u001..u006), field clearing, lane-ID format, and a malformed ledger refused. Atomic write: a temporary file that is half-written then fails, and a complete one whose rename fails, each leave the previous `lanes.md` byte-identical and no temporary file. `lane.test.ts` runs the real program in scratch repositories (isolated `HOME`): creation with every handle field, placement `own-worktree` for a linked worktree and `shared-worktree` for `--worktree .` with normalized `--paths`, nothing committed (HEAD unchanged, `lanes.md` untracked); a report with trailing spaces, no final newline, a tab and non-ASCII filed byte-identical and the pointer resolving to it; a clashing different file at the next report path refused with the file and the ledger unchanged, the same bytes accepted on retry; steer and no-report History lines through the CLI. Guard, shared and synced: off the recorded branch, on a detached HEAD and while unclaimed, `lane set` exits 1 with the reason and the ledger byte-identical (or absent). Existing-mode control: a quick project is refused before any write.
- Can-fail: skipping the `assertOrchestratorCheckout` call in `setLane` failed all six guard tests (off-branch, detached, unclaimed; shared and synced) on their exit code (expected 1, received 0); writing the ledger straight to `lanes.md` instead of temporary-then-rename failed the atomic test (the previous ledger was overwritten with the partial content). Each was restored.
- Known Unknown settled (the parseable block format inside `lanes.md`): CLI-written Markdown under a `# Lanes: <project>` title and a fixed preamble. `## Active` holds one `### lNN` block per open lane of `- <field>: <value>` lines in a fixed order (`state`, `dispatch`, `next`, `owner`, `waiting_on`, `blocker`, `replaced_by`, `task`, `thread`, `worktree`, `placement`, `branch`, `base`, `head`, `review_round`, `report`, `wake`, `provider`, `model`, `effort`, `observed_model`, `paths`, `last_observed`); an unset field is not written, and an unknown or repeated field is refused. `dispatch: dNN open|reported|no-report` carries the lane's current dispatch. `## Closed` and `## History` hold `- <id> · <text>` lines (`- l03 · merged · <time> · branch … · head … · report …`; `- u007 · <time> · l01 d02 · <changes>`), with `_None._` for an empty section. Values are one line; reading undoes Markdown backslash escapes, because the repository's pre-commit oxfmt rewrites a committed ledger's `*` as `\*` (captured real output in `ledger.test.ts`). Reasons: a Markdown file a fresh session reads in one pass; one block per lane rewritten in place keeps Active current; field lines survive formatter re-padding where a table would not hold optional fields.
- Decisions: IDs `l01` (lanes), `d01` per lane (dispatches), `u001` (updates). Creation opens d01 in state `dispatched`; `--report` and `--no-report` imply `turn-finished` and `--dispatch` implies `dispatched` unless `--state` is given; leaving `blocked` clears `waiting_on` and `blocker`; `--waiting-on` is one of `owner`, `lane`, `linked-project`, `external`. `last_observed` is the time of each update. `head` is the head the lane's last report delivered, set by the orchestrator with `--head` when it files the report. `placement` is derived from `--worktree` when it is set: `shared-worktree` when it is this checkout (which the guard makes the orchestrator's), otherwise `own-worktree`. A report is copied before the ledger is written, so a failed write never leaves a pointer to a missing file; a report is never edited, so a different existing file is refused and the same bytes accepted. Nothing is committed or pushed.

### Task p07-t02: The bundled lane-report.md template

**Status:** completed
**Commit:** dec97ac02d284b8617b9a30e2bf5b9235bd6c322
**Executor:** phase-implementer:freestyle-projects-p07-implementation-1

- Intent: the Lane reports decision's report shape as the bundled `lane-report.md` template (bundle inputs and the workflows pack), resolved with `oat template resolve lane-report --output <path>` and embedded in each dispatch brief.
- Files: `.oat/templates/lane-report.md`, `packages/cli/scripts/bundle-inputs.mjs`, `packages/cli/src/commands/tools/shared/pack-manifest.ts`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts`.
- Proof: `pnpm --filter @open-agent-toolkit/cli build` (bundles the template); `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/commands/template src/commands/tools src/validation` (73 files, 1898 passed) and `src/commands/init src/commands/project/new src/release` (59 files, 1494 passed; the bundle-consistency and pack-manifest checks cover the new entry); CLI `check` exit 0. The new `freestyle lane report shape (p07)` tests pin the ten sections in the decision's order with Summary split into This round and Lane so far, the tested-SHA line and the final-message instruction; resolve `lane-report` under an isolated `HOME` with no repository tier (tier `bundle`, no path, the `--output` copy byte-identical to the repository template), build a dispatch brief that embeds it after the dispatch facts and assert the brief carries every section in order; and show a user-tier `~/.oat/templates/lane-report.md` overriding the bundle.
- Decisions: the template has no frontmatter, unlike the document templates, because `--output` copies raw and the shape is embedded whole in a brief (a repository or user override is embedded the same way). It tells the lane it writes no project records and that every turn end, partial ones included, gets a report; the lane-notes instruction is p10's. Placeholders use `{...}` like the other templates, and the prose names no heading literally (the template heading-literal guard).

### Task p07-t03: The head-ahead check and the status lane lines

**Status:** completed
**Commit:** f99dcb511887483a60f9aa6ca350b71201c9d133
**Executor:** phase-implementer:freestyle-projects-p07-implementation-1

- Intent: the Head-ahead check decision (for a lane in its own worktree, `lane set` and `status` flag a branch head past the last report's head) and the Orchestrator branch decision's lane naming (`status` names the lane when `lanes.md` lists this checkout's branch).
- Files: `packages/cli/src/commands/project/lane/{head.ts,set.ts,index.ts,lane.test.ts}`, `packages/cli/src/commands/project/orchestrator/branch.ts`, `packages/cli/src/commands/project/{status.ts,status.test.ts}`.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project src/commands/help-snapshots.test.ts src/commands/commands.integration.test.ts` (73 files, 2146 passed); CLI `check` and `type-check` exit 0. `lane.test.ts` (real program, real git, a linked worktree on `lane/l01` with one commit reported through `--report --head`): no flag while the branch head is the reported head (JSON `headCheck.status: current`); two further commits make `lane set` print `Warning: Lane head ahead of its report: l01 (branch lane/l01) is 2 commits past the last report's head <sha>; do not merge unreported commits unreviewed.` and `status` print the same line (JSON `lanes.headAhead` with both heads and `commits: 2`), and filing the next report at the new head clears it; a branch reset and recommitted past the reported head is flagged as `has moved off the last report's head <sha> (1 commit not in it)`; a `shared-worktree` lane is never checked (`headCheck: null`, no flag after the orchestrator commits on its branch), and a lane whose branch is not in this clone is `unknown` with the reason and no flag. `status` run in the lane's worktree prints `Current branch: lane/l04 (not the orchestrator branch: this checkout is lane l04 in lanes.md)`, and in the orchestrator's checkout still `this checkout is the orchestrator`. `status.test.ts` (mocked dependencies): the lane-naming line and JSON `lanes`, both flag wordings, `Lanes: unreadable (...)` for a ledger that cannot be read, and the existing-mode control (a quick project prints no lane line and no `lanes` field); the p05 orchestrator-line tests pass unchanged (`a lane` when the ledger lists no lane on the branch).
- Can-fail: making `isHeadFlagged` return false failed the ahead and moved tests on their expected text (`expected '' to contain 'Warning: Lane head ahead of its repor…'`, and the `status` output lacking the line); dropping the `shared-worktree` exclusion from `headCheckApplies` failed the orchestrator-checkout test (`expected { lane: 'l02', … } to be null`). Each was restored.
- Decisions: the branch is read as `refs/heads/<branch>` in this clone, because the check is for lanes in their own worktree, which share the clone; a remote delegate's branch is not compared (reported `unknown`, never flagged), and `status` prints only flagged lanes. A head that differs from the reported one is flagged whether it descends from it (`ahead`) or not (`moved`), since both mean unreported commits. Only active lanes are named or checked. `status` reads the `lanes.md` of the project folder it reads: in a lane worktree of a shared project that copy is the one committed when the lane branched, so it lists the lane only if the ledger was saved before the lane's branch was cut; `status --project-path <the orchestrator checkout's project folder>` reads the current ledger from any worktree of the clone (used in the test and the scratch run).

### Task p07-t04: AGENTS.md dispatch, lane reports and lane placement sections

**Status:** completed
**Commit:** 0eb3ad2fed1ad90323b38597b02cf45b1cb5d949
**Executor:** phase-implementer:freestyle-projects-p07-implementation-1

- Intent: the project `AGENTS.md` sections for dispatch, reports and lane placement (Lanes and linked projects, Dispatch, Lane reports, Lane placement and Head-ahead check decisions), and the ledger and reports in its project files, single-writer list, guarded commands and records commands.
- Files: `.oat/templates/project-agents.md`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts`. No skill edit: the `oat-project-freestyle` refresh step is keyed on the template's `##` headings, so an existing project's `AGENTS.md` lacking the three new sections is replaced whole on its next resume (p05-t03's mechanism, whose tests render from the current template).
- Proof: `pnpm --filter @open-agent-toolkit/cli build`; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/project/new src/commands/template src/commands/project/linked src/commands/project/orchestrator src/commands/commands.integration.test.ts` (39 files, 1545 passed, the bundle-tier scaffold tests included); CLI `check` and `type-check` exit 0. Contract tests: the pinned heading list gains Dispatch, Lane reports and Lane placement between Linked projects and Records commands; the Dispatch section names every state in `LANE_STATES` and the `WAITING_ON_KINDS` the code accepts; every `--flag` the three sections name exists on the real `lane set` command; the Dispatch section defines a dispatch, the steer, wake and no-report cases, the brief contents with `oat template resolve lane-report --output <path>` embedded whole, and the resume rule (check each open dispatch's handle and the forge and record it with `lane set` before any redispatch); Lane reports files before acting, never edits, keys log entries by dispatch ID and forbids merging unreported commits unreviewed; Lane placement supports both placements and prescribes neither, with the derived `shared-worktree`/`own-worktree` and the shared-checkout rules; Single writer, Orchestrator branch and Project files name `lanes.md`, `lane-reports/` and `lane set`.
- Decisions: the section names are Dispatch, Lane reports and Lane placement, after Linked projects so the lane self-test and the lane definition read in order. Dispatch carries the ledger commands, the brief contents and the reconcile-on-resume rule; Records commands gains `lane set` and says that `status` from a lane worktree reads the current ledger through `--project-path` at the orchestrator checkout's project folder (p07-t03 decision).

### Task p07-t05: Multi-lane scratch run with the branch build

**Status:** no-change
**Executor:** phase-implementer:freestyle-projects-p07-implementation-1
**Handle:** freestyle-projects-p07-implementation-1 (this session)

- Intent: the scratch-run exit evidence: a multi-lane freestyle project with one shared-worktree lane that ends with one unfinished dispatch, a fresh session given only the project files and forge access identifying that lane's handle, owner and next action before any redispatch; one completed dispatch's returned text filed with `lane set --report` and its pointer resolving to a verbatim copy; `status` run from a listed lane branch naming the lane; a dispatch brief built under an isolated `HOME` from the bundled `lane-report.md`.
- Files: none in the repository; transcript in `references/analysis/p07-scratch-transcript.md` (gitignored).
- Proof: the transcript; branch build `node packages/cli/dist/index.js` built from `ee05a1bb7027779493f3327fa372c338b3775b1f` (code at `0eb3ad2fed1ad90323b38597b02cf45b1cb5d949`).
- Setup: a throwaway repository under `$TMPDIR/oat-p07-scratch` with an isolated `HOME` and global Git config and `oat` on `PATH` as a wrapper for the branch build. Forge access is simulated by a local bare repository `forge.git` (pushed branches stand in for PRs); `orch` is its clone and the orchestrator's checkout on `main`; lanes `lane-l01` and `lane-l03` are linked worktrees of that clone. The orchestrator and the delegates were played by the implementer from the scaffolded `AGENTS.md`, with scripted delegate final messages.
- Project: `oat project new demo --mode freestyle --scope shared --with-project-log` on `main`; the scaffolded `AGENTS.md` carries the ten sections including Dispatch, Lane reports and Lane placement.
- Dispatch brief: `oat template resolve lane-report --output <briefs>/l01-d01-report.md --json` reported tier `bundle`, path `null` (no repository or user template); the brief composed by the Dispatch section (lane and dispatch IDs, the `AGENTS.md` and `shape.md` paths, worktree and branch, no project records, the shape embedded whole) carries all ten report sections and both Summary subsections.
- Lane l01 (own worktree): created with task, thread, worktree, branch, base, next, owner, provider, model, effort and wake (`placement: own-worktree`); the lane committed and pushed `lane/l01`; its returned text, saved verbatim, was filed with `lane set l01 --report <file> --head <sha> --state work-settled`: the pointer `lane-reports/l01-d01.md` resolves to a copy `cmp` reports identical (both sha256 `91756e3d…` on the first run; same check on the final run), and the accepted log entry was appended keyed by the dispatch ID (`--ref l01-d01`). After one unreported commit on `lane/l01`, `status` on `main` printed `Lane head ahead of its report: l01 (branch lane/l01) is 1 commit past the last report's head <sha>; do not merge unreported commits unreviewed.` and `lane set` repeated it as a warning.
- Lane l02 (shared worktree): a subagent in the orchestrator's checkout (`--worktree .`, `placement: shared-worktree`, `paths: docs/guide.md`), state running, one steer recorded as History `u005`; left with `dispatch: d01 open` and an uncommitted edit in `docs/guide.md`, the one unfinished dispatch.
- Lane l03 (own worktree): recorded and saved on `main` before its worktree was cut, then closed d01 with a partial blocked report (`--state blocked --waiting-on external`, owner `user`).
- Lane naming: `status --project-path .oat/projects/shared/demo` in `lane-l03` printed `Current branch: lane/l03 (not the orchestrator branch: this checkout is lane l03 in lanes.md)` (its copy was committed with the l03 entry); in `lane-l01`, `status --project-path <orch>/.oat/projects/shared/demo` printed `... this checkout is lane l01 in lanes.md`, while its own copy, branched before the ledger existed, says `this checkout is a lane` (p07-t03 decision). From `lane-l01`, `lane set l01 --project .oat/projects/shared/demo --state running` exit 1: `Cannot update lane l01: this checkout is on branch lane/l01, but project demo's orchestrator branch is main.`
- Fresh session: request `freestyle-projects-p07-t05-fresh-session-1`, one fresh-context read-only `general-purpose` subagent (Agent model `sonnet`, provider-default effort; bounded intelligent recon at the economy route, the root's suggested class), accepted and completed. Its brief held only the project folder path, the forge path and the question (which lane has the unfinished dispatch; its handle, owner and next action; what it would do before any redispatch), read-only. It answered l02 d01, handle `subagent-a1b2`, owner `orchestrator`, next action "wait for the docs subagent to finish its turn, then file its report", and before any redispatch: check whether the handle is alive, read the `docs/guide.md` diff against the task and the steer, record the finding with `lane set` (`--no-report` if interrupted), redispatch only if incomplete; it also flagged l01's unreported forge commit. Answer verbatim in the transcript; `lanes.md` (sha256 `2ec1b57e…`), the `orch` HEAD and working tree, and the forge refs were unchanged afterwards. It read the orchestrator checkout's `git status` beyond the project folder to see the uncommitted edit.
- Known Unknown settled (whether existing `oat project dispatch record` IDs can serve as dispatch IDs): no. `oat project dispatch record` validates a launcher's complete dispatch record and OAT event (provider envelope, role, model and effort selectors, launch status) and writes nothing; its `request_id` is a free-form, project-wide string chosen by a lifecycle launcher (for example `freestyle-projects-p07-implementation-1`), not allocated per lane, and a freestyle orchestrator's launches (a native subagent, a T3 delegate, a remote run) need not pass through it. The ledger therefore allocates its own dispatch IDs, numbered per lane (`d01`, `d02`) by `lane set` and naming the report files (`lane-reports/l07-d02.md`), as the IDs decision says; when an orchestrator does validate a launch with `dispatch record`, it records that request ID as the lane's `--task` handle (this run used free-form handles such as `run-7f3a`).

### Task p07-t06: Fix p07 review findings (M1, L1)

**Status:** completed
**Commit:** 3a3103ba76e8436e6d51c1080c1a9690f3a6122e
**Executor:** root (root-inline review fix; see `## Orchestration Runs`)

- Intent: p07 review `freestyle-projects-p07-review-1` M1 (accepted-requirement, Ledger vs project log decision: story events in the project log point to a ledger update ID) and L1 (accepted-requirement, Lane reports decision: the tested SHA must equal the delivered head).
- Files: `.oat/templates/project-agents.md` (Lane reports: structural entries for merges and other story events take the `lane set` update ID as `--ref`; other ledger updates get no log entry), `.oat/templates/lane-report.md` (drops ", or say why not"), `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts` (pins both).
- Proof: `pnpm build` exit 0; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/project` exit 0 (104 files, 3382 tests); `pnpm check` exit 0; `pnpm lint` exit 0.

Late fix p07-t06 (p07 review round 1: M1 and L1, accepted requirements) at `3a3103ba7`, recorded at `b65ebd8e3`. No later phase has a `**Base:**`, so the head advanced under the late-fix rule; the reviewed head stays `c4fafff2a`.

### Review Received: p07

- Review `freestyle-projects-p07-review-1` (Claude Opus 5.5 high, `oat-reviewer-claude-claude-opus-5-5-high`) on `df8268ad2..c4fafff2a`, artifact `reviews/archived/p07-code-review-2026-11-23T032928Z.md` (local-only): 0 critical, 0 high, 1 medium, 3 low; reconnaissance not attempted. The reviewer re-ran the focused p07 suites (119 passed) and a branch-build check of the off-branch refusal, verbatim filing, the head-ahead flag, the status lane line and the formatter round trip. It accepted the two items the implementer flagged (the Markdown unescape on read; the lane worktree reading the ledger as of the branch cut, documented).
- M1 (Medium): the project `AGENTS.md` never said that story events in the project log point to a ledger update ID. Fixed in p07-t06.
- L1 (Low): `lane-report.md` softened "tested SHA must equal the delivered head" with ", or say why not". Fixed in p07-t06.
- L2 (Low): filing an own-worktree lane's first report without `--head` turns the head-ahead check off for it. Dismissed: no contract source requires a refusal or warning, the AGENTS.md filing step always passes `--head`, and the operator's standing direction for m02 is to drop small unrequired hardening rather than defer it.
- L3 (Low): the p07-t05 record cites an earlier run's report checksum. Already addressed: the phase `**Head:**` paragraph carries the appended correction (`4f2b0576…`); committed record lines are not rewritten.
- **Finding classes:** M1 accepted-requirement (plan.md Decisions: Ledger vs project log) · L1 accepted-requirement (Decisions: Lane reports) · L2 new-hardening (no contract source) · L3 bookkeeping (provenance wording).
- Outcome: passed (0 critical, 0 high). The two fixes were not re-reviewed (operator direction: no re-review for straightforward fixes); root verification is in the p07-t06 record.

---

## Phase p10: Decisions and memories

**Status:** completed
**Base:** d4af984a5beadc33d0c115d6fc52094b34affbf0
**Executor:** phase-implementer:freestyle-projects-p10-implementation-1
**Head:** f9edb6c1b515f0e7e94e92dde58c5b04f04b1cd3

Phase verification at the head (clean tree but the gitignored `references/`, isolated `HOME`): `pnpm check` exit 0 (cli `check` and `build` cache miss, executed); `pnpm type-check` exit 0 (cli cache miss); `pnpm test` exit 0 under `scripts/with-isolated-home.sh` (cli `test` cache miss, executed: 457 files, 9984 tests; control-plane 327 replayed, no control-plane input changed; the root script's `test:smoke` 165, `test:skills` 754 and `test:scripts` 7 ran); `pnpm build` exit 0 (cache hit replaying the `ac25269` build `pnpm check` executed at this head, inputs unchanged); `pnpm lint` exit 0; `pnpm test:skills` exit 0 (754). Not run, owned by p08: `check:skill-bumps`, `release:*`, `build:docs`. An earlier `pnpm test` run at `a9907936` was stopped before it finished, to add p10-t05; no result from it is claimed.

Added by the second m02 amendment (2026-11-22): `decisions.md` and `memories.md` scaffolded beside `shape.md`, lane notes, and promotion from lane reports (plan.md Decisions: Decisions and memories).

Worktree: the project branch `feat/freestyle-projects-m02` in this checkout; committing owner: the phase implementer. Parallelism assessment: no declared parallel group; p10 cannot run beside p08, which documents it. Root fan-out fails the independence test because the templates, scaffold, project `AGENTS.md` template, `lane-report.md` and the skill's kickoff and resume steps all change together and share the contract tests. So one phase implementer (rung 3). The inline exception does not apply: p10 adds new scaffolded files and a scratch run.

### Task p10-t01: Scaffold decisions.md and memories.md for every freestyle project

**Status:** completed
**Commit:** 9bd980b08e8b2ce0bb55bb4069e36d2904480ce2
**Executor:** phase-implementer:freestyle-projects-p10-implementation-1
**Handle:** freestyle-projects-p10-implementation-1 (this session)

- Intent: Outcome 8 and the Decisions and memories decision (scaffold half). Bundled `decisions.md` (`## Live`, `## Superseded`, the `### drNN · <decision statement>` entry form and the supersession pointers) and `memories.md` (`## User preferences`, `## Gotchas`, `## Context`, dated and sourced bullets) templates, scaffolded for every freestyle project in every scope, `--link-to` children included, and for no other mode.
- Files: `.oat/templates/{decisions.md,memories.md}`, `packages/cli/src/commands/project/new/scaffold.ts`, `packages/cli/scripts/bundle-inputs.mjs`, `packages/cli/src/commands/tools/shared/pack-manifest.ts`, `packages/cli/src/commands/project/new/scaffold.test.ts`, `packages/cli/src/commands/project/linked/linked.test.ts`, `packages/cli/src/commands/commands.integration.test.ts`.
- Proof: `pnpm --filter @open-agent-toolkit/cli build`; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new src/commands/project/linked src/commands/commands.integration.test.ts src/commands/init/tools/shared src/commands/tools src/release` exit 0 (74 files, 1721 passed); CLI `check` and `type-check` exit 0. Bundle-tier scaffold tests (isolated `HOME`, no repository tier) in shared (committed with the scaffold), local (uncommitted) and synced (read back from `refs/oat/projects/<slug>` in the origin) assert `createdFiles` ends with `decisions.md` and `memories.md`, the headings (`Live`, `Superseded`; `User preferences`, `Gotchas`, `Context`), every section `_None yet._`, the entry form and both supersession pointers, no frontmatter, and each file byte-identical to the bundled template. `linked.test.ts`, with the parent in each scope, gives the parent a `dr01` entry first, then asserts the `--link-to` child's two files equal the empty templates, the parent's `decisions.md` is unchanged, and the child's scaffold commit holds the five files. Existing-mode controls: spec-driven, quick, import, lite, brief and goal scaffolds at the bundle tier create neither file (nor `AGENTS.md` or `shape.md`). The same-mode freestyle rerun skips all five; the `new --json` integration test lists them.
- Can-fail: dropping `decisions.md` from the freestyle `TEMPLATES_BY_MODE` entry failed nine tests (the three bundle-tier scope tests, the three `--link-to` creation tests, the bundled floor, the rerun and the real-template freestyle scaffold) on `createdFiles` and the missing file; restored.
- Decisions: both templates carry no frontmatter and no placeholder, like `lane-report.md`, so `oat template resolve decisions --output <path>` (raw copy) writes exactly what the scaffold writes; first-use creation in a project created before p10 needs no rendering step. Titles are `# Decisions` and `# Memories`. The entry form is described in the preamble rather than shown as a heading, so the files open with no entry and the heading-literal guard holds (the prose names the sections as "the Live section", never `## Live`). `oat project new` output is unchanged: it still names `AGENTS.md` and `shape.md`, and `createdFiles` lists the new pair.

### Task p10-t02: AGENTS.md decisions and memories rules, lane notes and promotion, and the shape.md Project log paragraph

**Status:** completed
**Commit:** 1fbd1e22b6237dc4927c9b39bd5931642691cfbd
**Executor:** phase-implementer:freestyle-projects-p10-implementation-1
**Handle:** freestyle-projects-p10-implementation-1 (this session)

- Intent: the AGENTS.md and template half of p10's Intent. The project `AGENTS.md` names `decisions.md` and `memories.md` in its opening resume line (`shape.md`, then `decisions.md` `## Live`, then `memories.md`), `## Project files` and `## Single writer`, and gains a `## Decisions and memories` section (the authority rule, writing by hand, the supersession steps, first-use creation only when a file is absent, a linked project starts empty); `## Dispatch` gains the lane notes path as authorized scratch in each brief, with the ignore qualification and the read-only delegate case, and `## Lane reports` the promotion step after a report is filed; `lane-report.md` gains the lane-notes instruction; the `shape.md` template's `## Project log` paragraph defers decisions about the work to `decisions.md`.
- Files: `.oat/templates/{project-agents.md,lane-report.md,shape.md}`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts`, `packages/cli/src/commands/project/new/scaffold.test.ts`.
- Proof: `pnpm --filter @open-agent-toolkit/cli build`; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/project/new src/commands/project/linked src/commands/project/lane src/commands/template src/commands/commands.integration.test.ts` exit 0 (40 files, 1580 passed, the bundle-tier scaffold tests included); CLI `check` and `type-check` exit 0. Contract tests (`freestyle decisions and memories (p10)`): the two templates' sections in order (`Live`, `Superseded`; `User preferences`, `Gotchas`, `Context`) with no frontmatter or placeholder, and the entry form and both supersession pointers; the AGENTS.md first line verbatim with `shape.md`, `## Live`, `decisions.md`, `memories.md` in that order, both files in Project files and in the single-writer list; the authority rule, writing by hand with no command, the supersession steps, create only when absent and the linked-project rule; the `shape.md` Project log paragraph's deferral to `decisions.md`, `drNN` citation and `memories.md`; the Dispatch lane notes path (`.oat/analysis/lane-notes/<lane>-<dispatch>.md`), authorized scratch outside `paths:`, the `.oat/**/analysis` qualification and the read-only delegate; the Lane reports promotion step after the log step, citing the dispatch ID; the `lane-report.md` lane-notes instruction verbatim. The AGENTS.md first-use block is executed against a stub `oat template resolve` that copies the repository template raw: a missing `decisions.md` is created byte-identical to the template while a hand-written `memories.md` is left byte-identical, and with both present a resolver that would fail is never called. The pinned AGENTS heading list gains `Decisions and memories` after `Where records live`; the existing `names only lane set options the command has` test still passes (the new Dispatch text names no other flag). The bundle-tier scaffold tests pin the new first line in every scope.
- Can-fail: replacing the block's `[ -e ... ] ||` with `true &&` (always copy) failed the first-use test on the hand-written `memories.md` (`expected '# Memories\n\nWhat a returning agent …' to be '# Memories\n\n- kept\n'`); restored.
- Decisions: the rules are a new `## Decisions and memories` section between Where records live and Orchestrator branch, so the `oat-project-freestyle` refresh (keyed on `##` headings, p05-t03) replaces an older project's `AGENTS.md` on its next resume and the project then carries the first-use step before it needs the files; editing only existing sections would not have triggered the refresh for a project scaffolded by p05 or p07 code. The promotion is step 4 of the filing steps. The lane-notes path is named once, in Dispatch, and `lane-report.md` refers to "the lane notes file your brief names", because the brief may name a path outside the checkout.

### Task p10-t03: The skill's resume step and the kickoff reference

**Status:** completed
**Commit:** beb4563c03198985ec8d78afc65a1283a85222ee
**Executor:** phase-implementer:freestyle-projects-p10-implementation-1
**Handle:** freestyle-projects-p10-implementation-1 (this session)

- Intent: the skill half of p10's Intent. `oat-project-freestyle` SKILL.md Step 2 creates a missing `decisions.md` or `memories.md` from OAT's template after the claim and the AGENTS.md refresh (only when absent), then reads all of `decisions.md` `## Live` and `memories.md`; the kickoff reference keeps the parent's decisions and memories out of an adopted shape and points an adapted brief-style document's `## Decisions` at `decisions.md`.
- Files: `.agents/skills/oat-project-freestyle/{SKILL.md,references/kickoff.md}`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts`. No `metadata.version` bump: p08 owns bumps for m02.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`; `bash scripts/with-isolated-home.sh pnpm test:skills`; `pnpm oat:validate-skills`; `pnpm exec oxlint .agents/skills`; `pnpm run format:root`. All exit 0: vitest 33 files, 1349 passed; `test:skills` 754 passed; 69 skills validated; CLI `check` and `type-check` exit 0. Contract tests: in Step 2 the claim precedes the refresh, which precedes the new first-use step, which precedes `Then determine:`; Step 2 reads all of `## Live` and `memories.md` and never acts on a `## Superseded` entry. The Step 2 block is executed against a stub `oat template resolve` (repository template copied raw): with a hand-written `decisions.md` present it creates only `memories.md` (byte-identical to the template, one `created` line) and leaves `decisions.md` byte-identical; a second run with a failing resolver is silent and exit 0; with nothing present and a failing resolver it exits 1 (`could not create decisions.md from the decisions template; stopping`) and creates nothing. Kickoff: an adopted shape copies only `shape.md`; Adapting step 4 points a brief-style `## Decisions` at `decisions.md` (a heading `plan-brief.md` carries). The `names only headings` contract test now also accepts the decisions and memories headings.
- Can-fail: replacing the block's `[ -e ... ] && continue` with `false && continue` failed the existing-file test on its output (both files reported created, the hand-written `decisions.md` replaced); restored.
- Decisions: the skill's block and the AGENTS.md block do the same thing; the skill's adds the stop on a failed resolve and the `created` line because it runs unattended in the resume flow, the AGENTS.md one is the hand recipe for an orchestrator not resuming through the skill. Interaction with the AGENTS.md refresh (p05-t03): on a project created before p10 the refresh runs first (the new `## Decisions and memories` heading is missing, so AGENTS.md is replaced whole), then the first-use step creates both files, so the refreshed rules and the files they name arrive in the same resume. Step 1 (create) still confirms only `state.md`, `AGENTS.md` and `shape.md`, so a newer skill on an older CLI reaches Step 2, where a template that does not resolve stops the run. Adapting step 4 is new and the leftover check is renumbered 5.

### Task p10-t04: Scratch run from an m01 project with the branch build

**Status:** no-change
**Executor:** phase-implementer:freestyle-projects-p10-implementation-1
**Handle:** freestyle-projects-p10-implementation-1 (this session)

- Intent: the scratch-run exit evidence: starting from a freestyle project created by the m01 build, the orchestrator creates each missing file without touching an existing one; one lane writes a decision and a gotcha to its notes file during its dispatch, its report carries both, and the orchestrator promotes them citing the dispatch ID; a later decision supersedes an earlier one with pointers both ways; a fresh session given only the project files lists every `## Live` decision and none superseded, and names the gotcha and its source.
- Files: none in the repository; transcript in `references/analysis/p10-scratch-transcript.md` (gitignored).
- Proof: the transcript. m01 build: `node packages/cli/dist/index.js` built in a detached worktree at `1e0b473c66865c4f6af3acdd2e09f532edc6ccc5` under `$TMPDIR/oat-p10-m01` (`pnpm install --frozen-lockfile --prefer-offline`, `pnpm --filter @open-agent-toolkit/cli... build`, both exit 0), removed after the run; it was built, not reproduced from templates. Branch build: this checkout's `node packages/cli/dist/index.js` built at `62a09f918142446e4436c92ef6a1b0ec97d6b3ca` (code at `beb4563c0`).
- Setup: a throwaway repository under `$TMPDIR/oat-p10-scratch` with an isolated `HOME` and global Git config, `.oat/**/analysis/` ignored (the `oat init` choice), and wrappers `oat-m01` and `oat` on `PATH`. The orchestrator was played by the implementer from the branch `SKILL.md` Step 2 blocks (extracted verbatim and run) and the project `AGENTS.md`, with scripted user answers.
- m01 project: `oat-m01 project new legacy --mode freestyle --scope shared --with-project-log` wrote `AGENTS.md` (first line `Read shape.md in this folder before acting...`, five sections), `shape.md` and `state.md` with no `oat_orchestrator_branch`, and no `decisions.md` or `memories.md`; it was shaped (scripted) and committed.
- Resume with the branch build: `orchestrator set` claimed the unclaimed project on `main`; the SKILL.md refresh block printed the six missing headings (`## Decisions and memories` first) and replaced `AGENTS.md`, whose first line became the resume order; the first-use block printed `created` for `decisions.md` and `memories.md`, with `shape.md`, `state.md` and the refreshed `AGENTS.md` hashes unchanged across it, and the new `decisions.md` identical (`cmp`) to `oat template resolve decisions --output` at the bundle tier. After the orchestrator wrote `dr01` (source: the user) and committed the records with exact paths, a second run of the block printed nothing and both files' hashes were unchanged.
- Lane: `lane set l01` (own worktree `lane-l01` on `lane/l01`); `git check-ignore -v` showed `.oat/**/analysis/` covering `.oat/analysis/lane-notes/l01-d01.md`; the brief (dispatch facts by the AGENTS.md Dispatch section, notes path as authorized scratch, `lane-report` shape from the bundle embedded whole) was dispatched verbatim as request `freestyle-projects-p10-t04-lane-l01-d01-1`, one fresh-context `general-purpose` subagent (Agent model `sonnet`, provider-default effort; accepted, completed). It committed `e207ce05b5ad8154f9d525a58de0301a6cc4a676` (`src/csv.mjs`, `test/csv.test.mjs`, a one-line `package.json` test-glob fix it reported as a deviation) and returned its report, recorded verbatim. Its notes file was born at 21:59:06, six seconds before its commit at 21:59:12, ignored (`!!`) and uncommitted, and holds the doubled-quote decision and the zero-test gotcha; the report's Decisions and Learnings carry both; nothing under `.oat/projects/` changed in either checkout. The implementer re-ran `npm test` in the lane worktree (`tests 9`, `pass 9`).
- Filing and promotion: `lane set l01 --report <returned file> --head e207ce0... --state work-settled` (u002) filed a copy `cmp` reports identical; one accepted decision entry was appended with `--source l01-d01` citing `dr02` (a first attempt with a nonexistent `--kind` option failed and wrote nothing; recorded in the transcript); the orchestrator promoted the decision as `dr02` (Source: `l01-d01`) and the gotcha as a `## Gotchas` bullet ending `(2026-11-22, l01-d01)`, and did not promote the other bullets (the zsh note is about the lane's shell).
- Supersession: the user's SQLite decision became `dr03` under `## Live` with `Supersedes: dr01`; `dr01` moved intact to `## Superseded` with `Superseded by dr03, 2026-11-22`; the records were committed with exact paths.
- Fresh session: request `freestyle-projects-p10-t04-fresh-session-1`, one fresh-context read-only `general-purpose` subagent (Agent model `sonnet`, provider-default effort; accepted, completed); its brief held only the project path, a read-only instruction and the question. It listed dr02 and dr03 as in force, named dr01 only as no longer in force (under `## Superseded`, superseded by dr03), and named the gotcha with its source `l01-d01` and the lane report; answer verbatim in the transcript. The project tree hash (`84e2d263…`), HEAD and the clean working tree were unchanged afterwards, and `oat project check-state` passed. It also noted that the lane's ledger `next` was stale after the report was filed (the run did not update it).

### Task p10-t05: Name decisions.md and memories.md among the records a lane report says a lane never writes

**Status:** completed
**Commit:** 8949649d42c94cc5009688418785f9aa4d8274a3
**Executor:** phase-implementer:freestyle-projects-p10-implementation-1
**Handle:** freestyle-projects-p10-implementation-1 (this session)

- Intent: phase self-review. `lane-report.md` lists the project records a lane must not write (the ledger, the project log, `shape.md`, the project's documents) but not the two new files, while the Single writer and Decisions and memories decisions keep both orchestrator-only; a lane reading only its brief could take them as writable.
- Files: `.oat/templates/lane-report.md`, `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts`.
- Proof: `pnpm --filter @open-agent-toolkit/cli build`; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/template` exit 0 (34 files, 1364 passed, including the p07 bundle-tier dispatch-brief test against the rebuilt bundle). The p10 lane-notes contract test now also pins the lane-report record list with `decisions.md` and `memories.md`. Found at the phase self-review after p10-t04; the scratch lane's brief already named both files as records it must not write, so the run's evidence stands.

### Task p10-t06: Fix p10 review findings (L1, L2)

**Status:** completed
**Commit:** dfe4e2a38c87f6a729d79cd6bfa5255149d72c91
**Executor:** root (root-inline review fix; see `## Orchestration Runs`)

- Intent: p10 review `freestyle-projects-p10-review-1` L1 (complexity: the AGENTS.md First use bullet repeated the skill's creation block with its own test) and L2 (the Linked projects bullet went beyond the brief's "starts with its own empty files").
- Files: `.oat/templates/project-agents.md` (First use is one sentence naming `oat template resolve <decisions|memories> --output …`, only when absent, done by the skill on resume; Linked projects keeps only the brief's wording), `packages/cli/src/commands/init/tools/shared/freestyle-contracts.test.ts` (drops the AGENTS.md block-run test, keeps the SKILL.md Step 2 block tests, pins the new sentence).
- Proof: `pnpm build` exit 0; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation src/commands/project` exit 0 (104 files, 3398 tests); `pnpm check`, `pnpm lint` and `pnpm type-check` exit 0.

Late fix p10-t06 (p10 review round 1: L1 and L2) at `dfe4e2a38`, recorded at `40cc01897`. No later phase has a `**Base:**`, so the head advanced under the late-fix rule; the reviewed head stays `07e828dab`.

### Review Received: p10

- Review `freestyle-projects-p10-review-1` (Claude Opus 5.5 high, `oat-reviewer-claude-claude-opus-5-5-high`) on `d4af984a5..07e828dab`, artifact `reviews/archived/p10-code-review-2026-11-23T041712Z.md` (local-only): 0 critical, 0 high, 0 medium, 2 low; reconnaissance not attempted. The reviewer re-ran the freestyle contract, scaffold and linked suites (192 passed) and probed the first-use step with the branch build's real `oat template resolve` (absent file created byte-identical; existing file left alone; the `[ -e ]` check is what protects it). It found the authority, supersession and first-use rules stated consistently across the templates, AGENTS.md, `lane-report.md`, `shape.md`, kickoff and the skill, p05's refresh and p07's lane sections intact, and accepted the implementer's five choices where the brief was silent.
- L1 (Low, complexity): the AGENTS.md First use bullet repeated the skill's creation block with its own test. Fixed in p10-t06 (one sentence; the skill's block and its tests remain).
- L2 (Low): "never copies another project's decisions or memories" went beyond the brief. Fixed in p10-t06 (the brief's wording only).
- **Finding classes:** L1 accepted-requirement (Decisions and memories: first use with `oat template resolve`, only when absent; the complexity lens the operator set for m02) · L2 regression (the bullet overstated plan.md Decisions and memories: "A linked child starts with empty files").
- Outcome: passed (0 critical, 0 high). The fixes were not re-reviewed (operator direction: no re-review for straightforward fixes); root verification is in the p10-t06 record.

Correction to the p10-t06 record and the late-fix line above: both name `dfe4e2a38` (the p10 Step 7a bookkeeping commit) as the fix commit. The first implementation commit attempt was refused by commitlint (header over 100 characters) and the root's script recorded `HEAD` without checking the result. The p10-t06 implementation commit is `fd0366c3f00c6361e8203d7c0367f78692a8a78a`, made after the p10 bookkeeping commit `b373b426c`; its content and verification are the ones the record describes.

---

## Phase p08: m02 docs and release

**Status:** in_progress
**Base:** 6430f47ad53025b99bf8ba83661ad8f5fe435ead
**Executor:** phase-implementer:freestyle-projects-p08-implementation-1
**Head:** 29e87c4baaa1dc9659afbb9662f57a963f5a64f8

Phase verification at the head on a clean tree (only the untracked `references/`), in Definition of Done order with each exit code captured:

- `pnpm check`: exit 0 (11 tasks, 4 cached; every package `check` a cache miss).
- `pnpm type-check`: exit 0 (11 tasks, 5 cached).
- `pnpm test` under `scripts/with-isolated-home.sh`: exit 0. Every package `test` was a cache miss and executed: cli 457 files, 9989 tests; control-plane 327; docs-config 24, docs-theme 159, docs-transforms 72, oat-docs 93. The chained `test:smoke` (165), `test:skills` (754) and `test:scripts` (7) passed.
- `pnpm build`: exit 0. It replayed from cache (FULL TURBO), so it was re-run with `turbo run build --filter='!oat-docs' --force`: exit 0 (5 tasks, 0 cached).
- `pnpm run check:skill-bumps`: exit 0 (1 changed canonical skill and agent role checked), after `git fetch origin main` (`699f8ee43`).
- `pnpm release:check-versions`: exit 0.
- `pnpm release:validate`: exit 0 (5 packages at 0.3.57).
- `pnpm build:docs`: exit 0. It also replayed from cache and was re-run with `turbo run build --filter=oat-docs... --force`: exit 0 (6 tasks, 0 cached).
- Docs-index `generate-index`, then `git diff --exit-code -- apps/oat-docs/index.md`: exit 0.
- Also exit 0: `pnpm lint`, `pnpm format`, `pnpm oat:validate-skills` (69 OK, within `pnpm check` and separately), and the isolated `vitest run src/release src/commands/init/tools/shared src/validation src/commands/sync bundle-consistency` (41 files, 1532 passed, at p08-t03).

`pnpm test:evidence` was not run: the uncached `pnpm test` above executed every package suite. Recovery: 0/10 used, none pending. No nested dispatch.

Worktree: the project branch `feat/freestyle-projects-m02` in this checkout, after the root merged `origin/main` (`6430f47ad`, #428, packages at 0.3.56 on main); committing owner: the phase implementer. Parallelism assessment: no declared parallel group and p08 is the last m02 phase. Root fan-out fails the independence test because the docs pages, skill bumps, lockstep versions and provider views share generated outputs (docs index, sync manifest) and the release gates. So one phase implementer (rung 3). The inline exception does not apply: p08 spans many docs pages and the release gates.

### Task p08-t01: Document the m02 freestyle records and commands in the docs pages

**Status:** completed
**Commit:** 9b3eaa4c037864ebb0d50442599952bd68223bca
**Executor:** phase-implementer:freestyle-projects-p08-implementation-1
**Handle:** freestyle-projects-p08-implementation-1 (this session)

- Intent: document the orchestrator branch, linked projects, shape adoption, the lane ledger and reports, and decisions and memories, as the m02 code ships them, in the docs pages that describe freestyle.
- New page `workflows/projects/execution/freestyle-projects.md` (Running a Freestyle Project): no existing page covers running a freestyle project after creation (`starting-projects.md` covers the skill, `cli-reference.md` is a flat command list), so the topic had no natural home. Sections: Project files (each file, what it holds, who writes it), The orchestrator branch (`orchestrator/branch.ts`, `orchestrator/set.ts`, the guard and the AGENTS.md self-test), Lanes and lane reports (`lane/index.ts`, `lane/ledger.ts`, `lane/head.ts`, `lane-report.md`, the filing and promotion steps, lane notes, resume), Decisions and memories (`decisions.md`, `memories.md`, the authority and supersession rules, first use), Linked projects (`linked/link.ts`, `linked/ledger.ts`, `new/index.ts`, name-or-path resolution in `resolve-named-project.ts`, shape adoption from `kickoff.md`), Older projects (the skill's AGENTS.md refresh and first-use step). Listed in `execution/index.md`; nav sync added it to `execution/meta.json`.
- Updated: `reference/cli-reference.md` (`new`: `decisions.md`/`memories.md`, `oat_orchestrator_branch`, `--link-to`/`--purpose`, JSON `orchestratorBranch` and `linkedTo`; `status`: orchestrator, head-ahead and open-link lines, the unreadable-ledger lines, JSON `orchestrator`, `lanes`, `linkedProjects`; new entries for `orchestrator set`, `linked add`/`ack`, `lane set` and the guard; `template resolve`: `lane-report`, `decisions`, `memories`), `reference/oat-directory-structure.md`, `reference/project-artifacts.md` (freestyle row), `reference/project-state-machine.md` (`oat_orchestrator_branch`, `oat_linked_from`), `workflows/choose-workflow.md`, `workflows/projects/index.md` (folder contents; Execution map line), `execution/picking-up-projects.md` (status lines and resume order), `execution/project-log.md` (`linked ack`'s structural entry; lane-report and update-ID refs), `planning/starting-projects.md` (resume: claim, AGENTS.md refresh, first-use files, adopt-or-new; expected output; "the three scaffolded files" corrected to "the scaffolded files"), and the regenerated `apps/oat-docs/index.md`.
- Proof: `pnpm --filter oat-docs docs:validate` exit 0 (0 errors, 778 warnings; the same validator on the committed docs at `ea2f6c0ff` gives 777, and the one new warning is the provenance rule on the new page's lane-notes path `.oat/analysis/lane-notes/<lane>-<dispatch>.md`, kept because the path is the contract; two other new provenance hits were reworded away; the existing `starting-projects.md` page-length warning grew from 694 to 713 lines); `docs nav sync --check` exit 0; `pnpm --filter oat-docs check` exit 0 (catalog current at 74 skills); `pnpm --filter oat-docs test` exit 0; `generate-index` regenerated two entries.
- Inspected, unchanged: `approvals-and-automation.md` ("after creation OAT commits, pushes, dispatches and opens nothing" stays true: the m02 commands write files and commit nothing), `starting-projects.md` situation-table row (a summary), `lifecycle.md`, `skills/index.md` (generated catalog row; the skill description is unchanged), and the other freestyle mentions from p04 (mode lists and stops that m02 does not change).

### Task p08-t02: Name the m02 status fields in the CLI README and check the m02 help text

**Status:** completed
**Commit:** e25357c86d7277446499ee6c9700d6feeafa53bd
**Executor:** phase-implementer:freestyle-projects-p08-implementation-1
**Handle:** freestyle-projects-p08-implementation-1 (this session)

- Intent: the CLI and package READMEs and the help text the m02 commands touch.
- `packages/cli/README.md`: the `status --json` entry names the top-level `orchestrator`, `lanes` and `linkedProjects` objects a freestyle payload carries (`status.ts` `writeProjectStatusOutput`).
- Inspected, unchanged: root `README.md` (the freestyle sentence names files and records generally and stays true); `packages/control-plane/README.md` (m02 changes no control-plane code); root `AGENTS.md` (the Freestyle workflow option stays true); CLI help (`oat project --help` lists `lane`, `linked` and `orchestrator` with their descriptions, each subcommand's options match the docs, `oat project new --help` describes `--link-to` and `--purpose`; `oat template resolve` and `status` help name no template or field list). The freestyle `new` output line `Project rules: <path> (OAT-owned; read shape.md first)` stays true (`shape.md` is still read first) and is left as shipped.
- Files: `packages/cli/README.md`.
- Proof: `oxfmt --check packages/cli/README.md` exit 0; `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/release/public-package-contract.test.ts src/commands/help-snapshots.test.ts` exit 0 (2 files, 101 passed).

### Task p08-t03: Release: the oat-project-freestyle bump, lockstep versions and provider views

**Status:** completed
**Commit:** dd8b401f8919c33335fea15e1c39c88e65e1314a
**Executor:** phase-implementer:freestyle-projects-p08-implementation-1
**Handle:** freestyle-projects-p08-implementation-1 (this session)

- Intent: one `metadata.version` bump per canonical skill the m02 diff changed, the lockstep bump of the five public packages above `origin/main`, and provider views regenerated with the branch build.
- Inventory: `git diff --stat origin/main...HEAD` (`origin/main` `699f8ee43`, the merge base) changes one canonical skill, `oat-project-freestyle` (`SKILL.md`, `references/kickoff.md`), no agent role under `.agents/agents/`, and the bundled templates `decisions.md`, `memories.md`, `lane-report.md`, `project-agents.md`, `shape.md` and `state-freestyle.md` plus CLI source, which put the CLI release surface in the lockstep policy. No `.agents/docs/` file changed.
- Skill bump: `oat-project-freestyle` `metadata.version` 1.0.0 to 1.1.0 (minor: m02 adds the claim, the AGENTS.md refresh, first-use creation and linked-child adoption, as `oat-brainstorm` took 1.4.0 for its freestyle route). No test pins the version.
- Lockstep: `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json` 0.3.56 to 0.3.57 (`origin/main` is 0.3.56 after #428); `packages/cli/assets/public-package-versions.json` followed from `pnpm build`, and `.oat/sync/manifest.json` `oatVersion` (0.3.55 to 0.3.57) from the sync.
- Provider views: `pnpm build` (5 tasks, 0 cached) then `node packages/cli/dist/index.js sync --scope project` exit 0: "Manifest version refreshed; no content changes required". `.claude/skills/oat-project-freestyle` is a symlink to the canonical skill, so the bump needs no view change, and no agent role changed.
- Files: `.agents/skills/oat-project-freestyle/SKILL.md`, the five `package.json`, `packages/cli/assets/public-package-versions.json`, `.oat/sync/manifest.json`.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/release src/commands/init/tools/shared src/validation src/commands/sync bundle-consistency` exit 0 (41 files, 1532 passed); `bash scripts/with-isolated-home.sh pnpm test:skills` exit 0 (754 passed); `pnpm oat:validate-skills` exit 0 (69 OK); `oxfmt --check` on the changed files exit 0. After the commit and `git fetch origin main`: `pnpm run check:skill-bumps` exit 0 (1 changed canonical skill and agent role checked) and `pnpm release:check-versions` exit 0.

### Task p08-t04: Fix p08 review findings (M1, L1-L4)

**Status:** completed
**Commit:** 29e87c4baaa1dc9659afbb9662f57a963f5a64f8
**Executor:** root (root-inline review fix; see `## Orchestration Runs`)

- Intent: p08 review `freestyle-projects-p08-review-1` M1 (resume order) and L1 to L4 (`linked ack` lookup, the no-commit opening line, the local-child run step, the head-ahead wording), each checked against the code before the edit.
- Files: `apps/oat-docs/docs/workflows/projects/execution/freestyle-projects.md`. On resume the orchestrator reads `lanes.md` before acting, after `shape.md`, `decisions.md` `## Live` and `memories.md` (`.oat/templates/project-agents.md`). `linked ack` matches its child argument, or the last part of a path, against the parent's open rows (`linked/link.ts` `ackLinkedProject`). The opening line names the one exception, `new --link-to` saving the child's scaffold. A local child exists only in the checkout that created it (the template's sentence). The head check also flags a branch that moved off the reported head (`lane/head.ts` `moved`); a branch not in this clone is not flagged, and `lane set --json` reports its `headCheck` as `unknown`.
- Proof: `pnpm --filter oat-docs docs:check` exit 0 (0 errors, 778 warnings; the only one on this page is the accepted lane-notes provenance warning); `pnpm docs:validate` exit 0; `generate-index` exit 0 with no change to `apps/oat-docs/index.md`; `pnpm check` exit 0.

Late fix p08-t04 (p08 review round 1: M1 and L1 to L4) at `29e87c4ba`. No later phase has a `**Base:**`, so the head advanced under the late-fix rule; the reviewed head stays `bb8793296`.

### Review Received: p08

- Review `freestyle-projects-p08-review-1` (Claude Opus 5.5 high, `oat-reviewer-claude-claude-opus-5-5-high`) on `6430f47ad..bb8793296`, the fresh-context docs review against the code that p08's exit evidence names; artifact `reviews/archived/p08-code-review-2026-11-23T045600Z.md` (local-only): 0 critical, 0 high, 1 medium, 4 low; reconnaissance not attempted. The reviewer found the commands, flags, help text, status lines and JSON fields, ledger grammar, IDs, states, guard, link rows and log entry documented as the code ships them, and the release work correct: `oat-project-freestyle` the only changed canonical skill, bumped once to 1.1.0, no agent role changed, the five public packages at 0.3.57 above main's 0.3.56, and the versions asset and sync manifest in agreement. It accepted the new page, the lane-notes provenance warning and the longer `starting-projects.md`.
- M1 (Medium): the new page said the orchestrator reads `lanes.md` first on resume. Fixed in p08-t04.
- L1 (Low): the name-resolution paragraph overstated what `linked ack <child>` looks up. Fixed in p08-t04.
- L2 (Low): the opening said no command commits, while `new --link-to` saves the child's scaffold. Fixed in p08-t04.
- L3 (Low): the run-the-child step assumed another worktree, which a local child cannot have. Fixed in p08-t04.
- L4 (Low): the head-ahead text left out the moved-off case and said a missing branch is reported as unknown. Fixed in p08-t04.
- **Finding classes:** M1 regression (the page contradicted the resume order in `.oat/templates/project-agents.md` and `picking-up-projects.md`) · L1 regression (overstated `linked/link.ts`) · L2 regression (contradicted the page's own Linked projects section) · L3 regression (dropped the template's local-child sentence) · L4 regression (understated `lane/head.ts` and misdescribed `status`).
- Outcome: passed (0 critical, 0 high). The fixes were not re-reviewed (operator direction: no re-review for straightforward fixes); root verification is in the p08-t04 record.

### Task p08-t05: (review) Name the inspected parent in the printed linked ack command

**Status:** pending
**Source review:** reviews/archived/m02-integrated-review-2026-11-23T051139Z.md (N-1)

Intent: `packages/cli/src/commands/project/status.ts:149` prints `oat project linked ack <child>` with no parent, so for a project other than the active one it acknowledges the active parent's row. Print `--project <inspected parent path>` in the command.
Files: `status.ts`, its test, and the docs that quote the line (`reference/cli-reference.md`, `execution/freestyle-projects.md`, `execution/picking-up-projects.md` where they quote it).
Proof: a `status --project-path <A>` test with B active whose printed command closes A's row; can-fail with the old line.

### Task p08-t06: (review) Round-trip literal backslashes in the lane ledger

**Status:** pending
**Source review:** reviews/archived/m02-integrated-review-2026-11-23T051139Z.md (N-2)

Intent: `lane/ledger.ts:177` unescapes Markdown backslash escapes on read, but the writer writes values raw. A value such as `rg 'api\.v1'` loses its backslash, and the next update rewrites both the field and its earlier history line. Escape backslashes on write so a read returns what `lane set` wrote; keep reading a formatter's `\*` as `*`.
Files: `lane/ledger.ts` and its test.
Proof: a test that sets a field containing `\.`, makes a second update to another field and reads both the field and the first history line back unchanged; plus a formatter-escaped `\*` still reads as `*`; can-fail with the writer escape removed.

### Task p08-t07: (review) Keep filed lane reports byte-for-byte through a formatting commit hook

**Status:** pending
**Source review:** reviews/archived/m02-integrated-review-2026-11-23T051139Z.md (N-3)

Intent: This repository's lint-staged oxfmt hook rewrites `lane-reports/*.md` on commit (`*` list markers become `-`), so a filed report is edited. Add `.oat/projects/**/lane-reports/**` to the `.oxfmtrc.jsonc` ignore list, next to the explainer precedent and with a comment. In `.oat/templates/project-agents.md` Lane reports and the docs page, add one sentence: in a repository whose commit hooks format Markdown, exclude `lane-reports/` from them so the committed report stays verbatim.
Files: `.oxfmtrc.jsonc`, `.oat/templates/project-agents.md`, `apps/oat-docs/docs/workflows/projects/execution/freestyle-projects.md`, and any contract pin.
Proof: `oxfmt --check` on a report fixture using `*` markers reports nothing to change under the repo config (and does with the ignore removed); the template sentence is pinned.

### Task p08-t08: (review) Refuse new --link-to for a name that is already a project

**Status:** pending
**Source review:** reviews/archived/m02-integrated-review-2026-11-23T051139Z.md (N-4)

Intent: `project/new/index.ts:260`: `new <name> --link-to <parent>` on an existing standalone project exits 0, scaffolds nothing, opens the parent's row and leaves the child without `oat_linked_from`. In `prepareLinkedCreation`, before any write, refuse when the child's project folder already exists in the scope being created, naming `oat project linked add <name>` as the way to link an existing project. Ordinary `new` without `--link-to` is unchanged.
Files: `project/new/index.ts` and its test.
Proof: a test with an existing project: exit 1, the refusal names `linked add`, and the parent's `linked-projects.md` is unchanged; can-fail with the check removed.

### Task p08-t09: (review) Name the child in the linked-child claim handoff

**Status:** pending
**Source review:** reviews/archived/m02-integrated-review-2026-11-23T051139Z.md (N-5)

Intent: `project/new/index.ts:190` hands off `oat project orchestrator set` with no project. The parent stays the active project, so in a local child's checkout that command reports the parent as already claimed. Print `oat project orchestrator set --project <child>`, and use the same form where `.oat/templates/project-agents.md`, `references/kickoff.md` and the docs describe the child's claim.
Files: `project/new/index.ts`, its test, `.oat/templates/project-agents.md`, `.agents/skills/oat-project-freestyle/references/kickoff.md` (if it gives the claim command), and the docs pages that quote it.
Proof: a `new --link-to` output test asserting `--project <child>`; a scratch local child claimed by running the printed command.

### Task p08-t10: (review) Say how a child adopts a shape its checkout cannot see

**Status:** pending
**Source review:** reviews/archived/m02-integrated-review-2026-11-23T051139Z.md (N-6)

Intent: `references/kickoff.md:54` finds the parent's folder with `oat project list`, which does not list a local parent from another worktree. Add one sentence: when the parent is not listed in this checkout (a local parent lives only in its own checkout), ask the user for the path to the parent's `shape.md`, or define a new shape. No new command.
Files: `.agents/skills/oat-project-freestyle/references/kickoff.md` and any contract pin.
Proof: the sentence is pinned in the freestyle contract test.

### Task p08-t11: (review) Resume the adoption question before declaring the shape complete

**Status:** pending
**Source review:** reviews/archived/m02-integrated-review-2026-11-23T051139Z.md (N-7)

Intent: `SKILL.md:275`: when the child's goal is written and the session stops before the adoption question, every topic reads shaped. Resume then takes the complete-and-stop branch, although `shape.md` still says `adopted sections not yet confirmed`. Route that marker to `references/kickoff.md`'s confirmation question before the complete-and-stop branch.
Files: `.agents/skills/oat-project-freestyle/SKILL.md` and its contract test.
Proof: a contract test asserting the routing names the marker ahead of the complete-and-stop branch.

### Task p08-t12: (review) Key accepted lane-report log entries by the flag each entry type takes

**Status:** pending
**Source review:** reviews/archived/m02-integrated-review-2026-11-23T051139Z.md (N-8)

Intent: `.oat/templates/project-agents.md:230` and the docs say accepted proposed entries are keyed with `--ref l01-d02`. `oat project log append` refuses `--ref` on judgment entries; they take `--source`. State `--source <dispatch ID>` for a judgment entry and `--ref <dispatch ID>` for a structural one. Replace the contract test's exclusion of log flags from the lane-option scan (`freestyle-contracts.test.ts:753`) with a check that each example uses a flag its own command accepts.
Files: `.oat/templates/project-agents.md`, `apps/oat-docs/docs/workflows/projects/execution/freestyle-projects.md` (and `project-log.md` if it repeats the example), `freestyle-contracts.test.ts`.
Proof: the contract test fails on the old `--ref` judgment example and passes on the new text; a scratch `log append` with each documented form exits 0.

---

## Phase p09: Evidence fields

**Status:** pending

---

## Orchestration Runs

<!-- One line per dispatch request id, rendered by `oat project dispatch record --format line` and written as a list item. Update that line in place with the terminal outcome; never paste the record or event JSON. -->

<!-- orchestration-runs-start -->

- run/v1 · request=freestyle-projects-p01-implementation-1 · scope=p01 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p01-review-1 · scope=p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p02-implementation-1 · scope=p02 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p02-review-1 · scope=p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p02-review-2 · scope=p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p03-implementation-1 · scope=p03 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p03-review-1 · scope=p03 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p04-implementation-1 · scope=p04 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p04-review-1 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p04-review-2 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=freestyle-projects-p04-review-3 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- Root-inline phase: p04 (task p04-t08 only, review round 3 L1) · reason: a one-sentence docs wording fix, smaller than a fix-mode resume and its gate run · root model: claude-opus-5-5

- run/v1 · request=freestyle-projects-p05-implementation-1 · scope=p05 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=freestyle-projects-p05-review-1 · scope=p05 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p05 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=freestyle-projects-p07-implementation-1 · scope=p07 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p07 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- Nested (phase-implementer-owned, p07-t05 exit evidence): request=freestyle-projects-p07-t05-fresh-session-1 · read-only general-purpose fresh-context check on Sonnet at provider-default effort · launch=accepted · outcome=completed · no structured dispatch record (the phase report names it; answer kept verbatim in the gitignored p07 scratch transcript)

- run/v1 · request=freestyle-projects-p07-review-1 · scope=p07 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p07 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- Root-inline phase: p07 (task p07-t06 only, review round 1 M1 and L1) · reason: two template sentences and their contract pins, smaller than a fix-mode resume · root model: claude-opus-5-5

- run/v1 · request=freestyle-projects-p10-implementation-1 · scope=p10 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p10 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- Nested (phase-implementer-owned, p10-t04 exit evidence): request=freestyle-projects-p10-t04-lane-l01-d01-1 · general-purpose scratch lane l01 on Sonnet at provider-default effort, writes confined to the scratch repo · launch=accepted · outcome=completed · no structured dispatch record (the phase report names it; transcript in the gitignored p10 scratch transcript)
- Nested (phase-implementer-owned, p10-t04 exit evidence): request=freestyle-projects-p10-t04-fresh-session-1 · read-only general-purpose fresh-context check on Sonnet at provider-default effort · launch=accepted · outcome=completed · no structured dispatch record (answer kept verbatim in the gitignored p10 scratch transcript)

- run/v1 · request=freestyle-projects-p10-review-1 · scope=p10 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p10 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- Root-inline phase: p10 (task p10-t06 only, review round 1 L1 and L2) · reason: one template bullet rewritten and its contract pin, smaller than a fix-mode resume · root model: claude-opus-5-5

- run/v1 · request=freestyle-projects-p08-implementation-1 · scope=p08 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p08 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=freestyle-projects-p08-review-1 · scope=p08 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p08 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- Root-inline phase: p08 (task p08-t04 only, review round 1 M1 and L1 to L4) · reason: five sentence-level docs corrections on one page, smaller than a fix-mode resume · root model: claude-opus-5-5

<!-- orchestration-runs-end -->

## Reviews and Gates

<!-- Receipts for final, milestone and multi-phase reviews (a phase review receipt may stay in its phase) and one terminal line per gate run. state.md owns gate transitions; this slot keeps the outcome, waivers and operator choices. -->

- 2026-11-21 · brief and m01 amendment review, manual substitute for the project-disabled `oat-project-goal` gate · GPT 6.2 Astra, effort high, via T3 `delegate_task` (read-only) · reviewed head `987d479b798cbc2b2b28df9a3b414d3262cea1df` · 0 blocking; all findings folded into the brief across rounds at `dc3d90918`, `ec7dd284f`, `9b16c94d6`.
- 2026-11-22 · m01 milestone exit review, manual substitute for the project-disabled `oat-project-implement` exit gate · GPT 6.2 Astra, effort high, via T3 `delegate_task` (read-only) · reviewed head `c14f3517e3d2a925204093b359c6c330b6d1742f` · six rounds: round 1 on `a5c28dca2..7c35a902e` (H1–H4, M1–M7; H4 new-hardening, operator chose fix in m01), round 2 on `..86048bad1` (R2-1..R2-6), round 3 on `..749557100` (R3-1..R3-6; R3-1 and R3-2 operator chose fix in m01), round 4 on `..686d424bc` (R4-1, R4-2 fixed; R4-3 new-hardening Low, deferred), round 5 on `..4a3b2be5c` (R5-1), round 6 on `4a3b2be5c..c14f3517e` pass, 0 findings. Fixes p04-t09..p04-t14. Artifacts `reviews/m01-code-review-2026-11-22T{022415,040026,050000,055500,063000,070000}Z.md` (local-only). Exit carrier `project_disabled`.
- 2026-11-22 · m01 milestone exit re-review after the integrated-review fixes, manual substitute for the project-disabled `oat-project-implement` exit gate · GPT 6.2 Astra, effort high, via T3 `delegate_task` (read-only) · reviewed head `eece9b5fcd6b6943fb9cf89d818787e1e8e2845e` · two rounds: round 7 on `c14f3517e..7e8da0da6` (p04-t15, t16, t18, t20, merge `1cc893ed8` of origin/main `78b88baba`, bump `61f62885d`): R7-1 Medium, regression of the p04-t15 fix; I-1, I-2 Resume, I-4, I-6 and the Zod 4 integration confirmed; round 8 on `7e8da0da6..eece9b5fc` pass, 0 findings. Fix p04-t21. Artifacts `reviews/m01-code-review-2026-11-22T{150000,151300}Z.md` (local-only). Exit carrier `project_disabled`, refreshed to fresh.
- 2026-11-22 · m01 milestone exit gate after the integrated review cycle 2 fixes (p04-t22..p04-t25, `0c0f294f0..d0573a6a5`) · **operator-waived re-review:** the operator chose to fix J-1 and J-2 case A "with no further review rounds". Root verified instead: each fix diff read; the three new Step 0 blocks are byte-identical to the reviewed `oat-project-implement` block apart from its inline pull; `vitest run` over `state/generate.test.ts`, `project/status.test.ts`, `validation/skills.test.ts` exit 0 (380 passed, load 11–16); implementer's full gate list at `f617afb91` exit 0 (forced `test:evidence`, 0 of 12 cached, cli 9871) with can-fail checks per fix. Exit carrier `project_disabled`, refreshed to fresh.

- 2026-11-22 · pr-progress preflight: the 15 top-level review artifacts (p01–p04 phase rounds and the eight `m01-code-review-*` exit rounds) moved to `reviews/archived/` (local-only). Earlier journal lines and the p01–p04 `## Reviews` Artifact cells that name `reviews/<file>` or a bare filename refer to `reviews/archived/<file>`; the cells stay unchanged because the delivery check binds each row's identity.
- 2026-11-22 · PR #429 self-review (pr-self-review), testing and complexity lenses, GPT 6.2 Astra high via T3 `delegate_task` (read-only), on `origin/main...3e8c8c19c`: T-1 (blocking) the J-1 stop test treated the stop message as a stop; T-2 the midnight test used one clock reading for every read; T-3 duplicate presence and ordering rows for seven skills; T-4 the quick-start path test ran Step 0.5 under both pointers in every case (24.4 s). All four fixed test-only at `ffaefa31b` by the root (operator: fix if straightforward, no re-review). Can-fail: replacing each of the three skills' `exit 0` after the freestyle stop with `true` fails `freestyle checkout here stops`; passing a second clock read to `validateEntry` fails the midnight test; T-4 now 18.4 s. Gates: `vitest run src/validation src/commands/init/tools/shared src/commands/project/log/freestyle.test.ts` exit 0 (34 files, 1358 passed), cli `type-check`, oxlint and oxfmt on the two files exit 0. X-1 (mode probe copied into four skills) and X-2 (quick-start path resolver written twice): dropped by the operator (now or never: never); the copies stay pinned by the byte-identity contract test.
- 2026-11-22 · PR #429 Cursor Bugbot (at `3e8c8c19c`, Medium): `oat-project-revise` wrote a named project's active pointer before its freestyle stop. Fixed at `ca5f8c338` by the root (operator: fix if straightforward): the mode is read in Step 0 and the pointer written after the stop, as `oat-project-reconcile` does; the stop moved into the ordering contract test. Can-fail: writing the pointer before the stop fails `stop before oat config set activeProject`. `vitest run src/validation src/commands/init/tools/shared` exit 0 (1321 passed), `oat:validate-skills`, `check:skill-bumps` (29) exit 0; provider views synced.
- 2026-11-22 · PR #429 CI (`ci`, every head since `54a54f469`): five `oat-project-complete` merged-later resume tests failed with `No synced project named probe`. The test took Step 1's first bash block as the synced archive entry; p04 put the freestyle mode read ahead of it, so the test ran the mode read alone. Fixed at `16f859911` (test only): the test runs both Step 1 blocks in order, so it now also covers the mode read on that resume path. `pnpm test:skills` exit 0 (754 passed). The 120 s skill-contract timeout seen on `3e8c8c19c` was fixed by T-4.

### Review Received: m01

**Date:** 2026-11-22
**Review artifact (local-only):** reviews/archived/m01-integrated-review-2026-11-22T134403Z.md

Integrated milestone review of m01 (p01, p02, p03, p04) on `f6e8b9c92..6d97810c3` (branch-own diff from `a5c28dca2`; integration commit `91ba64a6e`), manual, GPT 6.2 Astra effort high via T3 `delegate_task` (read-only), per the Gates decision. Root verified every cited line at `6d97810c3`.

**Findings:** Critical 0 · High 2 · Medium 3 · Low 1
**Finding classes:** I-1 accepted-requirement (plan.md Outcome 6, p02 Intent, Constraint on commits after creation) · I-2 accepted-requirement (Outcomes 1 and 6, p02 Intent, p04-t10 operator-approved target verification) · I-3 accepted-requirement (Outcome 6, p02 brainstorm detour) · I-4 accepted-requirement (Outcome 1) · I-5 accepted-requirement (Outcome 1, p01 L2 deviation) · I-6 accepted-requirement (Decisions "Records branch" and "Single writer", Outcome 7)

- I-1 (High): synced brainstorm pushes under a commit-only agreement → fix task p04-t15.
- I-2 (High): freestyle Create scaffolds under a subdirectory; Resume passes on two failed `cd`s → fix task p04-t16.
- I-3 (Medium): brainstorm loses the active freestyle project from a subdirectory → fix task p04-t17.
- I-4 (Medium): default `project status` omits the pull instruction for an active unpulled synced project → fix task p04-t18.
- I-5 (Medium): CRLF paused freestyle loses the dashboard resume step → fix task p04-t19.
- I-6 (Low): kickoff local-scope rule reads as covering code commits → fix task p04-t20 (Low default convert; one sentence).

Deferred ledger re-evaluated by the reviewer: p02 L5 and m01 R4-3 still acceptable as recorded; p02 L1–L3 closed in the reviewed skill.

Review-cycle count for m01 integrated: 1 of 3. The six `m01-code-review-*` artifacts are exit-gate rounds (their `oat_review_scope` relabelled `p01-p04`, local-only) and are not counted, although their filenames contain `m01`.

**Outcome:** fixes queued: p04-t15, p04-t16, p04-t17, p04-t18, p04-t19, p04-t20. Late-fix rule: no later phase has a `**Base:**`, so the records land in p04 (status back to `in_progress`, base unchanged). m01 exit carrier marked stale; the exit gate substitute runs again before the next integrated review.

**Re-assessment (2026-11-22, operator-approved):** the first pass classed all six accepted-requirement without checking which commit introduced each defect. Root re-checked with `git blame` against the branch base `a5c28dca2`. Revised classes: I-2 split, Resume half regression (the p04-t10 pointer check passes on two failed `cd`s), Create half new-hardening (pre-existing cross-mode `oat project new` cwd behavior; no contract names subdirectory invocation) · I-3 new-hardening (detection at `oat-brainstorm/SKILL.md:238` predates the branch, `417eb2e97`, every mode) · I-5 new-hardening, re-rated Low (LF-only lifecycle reader predates the branch, `11f41ae88`; CRLF `state.md` unobserved). I-1, I-4 and I-6 unchanged. Revised outcome: fixes p04-t15, p04-t16 (narrowed to the Resume half), p04-t18, p04-t20; p04-t17 and p04-t19 cancelled; I-2 Create half, I-3 and I-5 deferred by the operator.

### Review Received: m01 (cycle 2)

**Date:** 2026-11-22
**Review artifact (local-only):** reviews/archived/m01-integrated-review-2026-11-22T152500Z.md

Integrated milestone review of m01 (p01, p02, p03, p04), cycle 2, on `f6e8b9c92..9267361de` (integration commits `91ba64a6e`, `1cc893ed8`), manual, GPT 6.2 Astra effort high via T3 `delegate_task` (read-only). Root verified every cited line at `9267361de` and the introducing commits.

**Findings:** Critical 0 · High 1 · Medium 1 · Low 2
**Finding classes:** J-1 accepted-requirement (Constraint: no automatic commits after creation; Outcome 1) · J-2 split: case A accepted-requirement for freestyle (Outcome 1), case B new-hardening (pre-branch `11f41ae88`, `49aeb5075`; every mode) · J-3 accepted-requirement (Outcome 7) · J-4 regression (`c20ef22d5` made `starting-projects.md:103` inaccurate)

- J-1 (High): review-provide, complete and autonomous pull before reading the mode → fix task p04-t22.
- J-2 (Medium): dashboard routes for a synced project without a checkout → case A fix task p04-t23; case B deferred by the operator.
- J-3 (Low): synced freestyle closeout omits the push between complete-state and archive → fix task p04-t24.
- J-4 (Low): import checklist line omits the freestyle exception → fix task p04-t25.

Cycle-1 disposition confirmed by the reviewer: I-1 (with R7-1), I-2 Resume, I-4, I-6 fixed; deferrals I-2 Create, I-3, I-5, p02 L5, R4-3 still acceptable.

Review-cycle count for m01 integrated: 2 of 3.

**Outcome:** fixes queued: p04-t22, p04-t23, p04-t24, p04-t25 (late-fix rule, records in p04). **Operator decision (2026-11-22):** fix J-1 and J-2 case A in m01 with no further review rounds; the root verifies the fixes and records the waiver at the exit carrier refresh.

### Review Received: m01 (cycle 3)

**Date:** 2026-11-22
**Review artifact (local-only):** reviews/archived/m01-integrated-review-2026-11-22T174038Z.md

Integrated milestone review of m01 (p01, p02, p03, p04), cycle 3, confirm only, on `0c0f294f0..32919c56a`, manual, GPT 6.2 Astra effort high via T3 `delegate_task` (read-only). Scope set by the operator: confirm the cycle-2 fixes by behavior, their can-fail checks, and no regressions in non-freestyle modes. Root verified K-1's cited code at `32919c56a` and its introducing commit.

**Findings:** Critical 0 · High 0 · Medium 1 · Low 0
**Finding classes:** K-1 new-hardening. The reviewer called it an incomplete J-2A fix, but the record-only lookup dates from `b9359a6fc` (p02-t06) and `status` output is identical at base and head; J-2A made the dashboard match `status`, as its intent stated. The brief (plan.md Scope: "Before its first pull in a checkout, a synced project is known only by its pointer") names only the pointer-known case; no contract source names an active project with no pointer on the branch.

- K-1 (Medium): with no pointer file on the branch and no checkout, but the remote ref present, `status` and the dashboard report the directory missing (`oat-project-open`) instead of `oat project pull <slug>` → deferred by the operator.

Confirmed by the reviewer: J-1, J-2 case A (with a pointer), J-3, J-4, each with a mutation check; no regression in quick (`status` and the quick dashboard identical base to head).

Review-cycle count for m01 integrated: 3 of 3.

**Outcome:** passed, deferred items only (K-1, operator-approved Medium deferral, 2026-11-22). No fix tasks.

### Review Received: m02

**Date:** 2026-11-22
**Review artifact (local-only):** reviews/archived/m02-integrated-review-2026-11-23T051139Z.md

Integrated milestone review of m02 (p05, p07, p10, p08) on `699f8ee43..52589cbea` (origin/main to the m02 head), manual, GPT 6.2 Astra effort high via T3 `delegate_task` (read-only), complexity lens, per the m02 review plan. Root checked every cited line at `52589cbea`; each defect is in code or text m02 introduced.

**Findings:** Critical 0 · High 1 · Medium 5 · Low 2
**Finding classes:** N-1 accepted-requirement (Outcome 3, p05 Intent: `linked ack` on the parent whose records were read) · N-2 accepted-requirement (Outcome 5, Lane ledger decision: append-only history) · N-3 accepted-requirement (p07, Lane reports decision: filed verbatim, never edited) · N-4 accepted-requirement (Outcome 3: `--link-to` creates a child, `linked add` links an existing project) · N-5 accepted-requirement (Outcome 4, p05: the child's own session claims it) · N-6 accepted-requirement (Shape adoption decision) · N-7 accepted-requirement (Shape adoption decision: ask once whether adopted sections differ) · N-8 accepted-requirement (Lane reports and Ledger vs project log decisions: entries keyed by dispatch ID)

- N-1 (High): `status` prints an unscoped `linked ack` that can close the active parent's row → p08-t05.
- N-2 (Medium): the ledger reader strips literal backslashes and the next write rewrites history → p08-t06.
- N-3 (Medium): the repository's formatting hook rewrites filed lane reports on commit → p08-t07.
- N-4 (Medium): `new --link-to` on an existing project reports success and opens a row → p08-t08.
- N-5 (Medium): the child claim handoff omits `--project <child>` → p08-t09.
- N-6 (Medium): a local parent's shape is not findable from a child worktree → p08-t10 (one kickoff sentence; no new command, per the complexity lens).
- N-7 (Low): resume can skip the adoption confirmation → p08-t11.
- N-8 (Low): the `--ref` example fails for judgment log entries → p08-t12.

Confirmed by the reviewer: base and head behave identically for spec-driven, quick, lite, brief, goal and import (scaffold, `new --json`, `status` text and JSON); focused suites pass (296 tests); lockstep 0.3.57 and `oat-project-freestyle` 1.1.0.

Review-cycle count for m02 integrated: 1 (the plan allows at most one confirm round after this one).

**Outcome:** fixes queued: p08-t05 to p08-t12 (late-fix rule: no later phase has a `**Base:**`, so the records land in p08, status back to `in_progress`, base unchanged). m02 exit carrier marked stale; m02 back to `implementing`.

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

- p02 review round 1 L5: `oat project status` exits 1 on a corrupt synced record while `list` shows a `restore record from Git` row (`packages/cli/src/commands/project/status.ts:94`). Never a lifecycle recommendation; existing failure posture. Deferred by root (agent authority over phase acceptance); trigger: p04, align status with list's row or document the difference.
- p02 review round 2 L1-L3 (`.agents/skills/oat-project-freestyle/SKILL.md`): the Resume path bullet does not say a named project wins over an active freestyle project (~:97); the unpulled synced case names no detection command (~:99-101; safe, `oat project new` refuses the duplicate); Success Criteria lists two resume triggers where Step 2 has three (~:199-200). Deferred by root; trigger: p04 skill-prose pass (no extra version bump, the skill is new in this PR).
- m01 review round 4 R4-3 (`m01-code-review-2026-11-22T055500Z.md`; class new-hardening, Low): in `oat-project-implement` Step 0, an empty or malformed `oat_workflow_mode` on a synced ref reads as the legacy spec-driven default, so arrival continues instead of stopping. Deferred by root to the follow-up issue; the implement skill is unchanged in m01. Trigger: the freestyle follow-up issue.
- m01 integrated review I-2 Create half, I-3 and I-5 (`reviews/archived/m01-integrated-review-2026-11-22T134403Z.md`; class new-hardening): running OAT skills from a repository subdirectory (`oat project new` scaffolds at the current directory in every mode and only `oat-project-quick-start` resolves the repository root; brainstorm's active-project test at `oat-brainstorm/SKILL.md:238` is cwd-relative in every mode), and the dashboard's LF-only lifecycle reader under a CRLF `state.md` (`state/generate.ts:242`). All three predate the branch and are cross-mode. Deferred by the operator on 2026-11-22. Trigger: the freestyle follow-up issue (subdirectory support across project skills; CRLF frontmatter reading).
- m01 integrated review cycle 2 J-2 case B (`reviews/archived/m01-integrated-review-2026-11-22T152500Z.md`; class new-hardening, Medium): after another checkout archives a synced project, the retained checkout's dashboard recommends `oat-project-complete`, whose entry fails pulling the archived ref (`state/generate.ts:959`). Pre-branch (`49aeb5075`), every mode, loud failure, nothing lost. Deferred by the operator on 2026-11-22. Trigger: the freestyle follow-up issue.
- m01 integrated review cycle 3 K-1 (`reviews/archived/m01-integrated-review-2026-11-22T174038Z.md`; class new-hardening, Medium): an active synced project with no pointer file on the branch and no checkout, whose `refs/oat/projects/<slug>` exists on origin, gets `directory missing` / `oat-project-open` from the dashboard and `missing` (exit 1) from `oat project status` instead of `oat project pull <slug>` (`project/unpulled-synced.ts:60`). In-branch since `b9359a6fc`, every mode; skills' Step 0 already pulls when the ref exists. Deferred by the operator on 2026-11-22. Trigger: the freestyle follow-up issue (probe the active remote ref when the pointer is absent).
- 2026-11-22 · operator decision (now or never): every deferral above is dropped, not deferred: p02 L5, p02 round 2 L1-L3 (closed in p04), R4-3, I-2 Create half, I-3, I-5, J-2 case B and K-1. No follow-up issue will be filed for them; the p08 intent's "file the follow-up issue for the deferred #420 items" is to be removed at m02 re-alignment.

## Deviations from Plan / Design

Document any intentional deviations from the brief. Include accepted review findings where the shipped implementation is source of truth and the brief needs alignment.

| Phase / Review        | Source Artifact                                  | Planned / Documented                                          | Actual / Accepted                                                                                                                                                 | Reason                                                                                                                       | Source of Truth | Follow-up                                        |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------ |
| p01 review L2         | plan.md Decisions (freestyle recommends nothing) | freestyle surfaces recommend `none`                           | a paused active freestyle project keeps the dashboard's mode-independent `oat project open` resume step; the router and every other dashboard route return `none` | resuming a paused active project is mode-independent, and the same dashboard/router split already exists for lifecycle modes | implementation  | none; p04 docs describe it                       |
| p02 (root direction)  | plan.md p04 Intent (docs pages)                  | the docs guide for `oat-project-freestyle` lands in p04       | the minimal `skill-docs.json` entry and guide anchor land in p02                                                                                                  | the docs skill-catalog check fails `pnpm check` for any phase that adds an eligible skill                                    | implementation  | p04 writes the full docs pages around the anchor |
| p04 review round 3 L1 | p04-code-review-2026-11-22T021641Z.md            | review fixes go through the original phase implementer handle | root made the one-sentence docs fix (p04-t08) itself                                                                                                              | smaller than a fix-mode resume and its gate run                                                                              | implementation  | the m01 milestone review covers it               |
| m01 exit review       | plan.md Gates decision                           | each manual review is a `## Reviews` row                      | the m01 Astra exit review is a note under the Reviews table and a Reviews and Gates line, with no `m01 \| code` row                                               | `oat project delivery check` reads the latest `m01` code row as the integrated review (`delivery/check.ts:365`)              | implementation  | integrated review via oat-project-review-provide |

## Final Summary (for PR/docs)

**What shipped:**

- [capability 1]

**Behavioral changes (user-facing):**

- [bullet]

**Key files / modules:**

- `[path]` - [purpose]

**Verification performed:**

- [tests/lint/typecheck/build/manual steps]

**Outcomes audit:**

- Outcome 1: [observed evidence (accepted phase, commit, or verification result) or the recorded deferral]

**Brief deltas (if any):**

- [what changed vs plan.md and why]

## References

- Brief: `plan.md`
- Research: `references/research/`
