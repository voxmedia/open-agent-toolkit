---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-22
oat_current_task_id: null
oat_generated: false
---

# Implementation: oat-project-split

**Started:** 2026-05-18
**Last Updated:** 2026-05-20

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase                                   | Status | Tasks | Completed |
| --------------------------------------- | ------ | ----- | --------- |
| Phase 1: Schema & pure-logic foundation | passed | 6     | 6/6       |
| Phase 2: oat-project-split skill        | passed | 7     | 7/7       |
| Phase 3: Listings & dashboard filter    | passed | 3     | 3/3       |
| Phase 4: Integration hooks              | passed | 4     | 4/4       |
| Phase 5: Reconcile + dogfood + ship     | passed | 5     | 5/5       |
| Review Fixes: Final review polish       | passed | 2     | 2/2       |

**Total:** 27/27 tasks completed
**Parallel groups:** `[['p02', 'p03']]` (after p01 completes)

---

## Reviews Received

### Review Received: plan (artifact)

**Date:** 2026-05-20
**Review artifact:** `reviews/archived/artifact-plan-review-2026-05-20.md`
**Review type:** `artifact` (invocation: `manual`)

**Findings:**

- Critical: 0
- Important: 3
- Medium: 0
- Minor: 0

**Disposition map:**

- `I1` — Missing production invocation path for split helpers — `resolve_in_artifact` — added new task **`p01-t06`** (CLI subcommands `oat project split evaluate-signals / validate-plan / run`); updated `p02-t02`–`p02-t05` to orchestrate via the CLI; updated `p04-t01` to call `pnpm run cli -- project split evaluate-signals`.
- `I2` — Speculative / wrong file paths — `resolve_in_artifact` — corrected paths in `p01-t01` (frontmatter + state-utils, not `state/schema.ts`), `p01-t02`, `p03-t01` (`commands/project/list.ts`), `p03-t02` (`commands/state/generate.ts`), plus their verification commands.
- `I3` — Revalidation flag leaks into global discovery template — `resolve_in_artifact` — removed `.oat/templates/discovery.md` modification from `p01-t02`; made `p02-t03` explicit that the seeded child discovery is written from scratch (not copied from the template), with `oat_inherited_context_revalidated: false` written by the seeder only.

**Plan delta:**

- Phase 1 grew from 5 → 6 tasks (added `p01-t06`).
- Total task count: 23 → 24.

**No fix tasks added** (artifact review — findings resolved as direct edits to `plan.md`).

**Next:** Re-run `oat-project-review-provide artifact plan` to verify the edits, or proceed to `oat-project-implement` with the corrected plan.

### Review Received: plan (artifact, re-review v2)

**Date:** 2026-05-20
**Review artifact:** `reviews/archived/artifact-plan-review-2026-05-20-v2.md`
**Review type:** `artifact` (invocation: `manual`)
**Review cycle:** 2 of 3

**Findings:**

- Critical: 0
- Important: 3
- Medium: 0
- Minor: 0

**Disposition map:**

