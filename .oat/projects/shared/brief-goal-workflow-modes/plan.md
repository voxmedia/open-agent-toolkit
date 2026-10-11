---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-10
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: ['p12'] # quick mode cannot express 'none'; [] would mean every phase. Final-phase checkpoint only; under OAT_AUTONOMOUS it auto-reviews and continues.
oat_plan_parallel_groups: [['p02', 'p03', 'p04'], ['p05', 'p06', 'p07']] # groups of phases that run concurrently in worktrees
oat_plan_source: quick # spec-driven | quick | imported | lite
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: brief-goal-workflow-modes

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Add the `brief` (one delivery) and `goal` (many milestones) OAT workflow modes designed in `design.md`: one approved Project Brief in `plan.md`, phases with intent and exit evidence instead of tasks, a phase-unit progress contract, execution-record tasks, anchor-based review scope, a brief entry skill with the standard review ladder, and, after the v1 progress PR, the goal milestone loop with its delivery registry.

**Architecture:** A mode-family seam (`isBriefMode`) in the control plane selects a phase-unit progress contract at the two project readers; the router gains a brief-unit guard and brief routes; the CLI gains plan profiles, two templates, scaffold entries and a brief→quick promotion; lifecycle skills and agent roles gain brief-mode branches at the lines where they read tasks today. Goal lands on the same seam in v1.5 with a transition contract, delivery registry and closeout coverage predicate, after a mandatory Astra re-review of the carried objections.