- `I1` — `p01-t06` scheduled CLI orchestration before its helpers and omitted command registration — `resolve_in_artifact` — **reshaped `p01-t06`** to ship only `evaluate-signals` + `validate-plan` (pure-logic-only deps); **added `p02-t07`** at end of Phase 2 to ship `oat project split run` after `write-parent`/`seed-children`/`finalize`/`resume` exist; both tasks now include `packages/cli/src/commands/project/index.ts` registration.
- `I2` — State-validation tasks targeted files that don't own validation — `resolve_in_artifact` — **introduced `packages/cli/src/validation/project-state.ts`** as the dedicated cross-field validator (joins existing `validation/skills.ts`); `frontmatter.ts` now only recognizes new fields; `p01-t01`/`p01-t02` include an audit-then-wire step listing the lifecycle call sites (`commands/project/new/`, `commands/project/complete-state/`, the discovery-status-transition path).
- `I3` — Stale `packages/cli/src/projects/list/` path in `p03-t03` — `resolve_in_artifact` — corrected to `packages/cli/src/commands/project/list.integration.test.ts`. (Same path correction applied to `p02-t06`'s integration test directory as a consistency carryover.)

**Plan delta:**

- Phase 1 stays at 6 tasks (p01-t06 reshaped, scope narrowed).
- Phase 2 grew from 6 → 7 tasks (added `p02-t07` for `oat project split run`).
- Total task count: 24 → 25.

**No fix tasks added** (artifact review — findings resolved as direct edits to `plan.md`).

**Next:** Re-run `oat-project-review-provide artifact plan` to verify the v2 edits, or proceed to `oat-project-implement` with the corrected plan.

### Review Received: plan (artifact, re-review v3)

**Date:** 2026-05-20
**Review artifact:** `reviews/archived/artifact-plan-review-2026-05-20-v3.md`
**Review type:** `artifact` (invocation: `manual`)
**Review cycle:** 3 of 3

**Findings:**

- Critical: 0
- Important: 4
- Medium: 0
- Minor: 0

**Disposition map:**

- `I1` — `oat project split run --plan-file` could not enforce declared-vs-detected non-interactive behavior after normalization — `resolve_in_artifact` — introduced `SplitPlanDocument` as the command-boundary shape carrying `origin`, `interactive`, and the normalized `ChildPlan`; updated validation and run tasks to consume this document and test declared/detected non-interactive behavior at the actual CLI boundary.
- `I2` — `finalizeSplit` wrote the active project as a slug instead of a repo-relative project path — `resolve_in_artifact` — updated `p02-t04` to activate via `oat project open <child>` or a resolved `.oat/projects/<scope>/<child>` path, with a test against `.oat/config.local.json.activeProject`.
- `I3` — resume lacked durable child seed data — `resolve_in_artifact` — added `references/split-plan.json` on the coordination parent as the persisted `SplitPlanDocument`; updated parent writer, resume, integration tests, and design storage/error-handling rules to use it instead of reconstructing from `oat_children` slugs.
- `I4` — signal evaluator surface drifted from the accepted architecture — `resolve_in_artifact` — updated `design.md` to explicitly bless the shared pure-logic module plus `oat project split evaluate-signals` CLI adapter; updated hook tasks to use installed `oat` CLI syntax with `pnpm run cli --` only as a local-development fallback.

**Plan/design delta:**

- Phase/task counts unchanged: total remains 25 tasks.
- `p01-t04`, `p01-t06`, `p02-t02`, `p02-t04`, `p02-t05`, `p02-t06`, `p02-t07`, `p04-t01`, and `p04-t03` were refined in place.
- `design.md` now documents `SplitPlanDocument`, `references/split-plan.json`, CLI-backed signal evaluation, and repo-relative active child activation.

**No fix tasks added** (artifact review — findings resolved as direct edits to `plan.md` and `design.md`).

**Next:** This was the third plan review cycle. Do not continue automatic plan re-review looping without explicit user override; proceed with implementation or perform a manual approval check.

---

## Phase 1: Schema & pure-logic foundation

**Status:** passed
**Started:** 2026-05-18
**Completed:** 2026-05-20
**Review:** `reviews/archived/p01-review-2026-05-21-v3.md` (passed with 0 Critical, 0 Important)

### Phase Summary

**Outcome (what changed):**

- Added coordination-project state fields and validation for `oat_kind`, `decomposition`, parent/sibling/dependency linkage, and inherited-context revalidation.
- Added the split pure-logic foundation: signal evaluation, split payload normalization, child-plan DAG checks, and slug-collision detection.
- Added the first `oat project split` CLI surface for `evaluate-signals` and `validate-plan`.
- Added a validated discovery-completion boundary plus filesystem-aware state validation at project state write boundaries.

**Key files touched:**

- `packages/cli/src/validation/project-state.ts` - state/linkage validation rules.
- `packages/cli/src/projects/split/` - split signal, plan, and validation primitives.
- `packages/cli/src/commands/project/split/` - `evaluate-signals` and `validate-plan` CLI adapters.
- `packages/cli/src/commands/project/complete-discovery/` - child inherited-context revalidation boundary.
- `.oat/templates/state.md` - default state template fields.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/ src/commands/project/ src/projects/split/`
- Result: pass, 21 files / 197 tests.
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass.
- Run: `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit --pretty false`
- Result: pass.
- Run: `pnpm lint && pnpm type-check`
- Result: pass on reviewer standalone rerun; one earlier parallel run hit a transient asset-copy failure.

**Notes / Decisions:**

- The actual discovery-completion boundary is now a CLI command so skill prose can delegate validation instead of mutating `discovery.md` directly.
- Minor non-blocking review finding remains: duplicate signal inputs can still count twice in `evaluateSignals`.

### Task p01-t01: Add `oat_kind` + `decomposition` phase to OAT state schema

**Status:** completed
**Commit:** `dbb26788`

**Outcome:**

- OAT state now recognizes implementation vs coordination projects and enforces decomposition-phase rules.

**Files changed:**

- `.oat/templates/state.md` - added default state fields.
- `packages/cli/src/commands/shared/frontmatter.ts` - recognized new frontmatter fields.
- `packages/cli/src/validation/project-state.ts` - added validation entrypoint.
- `packages/cli/src/commands/project/{new,complete-state,open,pause}/` - added write-boundary validation.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/ src/commands/project/ src/projects/split/`
- Result: pass.

**Notes / Decisions:**

- Validation lives in `packages/cli/src/validation/project-state.ts`; frontmatter parsing stays shape-only.

**Issues Encountered:**

- None.

---

### Task p01-t02: Add parent/sibling/depends-on + inherited-revalidated fields

**Status:** completed
**Commit:** `13e6f5b3`, fixes `b15a39b6`, `52287006`, `25a78110`, `2fd92666`

**Outcome:**

- Child linkage and inherited-context rules are recognized and enforced, including the planned split-child shape where `state.md` owns `oat_parent` and seeded `discovery.md` owns `oat_inherited_context_revalidated`.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/ src/commands/project/ src/projects/split/`
- Result: pass.

**Notes:**

- Phase review required two fix iterations before p01 passed.

---

### Task p01-t03: Signal evaluator module + unit tests

**Status:** completed
**Commit:** `7e1f0ada`

**Outcome:**

- Added signal evaluation and confidence tiers for split detection.

---

### Task p01-t04: `SplitPlanDocument` normalization module + unit tests

**Status:** completed
**Commit:** `60d0e496`

**Outcome:**

- Added normalized `SplitPlanDocument` carrying origin, interactivity, and child plan data.

---

### Task p01-t05: DAG validator + slug-collision detector + unit tests

**Status:** completed
**Commit:** `dc17e4fd`, fix `34e9aec4`

**Outcome:**

- Added child-plan DAG validation and parent/child slug collision detection against existing project slugs.

---

### Task p01-t06: Expose `evaluate-signals` + `validate-plan` via `oat project split` CLI subcommands

**Status:** completed
**Commit:** `325d1bd1`, fix `34e9aec4`

**Outcome:**

- Registered `oat project split evaluate-signals` and `oat project split validate-plan` for downstream skill hooks and Phase 2 orchestration.

---

## Phase 2: oat-project-split skill

**Status:** passed
**Started:** 2026-05-20
**Completed:** 2026-05-20
**Review:** `reviews/archived/p02-review-2026-05-21-v3.md` (passed with 0 Critical, 0 Important)

### Task p02-t01: Create `oat-project-split` SKILL.md skeleton

**Status:** completed
**Commit:** `5906e31f`

---

### Task p02-t02: Coordination parent writer (scaffold + normalize)

**Status:** completed
**Commit:** `0650238b`, fix `31baa6ae`

---

### Task p02-t03: Child scaffolder + seeder

**Status:** completed
**Commit:** `59efcd24`

---

### Task p02-t04: Parent completion + active-child selection

**Status:** completed
**Commit:** `6c13120d`

---

### Task p02-t05: Resume mode (partial-state detection + reconstruction)

**Status:** completed
**Commit:** `4acf4533`, fix `16810d27`

---

### Task p02-t06: Integration test suite (fixture-based)

**Status:** completed
**Commit:** `2fb86442`, fix `b49de59f`

---

### Task p02-t07: Add `oat project split run` subcommand (orchestrated end-to-end split)

**Status:** completed
**Commit:** `2467d7f6`, fixes `123c7c0b`, `9a32d92b`

**Outcome:**

- Standalone `oat-project-split` skill and `oat project split run` now create coordination parents, seed children, finalize active child selection, persist/resume durable split plans, enforce effective non-interactive detected fail-fast behavior, and require explicit confirmation before resume writes.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/projects/split/ src/commands/project/split/`
- Result: pass, 12 files / 49 tests.
- Run: `pnpm oat:validate-skills`
- Result: pass, 49 oat-\* skills validated.
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass.
- Run: `pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit --pretty false`
- Result: pass.

**Notes:**

- The declared p02/p03 parallel group degraded to sequential because worktree bootstrap baseline reported Codex provider drift/missing entries in the phase worktree.
- Medium p02 review finding remains: p02-t06 does not mirror the full planned integration matrix; hook wording/picker assertions are expected in p04.

---

## Phase 3: Listings & dashboard filter

**Status:** pending
**Started:** -

### Task p03-t01: `oat project list` filter + `--include-coordination` flag

**Status:** completed
**Commit:** `c74fb982`

---

### Task p03-t02: Dashboard `## Decompositions` section

**Status:** completed
**Commit:** `bdffa118`

---

### Task p03-t03: List + dashboard end-to-end test

**Status:** completed
**Commit:** `f320170f`

**Outcome:**

- Terminal coordination parents are hidden from default project listings, exposed via `--include-coordination`, and grouped under `## Decompositions` in the dashboard.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/list.test.ts src/commands/state/generate.test.ts src/commands/project/list.integration.test.ts`
- Result: pass, 3 files / 27 tests.
- Run: `pnpm lint && pnpm type-check`
- Result: pass.

---

## Phase 4: Integration hooks

**Status:** pending
**Started:** -

### Task p04-t01: Detection hook in `oat-project-discover`

**Status:** completed
**Commit:** `356ba9aa`, fix `e8aac7a1`

---

### Task p04-t02: Declared-mode + boundary question in `oat-brainstorm`

**Status:** completed
**Commit:** `7e8db68c`

---

### Task p04-t03: Conditional "Promote to N projects" picker option in `oat-brainstorm`

**Status:** completed
**Commit:** `3c41fc75`

---

### Task p04-t04: Skill-simulation integration tests for the hooks

**Status:** completed
**Commit:** `51c5c530`

**Outcome:**

- `oat-project-discover` and `oat-brainstorm` now delegate split detection/handoff to the split skill instead of duplicating split mechanics, including non-interactive detected fail-fast behavior.
- Brainstorm supports declared multi-project intent and conditional `Promote to N projects` handoff.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/__tests__/skills/discover-detection.test.ts src/__tests__/skills/brainstorm-handoff.test.ts`
- Result: pass.
- Run: `pnpm oat:validate-skills`
- Result: pass.
- Run: `pnpm lint && pnpm type-check`
- Result: pass.

**Notes:**

- Medium p04 review finding remains: tests are helper/string based rather than full transcript/AskUserQuestion fixtures.

---

## Phase 5: Reconcile + dogfood + ship

**Status:** passed
**Started:** 2026-05-21
**Completed:** 2026-05-21
**Review:** `reviews/archived/p05-review-2026-05-21-v4.md` (passed with 0 Critical, 0 Important)

### Phase Summary

**Outcome (what changed):**

- Reconciled backlog item `bl-3a4a` with the settled coordination-parent design.
- Dogfooded declared, detected mid-stream, detected convergence, and resume split paths with file-backed evidence.
- Fixed p05 dogfood findings: quick-routing state for split children, coordination-parent state prose, detected active-parent conversion, and coordination status/list rendering.
- Bumped touched skill versions and lockstep public package versions.

**Key files touched:**

- `.oat/repo/reference/backlog/items/sub-project-split-escape-hatch.md` - reconciled backlog traceability.
- `.oat/projects/shared/oat-project-split/dogfood/` - declared, detected, and resume dogfood evidence.
- `packages/cli/src/commands/project/split/run.ts` - detected active-parent conversion path.
- `packages/control-plane/src/` - preserved decomposition coordination status and inert recommendations.
- `.agents/skills/oat-project-split/SKILL.md`, `.agents/skills/oat-project-discover/SKILL.md`, `.agents/skills/oat-brainstorm/SKILL.md` - skill version bumps.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split/__tests__/run.test.ts src/commands/project/status.test.ts src/commands/project/list.test.ts src/commands/project/list.integration.test.ts`
- Result: pass, 4 files / 33 tests.
- Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts src/recommender/router.test.ts src/project.test.ts`
- Result: pass, 3 files / 25 tests.
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass.
- Run: `pnpm --filter @open-agent-toolkit/control-plane type-check`
- Result: pass.
- Run: `pnpm format`
- Result: pass.
- Run: `pnpm release:validate`
- Result: pass in p05 review v4.

**Notes / Decisions:**

- The p05 review loop required live dogfood beyond the initial command-boundary fixtures. The release-blocking issues found by dogfood were fixed before p05 was marked passed.
- `project split validate-plan` still rejects plans whose detected parent slug already exists before run; `project split run` intentionally supports the active detected parent conversion path. This is recorded as dogfood friction, not a release blocker.

### Task p05-t01: Reconcile `bl-3a4a` backlog item

**Status:** completed
**Commit:** `99c2d6d8`

**Outcome:**

- Backlog item `bl-3a4a` now reflects the shipped coordination-parent model and trigger surfaces.

---

### Task p05-t02: Dogfood declared path

**Status:** completed
**Commit:** `370cbcc9`, fixes `6ad278fe`, `3f3b94f0`, live evidence `e9815dbd`

**Outcome:**

- Declared multi-project entry dogfood produced a coordination parent and child project tree, with captured prompts and rough edges.

---

### Task p05-t03: Dogfood detected path

**Status:** completed
**Commit:** `b2d4f2ef`, fixes `edd96f40`, `931f5f16`, `e9f873bf`, `601fda7a`, `39d55bb5`

**Outcome:**

- Detected mid-stream and convergence dogfood captured actual prompts, split documents, resulting trees, and the active-parent conversion behavior.

---

### Task p05-t04: Dogfood resume

**Status:** completed
**Commit:** `89a28fca`

**Outcome:**

- Resume dogfood exercised persisted split-plan recovery and missing-child completion.

---

### Task p05-t05: SKILL versions + lockstep public package bumps

**Status:** completed
**Commit:** `9359273b`

**Outcome:**

- Touched OAT skills carry version bumps and the five public packages were bumped in lockstep.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 — 2026-05-20 21:19

**Branch:** chore/orient-subproject-split-backlog
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p01   | DONE_WITH_CONCERNS | pass   | 2/2            | completed   |

#### Parallel Groups

- p01: sequential

#### Outstanding Items

- Minor review finding remains: duplicate fired signals can still falsely cross the split threshold.

### Run 2 — 2026-05-20 22:09

**Branch:** chore/orient-subproject-split-backlog
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p02   | DONE_WITH_CONCERNS | pass   | 2/2            | completed   |

#### Parallel Groups

- Declared group `[p02, p03]` degraded to sequential before phase dispatch.
- Reason: `oat-worktree-bootstrap-auto` created p02/p03 worktrees at the correct base, but strict baseline failed during `oat status --scope project` because Codex provider entries were missing/drifted in the worktree.

#### Outstanding Items

- Medium p02 review finding remains: p02-t06 does not mirror the full planned integration matrix. Hook wording/picker coverage is expected in p04.

### Run 3 — 2026-05-20 22:19

**Branch:** chore/orient-subproject-split-backlog
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p03   | DONE        | pass   | 0/2            | completed   |

#### Parallel Groups

- p03: sequential after p02 because the declared p02/p03 worktree group degraded before p02 dispatch.

#### Outstanding Items

- None.

### Run 4 — 2026-05-20 22:38

**Branch:** chore/orient-subproject-split-backlog
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p04   | DONE        | pass   | 1/2            | completed   |

#### Parallel Groups

- p04: sequential

#### Outstanding Items

- Medium p04 review finding remains: hook tests do not use full transcript/AskUserQuestion fixtures.

### Run 5 — 2026-05-21 04:45

**Branch:** chore/orient-subproject-split-backlog
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p05   | DONE_WITH_CONCERNS | pass   | 2/2            | completed   |

#### Parallel Groups

- p05: sequential

#### Outstanding Items

- `project split validate-plan` reports slug collisions for detected active-parent conversion plans before run, while `project split run` succeeds by design.
- Installed `oat` command lagged the local CLI during dogfood; dogfood used the local `pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts` path.

### Final Review — 2026-05-21

**Review:** `reviews/archived/final-code-review-2026-05-21-v2.md` (passed with 0 Critical, 0 Important)

**Fix summary:**

- Enforced coordination-parent invariants in state/filesystem validation.
- Added transcript + stubbed AskUserQuestion hook fixtures for discover and brainstorm split handoffs.
- Deduplicated split signals before threshold evaluation.

### Review Received: final (v3 independent re-evaluation)

**Date:** 2026-05-21
**Review artifact:** `reviews/archived/final-code-review-2026-05-21-v3.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 4

**New tasks added:** `p-rev1-t01`, `p-rev1-t02`

**Converted Minor findings:**

- `m2` — stale declared dogfood display note.
- `m4` — stale declared dogfood state-body limitation note.

**Deferred Findings (Minor):**

- `m1` — `validate-plan` rejects persisted split plans after run. Deferred because it is a moderate CLI semantics/API change (`--for-resume` / `--allow-existing`) rather than a small polish edit, and current `run` behavior is correct.
- `m3` — active detected-parent conversion UX logging. Deferred because it is non-blocking command UX polish and should be handled with a focused follow-up test rather than blocking final closeout.

**Next:** Review-fix tasks completed in `p-rev1`; final re-review/receive remains the next lifecycle gate if needed before PR closeout.

### Run 4 — 2026-05-22 14:38

**Branch:** chore/orient-subproject-split-backlog
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase  | Implementer | Review | Fix Iterations | Disposition |
| ------ | ----------- | ------ | -------------- | ----------- |
| p-rev1 | DONE        | pass   | 0/2            | committed   |

#### Parallel Groups

- `p-rev1`: sequential revision phase

#### Outstanding Items

- None

#### Review Artifact

- `reviews/archived/p-rev1-review-2026-05-22.md`

### Final Review Passed: final (2026-05-22)

**Review artifact:** `reviews/archived/final-review-2026-05-22.md`
**Verdict:** pass for merge readiness
**Findings:** 0 Critical, 0 Important, 2 Minor

**Disposition:**

- `m1` — deferred Minor follow-up for post-run `validate-plan` semantics (`--for-resume` / `--allow-existing` or pre-run-only docs).
- `m3` — deferred Minor follow-up for active detected-parent conversion CLI logging.

**Next:** Final review gate is closed; continue with configured post-implementation sequence (`docs-pr`).

<!-- orchestration-runs-end -->

---

## Revision Phase 1: Final review polish

**Status:** passed
**Started:** 2026-05-22
**Completed:** 2026-05-22
**Review:** `reviews/archived/p-rev1-review-2026-05-22.md` (passed with 0 Critical, 0 Important, 0 Minor)

### Task p-rev1-t01: Annotate fixed coordination list display dogfood note

**Status:** completed
**Commit:** `e6c018a8`

**Verification:**

- Run: `pnpm run cli -- project list --include-coordination`
- Result: pass

---

### Task p-rev1-t02: Annotate fixed coordination parent state-body dogfood note

**Status:** completed
**Commit:** `aa3e17a3`

**Verification:**

- Run: `rg -n "N/A \\(coordination parent\\)|project list --include-coordination" .oat/projects/shared/oat-project-split/dogfood/declared.md`
- Result: pass

---

## Implementation Log

Chronological log of implementation progress.

### 2026-05-18

**Session Start:** {time}

- [x] p01-t01: Add `oat_kind` + `decomposition` phase to OAT state schema - `dbb26788`
- [x] p01-t02: Add parent/sibling/depends-on + inherited-revalidated fields - `13e6f5b3`, fixes `b15a39b6`, `52287006`, `25a78110`, `2fd92666`
- [x] p01-t03: Signal evaluator module + unit tests - `7e1f0ada`
- [x] p01-t04: `SplitPlanDocument` normalization module + unit tests - `60d0e496`
- [x] p01-t05: DAG validator + slug-collision detector + unit tests - `dc17e4fd`, fix `34e9aec4`
- [x] p01-t06: Expose `evaluate-signals` + `validate-plan` via `oat project split` CLI subcommands - `325d1bd1`

**What changed (high level):**

- Phase 1 foundation is implemented and passed code review after two fix iterations.
- The next implementation target is the p02/p03 parallel group.

**Decisions:**

- Root validation commands may hit transient bundle asset-copy races when run in parallel; standalone reviewer reruns passed.

**Follow-ups / TODO:**

- Consider deduping duplicate fired signals in a later fix; current review rates it Minor.

**Blockers:**

- None.

**Session End:** 21:19

---

### 2026-05-18

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase  | Tests Run                                                                                          | Passed | Failed | Coverage                                       |
| ------ | -------------------------------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------- |
| 1      | -                                                                                                  | -      | -      | -                                              |
| 2      | -                                                                                                  | -      | -      | -                                              |
| 5      | Focused CLI/control-plane split/status/list tests; format; package type-checks; release validation | yes    | 0      | p05 review-fix and dogfood regression coverage |
| final  | Review receive converted selected Minor findings to dogfood annotation tasks                       | n/a    | n/a    | bookkeeping only                               |
| p-rev1 | Task-level dogfood checks plus subagent code review                                                | yes    | 0      | Dogfood evidence annotations                   |

## Final Summary (for PR/docs)

**What shipped:**

- Standalone `oat-project-split` mechanics for coordination parents, child scaffolding/seeding, resume, and activation.
- Detection/handoff hooks from `oat-project-discover` and `oat-brainstorm`.
- Project list/dashboard/status behavior for completed coordination parents.
- Dogfood evidence for declared, detected mid-stream, detected convergence, and resume paths.

**Behavioral changes (user-facing):**

- OAT can decompose a broad discovery or brainstorm into a coordination parent plus focused child implementation projects, then activate the first child.
- Completed coordination parents are hidden from default project lists and shown as inert decomposition records when explicitly included.

**Key files / modules:**

- `packages/cli/src/projects/split/` - split model, validation, parent/child writers, resume, and finalization.
- `packages/cli/src/commands/project/split/` - CLI adapters for split evaluation, validation, and run.
- `.agents/skills/oat-project-split/SKILL.md` - standalone split workflow skill.
- `.agents/skills/oat-project-discover/SKILL.md` and `.agents/skills/oat-brainstorm/SKILL.md` - split handoff integration hooks.
- `packages/control-plane/src/` - coordination status/list recommendation handling.

**Verification performed:**

- Phase-scoped vitest suites for split primitives, split run, project list/status/dashboard behavior, and skill hook simulations.
- Final verification passed: `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build`, and `pnpm release:validate`.
- Live dogfood documented in `.oat/projects/shared/oat-project-split/dogfood/`.
- Final review polish verification passed for dogfood evidence annotations in `p-rev1`.

**Design deltas (if any):**

- Detected split run now explicitly supports converting the active discovery project into the coordination parent when the detected parent slug already exists.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