**Tech Stack:** TypeScript ESM (Node 22), vitest, oxlint/oxfmt, Markdown skill contracts under `.agents/skills`, agent roles under `.agents/agents` with generated provider projections, Fumadocs docs app.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): register brief workflow mode`

**Staged delivery:** phases p01–p08 are v1 (brief) and end with `oat-project-pr-progress`; phases p09–p12 are v1.5 (goal). Before p09 starts, the design section "Carried to the v1.5 review" is resolved with Astra (gpt-6-astra, high) in a plan-revision round and p09–p12 are revised accordingly; they are planned here at the resolution available today.

**Operating rules for this run (from discovery, 2026-10-10):** no HiLL checkpoints; dispatch ceiling frontier with delegated implementers and reviewers on Claude Opus 5.5 at high effort; at a review cap run the complexity review, apply its recommendation, log it and continue; open PRs, never merge; decision records authored during the work; fetch `origin/main` and reconcile planned paths at every phase start and before every parallel dispatch.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (none)
- [x] Set `oat_plan_hill_phases` in frontmatter (`['p12']`: quick mode has no representation for none, and `[]` means every phase)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Group 1 `['p02', 'p03', 'p04']` runs after p01 lands the registry and parser contract. Write sets are disjoint: p02 owns `packages/control-plane/src/recommender/router.ts` (+test) and `packages/cli/src/commands/state/generate.ts` (+tests, `status.test.ts`); p03 owns `.oat/templates/*`, `packages/cli/src/commands/project/new/scaffold.ts` (+tests), `packages/cli/scripts/bundle-inputs.mjs`, `packages/cli/src/commands/tools/shared/pack-manifest.ts` (+test), `packages/cli/assets/templates/*` and the brief case in `commands.integration.test.ts`; p04 owns `packages/cli/src/commands/project/validate-plan/*`, `packages/cli/src/commands/project/promote/*` (+tests) and `packages/control-plane/src/state/quick-plan-readiness.ts` (+test). None shares generated output, lockfiles or fixtures; each verifies with its own scoped vitest runs and is a coherent deliverable alone. `help-snapshots.test.ts` is updated in p01 (mode choices) and not touched by the group.

Group 2 `['p05', 'p06', 'p07']` runs after group 1 merges. p05 owns the new `oat-project-brief` skill, `references/brief-contract.md`, `packages/cli/src/commands/shared/frontmatter.ts` (`GATE_AWARE_SKILLS`), the skill entry in `pack-manifest.ts`, and the planning-surface skills (plan-writing, plan, next, progress, discover, autonomous, new, lite, import-plan, promote-spec-driven, capture, docs, pjm-review-backlog, wave-execute); p06 owns `oat-project-implement/**`, `oat-project-quick-start/SKILL.md`, `oat-project-dispatch-subagents/SKILL.md`, `.agents/agents/*.md` and the regenerated projections; p07 owns review-provide, review-receive, reconcile, summary, pr-progress, pr-final, revise, complete, document and brainstorm (including `references/destinations.md`). Skill version bumps and the contract tests that pin cross-skill prose are deliberately deferred to p08 so no group member edits a shared test file. Projections (`.codex/agents`, `.cursor/agents`) are regenerated only in p06; p05 and p07 do not run `oat sync`.

p01 and p08 are sequential fan-in points. p09–p12 are sequential: p10 needs p09's registration, p11 needs p10's commands, p12 is the fan-in.

---

## Dispatch Profile

| Phase | Named ceiling | Rationale                                                                                                                    |
| ----- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| p01   | frontier      | Parser contract change with cross-mode regression risk; user asked for Opus 5.5 high implementers under the frontier ceiling |
| p08   | frontier      | Fan-in, contract tests, release gates and the v1 progress PR                                                                 |
| p12   | frontier      | Fan-in for the goal delivery and the final PR                                                                                |

All other phases use the project ceiling (frontier) with runtime selection; the implementer target chosen for this run is Claude Opus 5.5 at high effort.

---

RED/GREEN/Refactor is the recommended default where work is testable. Skill and docs tasks use a non-TDD shape with an explicit verification command.

## Phase 1: Control-plane registry and phase-unit contract

### Task p01-t01: Register `brief` and the mode-family predicate

**Files:**

- Modify: `packages/control-plane/src/types.ts` (add `brief` to `WORKFLOW_MODES`; add `BRIEF_MODES`, `BriefMode`, `isBriefMode`)
- Modify: `packages/control-plane/src/index.ts` (export the predicate if the barrel is explicit)
- Modify: `packages/control-plane/src/state/parser.test.ts` (modes pin at `:223-224`; parse `brief`)
- Modify: `packages/cli/src/commands/project/new/scaffold.ts` (`TEMPLATES_BY_MODE.brief` and `STATE_TEMPLATE_BY_MODE.brief` entries so the `Record<WorkflowMode, …>` maps compile; full behavior lands in p03)
- Modify: `packages/cli/src/commands/project/new/index.test.ts` (`:22` mode union, `:147-157` choices)
- Modify: `packages/cli/src/commands/help-snapshots.test.ts` (`--mode` choices snapshot `:1353-1354`)
- Modify: `packages/control-plane/README.md` (mode list prose `:31-32`)

**Step 1: Write test (RED)**

Extend `parser.test.ts`: `WORKFLOW_MODES` equals the five-mode list; `oat_workflow_mode: brief` parses to `brief`; `isBriefMode('brief')` is true and `isBriefMode('quick' | 'lite' | null)` is false.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts`
Expected: fails on the modes pin and the missing predicate.

**Step 2: Implement (GREEN)**

```typescript
export const WORKFLOW_MODES = [
  'spec-driven',
  'quick',
  'import',
  'lite',
  'brief',
] as const;
export const BRIEF_MODES = ['brief'] as const;
export type BriefMode = (typeof BRIEF_MODES)[number];
export function isBriefMode(
  mode: WorkflowMode | null | undefined,
): mode is BriefMode {
  return mode != null && (BRIEF_MODES as readonly string[]).includes(mode);
}
```

Add the scaffold map entries (`brief: [state.md, {source: 'plan-brief.md', target: 'plan.md'}, {source: 'implementation-brief.md', target: 'implementation.md'}]` and a `STATE_TEMPLATE_BY_MODE.brief` mirroring lite's plan-phase start with brief wording). Update the CLI tests and snapshot.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/index.test.ts src/commands/help-snapshots.test.ts`
Expected: pass.

**Step 3: Verify**

Run: `pnpm type-check`
Expected: no errors (the `Record<WorkflowMode, …>` maps compile).

**Step 4: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/index.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/README.md packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/index.test.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t01): register brief workflow mode and isBriefMode predicate"
```

---

### Task p01-t02: Phase-unit parsing with strict markers

**Files:**

- Modify: `packages/control-plane/src/state/tasks.ts` (`parsePhaseMarkers`, `parseProvisionalPhaseIds`, `TaskProgressOptions`, `phaseUnits` branch in `parsePhaseProgress`/`parseTaskProgress`)
- Modify: `packages/control-plane/src/state/tasks.test.ts`

**Step 1: Write test (RED)**

Brief mode (`{ phaseUnits: true }`): a plan with two taskless phases and a journal with `**Status:** completed` under phase 1 yields `total 2, completed 1`, each phase `unit: 'phase'`; a `### Task p01-t01` whose completed line sits after the task heading does **not** complete phase 1 (ownership ends at any `#` line); `**Provisional:** yes` in the plan overrides a journal completion; a task heading in the plan does not change `total`; `taskRecords` counts journal records only; `p-revN` phases count as units; `**Status:** completed # note` is not a marker. Task mode (default): a taskless phase heading is dropped (new pin) and the existing suite is unchanged.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/tasks.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

Implement the precedence from `design.md` "Phase-unit progress contract" (extracted handling is added in p09; in v1 an `extracted` status is treated as `pending`). Keep the task-mode path byte-for-byte; the new fields are added to the phase objects only inside the `phaseUnits` branch.

Run: the same scoped command. Expected: pass.

**Step 3: Prove it can fail**

Temporarily remove the "ownership ends at any heading" check, confirm the task-completes-phase case fails, restore. Record the evidence line in `implementation.md`.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane check && pnpm type-check`
Expected: no errors.

**Step 5: Commit**

```bash
git add packages/control-plane/src/state/tasks.ts packages/control-plane/src/state/tasks.test.ts
git commit -m "feat(p01-t02): phase-unit progress parsing with strict journal markers"
```

---

### Task p01-t03: Public type fields, scope seam and reader wiring

**Files:**

- Modify: `packages/control-plane/src/types.ts` (optional `unit`, `provisional`, `taskRecords` on `PhaseProgress`)
- Modify: `packages/control-plane/src/state/tasks.ts` (`selectPhaseUnits`)
- Modify: `packages/control-plane/src/project.ts` (`:46`, `:122` pass `{ phaseUnits: isBriefMode(parsedState.workflowMode) }`)
- Modify: `packages/control-plane/src/project.test.ts` (or the existing reader test file; add brief fixtures)
- Modify: `packages/control-plane/src/state/tasks.test.ts` (`selectPhaseUnits` ordering and `null` scope)

**Step 1: Write test (RED)**

Through `readProjectState` (both readers): a brief project with a taskless accepted phase reports `progress.total 1, completed 1`; the same files under `oat_workflow_mode: quick` report `total 0`; `selectPhaseUnits(progress, ['p03','p01'])` returns p01 then p03 (document order) and `null` returns all.

**Step 2: Implement (GREEN)** then run `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/project.test.ts src/state/tasks.test.ts`.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/control-plane exec vitest run`
Expected: full package suite passes (existing `toEqual` pins unchanged).

**Step 4: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/state/tasks.ts packages/control-plane/src/project.ts packages/control-plane/src/project.test.ts packages/control-plane/src/state/tasks.test.ts
git commit -m "feat(p01-t03): phase-unit fields, selectPhaseUnits seam and reader wiring"
```

---

## Phase 2: Router and dashboard routes

### Task p02-t01: Brief routes and mode-aware planning ownership

**Files:**

- Modify: `packages/control-plane/src/recommender/router.ts` (`BRIEF_ROUTES` with explicit `plan:in_progress:3`, `plan:in_progress:2`, `plan:complete:1`, `implement:in_progress:any`; `case 'brief'` in `getWorkflowRoutes`; mode-aware `CURRENT_PHASE_SKILLS` lookup used by `getHillOverride` so the plan phase maps to `oat-project-brief` for brief modes)
- Modify: `packages/control-plane/src/recommender/router.test.ts`

**Step 1: Write test (RED)**: brief at `plan:in_progress` tier 3 and tier 2 → `oat-project-brief`; `plan:complete` → implement; a brief with a pending plan HiLL checkpoint → `oat-project-brief`; a test that every value in `WORKFLOW_MODES` has an explicit route table (behavioral: recommend for each mode at `plan:in_progress:3` and assert none falls to the spec-driven skill except spec-driven).

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`.

**Step 3: Commit**

```bash
git add packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts
git commit -m "feat(p02-t01): brief routes and mode-aware planning ownership"
```

---

### Task p02-t02: Brief-unit guard before post-implementation routing

**Files:**

- Modify: `packages/control-plane/src/recommender/router.ts` (guard after `getHillOverride`, conditioned on `state.phase === 'implement'`, `isBriefMode`, `lifecycle !== 'complete'`, `hasIncompletePhaseUnit(selectPhaseUnits(progress, null))`)
- Modify: `packages/control-plane/src/recommender/router.test.ts`

**Step 1: Write test (RED)**: brief at `implement:complete` with an incomplete ordinary unit → implement with reason "Incomplete phase-units remain"; same with `pr_open`; provisional phase counts as incomplete; `lifecycle: complete` does not reopen; brief at `plan:in_progress` with an incomplete phase still routes to `oat-project-brief` (guard inert outside implement); brief with all units accepted and no summary → `oat-project-summary` (lite exemption not extended); quick behavior unchanged (existing cases).

**Step 2: Implement (GREEN)**; run the scoped router test.

**Step 3: Prove it can fail**: drop the `phase === 'implement'` condition, confirm the planning case fails, restore; record in `implementation.md`.

**Step 4: Commit**

```bash
git add packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts
git commit -m "feat(p02-t02): brief-unit guard before post-implementation routing"
```

---

### Task p02-t03: Dashboard route map, help text and parity

**Files:**

- Modify: `packages/cli/src/commands/state/generate.ts` (`routeMap` keys for `brief:plan:*`, `brief:implement:*`; Quick Commands help line for `oat-project-brief`; Mode row)
- Modify: `packages/cli/src/commands/state/generate.test.ts` (all-modes routing, help line, parity with `recommendSkill`)
- Modify: `packages/cli/src/commands/project/status.test.ts` (brief route for a not-ready plan)

**Step 1: Write test (RED)**: generate a dashboard for a brief project in each phase/status and assert the same skill `recommendSkill` returns; the help block lists `oat-project-brief`.

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts src/commands/project/status.test.ts`.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts packages/cli/src/commands/project/status.test.ts
git commit -m "feat(p02-t03): dashboard routes and help text for brief mode"
```

---

## Phase 3: Templates and scaffold

### Task p03-t01: Brief plan and journal templates with bundle registration

**Files:**

- Create: `.oat/templates/plan-brief.md` (frontmatter identical to `plan.md` with `oat_plan_source: brief`, `oat_template_name: plan-brief`; body per `design.md` "plan-brief.md" with the strict phase block grammar and a `## Milestones` placeholder comment reserved for goal)
- Create: `.oat/templates/implementation-brief.md` (per `design.md` "implementation-brief.md": phase sections with `**Status:**`, `**Base:**`, `**Head:**`, `**Executor:**`, execution-record task block example, orchestration-run markers, dated log)
- Modify: `.oat/templates/state.md` (`oat_workflow_mode` comment lists `brief`; note that `oat_hill_checkpoints: []` means none for brief modes)
- Modify: `.oat/templates/plan.md` (`oat_plan_source` comment lists `brief`)
- Modify: `packages/cli/scripts/bundle-inputs.mjs` (`templateFiles` adds both)
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts` (template entries)
- Create (force-add): `packages/cli/assets/templates/plan-brief.md`, `packages/cli/assets/templates/implementation-brief.md`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts` (`PROJECT_TEMPLATE_NAMES`; bundled floor test for both)
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.test.ts`

**Steps:** write the templates; register; run `bash packages/cli/scripts/bundle-assets.sh` and `git add -f` the two bundled copies; extend the tests.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/tools/shared/pack-manifest.test.ts` passes; `node packages/cli/dist/index.js template resolve plan-brief --output /tmp/pb.md` after `pnpm --filter @open-agent-toolkit/cli build` resolves from the repository tier.

**Commit:**

```bash
git add .oat/templates packages/cli/scripts/bundle-inputs.mjs packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/src/commands/project/new/scaffold.test.ts
git add -f packages/cli/assets/templates/plan-brief.md packages/cli/assets/templates/implementation-brief.md
git commit -m "feat(p03-t01): plan-brief and implementation-brief templates with bundle registration"
```

---

### Task p03-t02: Scaffold behavior for brief projects

**Files:**

- Modify: `packages/cli/src/commands/project/new/scaffold.ts` (complete `TEMPLATES_BY_MODE.brief` and `STATE_TEMPLATE_BY_MODE.brief`: phase `plan`, status `in_progress`, hill `[]`, artifact and progress bullets, next milestone text; `references/research/.gitkeep`; re-add `oat_template: true` to `plan.md` as lite does)
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts` (end-to-end `project new --mode brief` then route → `oat-project-brief`)

**Step 1: Write test (RED)**: scaffolding `--mode brief` creates `state.md`, `plan.md` (from plan-brief, `oat_template: true`, `oat_plan_source: brief`), `implementation.md` (from implementation-brief), `references/research/.gitkeep`, `reviews/`, `pr/`; `state.md` has `oat_workflow_mode: brief`, `oat_phase: plan`; dashboard routes to `oat-project-brief`.

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/commands.integration.test.ts`.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/scaffold.test.ts packages/cli/src/commands/commands.integration.test.ts
git commit -m "feat(p03-t02): scaffold brief projects with research references and brief templates"
```

---

## Phase 4: Plan profiles, promotion and readiness

### Task p04-t01: Plan profiles in validate-plan

**Files:**

- Create: `packages/cli/src/commands/project/validate-plan/profiles.ts` (`PlanProfile`, `resolvePlanProfile`, `ValidationContext`, `extractPhaseIds`, `validatePlanForProfile`; lite rules moved verbatim from `validate-plan.ts:67-115`; brief rules and codes per `design.md`)
- Create: `packages/cli/src/commands/project/validate-plan/profiles.test.ts`
- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.ts` (re-export; `extractPhaseIdsFromPlan` delegates for task profiles)
- Modify: `packages/cli/src/commands/project/validate-plan/index.ts` (resolve profile from the state frontmatter it already reads at `:82-95`; replace the direct lite call)
- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.test.ts`, `index.test.ts`

**Step 1: Write test (RED)**: brief positives (two taskless phases with Intent/Exit evidence, a parallel group of two taskless phases validates); each brief error code; `p-revN` headings are extracted in document order; a fenced example phase heading is ignored; a task heading under a brief phase yields the warning; every existing lite case passes unchanged against the `lite` profile; a quick plan still uses task-heading extraction (sorted).

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan`.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/project/validate-plan
git commit -m "feat(p04-t01): plan profiles with brief validation rules"
```

---

### Task p04-t02: Readiness clause for promoted briefs

**Files:**

- Modify: `packages/control-plane/src/state/quick-plan-readiness.ts` (clause 6: `oat_promotion_pending_phases` absent or empty; new not-ready reason `promotion-pending-phases`; header comment updated)
- Modify: `packages/control-plane/src/state/quick-plan-readiness.test.ts`

**Step 1: Write test (RED)**: an otherwise-ready plan with `oat_promotion_pending_phases: ['p03']` is not ready with the new reason; `[]` and absent are ready.

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/quick-plan-readiness.test.ts`. The bash guard mirror in `oat-project-quick-start/SKILL.md` is updated in p06-t03.

**Step 3: Commit**

```bash
git add packages/control-plane/src/state/quick-plan-readiness.ts packages/control-plane/src/state/quick-plan-readiness.test.ts
git commit -m "feat(p04-t02): readiness clause for promotion-pending phases"
```

---

### Task p04-t03: Promote brief → quick

**Files:**

- Modify: `packages/cli/src/commands/project/promote/promote.ts` (accept `brief` as a source mode alongside `lite`; migration table by phase state and record disposition from `design.md` "Promote brief → quick"; frontmatter writes including `oat_promoted_from`, `oat_promotion_pending_phases`, `oat_plan_source: quick`, `oat_template: true`; `discovery.md` rendering from the brief; `references/brief-archive.md`; `(pre-promotion, brief)` annotations on review rows; state `plan`/`in_progress`/`oat_ready_for: oat-project-quick-start`; lite path untouched)
- Modify: `packages/cli/src/commands/project/promote/index.ts` (description text)
- Modify: `packages/cli/src/commands/project/promote/promote.test.ts`, `packages/cli/src/commands/help-snapshots.test.ts` (`:1188` description) if the description changes
- Modify: `packages/cli/src/commands/commands.integration.test.ts` (promote brief → quick end to end)

**Step 1: Write test (RED)**: accepted phase with two completed records and one cancelled record → two plan tasks, a `**Historical records:**` line, no fabricated completion; accepted phase with no records → one synthesized task at the next free ID with a journal completed marker and `**Commit:** <head>`; active phase → completed records copied, unfinished records keep IDs, no synthesis; pending and provisional phases listed in `oat_promotion_pending_phases`; readiness not ready; lite promotion cases unchanged.

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote src/commands/commands.integration.test.ts`.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/project/promote packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/commands.integration.test.ts
git commit -m "feat(p04-t03): promote brief projects to quick with disposition-aware migration"
```

---

## Phase 5: Brief entry skill and planning surfaces

### Task p05-t01: `oat-project-brief` skill and the shared brief contract

**Files:**

- Create: `.agents/skills/oat-project-brief/SKILL.md` (frontmatter with `metadata.version: 1.0.0`, `oat_gateable: true`; structure modeled on `oat-project-lite`: hook-safe commits, prerequisites, mode assertion, progress indicators, Step 0 preflight, Step 0.5 scaffold `oat project new --mode brief`, Step 1 metadata, Step 2 interview per F2 and C4, Step 3 one-pass brief and commit, Step 3.5 dispatch ladder and ceiling, Step 3.55 phase gate setup, Step 3.57 lifecycle gate posture, Step 3.6 artifact review loop, gate execution with `oat_brief_gate` record, Step 3.7 disposition and single approval, Step 4 state sync, Step 5 journal init, Step 6 dashboard, Step 6.5 commit, Step 7 next action; success criteria)
- Create: `.agents/skills/oat-project-brief/references/brief-contract.md` (brief sections, phase and marker grammar, readiness criteria and design strand, review ladder, F12 precedence, F13 record shape and lookahead, pointer interpretation, record ownership, anchor rules including the late-fix rule, promotion rules; goal sections reserved)
- Modify: `packages/cli/src/commands/shared/frontmatter.ts` (`GATE_AWARE_SKILLS` adds `oat-project-brief`)
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts` (+test) and `packages/cli/scripts/bundle-inputs.mjs` (skill directory)
- Modify: `NOTICES.md` if any prose is adapted from external projects (grill-me, superpowers)

**Steps:** write the skill and reference; register; run `pnpm oat:validate-skills`.

**Verify:** `pnpm oat:validate-skills` passes; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts src/validation/skills.test.ts -t "gate"` passes for the gateable declarations; `node packages/cli/dist/index.js gate resolve oat-project-brief --project <scratch brief project> --json` returns a resolution.

**Commit:**

```bash
git add .agents/skills/oat-project-brief packages/cli/src/commands/shared/frontmatter.ts packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/scripts/bundle-inputs.mjs NOTICES.md
git commit -m "feat(p05-t01): oat-project-brief entry skill and shared brief contract"
```

---

### Task p05-t02: Planning-surface skills recognize brief

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md` (`:90` mode list; `:567` `oat_plan_source` values add `brief`; Mode-Specific Planning Inputs row; brief profile note)
- Modify: `.agents/skills/oat-project-plan/SKILL.md` (`:22-31` mode gate stops for brief and routes to `oat-project-brief`; per-mode stop message)
- Modify: `.agents/skills/oat-project-next/SKILL.md` (entry list; brief routing table mirroring `BRIEF_ROUTES`; closeout applies to brief)
- Modify: `.agents/skills/oat-project-progress/SKILL.md` (mode enumeration and brief table counting phase-units)
- Modify: `.agents/skills/oat-project-discover/SKILL.md` (routes brief to its entry skill)
- Modify: `.agents/skills/oat-project-autonomous/SKILL.md` (mode selection table and route table include brief; goal excluded until v1.5)
- Modify: `.agents/skills/oat-project-new/SKILL.md`, `oat-project-lite/SKILL.md`, `oat-project-import-plan/SKILL.md`, `oat-project-promote-spec-driven/SKILL.md` (brief mentions and promotion hints), `oat-project-capture/SKILL.md`, `oat-docs/SKILL.md` (`:149-181`), `oat-pjm-review-backlog/SKILL.md` (`:259`), `oat-wave-execute/SKILL.md` (mode mention)

**Steps:** apply each edit at the cited lines; keep every line that pairs quick with spec-driven and lite also naming brief (the p08 contract test will pin this).

**Verify:** `pnpm oat:validate-skills` passes; `grep -rn "quick.*spec-driven.*lite" .agents/skills/<each>/SKILL.md` shows brief alongside; `pnpm format:root` clean.

**Commit:**

```bash
git add .agents/skills/oat-project-plan-writing .agents/skills/oat-project-plan .agents/skills/oat-project-next .agents/skills/oat-project-progress .agents/skills/oat-project-discover .agents/skills/oat-project-autonomous .agents/skills/oat-project-new .agents/skills/oat-project-lite .agents/skills/oat-project-import-plan .agents/skills/oat-project-promote-spec-driven .agents/skills/oat-project-capture .agents/skills/oat-docs .agents/skills/oat-pjm-review-backlog .agents/skills/oat-wave-execute
git commit -m "feat(p05-t02): planning-surface skills recognize brief mode"
```

---

## Phase 6: Execution skills and agent roles

### Task p06-t01: Implement references for brief execution

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/plan-and-resume.md` (Step 2.5: brief modes read `oat_plan_hill_phases` with `[]` meaning none; Step 3: brief pointer interpretation and first-incomplete-unit resume; `:308-315` finalization starts when all phase-units are accepted; provisional phases made concrete before dispatch)
- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md` (`:72` phase scope `workflow_mode` adds brief; brief requirement source = phase Intent and Exit evidence plus brief Outcomes/Constraints/Decisions; the F12 precedence ladder and independence test; phase-start record; `**Base:**`/`**Head:**` capture; F13 execution records with lookahead; fresh reviewer per phase on anchors; journal ownership for parallel worktrees)
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md` (brief completion audited against Outcomes; brief uses the non-lite sequence normalization and approval algorithm; `pr`→`pr-final` unchanged in v1)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` only if a top-level step references modes

**Verify:** `pnpm oat:validate-skills`; a dry read-through against `design.md` sections "Phase-unit progress contract", "Review scope from anchors" and "Entry and interview skills" with the file:line list recorded in `implementation.md`.

**Commit:**

```bash
git add .agents/skills/oat-project-implement
git commit -m "feat(p06-t01): brief-mode execution, resume and closeout in implement references"
```

---

### Task p06-t02: Agent roles and regenerated projections

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md` (`:32` `workflow_mode` adds brief; `:116-130` brief requirement source and no task extraction; execution-record creation per F13; `**Base:**`/`**Head:**` writes; never commit from a nested worker; Task Outcomes table lists records; bump top-level `version:`)
- Modify: `.agents/agents/oat-reviewer.md` (`:53` mode; `:126-131`, `:149-154`, `:174-179` brief artifacts and requirement source; `:264-283` plan review of a brief uses the brief section list with no task requirement; `:310` design not applicable; code review scope from anchors with the artifact record fields; bump `version:`)
- Regenerate: `.codex/agents/*`, `.cursor/agents/*-<model>-<effort>.md` via `node packages/cli/dist/index.js sync --scope project`

**Verify:** `pnpm oat:validate-skills`; `git diff --stat .codex/agents .cursor/agents` shows only regenerated files; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "agent"` passes.

**Commit:**

```bash
git add .agents/agents .codex/agents .cursor/agents
git commit -m "feat(p06-t02): brief-mode branches in implementer and reviewer roles"
```

---

### Task p06-t03: Quick-start promoted-brief resume and dispatch example

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md` (Step 0.5 resume detects `oat_promoted_from: brief`: author tasks for each phase in `oat_promotion_pending_phases`, clear the list as authored, present historical tasks as accepted, approval covers the new tasks; bash `quick_plan_ready` gains clause 6 mirroring p04-t02; Step 3 provenance note)
- Modify: `.agents/skills/oat-project-dispatch-subagents/SKILL.md` (`:243` example accepts `workflow_mode: brief` with a phase ID scope)

**Verify:** run the bash guard from the skill against a fixture plan with `oat_promotion_pending_phases: ['p02']` (exit 1) and without (exit 0); `pnpm oat:validate-skills`.

**Commit:**

```bash
git add .agents/skills/oat-project-quick-start .agents/skills/oat-project-dispatch-subagents
git commit -m "feat(p06-t03): promoted-brief resume contract in quick-start"
```

---

## Phase 7: Review, record and closeout skills

### Task p07-t01: Review scope from anchors in review-provide

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` (`:165-169`, `:306` mode; `:311-326` required artifacts for brief; `:411-457` scope resolution: brief branch with anchor resolution, aggregate-head containment, sequential and parallel continuity, late-fix rule, merge-base-range fallback for missing anchors, reconcile on invalid anchors; `:498-519` artifact file set for brief; `:597-662` rendering; artifact record fields `oat_review_requested_scope`, `oat_review_phase_ids`, `oat_review_base_sha`, `oat_review_scope_source`, `oat_review_fallback_reason`, `oat_review_integration_commits`, `oat_review_narrowed_from`)

**Verify:** `pnpm oat:validate-skills`; a scripted check in a temp repo (linear history A→B→C, anchors p01 A..B, p02 B..C; then a decreasing-head case p02 A..B) exercising the documented bash fragments records the expected accept/reject outcomes in `implementation.md`.

**Commit:**

```bash
git add .agents/skills/oat-project-review-provide
git commit -m "feat(p07-t01): anchor-based review scope for brief modes"
```

---

### Task p07-t02: Review-receive and reconcile brief branches

**Files:**

- Modify: `.agents/skills/oat-project-review-receive/SKILL.md` (`:385-409`, `:460-478`, `:550-564`: brief branch records fixes as journal execution records with `(review)` prefix and `**Source review:**`; late-fix rule appends `## Phase p-revN:` with `**Corrects:** pNN` in plan and journal when a later phase has started; reopens phase status; event provenance preserved; pointer set)
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md` (`:277-284`, `:631-640`: brief branch maps commits to journal records and phases by anchors; synthesized records `**Executor:** reconciled`; never writes phase `completed`; pointer to first incomplete unit)

**Verify:** `pnpm oat:validate-skills`; read-through against `design.md` "Reconcile and review-receive" with line references recorded.

**Commit:**

```bash
git add .agents/skills/oat-project-review-receive .agents/skills/oat-project-reconcile
git commit -m "feat(p07-t02): brief-mode review-receive and reconcile branches"
```

---

### Task p07-t03: Summary, PR, revise, complete, document and brainstorm

**Files:**

- Modify: `.agents/skills/oat-project-summary/SKILL.md` (`:25`, `:119-131` prerequisite is one accepted phase-unit; `:207-226`, `:400` freshness by `oat_summary_phase_fingerprint` per `design.md` "Summary freshness"; brief source table)
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md` (`:136-150` scope from anchors for brief; `:160-178` artifacts)
- Modify: `.agents/skills/oat-project-pr-final/SKILL.md` (`:29-30`, `:162-180` brief requires summary like quick; reduced-assurance note names the brief; `:273-278`, `:391` sources)
- Modify: `.agents/skills/oat-project-revise/SKILL.md` (`:160-171` brief creates `## Phase p-revN:` with Intent and Exit evidence and no tasks; `:208`, `:214` pointer `p-revN`)
- Modify: `.agents/skills/oat-project-complete/SKILL.md` (`:390-392` staleness by fingerprint for brief; `:1094` artifact set)
- Modify: `.agents/skills/oat-project-document/SKILL.md` (`:212-217` brief artifact set)
- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (`:241`, `:404-405`, `:744-751` brief fold-back targets `plan.md`; promote offers brief) and `references/destinations.md` (`:125-126`, `:160-168` add brief, lite and import rows)

**Verify:** `pnpm oat:validate-skills`; `pnpm format:root`; read-through recorded.

**Commit:**

```bash
git add .agents/skills/oat-project-summary .agents/skills/oat-project-pr-progress .agents/skills/oat-project-pr-final .agents/skills/oat-project-revise .agents/skills/oat-project-complete .agents/skills/oat-project-document .agents/skills/oat-brainstorm
git commit -m "feat(p07-t03): brief-mode summary, PR, revise, complete, document and brainstorm routing"
```

---

## Phase 8: Contracts, docs, records and the v1 progress PR

### Task p08-t01: Skill contract tests for brief

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts` (extend the lite-mode contract blocks `:8315-9100` to brief: entry surfaces list it; any line pairing quick with spec-driven and lite also names brief; `GATE_AWARE_SKILLS` matches `oat_gateable`; gateable brief)
- Modify: `packages/cli/src/validation/named-skill-load-contract.test.ts`, `autonomy-gate-inventory.test.ts`, `packages/cli/src/commands/init/tools/shared/{review-skill,post-implement-sequence,project-start-preflight}-contracts.test.ts`, `packages/cli/src/engine/engine.integration.test.ts` as each references lite

**Step 1: Write test (RED)**: the brief blocks fail against a deliberately omitted mention (temporarily revert one p05 edit) and pass after restore; record as the prove-it-can-fail evidence.

**Step 2: Implement (GREEN)**; run `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared src/engine`.

**Step 3: Commit**

```bash
git add packages/cli/src/validation packages/cli/src/commands/init/tools/shared packages/cli/src/engine
git commit -m "test(p08-t01): skill contract coverage for brief mode"
```

---

### Task p08-t02: Real-artifact probe

**Files:**

- Create: `implementation.md` evidence section only (no tracked fixtures; scratch under a `mktemp -d` repo)

**Steps:** `pnpm build`; in a temp git repo, `oat init` with the branch CLI, `project new --mode brief`, author a two-phase brief (one parallel group of two taskless phases), write journal sections with anchors for both phases, then run `project status --json`, `project validate-plan`, `state refresh`, and `gate review` parsing of a hand-written review artifact carrying the new scope fields. Record every command and its categorical outcome in `implementation.md`. Any failure is fixed in the owning phase's files and re-probed.

**Verify:** all probed commands succeed; `project status` reports `total 2, completed 2`; validate-plan passes the taskless parallel group.

**Commit:**

```bash
git add .oat/projects/shared/brief-goal-workflow-modes/implementation.md
git commit -m "chore(p08-t02): record real-artifact probe for brief mode"
```

---

### Task p08-t03: Docs, lane diagrams and root AGENTS.md

**Files:**

- Modify: `apps/oat-docs/docs/workflows/choose-workflow.md`, `workflows/projects/lifecycle.md` (lanes and diagram references), `reference/project-state-machine.md`, `reference/project-artifacts.md`, `reference/oat-directory-structure.md`, `reference/cli-reference.md`, `workflows/approvals-and-automation.md`, `workflows/projects/planning/starting-projects.md` (`## oat-project-brief` section), `workflows/projects/planning/planning-skills.md`, `workflows/projects/planning/hill-checkpoints.md`, `workflows/projects/execution/execution-skills.md`, `workflows/projects/execution/implementation-execution.md`, `workflows/projects/execution/picking-up-projects.md`, `closeout/closeout-skills.md`, `closeout/pr-flow.md`, `reviews/index.md`, `reviews/review-flavors.md`, `advanced/workflow-gates.md`, `advanced/autonomy.md`, `skills/brainstorm.md`
- Create: `apps/oat-docs/public/diagrams/project-lifecycle-8-brief-lane-{light,dark}.svg` following the existing lane diagram style; update `project-state-machine-{light,dark}.svg`
- Modify: `AGENTS.md` (Workflow Options adds brief as option 4 with goal noted as v1.5; recommendation heuristic row; Workflow Mode Change Inventory unchanged)
- Regenerate: `apps/oat-docs/docs/skills/index.md` via `pnpm docs:skills:generate`; `apps/oat-docs/index.md` via `oat docs generate-index`

**Verify:** `pnpm build:docs` and `pnpm --filter oat-docs check` (markdownlint) pass; `git diff --stat apps/oat-docs/index.md` shows only generated changes.

**Commit:**

```bash
git add apps/oat-docs AGENTS.md
git commit -m "docs(p08-t03): brief workflow mode across docs, diagrams and workflow options"
```

---

### Task p08-t04: Decision records and backlog items

**Files:**

- Create via `oat decision new`: `DR-<date>-brief-mode-family` (modes, predicate, naming), `DR-<date>-phase-unit-progress-contract`, `DR-<date>-anchor-review-scope`, `DR-<date>-tasks-as-execution-records`, `DR-<date>-brief-promotion-migration`
- Create via `oat backlog new`: BL for `.oat/scripts/generate-oat-state.sh` legacy mode table (no lite or brief case; bundled asset referenced by skills)
- Regenerate: `.oat/repo/reference/decisions/index.md` via `oat decision regenerate-index`

**Verify:** `node packages/cli/dist/index.js pjm doctor --json` reports adopted; the index regenerates without conflict.

**Commit:**

```bash
git add .oat/repo
git commit -m "docs(p08-t04): decision records and backlog for brief workflow mode"
```

---

### Task p08-t05: Version bumps and the full gate run

**Files:**

- Modify: `metadata.version` in every skill changed in p05–p07 (one bump each) and `version:` in both agent roles (already bumped in p06-t02; verify)
- Modify: lockstep versions in `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms` (`package.json`) and `packages/cli/assets/public-package-versions.json` per `pnpm release:check-versions`

**Steps:** `git fetch origin main`; bump; run every gate with captured exit codes:

```bash
for g in check type-check test build "run check:skill-bumps" "release:check-versions" "release:validate" "build:docs"; do pnpm $g > "/tmp/gate-${g// /-}.log" 2>&1; echo "$g exit=$?"; done
HOME=$(mktemp -d) pnpm exec turbo run test --force > /tmp/gate-test-force.log 2>&1; echo "test-force exit=$?"
pnpm lint > /tmp/gate-lint.log 2>&1; echo "lint exit=$?"; pnpm format > /tmp/gate-format.log 2>&1; echo "format exit=$?"
```

**Verify:** every exit code is 0 with no `FULL TURBO` replay on the forced test run; failures are fixed in the owning files before the phase closes.

**Commit:**

```bash
git add .agents/skills .agents/agents packages/*/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p08-t05): version bumps for brief workflow mode"
```

After p08 is accepted and reviewed, run `oat-project-pr-progress` for p01–p08 (the v1 progress PR), link it with `link_pull_request`, and do not merge. Then run the Astra v1.5 plan-revision round on `design.md` "Carried to the v1.5 review" and revise p09–p12 before p09 starts.

---

## Phase 9: Goal registration and control-plane transitions (v1.5)

### Task p09-t01: Register `goal`, extraction parsing and goal state fields

**Files:**

- Modify: `packages/control-plane/src/types.ts` (`goal` in `WORKFLOW_MODES` and `BRIEF_MODES`; `extracted?: { to }` on `PhaseProgress`; goal state fields on `ProjectState`: `milestone`, `milestoneStatus`, `goalStatus`, `deliveries`, `milestoneGates`)
- Modify: `packages/control-plane/src/state/parser.ts` (+test) for the new fields
- Modify: `packages/control-plane/src/state/tasks.ts` (+test): `extracted` precedence, exclusion from totals and `selectPhaseUnits`
- Modify: `packages/cli/src/commands/project/new/scaffold.ts` (goal map entries), `index.test.ts`, `help-snapshots.test.ts`

**Verify:** scoped vitest for parser, tasks, scaffold and help snapshots; `pnpm type-check`.

**Commit:** `feat(p09-t01): register goal mode, extraction parsing and goal state fields`

---

### Task p09-t02: Goal routing priority and transition table

**Files:**

- Modify: `packages/control-plane/src/recommender/router.ts` (+test): `declared_met` checked first; empty-milestone rejection; status table recommendations and contexts; brief-unit guard scoped to the active milestone; the transition rows from `design.md`, revised per the carried items (review-receive owns `reviewing → delivering`; stale carriers route to implement's scoped milestone closeout)
- Modify: `packages/cli/src/commands/state/generate.ts` (+test) goal routes and help

**Verify:** behavioral router tests for every status and transition, including fixes after the integrated review, declared-met with `delivered` status, and recovery of an older delivery without moving the milestone pointer.

**Commit:** `feat(p09-t02): goal milestone routing and transitions`

---

## Phase 10: Goal CLI: validation, delivery registry, refresh and closeout (v1.5)

### Task p10-t01: Goal validation profile

**Files:** `validate-plan/profiles.ts` (+test): `goal` rules (`goal-milestones-missing`, `goal-duplicate-milestone`, `goal-milestone-unknown-phase`, `goal-phase-in-multiple-milestones`, `goal-shipped-milestone-changed`, `goal-group-crosses-milestone`).

**Verify:** scoped vitest. **Commit:** `feat(p10-t01): goal plan profile rules`

---

### Task p10-t02: Delivery registry types and `oat project delivery refresh`

**Files:** `packages/cli/src/commands/project/delivery/{index,refresh}.ts` (+tests) reading and writing `oat_deliveries` per `design.md` "Delivery registry", calling `gh pr view … --json state,headRefOid,baseRefOid` through an injectable dependency; staleness marking of the integrated review and the milestone `exit` carrier under the bookkeeping-successor contract decided in the v1.5 review; `packages/cli/src/commands/project/index.ts` registration; help snapshot.

**Verify:** scoped vitest with a stubbed `gh`; help snapshot. **Commit:** `feat(p10-t02): delivery registry refresh command`

---

### Task p10-t03: Closeout boundary inputs, coverage predicate and gate carriers

**Files:** `closeout-check/closeout-invariant.ts` (`EvaluateCloseoutOptions` gains `planContent`, `implementationContent`, `childLifecycles`; coverage predicate clauses with supersession chains resolved to the terminal delivery; terminal boundary requires `declared_met`, a valid outcome audit and a disposition for every remaining phase), `closeout-check/index.ts` and `complete-state/index.ts` (load the inputs through `checkProjectCloseout`; enforce before both success returns), `oat_milestone_gates` carrier validation; tests including identical state with different journal or child facts.

**Verify:** scoped vitest; one end-to-end goal fixture combining extraction, changed member revision, stale milestone gate, correction supersession and terminal coverage without a duplicate PR.

**Commit:** `feat(p10-t03): goal closeout coverage predicate and milestone gate carriers`

---

## Phase 11: Goal skills and roles (v1.5)

### Task p11-t01: `oat-project-goal` skill and goal sections of the brief contract

**Files:** `.agents/skills/oat-project-goal/SKILL.md` (gateable; brief steps plus Milestones table, milestone state, `plan` carrier, re-alignment entry at `delivered`, terminal declaration entry with outcome audit and deferrals), `oat-project-brief/references/brief-contract.md` goal sections (milestone index, delivery registry, extraction, transition contract), `frontmatter.ts` `GATE_AWARE_SKILLS`, pack manifest and bundle inputs.

**Verify:** `pnpm oat:validate-skills`; gate resolve on a scratch goal project. **Commit:** `feat(p11-t01): oat-project-goal skill and goal brief contract`

---

### Task p11-t02: Delivery registration, terminal delivery and review-loop owners

**Files:** `oat-project-pr-progress/SKILL.md` (goal: idempotent registration with persisted lookup keys, delivery prerequisites, refresh before registration), `oat-project-pr-final/SKILL.md` (goal: terminal delivery registration for uncovered accepted phases), `oat-project-review-receive/SKILL.md` and `oat-project-review-provide/SKILL.md` (goal milestone status writes per the carried item 1 resolution; bookkeeping-successor freshness per item 2), `oat-project-implement/references/*` (milestone closeout: scope-limited exit gate carrier, `reviewing` transition, outcome audit at terminal closeout, snapshot `pr` step satisfied at its position), `oat-brainstorm` goal fold-back routing ("revise this delivery" vs "align next milestone"), `oat-project-autonomous` (goal excluded), agent roles goal branches and regenerated projections.

**Verify:** `pnpm oat:validate-skills`; read-through against the revised design. **Commit:** `feat(p11-t02): goal delivery registration, terminal delivery and review-loop ownership`

---

## Phase 12: Goal contracts, docs, records and the final PR (v1.5)

### Task p12-t01: Contract tests, probe, docs, records and bumps for goal

**Files:** `skills.test.ts` and sibling contract tests for goal; a real-artifact goal probe (two milestones, one delivery registered against a stubbed `gh`, re-alignment, terminal closeout) recorded in `implementation.md`; docs pages and a goal lane diagram; `AGENTS.md` option text; decision records (`goal-milestone-loop`, `delivery-registry-and-coverage`, `milestone-extraction`); skill and lockstep version bumps; the full gate run with captured exit codes.

**Verify:** every gate exit 0 with a forced test run. **Commit:** `chore(p12-t01): goal mode contracts, docs, records and version bumps`

After p12 is accepted, the final integrated review, summary, document and `pr-final` run per the configured sequence; the final PR is linked and left for Thomas to merge.

---

## Reviews

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| p02    | code     | pending | -    | -        | -             | -          | -           |
| p03    | code     | pending | -    | -        | -             | -          | -           |
| p04    | code     | pending | -    | -        | -             | -          | -           |
| p05    | code     | pending | -    | -        | -             | -          | -           |
| p06    | code     | pending | -    | -        | -             | -          | -           |
| p07    | code     | pending | -    | -        | -             | -          | -           |
| p08    | code     | pending | -    | -        | -             | -          | -           |
| p09    | code     | pending | -    | -        | -             | -          | -           |
| p10    | code     | pending | -    | -        | -             | -          | -           |
| p11    | code     | pending | -    | -        | -             | -          | -           |
| p12    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |
| plan   | artifact | pending | -    | -        | -             | -          | -           |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Control-plane registry, phase-unit parsing, scope seam and readers
- Phase 2: 3 tasks - Router routes, brief-unit guard, dashboard parity
- Phase 3: 2 tasks - Templates with bundle registration, scaffold behavior
- Phase 4: 3 tasks - Plan profiles, readiness clause, brief → quick promotion
- Phase 5: 2 tasks - Brief entry skill and contract, planning-surface skills
- Phase 6: 3 tasks - Implement references, agent roles and projections, quick-start resume contract
- Phase 7: 3 tasks - Review-provide anchors, review-receive and reconcile, record and closeout skills
- Phase 8: 5 tasks - Contract tests, real-artifact probe, docs, decision records, version bumps and gates (v1 progress PR)
- Phase 9: 2 tasks - Goal registration and routing (v1.5)
- Phase 10: 3 tasks - Goal validation, delivery refresh, closeout coverage (v1.5)
- Phase 11: 2 tasks - Goal skills, registration and review-loop ownership (v1.5)
- Phase 12: 1 task - Goal contracts, docs, records, bumps and the final PR (v1.5)

**Total: 32 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (lightweight design, revision 3.1; "Carried to the v1.5 review" lists the goal items that gate p09)
- Discovery: `discovery.md`
- Consensus record: `.oat/repo/analysis/freestyle-brainstorm/consensus-proposal.md` (machine-local) and `design-overview.html`
- Precedent: PR #264 (`0f47bf700`), the lite workflow mode
