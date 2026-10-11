---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-10-10
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p12'] # quick mode cannot express 'none'; [] would mean every phase. Final-phase checkpoint only; under OAT_AUTONOMOUS it auto-reviews and continues.
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p02', 'p03', 'p04'], ['p05', 'p06', 'p07']] # groups of phases that run concurrently in worktrees
oat_plan_source: quick # spec-driven | quick | imported | lite
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: brief-goal-workflow-modes

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Add the `brief` (one delivery) and `goal` (many milestones) OAT workflow modes designed in `design.md`: one approved Project Brief in `plan.md`, phases with intent and exit evidence instead of tasks, a phase-unit progress contract, execution-record tasks, anchor-based review scope, a brief entry skill with the standard review ladder, and, after the v1 progress PR, the goal milestone loop with its delivery registry.

**Architecture:** A mode-family seam (`isBriefMode`) in the control plane selects a phase-unit progress contract at the two project readers; the router gains a brief-unit guard and brief routes; the CLI gains plan profiles, two templates, scaffold entries and a brief→quick promotion; lifecycle skills and agent roles gain brief-mode branches at the lines where they read tasks today. Goal lands on the same seam in v1.5 with a transition contract, delivery registry and closeout coverage predicate, after a mandatory Astra re-review of the carried objections.

**Tech Stack:** TypeScript ESM (Node 22), vitest, oxlint/oxfmt, Markdown skill contracts under `.agents/skills`, agent roles under `.agents/agents` with generated provider projections, Fumadocs docs app.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): register brief workflow mode`

**Plan amendment 5.1 (2026-10-11, after p10, within the approved outcomes):** (a) project-log ownership for goal: `oat-project-goal` appends one structural entry per milestone activation and re-alignment and defines "learnings captured" as a concrete write (p11-t01); `pr-progress`/`pr-final` append one structural entry per delivery registration (p11-t02); the p12-t02 probe runs the retro evidence inventory against a goal and a brief project — motivated by the finding that the log format is mode-agnostic but nothing in goal mode wrote to it and retro was never exercised in either mode; (b) contract sentences carried from the p10 reviews into p11-t01: the two implementer-chosen formats, `delivery check` versus closeout carrier consumers, the empty-registry `goal-delivery-unsettled` wording, and the two evaluator leniencies (L4). **Plan revision 5 (2026-10-11):** applies Astra's v1.5 round 1 (`references/astra-v15-round-1.md`, verdict ALIGNED with A+B) to p09–p12: recovery and audit state, Milestones membership contract, explicit goal review scopes, the shared delivery-evidence evaluator with bookkeeping-successor freshness, transitive supersession coverage, terminal declaration at the boundary, `delivered` versus `at_endpoint`, and the new task p10-t04 (goal → quick promotion). Goal-only guards carry named negative controls (the "Goal guard verification" supplement before p09-t01, added in Astra round 2 together with four design corrections: read-only closeout observation, older-delivery recovery isolation in reconcile/review-receive, the audit phase-entry shape with deferral reasons, and observed rather than agreed endpoint satisfaction for activation). **Plan revision 4 (2026-10-10):** applies the final structured review residuals (M1 order-independent mode-list check; L1 `VENDORING_SKILLS` lives in `gate-approval-record-contracts.test.ts:25`; L2 version-pin sweep covers the object-form block; L3 coverage row for the vendored gate record). **Plan revision 3 (2026-10-10):** applies the second structured review (H1–H4, M1–M2, L1–L3: pinned versions and text, catalog regeneration, named-skill-load scan, gate-record vendoring). **Plan revision 2 (2026-10-10):** applies the structured plan artifact review (Opus 5.5, findings H1–H4, M1–M7, L1–L3) and Astra's plan round 1 (ALIGNED WITH CHANGES, findings 1–6). Group 1 is now write-disjoint; cross-phase end-to-end tests, sync output, the autonomy coverage table and the docs mapping have single owners; every CLI-scoped test that depends on control-plane changes rebuilds the control plane first.

**Staged delivery:** phases p01–p08 are v1 (brief) and end with `oat-project-pr-progress`; phases p09–p12 are v1.5 (goal). Before p09 starts, the design section "Carried to the v1.5 review" was resolved with Astra (gpt-6-astra, high) in plan-revision round 1 (2026-10-11) and p09–p12 were revised accordingly (plan revision 5).

**Operating rules for this run (from discovery, 2026-10-10):** no HiLL checkpoints beyond the final-phase default; dispatch ceiling frontier with delegated implementers and reviewers on Claude Opus 5.5 at high effort; at a review cap run the complexity review, apply its recommendation, log it and continue; open PRs, never merge; decision records authored during the work; fetch `origin/main` and reconcile planned paths at every phase start and before every parallel dispatch.

**Build rule for every task:** CLI vitest resolves `@open-agent-toolkit/control-plane` through its built `dist` (`packages/control-plane/package.json` exports; no source alias in `packages/cli/vitest.config.ts`). Run `pnpm --filter @open-agent-toolkit/control-plane build` before any CLI-scoped vitest that depends on a control-plane change, and `pnpm --filter @open-agent-toolkit/cli build` before any `node packages/cli/dist/index.js …` check. Verification commands below include these where they apply.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (none beyond the final-phase default)
- [x] Set `oat_plan_hill_phases` in frontmatter (`['p12']`: quick mode has no representation for none, and `[]` means every phase)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

**Group 1 `['p02', 'p03', 'p04']`** runs after p01 lands the registry, the parser contract and the readiness clause. Write sets:

- p02: `packages/control-plane/src/recommender/router.ts` (+`router.test.ts`), `packages/cli/src/commands/state/generate.ts` (+`generate.test.ts`), `packages/cli/src/commands/project/status.test.ts`.
- p03: `.oat/templates/plan-brief.md`, `.oat/templates/implementation-brief.md`, `.oat/templates/state.md`, `.oat/templates/plan.md`, `packages/cli/src/commands/project/new/scaffold.ts` (+`scaffold.test.ts`), `packages/cli/scripts/bundle-inputs.mjs`, `packages/cli/src/commands/tools/shared/pack-manifest.ts` (+test), `packages/cli/assets/templates/*`.
- p04: `packages/cli/src/commands/project/validate-plan/*`, `packages/cli/src/commands/project/promote/*` (+tests, including a new `promote.brief.test.ts`).

No group member edits `commands.integration.test.ts`, `help-snapshots.test.ts`, `types.ts` or a sibling's files; those end-to-end and snapshot updates live in p01 and p08. Each lane verifies against hand-built fixtures only: p03 asserts scaffolded files and frontmatter without routing (routes come from p02), and p04 promotes a hand-written brief project (templates come from p03). `--mode brief` is expected to fail at runtime between p01 and p03 because the templates do not exist yet; no task in that window exercises it.

**Group 2 `['p05', 'p06', 'p07']`** runs after group 1 merges. Write sets:

- p05: `.agents/skills/oat-project-brief/**` (new), `packages/cli/src/commands/shared/frontmatter.ts`, `pack-manifest.ts` (+test) and `bundle-inputs.mjs` (skill entries; safe because p03's edits merged before this group), `.agents/docs/autonomy-contract.md` (BRIEF entries and the 17th root; sole group-2 owner), `apps/oat-docs/skill-docs.json` and a minimal `## oat-project-brief` section in `apps/oat-docs/docs/workflows/projects/planning/starting-projects.md` (keeps `pnpm check` green; p08 expands it), and the planning-surface skills (plan-writing, plan, next, progress, discover, autonomous, new, lite, import-plan, promote-spec-driven, capture, docs, pjm-review-backlog, wave-execute).
- p06: `.agents/skills/oat-project-implement/**`, `.agents/skills/oat-project-quick-start/SKILL.md`, `.agents/skills/oat-project-dispatch-subagents/SKILL.md`, `.agents/agents/*.md`, regenerated projections under `.codex/agents` and `.cursor/agents`, and `.oat/sync/manifest.json` (sole group-2 owner of `oat sync` output).
- p07: review-provide, review-receive, reconcile, summary, pr-progress, pr-final, revise, complete, document and brainstorm (including `references/destinations.md`).

**Expected-red until p08-t01** (phase self-checks and reviewers treat these, and only these, as deferred): `packages/cli/src/validation/skills.test.ts:8719` (pins `workflow_mode: {spec-driven|quick|import|lite}` in `phase-execution.md:72`, broken by p06-t01); `skills.test.ts:8691` (pins the implementer's four-mode line at `oat-phase-implementer.md:32`, broken by p06-t02); `skills.test.ts:8660` (reviewer and implementer mode-aware contracts, broken by p06-t02); `skills.test.ts:9044` (pins `Workflow mode: {lite | quick | spec-driven}` in `oat-project-autonomous/SKILL.md:510`, broken by p05-t02); `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts:4720` (pins oat-project-next's four-mode sentence, broken by p05-t02); `packages/cli/src/validation/named-skill-load-contract.test.ts:2941-2981` (HEAD scan requires every execution-verb sentence naming an `oat-project-*` skill to be classified and bound to exactly one live call site; new `oat-project-brief` sentences and moved pointers from p05–p07 go unclassified until p08-t01); `packages/cli/src/validation/autonomy-gate-inventory.test.ts` prompt-site mappings re-keyed by p06 and p07 edits (p05 owns `.agents/docs/autonomy-contract.md` in group 2 and maps its own re-keys inside p05; p06 and p07 re-keys are mapped in p08-t01). Catch-all: any contract test under `packages/cli/src/validation` or `packages/cli/src/commands/init/tools/shared` that pins exact text or a `metadata.version` in a file p05–p07 edit is deferred to p08-t01 (text) or p08-t06 (versions). Skill `metadata.version` bumps and both agent-role `version:` bumps are deferred to p08-t06 (one bump per file per PR).

p01 and p08 are sequential fan-in points. p09–p12 are sequential.

**Expected-red until p12-t01 (v1.5):** `packages/cli/src/validation/skills.test.ts` mode-string pins at `:8674`, `:8697`, `:8725` (and any other five-mode pin a p11 edit touches), `named-skill-load-contract.test.ts` unclassified `oat-project-goal` sentences, `autonomy-gate-inventory.test.ts` mappings re-keyed by p10-t04 and p11-t02 until p11-t03, which maps all outstanding re-keys (p11-t01 maps its own because it edits `autonomy-contract.md`), and `check:skill-bumps`. Catch-all: any contract test under `packages/cli/src/validation` or `packages/cli/src/commands/init/tools/shared` that pins text in a file p10–p11 edit is deferred to p12-t01. Version bumps are deferred to p12-t05. Phase self-checks and reviewers treat these, and only these, as deferred.

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

## Phase 1: Control-plane registry, phase-unit contract and readiness clause

### Task p01-t01: Register `brief` and the mode-family predicate

**Files:**

- Modify: `packages/control-plane/src/types.ts` (add `brief` to `WORKFLOW_MODES`; add `BRIEF_MODES`, `BriefMode`, `isBriefMode`)
- Modify: `packages/control-plane/src/index.ts` (export the predicate alongside the existing named exports)
- Modify: `packages/control-plane/src/state/parser.test.ts` (modes pin at `:223-224`; parse `brief`)
- Modify: `packages/cli/src/commands/project/new/scaffold.ts` (`TEMPLATES_BY_MODE.brief` = `state.md`, `plan-brief.md → plan.md`, `implementation-brief.md → implementation.md`; `STATE_TEMPLATE_BY_MODE.brief` mirroring lite's plan-phase start with brief wording; the two maps are the only `Record<WorkflowMode, …>` sites and must compile in this task)
- Modify: `packages/cli/src/commands/project/new/index.test.ts` (`:22` harness mode union)
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

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts && pnpm --filter @open-agent-toolkit/control-plane build && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/index.test.ts src/commands/help-snapshots.test.ts`
Expected: pass.

**Step 3: Verify**

Run: `pnpm type-check`
Expected: no errors.

**Step 4: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/index.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/README.md packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/index.test.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t01): register brief workflow mode and isBriefMode predicate"
```

---

### Task p01-t02: Phase-unit parsing with strict markers and public fields

**Files:**

- Modify: `packages/control-plane/src/types.ts` (optional `unit`, `provisional`, `taskRecords` on `PhaseProgress`, present only when the phase-unit branch produced them)
- Modify: `packages/control-plane/src/state/tasks.ts` (`parsePhaseMarkers`, `parseProvisionalPhaseIds`, `TaskProgressOptions`, `phaseUnits` branch in `parsePhaseProgress`/`parseTaskProgress` returning the new fields)
- Modify: `packages/control-plane/src/state/tasks.test.ts`

**Step 1: Write test (RED)**

Brief mode (`{ phaseUnits: true }`): a plan with two taskless phases and a journal with `**Status:** completed` under phase 1 yields `total 2, completed 1`, each phase `unit: 'phase'`; a `### Task p01-t01` whose completed line sits after the task heading does **not** complete phase 1 (ownership ends at any `#` line); `**Provisional:** yes` in the plan overrides a journal completion (`provisional: true`); a task heading in the plan does not change `total`; `taskRecords` counts journal records only; `p-revN` phases count as units; `**Status:** completed # note` is not a marker. Task mode (default): a taskless phase heading is dropped (new pin), returned objects carry none of the new fields, and the existing suite is unchanged.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/tasks.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

Implement the precedence from `design.md` "Phase-unit progress contract" (extracted handling is added in p09; in v1 an `extracted` status is treated as `pending`). Keep the task-mode path byte-for-byte.

Run: the same scoped command. Expected: pass.

**Step 3: Prove each clause can fail**

One neutralize → confirm failure → restore cycle per clause, each recorded in `implementation.md`: (a) ownership ends at any heading; (b) provisional overrides completion; (c) plan task headings do not affect totals; (d) strict marker match rejects trailing text; (e) task-mode taskless phase is dropped.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane check && pnpm type-check`
Expected: no errors.

**Step 5: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/state/tasks.ts packages/control-plane/src/state/tasks.test.ts
git commit -m "feat(p01-t02): phase-unit progress parsing with strict journal markers"
```

---

### Task p01-t03: Scope seam and reader wiring

**Files:**

- Modify: `packages/control-plane/src/state/tasks.ts` (`selectPhaseUnits`)
- Modify: `packages/control-plane/src/project.ts` (`:46`, `:122` pass `{ phaseUnits: isBriefMode(parsedState.workflowMode) }`)
- Modify: `packages/control-plane/src/project.test.ts` (brief fixtures through both readers)
- Modify: `packages/control-plane/src/state/tasks.test.ts` (`selectPhaseUnits` ordering and `null` scope)

**Step 1: Write test (RED)**

Through `getProjectState` and `listProjects`: a brief project with a taskless accepted phase reports `progress.total 1, completed 1`; the same files under `oat_workflow_mode: quick` report `total 0`; a journal-only completed task record leaves its brief phase pending; `selectPhaseUnits(progress, ['p03','p01'])` returns p01 then p03 (document order) and `null` returns all.

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/project.test.ts src/state/tasks.test.ts`.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/control-plane exec vitest run`
Expected: full package suite passes (existing `toEqual` pins unchanged).

**Step 4: Commit**

```bash
git add packages/control-plane/src/state/tasks.ts packages/control-plane/src/project.ts packages/control-plane/src/project.test.ts packages/control-plane/src/state/tasks.test.ts
git commit -m "feat(p01-t03): selectPhaseUnits seam and brief-aware project readers"
```

---

### Task p01-t04: Readiness clause for promoted briefs

**Files:**

- Modify: `packages/control-plane/src/types.ts` (`QuickPlanReadinessFailure` adds `'promotion-pending-phases'`, `:49-53`)
- Modify: `packages/control-plane/src/recommender/router.ts` (`QUICK_PLAN_FAILURE_REASONS` entry at `:188-195`; no other router change in this task)
- Modify: `packages/control-plane/src/state/quick-plan-readiness.ts` (clause 6: `oat_promotion_pending_phases` absent or empty; header comment)
- Modify: `packages/control-plane/src/state/quick-plan-readiness.test.ts`, `router.test.ts` (reason text)

**Step 1: Write test (RED)**: an otherwise-ready plan with `oat_promotion_pending_phases: ['p03']` is not ready with the new reason and the router's not-ready reason names it; `[]` and absent are ready.

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/quick-plan-readiness.test.ts src/recommender/router.test.ts && pnpm type-check`. The bash guard mirror in `oat-project-quick-start/SKILL.md` is updated in p06-t03.

**Step 3: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/recommender/router.ts packages/control-plane/src/state/quick-plan-readiness.ts packages/control-plane/src/state/quick-plan-readiness.test.ts packages/control-plane/src/recommender/router.test.ts
git commit -m "feat(p01-t04): readiness clause for promotion-pending phases"
```

---

### Task p01-t05: (review) Export the phase-unit parser surface from the package barrel

**Files:**

- Modify: `packages/control-plane/src/index.ts`
- Modify: `packages/control-plane/src/state/parser.test.ts` (barrel pin)
- Modify: `packages/control-plane/README.md` (Public API snippet)

**Step 1: Understand the issue**

Review finding (p01 review, Medium): `index.ts` exports only `types`, the two readers, the router entry points and `evaluateQuickPlanReadiness`; `parsePhaseMarkers`, `parseProvisionalPhaseIds`, `parseTaskProgress`, `selectPhaseUnits` and the types `JournalPhaseStatus`, `PhaseMarkers`, `TaskProgressOptions` stay package-internal, so p04 (validate-plan profiles, promotion) could not reach the strict marker grammar without duplicating it or editing `index.ts` outside its write set.
Location: `packages/control-plane/src/index.ts:1-4`

**Step 2: Implement fix**

Add `export { parsePhaseMarkers, parseProvisionalPhaseIds, parseTaskProgress, selectPhaseUnits } from './state/tasks';` and `export type { JournalPhaseStatus, PhaseMarkers, TaskProgressOptions } from './state/tasks';`. Add a barrel pin importing these names from `'../index'` beside the existing `WORKFLOW_MODES` pin in `parser.test.ts`. List the names in the README Public API snippet.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts && pnpm --filter @open-agent-toolkit/control-plane build && node -e "const m=require('./packages/control-plane/dist/index.js');console.log(['parsePhaseMarkers','parseProvisionalPhaseIds','parseTaskProgress','selectPhaseUnits'].map(n=>n in m))"`
Expected: tests pass; the probe prints `[ true, true, true, true ]`.

**Step 4: Commit**

```bash
git add packages/control-plane/src/index.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/README.md
git commit -m "fix(p01-t05): export the phase-unit parser surface from the barrel"
```

---

### Task p01-t06: (review) Read block lists across blank and comment lines in readiness clause 6

**Files:**

- Modify: `packages/control-plane/src/state/quick-plan-readiness.ts`
- Modify: `packages/control-plane/src/state/quick-plan-readiness.test.ts`

**Step 1: Understand the issue**

Review finding (p01 review, Low): `hasNoPromotionPendingPhases` inspects only `frontmatter[index + 1]` for a block-list item, so a bare `oat_promotion_pending_phases:` key followed by a blank or comment line and then `  - p03` reads as empty and the plan is reported ready (fail-open). Flow lists and the absent key behave correctly.
Location: `packages/control-plane/src/state/quick-plan-readiness.ts:171`

**Step 2: Implement fix**

After the `nullValue` match, skip blank lines and lines starting with `#` within the frontmatter block before applying `BLOCK_LIST_ITEM`; update the header comment (`:26-31`, `:132-138`) to state the accepted empty forms. Add the blank-line and comment-line cases to the `promotion-pending phases clause` describe block (one not-ready case each, plus the existing ready controls).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/quick-plan-readiness.test.ts && pnpm type-check`
Expected: pass, including the two new not-ready cases.

**Step 4: Commit**

```bash
git add packages/control-plane/src/state/quick-plan-readiness.ts packages/control-plane/src/state/quick-plan-readiness.test.ts
git commit -m "fix(p01-t06): read readiness clause 6 block lists across blank and comment lines"
```

---

## Phase 2: Router and dashboard routes

### Task p02-t01: Brief routes and mode-aware planning ownership

**Files:**

- Modify: `packages/control-plane/src/recommender/router.ts` (`BRIEF_ROUTES` with explicit `plan:in_progress:3`, `plan:in_progress:2`, `plan:complete:1`, `implement:in_progress:any`; `case 'brief'` in `getWorkflowRoutes`; mode-aware `CURRENT_PHASE_SKILLS` lookup used by `getHillOverride` so the plan phase maps to `oat-project-brief` for brief modes)
- Modify: `packages/control-plane/src/recommender/router.test.ts`

**Step 1: Write test (RED)**: brief at `plan:in_progress` tier 3 and tier 2 → `oat-project-brief`; `plan:complete` → implement; a brief with a pending plan HiLL checkpoint → `oat-project-brief`; a behavioral check that recommending for each value of `WORKFLOW_MODES` at `plan:in_progress:3` never yields the spec-driven entry skill except for spec-driven.

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

**Step 1: Write test (RED)**: brief at `implement:complete` with an incomplete ordinary unit → implement with reason "Incomplete phase-units remain"; same with `pr_open`; provisional counts as incomplete; `lifecycle: complete` does not reopen; brief at `plan:in_progress` with an incomplete phase still routes to `oat-project-brief`; brief with all units accepted and no summary → `oat-project-summary`; quick behavior unchanged.

**Step 2: Implement (GREEN)**; run the scoped router test.

**Step 3: Prove it can fail**: drop the `phase === 'implement'` condition, confirm the planning case fails, restore; record in `implementation.md`.

**Step 4: Commit**

```bash
git add packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts
git commit -m "feat(p02-t02): brief-unit guard before post-implementation routing"
```

---

### Task p02-t03: Dashboard route map, help text and bounded parity

**Files:**

- Modify: `packages/cli/src/commands/state/generate.ts` (`routeMap` keys `brief:plan:in_progress` → `oat-project-brief`, `brief:plan:complete` → `oat-project-implement`, `brief:implement:in_progress` → `oat-project-implement`; mode-aware HiLL map at `:435-441` so brief's plan phase maps to `oat-project-brief`; Quick Commands help line for `oat-project-brief`; Mode row)
- Modify: `packages/cli/src/commands/state/generate.test.ts`, `packages/cli/src/commands/project/status.test.ts`

**Parity scope:** `generate.ts` builds state from frontmatter only (`:224-280`) and has no phase-unit progress, so parity with `recommendSkill` is asserted for plan-phase states and `implement:in_progress` only. For `implement:complete`/`pr_open` the dashboard follows the shared post-implementation map, and the router (reached through `oat project status` and `oat-project-next`) is the authority for the brief-unit guard; the dashboard prints a note to that effect for brief projects. Record this bound in the generate.ts comment and the test.

**Step 1: Write test (RED)**; **Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/control-plane build && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts src/commands/project/status.test.ts`.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts packages/cli/src/commands/project/status.test.ts
git commit -m "feat(p02-t03): dashboard routes and help text for brief mode"
```

---

### Task p02-t04: (review) Make the provisional-unit clause of the brief-unit guard discriminating

**Files:**

- Modify: `packages/control-plane/src/recommender/router.test.ts`

**Step 1: Understand the issue**

Review finding (p02 review, Medium): `hasIncompletePhaseUnit` tests `unit.provisional === true || unit.completed < unit.total`, but the fixture builds every provisional unit with `completed: 0`, so the "treats a provisional phase-unit as incomplete" case passes through the second clause alone; removing the `provisional` clause leaves the suite green.
Location: `packages/control-plane/src/recommender/router.test.ts:1287`, `router.ts:314-318`

**Step 2: Implement fix**

Extend `makeBriefUnitProgress` with an explicit `completed` override (or build the phase inline) and give the `:1287` case a unit `{ phaseId: 'p02', total: 1, completed: 1, provisional: true }`; assert the guard still routes to `oat-project-implement`. Prove it can fail: neutralize the `provisional` clause, confirm this case fails, restore.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`
Expected: pass; the neutralization cycle shows exactly this case failing.

**Step 4: Commit**

```bash
git add packages/control-plane/src/recommender/router.test.ts
git commit -m "test(p02-t04): make the provisional-unit guard clause discriminating"
```

---

### Task p02-t05: (review) Print the router-authority note only in the implement phase

**Files:**

- Modify: `packages/cli/src/commands/state/generate.ts`
- Modify: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Understand the issue**

Review finding (p02 review, Low): `BRIEF_ROUTER_AUTHORITY_NOTE` is emitted for every active brief project, including the plan phase, although it explains an implement-stage guard.
Location: `packages/cli/src/commands/state/generate.ts:820-827` (constant at `:395-399`)

**Step 2: Implement fix**

Gate the note on `state.phase === 'implement'`; move the "shows … router-authority note" assertion from the `plan:in_progress` fixture (`generate.test.ts:1183-1197`) to the `implement:complete` fixture (`:1202`) and add a negative assertion for the plan-phase fixture.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane build && HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts
git commit -m "fix(p02-t05): show the router-authority note only in the implement phase"
```

---

## Phase 3: Templates and scaffold

### Task p03-t01: Brief plan and journal templates with bundle registration

**Files:**

- Create: `.oat/templates/plan-brief.md` (frontmatter keys identical to `plan.md` with `oat_plan_source: brief`, `oat_template_name: plan-brief`, and the `oat_plan_hill_phases` comment reading `[] = none for brief modes`; body per `design.md` "plan-brief.md" with the strict phase block grammar and a `## Milestones` placeholder comment reserved for goal)
- Create: `.oat/templates/implementation-brief.md` (per `design.md` "implementation-brief.md": phase sections with `**Status:**`, `**Base:**`, `**Head:**`, `**Executor:**`, an execution-record task block example, orchestration-run markers, dated log)
- Modify: `.oat/templates/state.md` (`oat_workflow_mode` comment lists `brief`; note that `oat_hill_checkpoints: []` means none for brief modes)
- Modify: `.oat/templates/plan.md` (`oat_plan_source` comment lists `brief`)
- Modify: `packages/cli/scripts/bundle-inputs.mjs` (`templateFiles` adds both)
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts` (+`pack-manifest.test.ts`)
- Create (force-add): `packages/cli/assets/templates/plan-brief.md`, `packages/cli/assets/templates/implementation-brief.md`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts` (`PROJECT_TEMPLATE_NAMES`; bundled floor test for both)

**Steps:** write the templates; register; run `bash packages/cli/scripts/bundle-assets.sh` and `git add -f` the two bundled copies; extend the tests.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/tools/shared/pack-manifest.test.ts` passes; `pnpm --filter @open-agent-toolkit/cli build && node packages/cli/dist/index.js template resolve plan-brief --output "$(mktemp -d)/pb.md"` resolves from the repository tier.

**Commit:**

```bash
git add .oat/templates packages/cli/scripts/bundle-inputs.mjs packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/src/commands/project/new/scaffold.test.ts
git add -f packages/cli/assets/templates/plan-brief.md packages/cli/assets/templates/implementation-brief.md
git commit -m "feat(p03-t01): plan-brief and implementation-brief templates with bundle registration"
```

---

### Task p03-t02: Scaffold behavior for brief projects

**Files:**

- Modify: `packages/cli/src/commands/project/new/scaffold.ts` (complete `STATE_TEMPLATE_BY_MODE.brief`: phase `plan`, status `in_progress`, hill `[]`, artifact and progress bullets, next milestone text; `references/research/.gitkeep`; re-add `oat_template: true` to `plan.md` as lite does)
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`

**Step 1: Write test (RED)**: scaffolding `--mode brief` creates `state.md` (`oat_workflow_mode: brief`, `oat_phase: plan`), `plan.md` (from plan-brief, `oat_template: true`, `oat_plan_source: brief`), `implementation.md` (from implementation-brief), `references/research/.gitkeep`, `reviews/`, `pr/`. No routing assertion (routes belong to p02; the end-to-end scaffold → route case is p08-t02).

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/scaffold.test.ts
git commit -m "feat(p03-t02): scaffold brief projects with research references and brief templates"
```

---

### Task p03-t03: (review) Fence the brief grammar example and pair `extracted` with its companion marker

**Files:**

- Modify: `.oat/templates/plan-brief.md`
- Modify: `.oat/templates/implementation-brief.md`
- Modify: `packages/cli/assets/templates/plan-brief.md`, `packages/cli/assets/templates/implementation-brief.md` (bundled copies regenerated by `bash packages/cli/scripts/bundle-assets.sh`, byte-identical)

**Step 1: Understand the issue**

Review finding (p03 review, Low ×2): the phase grammar explanation at `plan-brief.md:67-78` sits in an HTML comment with bare `**Intent:**` / `**Exit evidence:**` / `**Provisional:** yes | no` lines, which the design's record-line exclusion (fences and indented code) does not cover; and `implementation-brief.md:29` lists `extracted` as a phase status without the design-required `**Extracted to:** <slug>` companion marker.

**Step 2: Implement fix**

Move the grammar example into a fenced ```markdown block (so parsers and validators ignore it by construction) and keep the prose explanation outside the fence; in the journal template's conventions block, document `extracted`together with its mandatory`**Extracted to:** <slug>` line. Re-run the bundler so the bundled copies match.

**Step 3: Verify**

Run: `bash packages/cli/scripts/bundle-assets.sh && cmp .oat/templates/plan-brief.md packages/cli/assets/templates/plan-brief.md && cmp .oat/templates/implementation-brief.md packages/cli/assets/templates/implementation-brief.md && pnpm --filter @open-agent-toolkit/control-plane build && HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new src/commands/tools/shared`
Expected: copies identical; tests pass; the built parser still reads the plan template as 2 units with p02 provisional.

**Step 4: Commit**

```bash
git add .oat/templates/plan-brief.md .oat/templates/implementation-brief.md
git add -f packages/cli/assets/templates/plan-brief.md packages/cli/assets/templates/implementation-brief.md
git commit -m "fix(p03-t03): fence the brief grammar example and pair extracted with its companion marker"
```

---

## Phase 4: Plan profiles and promotion

### Task p04-t01: Plan profiles in validate-plan

**Files:**

- Create: `packages/cli/src/commands/project/validate-plan/profiles.ts` (`PlanProfile`, `resolvePlanProfile`, `ValidationContext`, `extractPhaseIds`, `validatePlanForProfile`; lite rules moved verbatim from `validate-plan.ts:67-115`; brief rules and codes per `design.md`)
- Create: `packages/cli/src/commands/project/validate-plan/profiles.test.ts`
- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.ts` (re-export; `extractPhaseIdsFromPlan` delegates for task profiles)
- Modify: `packages/cli/src/commands/project/validate-plan/index.ts` (resolve the profile from the state frontmatter it already reads at `:82-95`; replace the direct lite call)
- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.test.ts`, `index.test.ts`

**Step 1: Write test (RED)**: brief positives (two taskless phases with Intent/Exit evidence; a parallel group of two taskless phases validates); each brief error code; `p-revN` headings extracted in document order; a fenced example heading ignored; a task heading under a brief phase yields the warning; every existing lite case passes unchanged against the `lite` profile; a quick plan still uses sorted task-heading extraction.

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/control-plane build && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan`.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/project/validate-plan
git commit -m "feat(p04-t01): plan profiles with brief validation rules"
```

---

### Task p04-t02: Promote brief → quick

**Files:**

- Modify: `packages/cli/src/commands/project/promote/promote.ts` (accept `brief` as a source mode alongside `lite`; migration table by phase state and record disposition from `design.md` "Promote brief → quick"; frontmatter writes `oat_promoted_from`, `oat_promotion_pending_phases`, `oat_plan_source: quick`, `oat_template: true`; `discovery.md` rendering from the brief; `references/brief-archive.md`; `(pre-promotion, brief)` annotations on review rows; state `plan`/`in_progress`/`oat_ready_for: oat-project-quick-start`; lite path untouched; the command description string stays unchanged in this task so no help snapshot moves inside the group — its wording is updated in p08-t02)
- Create: `packages/cli/src/commands/project/promote/promote.brief.test.ts` (hand-written brief project fixtures, no scaffold dependency)
- Modify: `packages/cli/src/commands/project/promote/promote.test.ts` only if shared helpers change

**Step 1: Write test (RED)**: accepted phase with two completed records and one cancelled record → two plan tasks, a `**Historical records:**` line, no fabricated completion; accepted phase with no records → one synthesized task at the next free ID with a journal completed marker and `**Commit:** <head>`; active phase → completed records copied, unfinished records keep IDs, no synthesis; pending and provisional phases listed in `oat_promotion_pending_phases`; readiness not ready (`promotion-pending-phases`); lite promotion cases unchanged.

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/control-plane build && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote`.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/project/promote
git commit -m "feat(p04-t02): promote brief projects to quick with disposition-aware migration"
```

---

### Task p04-t03: (review) Carry the pre-promotion annotation outside review-row identity cells

**Files:**

- Modify: `packages/cli/src/commands/project/promote/promote.ts`
- Modify: `packages/cli/src/commands/project/promote/promote.brief.test.ts`

**Step 1: Understand the issue**

Review finding (p04 review, Medium): `(pre-promotion, brief)` is appended to each review row's Scope cell, which breaks the Scope + Type + artifact identity that implement Step 7b, review-receive, `review latest` and the readiness `PLAN_ARTIFACT_ROW` key on; it also rewrites `pending` placeholder rows.
Location: `promote.ts` (`PRE_PROMOTION_ANNOTATION`, row rewrite)

**Step 2: Implement fix**

Leave every review row's cells untouched. Record provenance as a single line under `## Reviews` (for example `Rows above dated on or before <date> were recorded pre-promotion under workflow mode brief.`), never in identity cells and never on `pending` rows. Update the tests at `promote.brief.test.ts:521-541` to assert row identity is preserved and the provenance line exists.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/promote/promote.ts packages/cli/src/commands/project/promote/promote.brief.test.ts
git commit -m "fix(p04-t03): keep review-row identity intact when promoting a brief"
```

---

### Task p04-t04: (review) Share one index-preserving record-line reader between control-plane and the CLI

**Files:**

- Modify: `packages/control-plane/src/state/quick-plan-readiness.ts` (export an index-preserving reader, for example `recordLineMask(lines): boolean[]`, alongside `readRecordLines`)
- Modify: `packages/control-plane/src/index.ts` (barrel export)
- Modify: `packages/control-plane/src/state/quick-plan-readiness.test.ts` (pin the mask against fenced and indented examples)
- Modify: `packages/cli/src/commands/project/validate-plan/profiles.ts` (consume the export; delete the local `recordLineMask`)

**Step 1: Understand the issue**

Review finding (p04 review, Medium): `recordLineMask` in `profiles.ts` duplicates control-plane's fence and indented-code exclusion; the design's "same fence and indented-code exclusion" rule exists to prevent that drift. Promotion needs line indices, so a bare export of `readRecordLines` is insufficient.
Location: `profiles.ts` (`recordLineMask`), `quick-plan-readiness.ts` (`readRecordLines`)

**Step 2: Implement fix**

Add the index-preserving reader next to `readRecordLines` (same CommonMark fence and four-column indentation rules, one boolean per line), export it from the barrel, pin it, and make `profiles.ts` use it. Lane note: these two control-plane files are not touched by p02 or p03, so the widening is merge-safe.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/quick-plan-readiness.test.ts && pnpm --filter @open-agent-toolkit/control-plane build && HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan src/commands/project/promote && pnpm type-check`
Expected: pass; `grep -n "function recordLineMask" packages/cli/src/commands/project/validate-plan/profiles.ts` prints nothing.

**Step 4: Commit**

```bash
git add packages/control-plane/src/state/quick-plan-readiness.ts packages/control-plane/src/index.ts packages/control-plane/src/state/quick-plan-readiness.test.ts packages/cli/src/commands/project/validate-plan/profiles.ts
git commit -m "fix(p04-t04): share the index-preserving record-line reader from control-plane"
```

---

### Task p04-t05: (review) Reject malformed provisional markers, refuse promotion without a phase head, and carry Approach into discovery

**Files:**

- Modify: `packages/cli/src/commands/project/validate-plan/profiles.ts`, `profiles.test.ts`
- Modify: `packages/cli/src/commands/project/promote/promote.ts`, `promote.brief.test.ts`

**Step 1: Understand the issue**

Review findings (p04 review, Low ×3): `**Provisional:**yes` (no space) validates clean while the control-plane parser does not treat it as provisional; an accepted phase without `**Head:**` synthesizes `**Commit:** -`; the brief's `## Approach` is dropped from both working artifacts.

**Step 2: Implement fix**

Validate the provisional line with the same expression the parser uses (space required), reporting `brief-provisional-invalid` otherwise. Refuse promotion of an accepted phase that lacks a `**Head:**` marker with a new reason `missing-phase-head` instead of synthesizing a dash. Render the brief's Approach section into `discovery.md` under `## Solution Space` / `### Chosen Direction` so the design content survives promotion.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane build && HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan src/commands/project/promote`
Expected: pass, with one new case per finding.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/validate-plan/profiles.ts packages/cli/src/commands/project/validate-plan/profiles.test.ts packages/cli/src/commands/project/promote/promote.ts packages/cli/src/commands/project/promote/promote.brief.test.ts
git commit -m "fix(p04-t05): strict provisional marker, refuse headless promotion, carry Approach into discovery"
```

---

### Task p04-t06: (review) Make the Approach heading demotion fence-aware

**Files:**

- Modify: `packages/cli/src/commands/project/promote/promote.ts`
- Modify: `packages/cli/src/commands/project/promote/promote.brief.test.ts`

**Step 1: Understand the issue**

Review finding (p04 review round 2, Low): the Approach heading demotion at `promote.ts:1106` is not fence-aware, so a `### ` line inside a fenced example in Approach is demoted too.

**Step 2: Implement fix**

Gate the demotion on `recordLineMask` per line (only record lines are demoted); add one test with a fenced `### ` line inside Approach that must survive unchanged while a real `### Design` subheading is demoted.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane build && HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/promote/promote.ts packages/cli/src/commands/project/promote/promote.brief.test.ts
git commit -m "fix(p04-t06): fence-aware Approach heading demotion on promotion"
```

---

## Phase 5: Brief entry skill and planning surfaces

### Task p05-t01: `oat-project-brief` skill, shared contract, gate registration and autonomy entries

**Files:**

- Create: `.agents/skills/oat-project-brief/SKILL.md` (frontmatter with `metadata.version: 1.0.0`, `oat_gateable: true`; structure modeled on `oat-project-lite`: hook-safe commits, prerequisites, mode assertion, progress indicators, Step 0 preflight, Step 0.5 scaffold `oat project new --mode brief`, Step 1 metadata, Step 2 interview per F2 and C4, Step 3 one-pass brief and commit, Step 3.5 dispatch ladder and ceiling, Step 3.55 phase gate setup, Step 3.57 lifecycle gate posture, Step 3.6 artifact review loop, gate execution persisting `oat_brief_gate` in `state.md` with exactly the `oat_quick_start_gate` core fields (`status`, `disposition`, `config_fingerprint`, `reviewed_head`, `decided_at`; absent when no gate is configured; read back by nothing in v1, provenance only), Step 3.7 disposition and single approval, Step 4 state sync, Step 5 journal init, Step 6 dashboard, Step 6.5 commit, Step 7 next action; success criteria)
- Create: `.agents/skills/oat-project-brief/references/brief-contract.md` (brief sections, phase and marker grammar, readiness criteria and design strand, review ladder, F12 precedence, F13 record shape and lookahead, pointer interpretation, record ownership, anchor rules including the late-fix rule, promotion rules; goal sections reserved)
- Modify: `packages/cli/src/commands/shared/frontmatter.ts` (`GATE_AWARE_SKILLS` adds `oat-project-brief`)
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts` (+test) and `packages/cli/scripts/bundle-inputs.mjs` (skill directory)
- Modify: `.agents/docs/autonomy-contract.md` (BRIEF-01..NN rows for dirty tree, startup input, interview, review findings, dispatch-ladder scope, dispatch policy, configured gate, lifecycle gate posture, approval; `oat-project-brief` added as the 17th inventoried root)
- Modify: `apps/oat-docs/skill-docs.json` (`oat-project-brief` → `workflows/projects/planning/starting-projects.md#oat-project-brief`, family "Project entry") and `apps/oat-docs/docs/workflows/projects/planning/starting-projects.md` (minimal `## oat-project-brief` section with an `**Example scenario:**`; p08-t04 expands it); regenerate and commit `apps/oat-docs/docs/skills/index.md` via `pnpm docs:skills:generate` (the committed catalog staleness check in `apps/oat-docs/scripts/skill-catalog.ts:154-164` fails otherwise)
- Modify: `.agents/docs/gate-approval-record.md` (Carriers list gains `oat_brief_gate` beside `oat_quick_start_gate`; no other group-2 lane writes this file)
- Create: `.agents/skills/oat-project-brief/references/docs/gate-approval-record.md` and `references/docs/autonomy-contract.md` as symlinks to the shared docs (the same vendoring lite carries, so `skills-bundled-docs-contract.test.ts` stays green), and point the skill at the vendored paths; add the `oat-project-brief/references/docs/autonomy-contract.md | * -> NG` and `oat-project-brief/references/docs/gate-approval-record.md | * -> NG` coverage rows in the autonomy contract (as `autonomy-contract.md:328-329` does for implement and quick-start)
- Modify: `.oat/templates/state.md` is **not** touched here (p03 owns it); the `oat_brief_gate` comment block is added to the template in p08-t02
- Modify: `NOTICES.md` if any prose is adapted from external projects (grill-me, superpowers)

**Steps:** write the skill and reference; register; add the autonomy rows and the docs mapping; run `pnpm oat:validate-skills`.

**Verify:** `pnpm oat:validate-skills` passes; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts src/validation/autonomy-gate-inventory.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/gate-approval-record-contracts.test.ts` passes (the 17-root pin updated here) and `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "gate-aware skill set"` passes; `pnpm --filter oat-docs docs:skills:check` passes after the catalog regeneration; registration is proven by the live gate-aware pin (`skills.test.ts` "pins the gate-aware skill set against live oat_gateable declarations") and by the `oat_skill_gate_overrides` parser accepting `oat-project-brief` while rejecting an unregistered name (`gate resolve <name>` returns `not_configured` for any name and is not evidence).

**Commit:**

```bash
git add .agents/skills/oat-project-brief .agents/docs/autonomy-contract.md .agents/docs/gate-approval-record.md packages/cli/src/commands/shared/frontmatter.ts packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/scripts/bundle-inputs.mjs packages/cli/src/validation/autonomy-gate-inventory.test.ts apps/oat-docs/skill-docs.json apps/oat-docs/docs/workflows/projects/planning/starting-projects.md apps/oat-docs/docs/skills/index.md NOTICES.md
git commit -m "feat(p05-t01): oat-project-brief entry skill, shared brief contract and autonomy entries"
```

---

### Task p05-t02: Planning-surface skills recognize brief

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md` (`:90` mode list; `:567` `oat_plan_source` values add `brief`; Mode-Specific Planning Inputs row; brief profile note)
- Modify: `.agents/skills/oat-project-plan/SKILL.md` (`:22-31` mode gate stops for brief and routes to `oat-project-brief`; per-mode stop message)
- Modify: `.agents/skills/oat-project-next/SKILL.md` (entry list; brief routing table mirroring `BRIEF_ROUTES`; closeout applies to brief; the four-mode sentence pinned at `review-skill-contracts.test.ts:4720` becomes five modes, expected-red until p08-t01)
- Modify: `.agents/skills/oat-project-progress/SKILL.md` (mode enumeration and brief table counting phase-units)
- Modify: `.agents/skills/oat-project-discover/SKILL.md` (routes brief to its entry skill)
- Modify: `.agents/skills/oat-project-autonomous/SKILL.md` (mode selection table and route table include brief; goal excluded until v1.5)
- Modify: `.agents/skills/oat-project-new/SKILL.md`, `oat-project-lite/SKILL.md`, `oat-project-import-plan/SKILL.md`, `oat-project-promote-spec-driven/SKILL.md` (brief mentions and promotion hints), `oat-project-capture/SKILL.md`, `oat-docs/SKILL.md` (`:149-181`), `oat-pjm-review-backlog/SKILL.md` (`:259`), `oat-wave-execute/SKILL.md` (mode mention)

**Steps:** apply each edit at the cited lines; keep every line that pairs quick with spec-driven and lite also naming brief (the p08 contract test will pin this). Do not rewrite prompt-site lines beyond what the mode mention requires; because p05 owns `.agents/docs/autonomy-contract.md` in group 2, map any site this task re-keys (sites are keyed by heading plus line) in the same commit so `autonomy-gate-inventory.test.ts` stays green at the end of p05.

**Verify:** `pnpm oat:validate-skills` passes; the order-independent check `rg -n 'quick' .agents/skills/{oat-project-plan-writing,oat-project-plan,oat-project-next,oat-project-progress,oat-project-discover,oat-project-autonomous,oat-project-new,oat-project-lite,oat-project-import-plan,oat-project-promote-spec-driven,oat-project-capture,oat-docs,oat-pjm-review-backlog,oat-wave-execute}/SKILL.md | rg 'spec-driven' | rg 'lite' | rg -v 'brief' | rg -v 'oat-project-discover/SKILL.md:(3|23|27):'` prints nothing (at HEAD it matches about fifteen mode-list lines, including `plan-writing:90,567`, `progress:176`, `next:133,482`, `autonomous:77,309,510`, `discover:35`, `capture:32`, `pjm-review-backlog:259`, every one of which must now name brief); `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts` passes; `pnpm format:root` clean.

**Commit:**

```bash
git add .agents/docs/autonomy-contract.md .agents/skills/oat-project-plan-writing .agents/skills/oat-project-plan .agents/skills/oat-project-next .agents/skills/oat-project-progress .agents/skills/oat-project-discover .agents/skills/oat-project-autonomous .agents/skills/oat-project-new .agents/skills/oat-project-lite .agents/skills/oat-project-import-plan .agents/skills/oat-project-promote-spec-driven .agents/skills/oat-project-capture .agents/skills/oat-docs .agents/skills/oat-pjm-review-backlog .agents/skills/oat-wave-execute
git commit -m "feat(p05-t02): planning-surface skills recognize brief mode"
```

---

### Task p05-t03: (review) Carry the brief contract in the review payload and state the promotion precondition once

**Files:**

- Modify: `.agents/skills/oat-project-brief/SKILL.md`
- Modify: `.agents/docs/autonomy-contract.md` (BRIEF-04 cell)

**Step 1: Understand the issue**

Review finding (p05 review, Low ×2): Step 3.6 says the reviewer receives `references/brief-contract.md`, but the loop payload lists only lite's five fields, so nothing carries it; promotion to quick is offered "once a brief is committed" in prose, yet BRIEF-04 and Step 3.7 option 3 do not state the precondition or the hand-off, and `promote` does not refuse a placeholder scaffold.
Location: `.agents/skills/oat-project-brief/SKILL.md:255,369-375,490-492`; `.agents/docs/autonomy-contract.md:171`

**Step 2: Implement fix**

Add an explicit payload entry under the Step 3.6 list (for example `artifact_paths: { precedent: ".agents/skills/oat-project-brief/references/brief-contract.md" }`) and reword the sentence to say the dispatch includes it; keep the five existing fields. State the promotion precondition once (only after Step 3's validated, committed brief; before that abandon the scaffold and start `oat-project-quick-start`), reuse it in the workflow-fit bullet, mirror it in BRIEF-04's autonomous-resolution cell, and end Step 3.7 option 3 with "then stop; the project is now quick and resumes through `oat-project-quick-start`".

**Step 3: Verify**

Run: `pnpm oat:validate-skills && pnpm format:root && HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts`
Expected: pass (inventory still 17 roots; any re-keyed BRIEF site mapped in the same commit).

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-brief/SKILL.md .agents/docs/autonomy-contract.md
git commit -m "fix(p05-t03): carry the brief contract in the review payload and state the promotion precondition"
```

---

## Phase 6: Execution skills and agent roles

### Task p06-t01: Implement references for brief execution

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/plan-and-resume.md` (Step 2.5: brief modes read `oat_plan_hill_phases` with `[]` meaning none; Step 3: brief pointer interpretation and first-incomplete-unit resume; `:308-315` finalization starts when all phase-units are accepted; provisional phases made concrete before dispatch)
- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md` (`:72` phase scope `workflow_mode` adds brief — pinned at `skills.test.ts:8719`, expected-red until p08-t01; brief requirement source = phase Intent and Exit evidence plus brief Outcomes/Constraints/Decisions; the F12 precedence ladder and independence test; phase-start record; `**Base:**`/`**Head:**` capture; F13 execution records with lookahead; fresh reviewer per phase on anchors; journal ownership for parallel worktrees)
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md` (brief completion audited against Outcomes; brief uses the non-lite sequence normalization and approval algorithm; `pr`→`pr-final` unchanged in v1)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` only if a top-level step references modes

**Verify:** `pnpm oat:validate-skills`; a read-through against `design.md` sections "Phase-unit progress contract", "Review scope from anchors" and "Entry and interview skills" with the file:line list recorded in `implementation.md`.

**Commit:**

```bash
git add .agents/skills/oat-project-implement
git commit -m "feat(p06-t01): brief-mode execution, resume and closeout in implement references"
```

---

### Task p06-t02: Agent roles, regenerated projections and sync manifest

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md` (`:32` `workflow_mode` adds brief; `:116-130` brief requirement source and no task extraction; execution-record creation per F13; `**Base:**`/`**Head:**` writes; never commit from a nested worker; Task Outcomes table lists records; the top-level `version:` bump is deferred to p08-t06 because `skills.test.ts:3373-3374,6813-6814` and `review-skill-contracts.test.ts:359` pin the exact values)
- Modify: `.agents/agents/oat-reviewer.md` (`:53` mode; `:126-131`, `:149-154`, `:174-179` brief artifacts and requirement source; `:264-283` plan review of a brief uses the brief section list with no task requirement; `:310` design not applicable; code review scope from anchors with the artifact record fields; `version:` bump deferred to p08-t06)
- Regenerate: `.codex/agents/*`, `.cursor/agents/*-<model>-<effort>.md` and `.oat/sync/manifest.json` via `pnpm --filter @open-agent-toolkit/cli build && node packages/cli/dist/index.js sync --scope project` (the `oat-project-brief` Claude link is created in p08-t02 after group 2 merges, since this worktree does not contain the new skill)

**Verify:** `pnpm oat:validate-skills`; `git diff --stat .codex/agents .cursor/agents .oat/sync/manifest.json` shows only regenerated files; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "pins portable user-default agents"` still passes (versions unchanged); `skills.test.ts:8660` and `:8691` are expected-red until p08-t01.

**Commit:**

```bash
git add .agents/agents .codex/agents .cursor/agents .oat/sync/manifest.json
git commit -m "feat(p06-t02): brief-mode branches in implementer and reviewer roles"
```

---

### Task p06-t03: Quick-start promoted-brief resume and dispatch example

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md` (Step 0.5 resume detects `oat_promoted_from: brief`: author tasks for each phase in `oat_promotion_pending_phases`, clear the list as authored, present historical tasks as accepted, approval covers the new tasks; bash `quick_plan_ready` gains clause 6 mirroring p01-t04; Step 3 provenance note)
- Modify: `.agents/skills/oat-project-dispatch-subagents/SKILL.md` (`:243` example accepts `workflow_mode: brief` with a phase ID scope)

**Verify:** extract the `quick_plan_ready` function from the skill into a temp script and run it against a fixture plan with `oat_promotion_pending_phases: ['p02']` (exit 1) and without (exit 0); `pnpm oat:validate-skills`.

**Commit:**

```bash
git add .agents/skills/oat-project-quick-start .agents/skills/oat-project-dispatch-subagents
git commit -m "feat(p06-t03): promoted-brief resume contract in quick-start"
```

---

### Task p06-t04: (review) Pin the per-phase review range for parallel-group members

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md` (Brief-Mode "Fresh reviewer on anchors" and "Journal ownership in parallel worktrees" subsections; the Parallel Group Execution note near `:1042-1044`)
- Modify: `.agents/agents/oat-phase-implementer.md` ("Journal ownership" paragraph near `:402-404`)
- Regenerate: implementer projections under `.codex/agents` and `.cursor/agents` via `pnpm --filter @open-agent-toolkit/cli build && node packages/cli/dist/index.js sync --scope project` (leave `.oat/sync/manifest.json` and the `oat-project-brief` link uncommitted; p08-t02)

**Step 1: Understand the issue**

Review finding (p06 review, Medium): "Fresh reviewer on anchors" requires `**Base:**` and `**Head:**` before dispatch and routes any failure to reconcile, but "Journal ownership in parallel worktrees" writes every member's anchors only at fan-in, while Parallel Group Execution still dispatches each member's review after its phase report. A group member therefore has no reviewable anchors at per-phase review time.
Location: `.agents/skills/oat-project-implement/references/phase-execution.md:107-138,1042-1044,1054`; `.agents/agents/oat-phase-implementer.md:402-404`

**Step 2: Implement fix**

Decision (root): keep per-phase review before fan-in, as group 1 of this project ran it. State in the Brief-Mode subsection and the `:1042-1044` note: "For a parallel-group member the per-phase Review Scope range is `EXPECTED_HEAD..<worktree head from the phase report>` with `oat_review_base_sha: EXPECTED_HEAD` and `oat_review_scope_source: anchors`; the fan-in `**Base:**`/`**Head:**` written afterwards govern `pNN-pMM` and `final` scopes." Mirror one sentence in the implementer role's "Journal ownership" paragraph naming the reported worktree head as the review head. Regenerate projections; commit only the implementer projections that change.

**Step 3: Verify**

Run: `pnpm oat:validate-skills && pnpm format:root && node packages/cli/dist/index.js sync --scope project --dry-run | grep -v ':skip \|already in sync'`
Expected: pass; the dry-run prints only the deferred `create_symlink claude/oat-project-brief` action.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/references/phase-execution.md .agents/agents/oat-phase-implementer.md .codex/agents .cursor/agents
git commit -m "fix(p06-t04): pin the per-phase review range for parallel-group members"
```

---

### Task p06-t05: (review) Remove the stale `[]` sentence and the duplicated import bullet

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/plan-and-resume.md` (`:169-170`)
- Modify: `.agents/agents/oat-phase-implementer.md` (`:560-561` duplicated `import` bullet)
- Regenerate: implementer projections (same command and exclusions as p06-t04)

**Step 1: Understand the issue**

Review finding (p06 review, Low ×2): the lite-bypass paragraph still says "for other modes, an empty list means every phase", contradicting "Brief checkpoint resolution" in the same step; p06-t02 inserted a second byte-identical `import` bullet above the new `brief` bullet, already propagated to 130 projections.
Location: `.agents/skills/oat-project-implement/references/plan-and-resume.md:169-170`; `.agents/agents/oat-phase-implementer.md:560-561`

**Step 2: Implement fix**

Reword `:169-170` to "for the task modes (spec-driven, quick, import) an empty list means every phase and therefore cannot represent lite's policy; brief modes read it as none (Brief checkpoint resolution below)". Delete the duplicate bullet at `:561`; regenerate projections.

**Step 3: Verify**

Run: `grep -c 'the imported plan, plus design/spec when present' .agents/agents/oat-phase-implementer.md && pnpm oat:validate-skills && pnpm format:root`
Expected: count 1; pass; `grep -n 'an empty list means every phase' …/plan-and-resume.md` shows only the reworded sentence.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/references/plan-and-resume.md .agents/agents/oat-phase-implementer.md .codex/agents .cursor/agents
git commit -m "fix(p06-t05): remove the stale empty-list sentence and the duplicated import bullet"
```

---

### Task p06-t06: (review) Scope the anchor pre-check to sequential phases

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md` ("Fresh reviewer on anchors", the pre-check sentence near `:109-111`)

**Step 1: Understand the issue**

Review finding (p06 review round 2, Low): the pre-check "Before dispatch, verify that both anchors exist and that `**Base:**` is an ancestor of `**Head:**`; a failed check routes to `oat-project-reconcile` and is never narrowed" is still unqualified, so a literal reader routes a parallel-group member (which has no journal anchors at step 5) to reconcile despite the range sentence that follows.
Location: `.agents/skills/oat-project-implement/references/phase-execution.md:109-111`

**Step 2: Implement fix**

Scope the pre-check in place: "For a sequential phase, before dispatch verify that both anchors exist and that `**Base:**` is an ancestor of `**Head:**`; a failed check routes to `oat-project-reconcile` and is never narrowed. For a parallel-group member, step 3's check that the worktree head descends from `EXPECTED_HEAD` stands in for that pre-check, and the per-phase Review Scope range is …" followed by the existing range sentence. Skill reference only; no projection regeneration.

**Step 3: Verify**

Run: `pnpm oat:validate-skills && pnpm format:root`
Expected: pass.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/references/phase-execution.md
git commit -m "fix(p06-t06): scope the anchor pre-check to sequential phases"
```

---

## Phase 7: Review, record and closeout skills

### Task p07-t01: Review scope from anchors in review-provide

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` (`:165-169`, `:306` mode; `:311-326` required artifacts for brief; `:411-457` scope resolution: brief branch with anchor resolution, aggregate-head containment, sequential and parallel continuity, late-fix rule, merge-base-range fallback for missing anchors, reconcile on invalid anchors; `:498-519` artifact file set for brief; `:597-662` rendering; artifact record fields `oat_review_requested_scope`, `oat_review_phase_ids`, `oat_review_base_sha`, `oat_review_scope_source`, `oat_review_fallback_reason`, `oat_review_integration_commits`, `oat_review_narrowed_from`)

**Verify:** `pnpm oat:validate-skills`; a scripted check (`mktemp -d` repo, the skill's documented bash fragments extracted verbatim) covering all six design counterexamples with a valid control and expected categorical outcomes recorded in `implementation.md`: (1) linear `A→B→C`, `p01 A..B`, `p02 B..C` → accepted, range `A..C`; (2) decreasing heads `p01 A..C`, `p02 A..B` → rejected, routed to reconcile; (3) a bookkeeping commit between sequential phases (`p02` base is a descendant of `p01` head) → accepted and inside the range; (4) a two-phase parallel group with integration merges → accepted with the integration commits listed; (5) a missing anchor → `scope_source: merge-base-range`; (6) an invalid anchor (nonexistent SHA) → reconcile; plus (7) a history longer than 50 commits where the grep-only path would miss commits and the anchor path does not. For each rejection case, neutralize the relevant guard, confirm the case is wrongly accepted, restore.

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

### Task p07-t04: (review) Review-provide label format, continuity notes and the brainstorm checklist

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` (`:364` label pattern; after `:552` resolver-scope sentence; "Parallel continuity" single-member note)
- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (`:849` success-criteria bullet)

**Step 1: Understand the issue**

Review finding (p07 review, Low ×4): (1) explicit-range phase labelling says `(p-revN-` but revision commits carry `(prevN-tNN)`, so a revision phase is silently dropped from `oat_review_phase_ids`; (2) the parallel-continuity prose still promises an integration-merge head that the resolver no longer checks (dropped because step 7 may integrate by cherry-pick); (3) a single group member reviewed after fan-in resolves to `fork..aggregate head` and silently carries earlier siblings' integration work; (4) the brainstorm checklist still says promotion writes `discovery.md` only.
Location: `.agents/skills/oat-project-review-provide/SKILL.md:364,536-556`; `.agents/skills/oat-brainstorm/SKILL.md:849`

**Step 2: Implement fix**

Change the label pattern to "`(pNN-` or `(prevN-`" and map `prevN` back to phase ID `p-revN` when listing phase IDs. Add one sentence after `:552`: the resolver verifies fork base and member-head ordering only; the merge-commit property is not enforced because step 7 may integrate by cherry-pick. Under "Parallel continuity" state that a single group member reviewed after fan-in carries its earlier siblings' integration commits inside the range, recommend the group's `pNN-pMM` run or the pre-fan-in member range for that case, and list sibling phases in the Review Scope as context when a single member is requested. Reword the brainstorm bullet to "Project promotion writes `discovery.md` for quick/spec-driven, `plan.md` for lite, and a `references/research/` note for brief — never `design.md`". Do not touch the resolver script (byte-identical to the tested block) unless the label change requires it; if it does, re-run case 1 and the `p-rev1` extra.

**Step 3: Verify**

Run: `pnpm oat:validate-skills && pnpm format:root && HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts`
Expected: pass; no autonomy re-key (or mapped in the same commit).

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-brainstorm/SKILL.md
git commit -m "fix(p07-t04): revision label format, continuity notes and the brainstorm promotion checklist"
```

---

## Phase 8: Contracts, integration, docs, records and the v1 progress PR

### Task p08-t01: Skill contract tests and autonomy coverage for brief

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts` (extend the lite-mode contract blocks `:8315-9100` to brief: entry surfaces list it; any line pairing quick with spec-driven and lite also names brief; `GATE_AWARE_SKILLS` matches `oat_gateable`; gateable brief; update the `:8719` phase-execution pin to the five-mode form)
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (`:4720` five-mode sentence), `post-implement-sequence-contracts.test.ts`, `project-start-preflight-contracts.test.ts`, `packages/cli/src/engine/engine.integration.test.ts` as each references lite; `skills.test.ts:8660`, `:8691`, `:9044` updated to the five-mode forms
- Modify: `packages/cli/src/validation/named-skill-load-contract.test.ts` (HEAD scan `:2941-2981`: classify every new `oat-project-brief` candidate sentence in `CALL_SITE_MATRIX`, rebind rows whose sentences moved in p05–p07, and keep `report.unclassified` empty with exactly one live call site per row; add `oat-project-brief` to `VENDORING_SKILLS` in `gate-approval-record-contracts.test.ts:25-30` so the p05-t01 symlinks are pinned)
- Modify: `.agents/docs/autonomy-contract.md` (map every prompt site re-keyed by p05–p07 edits per the contract's maintenance rule; `autonomy-gate-inventory.test.ts` green)

**Step 1: Write test (RED)**: the brief blocks fail against a deliberately omitted mention (temporarily revert one p05 edit) and pass after restore; record as the prove-it-can-fail evidence.

**Step 2: Implement (GREEN)**; run `pnpm --filter @open-agent-toolkit/control-plane build && HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared src/engine`.

**Step 3: Commit**

```bash
git add packages/cli/src/validation packages/cli/src/commands/init/tools/shared packages/cli/src/engine .agents/docs/autonomy-contract.md
git commit -m "test(p08-t01): skill contract and autonomy coverage for brief mode"
```

---

### Task p08-t02: Sync output, end-to-end integration tests and deferred snapshot edits

**Files:**

- Regenerate: `.claude/skills/oat-project-brief` (tracked symlink), `.oat/sync/manifest.json`, projections via `pnpm --filter @open-agent-toolkit/cli build && node packages/cli/dist/index.js sync --scope project`
- Modify: `packages/cli/src/commands/commands.integration.test.ts` (end-to-end `project new --mode brief` → dashboard route `oat-project-brief`; promote brief → quick end to end; readiness not-ready reason)
- Modify: `packages/cli/src/commands/project/promote/promote.ts` (command description mentions brief) and `packages/cli/src/commands/help-snapshots.test.ts` (`:1188` description)
- Modify: `.oat/templates/state.md` (`oat_brief_gate` commented block beside `oat_quick_start_gate`)
- Modify: `.oat/templates/implementation-brief.md` (carried from the p06 review: add an `**Outcomes audit:**` slot under `## Final Summary (for PR/docs)`; reword the `**Head:**` placeholder at `:56` to "recorded when the phase's work ends, before its review")
- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md` and `.agents/skills/oat-project-brief/references/brief-contract.md` §10 (carried from the p07 review: align "each phase head is its integration merge" with the review-provide resolver, which verifies fork base and member-head ordering only because step 7 may integrate by cherry-pick)
- Modify: `.agents/skills/oat-project-brief/references/brief-contract.md` (carried from the p06 review round 2: after `:224` add "A group member's per-phase review runs before fan-in on `EXPECTED_HEAD..<worktree head>` with `oat_review_scope_source: anchors`; the fan-in anchors govern `pNN-pMM` and `final`"; carried from the p06 review: `:72` states the ownership decision once — `**Base:**` written by the root in the phase-start commit, `**Head:**` by the committing owner when the phase ends, `**Status:** completed` only by the root at acceptance)

**Verify:** `git ls-files .claude/skills/oat-project-brief` lists the link; `pnpm --filter @open-agent-toolkit/control-plane build && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/commands.integration.test.ts src/commands/help-snapshots.test.ts` passes.

**Commit:**

```bash
git add .claude/skills/oat-project-brief .oat/sync/manifest.json .codex/agents .cursor/agents packages/cli/src/commands/commands.integration.test.ts packages/cli/src/commands/project/promote/promote.ts packages/cli/src/commands/help-snapshots.test.ts .oat/templates/state.md
git commit -m "chore(p08-t02): sync brief skill links, end-to-end integration tests and snapshot updates"
```

---

### Task p08-t03: Real-artifact probe

**Files:**

- Modify: `implementation.md` evidence section only (scratch under a `mktemp -d` repo; no tracked fixtures)

**Steps:** `pnpm build`; `CLI="$PWD/packages/cli/dist/index.js"`; `CP="$PWD/packages/control-plane/dist/index.js"`; `export HOME=$(mktemp -d)` for the whole probe (the maintainer's `~/.oat/templates/` would otherwise join template resolution); in `SCRATCH=$(mktemp -d)`: `git init`, `node "$CLI" --cwd "$SCRATCH" init …` as the repo's documented bootstrap requires, `node "$CLI" --cwd "$SCRATCH" --json project new brief-probe --mode brief`, author a two-phase brief (one parallel group of two taskless phases) in `$SCRATCH/.oat/projects/shared/brief-probe/plan.md`, write journal sections with anchors for both phases; then run and record: `node "$CLI" --cwd "$SCRATCH" --json project status --project-path <path>` (expect `progress.total 2, completed 2`), `node "$CLI" --cwd "$SCRATCH" --json project validate-plan --project-path <path>` (expect valid with the taskless group), `node "$CLI" --cwd "$SCRATCH" state refresh`, and a node script that imports `getProjectState` from `"$CP"` by absolute path against the scratch project and prints the phase units. The review artifact fields are exercised by p07-t01's scripted check, not here.

**Verify:** every probed command succeeds with the expected categorical result; failures are fixed in the owning phase's files and re-probed.

**Commit:**

```bash
git add .oat/projects/shared/brief-goal-workflow-modes/implementation.md
git commit -m "chore(p08-t03): record real-artifact probe for brief mode"
```

---

### Task p08-t04: Docs, lane diagrams and root AGENTS.md

**Files:**

- Modify: `apps/oat-docs/docs/workflows/choose-workflow.md`, `workflows/projects/lifecycle.md` (lanes and diagram references), `reference/project-state-machine.md`, `reference/project-artifacts.md`, `reference/oat-directory-structure.md`, `reference/cli-reference.md`, `workflows/approvals-and-automation.md`, `workflows/projects/planning/starting-projects.md` (expand the `## oat-project-brief` section added in p05-t01), `workflows/projects/planning/planning-skills.md`, `workflows/projects/planning/hill-checkpoints.md`, `workflows/projects/execution/execution-skills.md`, `workflows/projects/execution/implementation-execution.md`, `workflows/projects/execution/picking-up-projects.md`, `workflows/projects/closeout/closeout-skills.md`, `workflows/projects/closeout/pr-flow.md`, `workflows/projects/reviews/index.md`, `workflows/projects/reviews/review-flavors.md`, `workflows/advanced/workflow-gates.md`, `workflows/advanced/autonomy.md`, `skills/brainstorm.md`
- Create: `apps/oat-docs/public/diagrams/project-lifecycle-8-brief-lane-{light,dark}.svg` following the existing lane diagram style; update `project-state-machine-{light,dark}.svg`
- Modify: `AGENTS.md` (Workflow Options adds brief with goal noted as v1.5; recommendation heuristic row; Workflow Mode Change Inventory unchanged)
- Regenerate: `apps/oat-docs/docs/skills/index.md` via `pnpm docs:skills:generate` (the mapping entry from p05-t01 makes this succeed); `apps/oat-docs/index.md` via `oat docs generate-index`

**Verify:** `pnpm build:docs` and `pnpm --filter oat-docs check` pass; `git diff --stat apps/oat-docs/index.md` shows only generated changes.

**Commit:**

```bash
git add apps/oat-docs AGENTS.md
git commit -m "docs(p08-t04): brief workflow mode across docs, diagrams and workflow options"
```

---

### Task p08-t05: Decision records and backlog items

**Files:**

- Run first: `node packages/cli/dist/index.js pjm doctor --json` and confirm `adoption.state` is adopted before any write; use the `oat-pjm-decision` skill when installed, otherwise `oat decision new`
- Create: `DR-<date>-brief-mode-family` (modes, predicate, naming), `DR-<date>-phase-unit-progress-contract`, `DR-<date>-anchor-review-scope`, `DR-<date>-tasks-as-execution-records`, `DR-<date>-brief-promotion-migration`
- Create via `oat backlog new`: BL for `.oat/scripts/generate-oat-state.sh` legacy mode table, after recording the caller check: `grep -rn "generate-oat-state" --include=*.ts --include=*.mjs --include=*.md --include=*.sh . | grep -v node_modules` (bundled asset referenced by skills and tests, not invoked by the CLI path) in `implementation.md`
- Regenerate: `.oat/repo/reference/decisions/index.md` via `oat decision regenerate-index`

**Verify:** the index regenerates without conflict; `git status --short` clean after commit.

**Commit:**

```bash
git add .oat/repo
git commit -m "docs(p08-t05): decision records and backlog for brief workflow mode"
```

---

### Task p08-t06: Version bumps and the full gate run

**Files:**

- Modify: `metadata.version` in every skill changed in p05–p07 (one bump each) and top-level `version:` in both agent roles (deferred from p06-t02)
- Modify: every exact version pin that names a bumped skill or role (the line lists below are examples, not the full set; the sweep is authoritative): sweep `rg -n "toBe\\(expectedVersion\\)|\\['oat-project-[a-z-]+', '[0-9]+\\.[0-9]+\\.[0-9]+'\\]|toBe\\('[0-9]+\\.[0-9]+\\.[0-9]+'\\)|toBe\\(version\\)|version: '[0-9]+\\.[0-9]+\\.[0-9]+'" packages/cli/src` (the object-form block at `skills.test.ts:2209-2280` pins discover, plan, quick-start, lite and implement) and update `packages/cli/src/validation/skills.test.ts` (`:3373-3381`, `:5182-5198`, `:6591-6604`, `:6665-6675`, `:6811-6821`) and `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (`:359`, `:1414`)
- Modify: lockstep versions in `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms` (`package.json`) and `packages/cli/assets/public-package-versions.json`; versions strictly greater than fetched `origin/main`

**Steps:** `git fetch origin main`; bump; run every gate as an explicit line with its captured exit code (no shell loop; zsh does not word-split `$g`):

```bash
pnpm check > /tmp/gate-check.log 2>&1; echo "check exit=$?"
pnpm type-check > /tmp/gate-type-check.log 2>&1; echo "type-check exit=$?"
pnpm test > /tmp/gate-test.log 2>&1; echo "test exit=$?"
pnpm build > /tmp/gate-build.log 2>&1; echo "build exit=$?"
pnpm run check:skill-bumps > /tmp/gate-skill-bumps.log 2>&1; echo "check:skill-bumps exit=$?"
pnpm release:check-versions > /tmp/gate-check-versions.log 2>&1; echo "release:check-versions exit=$?"
pnpm release:validate > /tmp/gate-release-validate.log 2>&1; echo "release:validate exit=$?"
pnpm build:docs > /tmp/gate-build-docs.log 2>&1; echo "build:docs exit=$?"
HOME=$(mktemp -d) pnpm exec turbo run test --force > /tmp/gate-test-force.log 2>&1; echo "test-force exit=$?"
pnpm test:smoke > /tmp/gate-smoke.log 2>&1; echo "test:smoke exit=$?"; pnpm test:skills > /tmp/gate-skills.log 2>&1; echo "test:skills exit=$?"; pnpm test:scripts > /tmp/gate-scripts.log 2>&1; echo "test:scripts exit=$?"
pnpm lint > /tmp/gate-lint.log 2>&1; echo "lint exit=$?"; pnpm format > /tmp/gate-format.log 2>&1; echo "format exit=$?"
```

**Verify:** every exit code is 0 and the forced test log shows no `FULL TURBO` replay; failures are fixed in the owning files before the phase closes; after the commit, re-read the committed files and confirm `git status --short` is clean (the pre-commit hook re-formats Markdown).

**Commit:**

```bash
git add .agents/skills .agents/agents packages/*/package.json packages/cli/assets/public-package-versions.json packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "chore(p08-t06): version bumps for brief workflow mode"
```

After p08 is accepted and reviewed, run `oat-project-pr-progress` for p01–p08 (the v1 progress PR), link it with `link_pull_request`, and do not merge. Then run the Astra v1.5 plan-revision round on `design.md` "Carried to the v1.5 review" and revise p09–p12 before p09 starts.

---

### Task p08-t07: (review) Brief arrival point in the brainstorm docs and the gate template comment

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md` (`:673` brainstorm entry paragraph)
- Modify: `.oat/templates/state.md` (`:85` `oat_brief_gate` block comment) and its bundled copy under `packages/cli/assets/templates/` if one is tracked

**Step 1: Understand the issue**

Review finding (p08 review, Low ×2): the brainstorm entry paragraph was widened to four lanes but lists only three arrival points, leaving the brief reader without the hand-off `oat-brainstorm/SKILL.md:556-559` defines; the `oat_brief_gate` template comment says "read back by nothing" while `oat-project-progress` reads and reports it, and the skill's own wording is "read back by no route".
Location: `apps/oat-docs/docs/workflows/projects/lifecycle.md:673`; `.oat/templates/state.md:85`

**Step 2: Implement fix**

Append "; Brief users arrive at `oat-project-brief` with the brainstorm payload saved as a research note under `references/research/` and the scaffolded `plan.md` left for the interview." to the lifecycle sentence. Change the template comment clause to "provenance only, read back by no route" (matching `oat-project-progress/SKILL.md:233`); keep the bundled copy identical. No further version bump: the lockstep already exceeds `origin/main` on this branch.

**Step 3: Verify**

Run: `pnpm --filter oat-docs check && HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/gate-approval-record-contracts.test.ts src/commands/help-snapshots.test.ts && pnpm oat:validate-skills && pnpm format:root`
Expected: all exit 0; `git diff --stat` touches only the named files.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/workflows/projects/lifecycle.md .oat/templates/state.md packages/cli/assets/templates/state.md
git commit -m "fix(p08-t07): brief arrival point in the brainstorm docs and the gate template comment"
```

---

## Phase 9: Goal registration and control-plane transitions (v1.5)

**Goal guard verification, p09–p12 (Astra round 2).** Each existing named rejection and each case below retains its exact counterexample: acceptance with the owning guard neutralized, rejection after restoration, and a passing valid control. For new goal behavior, report this as guard-neutralization evidence, not a reproduced pre-existing HEAD defect. Exercise each distinct guard once at its owning public boundary; p12 references those results.

- **p09-t02 / p11-t01 — `goal-activation-prerequisites`:** independently refuse missing approval, disallowed/stale plan binding, a provisional next phase or next-group member, and activation after declaration. Accept an approved concrete next dispatch with later provisional phases.
- **p09-t02 / p11-t02 — `goal-recovery-evidence`:** independently refuse `fixes_completed`, wrong-artifact receive, blocked/stale exit evidence, and reuse of evidence after queued fixes. Clean receive advances only the targeted delivery; interrupted recovery preserves the active pointer; stale evidence detected at pr-progress entry for d01 while m02 is active leaves m02's ID, status and both pointers unchanged; inline feedback on m01 through `oat-project-revise` while m02 is active lands as a phase-only `p-rev1` with m01 membership and a recovery record, verified through the real membership and router readers, with an active-milestone case and an ordinary-brief case as controls.
- **p10-t02 / p10-t03 — `goal-carrier-subject`:** changed configuration, override or subject invalidates the resolution. Unchanged `no_gate` and `project_disabled` controls pass with null reviewed heads; implementation bookkeeping does not invalidate the approved plan subject.
- **p10-t02 — `goal-successor-inspection`:** reject missing objects, failed inspection, unknown paths and substantive merge-introduced changes. Accept the fully inspected bookkeeping chain without rewriting reviewed revisions.
- **p10-t03 — `goal-audit-integrity`:** independently reject unknown, duplicate or contradictory references, changed outcome numbering/text, provisional work claimed accepted, missing deferral reason/approval, `met` with deferred obligations, mismatched extraction targets and an incomplete child without approved deferral. An exhaustive `met_with_deferrals` audit passes without fabricating phase completion.
- **p10-t03 — `goal-terminal-observation`:** unreadable required inputs or failed member observation refuse completion without writes. Valid fresh observations permit read-only checking; snapshot PR satisfaction occurs only at its configured position.
- **p10-t03 — `goal-supersession-integrity`:** supplement existing graph cases with duplicate IDs, self-links, conflicting predecessors, a non-superseded source, replacement after historical endpoint attainment, additive corrections claiming inherited scope, registering entries, unmet endpoints and unknown/unaccepted scope claims. The valid three-delivery chain passes; later correction cannot overwrite historical review/gate bindings.
- **p11-t02 — `goal-explicit-review-scope`:** m01 owns p01–p02, m02 owns p03, and m01 gains p-rev1. Reject provenance expanded to include p03 and pre-fan-in evidence used as integrated delivery evidence. Accept exactly `[p01, p02, p-rev1]`, disclosing intervening Git changes.
- **p11-t02 — `goal-registration-resume`:** multiple lookup matches refuse creation; one match attaches without a duplicate; zero creates once.
- **p10-t04 — `goal-promotion-unsettled`:** supplement existing refusals with a registering/unsettled delivery; preserve the existing settled promotion-and-resume control.

### Task p09-t01: Register `goal`, extraction parsing and goal state fields

**Files:** `packages/control-plane/src/types.ts` (`goal` in `WORKFLOW_MODES` and `BRIEF_MODES`; `extracted?: { to }` on `PhaseProgress`; goal state fields on `ProjectState`: `milestone`, `milestoneStatus`, `goalStatus`, `goalOutcomeAudit` with the A3 shape and its validation result, `goalRecovery` (A1), `deliveries` with reciprocal replacement links and durable evidence incl. endpoint-attainment history (A4), `milestoneGates` with nullable `reviewed_head`, a subject binding (A2) and `exit.freshness: fresh | stale | null` plus `freshness_reason`), `packages/control-plane/src/state/parser.ts` (+test), `packages/control-plane/src/state/milestones.ts` (+test; B1: canonical fence-aware `## Milestones` table grammar and one shared reader returning membership plus errors), `packages/control-plane/src/state/goal-audit.ts` (+test; `validateGoalOutcomeAudit(audit, fullPhaseInventory, outcomes)` is the single audit predicate: it enumerates every plan phase, including extracted and revision phases, before any execution-scope filtering; p09-t02 and p10-t03 consume its result rather than re-validating), `packages/control-plane/src/project.ts` (both `ProjectState` constructors at `:51-82` and `:129-157` expose parsed membership with its errors, recovery and the audit validation result; reader tests), `packages/control-plane/src/state/tasks.ts` (+test: `extracted` precedence, exclusion from totals; membership is validated by `state/milestones.ts` — unknown, duplicate or missing phase → error surfaced on `ProjectState` — before any scope reaches `selectPhaseUnits`, which keeps its landed contract (`tasks.ts:263-266`, `tasks.test.ts:877-881` unchanged); goal callers never pass an unvalidated scope), `packages/control-plane/src/index.ts` (export the Milestones reader, its error type, the audit validator and the goal state types), `packages/control-plane/README.md` (mode list `:40-42` names `goal` as a brief-family mode), `packages/cli/src/commands/project/new/scaffold.ts` goal map entries, `oat_plan_source: goal` rendered (B1; the shared template hardcodes `brief` at `plan-brief.md:10`) and the brief-only Milestones placeholder (`plan-brief.md:76-78`) replaced by the canonical table header for goal, `packages/cli/src/commands/project/new/index.test.ts` (scaffold assertions incl. the Milestones header), `packages/cli/src/commands/help-snapshots.test.ts`.

**Verify:** scoped vitest for parser, milestones, project readers, tasks, scaffold and help snapshots after a control-plane build; `pnpm type-check`. Negative controls through the real readers: a malformed Milestones table, an unknown phase ID and a phase in two milestones each surface an error instead of vanishing from progress; a goal scaffold reads back `oat_plan_source: goal` and the canonical Milestones header; a CLI-side import of the new barrel exports type-checks after a control-plane build. Guard `goal-membership-reader`: neutralize the reader's unknown/duplicate/missing checks and show a malformed table, an unknown ID and a two-milestone phase vanish from progress; restore and show each surfaced as an error; a well-formed two-milestone table reads back exact membership.

**Commit:** `feat(p09-t01): register goal mode, extraction parsing and goal state fields`

---

### Task p09-t02: Goal routing priority and transition table

**Files:** `packages/control-plane/src/recommender/router.ts` (+test), `packages/cli/src/commands/state/generate.ts` (+test) goal routes and help.

**Steps:** for `workflowMode === 'goal'` the goal priority block runs immediately after `getHillOverride` and before `getBriefUnitGuard` (`router.ts:135`); under goal the brief-unit guard applies only inside status-table step 4 at `implementing`, with scope = the active milestone's ordered phase set from the shared Milestones reader; under `declared_met` the terminal execution scope excludes audited `deferred`/`retired` phases; pending recovery uses `oat_goal_recovery.phase_ids`; `brief` keeps the current guard unchanged. The router reads only persisted derived freshness (`integrated_review.disposition`, carrier freshness written by refresh or by the owning skill) and never evaluates Git. Implement the design's goal router priority as an explicit block: (1) `declared_met` → terminal recovery with the A3 audit validated first through p09-t01's `validateGoalOutcomeAudit` (undeclared or non-exhaustive audit refuses with the owner named; audited deferrals/retirements leave terminal execution scope without changing ordinary phase-unit counts); (2) actionable review artifacts → review-receive, then a pending `oat_goal_recovery` → its stage owner; (3) invalid membership (B1) → `oat-project-goal`; (4) the status table, with `reviewing` routed by the missing evidence (A1: missing/blocked/stale exit carrier → implement scoped closeout; missing/stale integrated review → review-provide; unreceived → review-receive) and review contexts carrying the explicit milestone identity and ordered phase set (B2), never a `first-last` range; `delivered` means registered, open and review-ready while activation of m(N+1) waits for the agreed endpoint (B4); brief-unit guard scoped to the active milestone.

**Verify:** behavioral router tests driven through the real project readers and `recommendSkill` (not hand-built router objects) for every status and transition. Negative controls: (A1) with m02 active and d01 needing recovery, a `received` review is not delivery-ready and review-provide is not recommended while the exit carrier is missing; the corrected route rejects both and leaves m02 and its pointer untouched, and a clean receive of the exact fresh review advances only d01; (A3) declared-met with a completed snapshot but an omitted phase or outcome disposition routes to goal for audit repair; (B4) a merged-endpoint fixture proves "open permits planning, not activation" and an `open` endpoint permits activation. Every A1/A3/B4 fixture sets `phase: implement` with `phaseStatus` in {in_progress, complete}. Three placement controls: a declared-met project with an audited deferred phase does not route to implement; a delivered m01 with drafted m02 phases does not route to implement; the existing `router.test.ts` brief-guard cases stay green unchanged; a recovery record walked through every stage via the real readers routes to each stage owner in turn and reaches no owner twice without a stage change; neutralize one stage write and show the route repeats. For each guard: neutralize it, show the bad state accepted, restore, show rejection, and keep a valid control passing.

**Commit:** `feat(p09-t02): goal milestone routing and transitions`

---

### Task p09-t03: (review) Newest passed review wins over a stale registry entry; tolerant scope labels; normalized id lists

**Files:**

- Modify: `packages/control-plane/src/recommender/router.ts` (+test)
- Modify: `packages/control-plane/src/state/parser.ts` (+test)

**Step 1: Understand the issue**

Review finding (p09 review, High + Medium + Low): `readIntegratedReview` sets `registered = delivery.integrated_review` for every status-table route and (a) returns `stale` outright when the registry disposition is stale/failed, (b) otherwise looks up the Reviews row by the registry's artifact, so after `delivering → implementing → reviewing → received → passed` on a new artifact the newest `passed` row is invisible; the row lookup accepts only a bare `mNN`/`dNN` Scope cell; persisted phase-id lists (`oat_goal_recovery.phase_ids`, `oat_deliveries[].scope`, `integrated_review.scope`, carrier `subject.scope`) are read verbatim while membership ids are normalized.
Location: `packages/control-plane/src/recommender/router.ts:701-759,722-731`; `packages/control-plane/src/state/parser.ts:275-283,343,381-386`

**Step 2: Implement fix**

When `target.artifact === null`, resolve the newest `code` row matching the milestone/delivery label first and let the registry's disposition govern only when that row's artifact equals `registered.artifact` (a superseded registry entry never vetoes a newer passed artifact). Accept a Scope cell equal to the id or starting with `<id>:`. Run `normalizePhaseId` over the four persisted lists in `parser.ts`, dropping tokens it rejects. Add a real-reader router test for the active-milestone cycle `delivering → implementing → reviewing → (received) → (passed) → pr-progress` with a registered delivery, in both registry-disposition variants, plus the `| m01: p01, p02 |` label case and a `p1` → `p01` list case.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane build && HOME=$FH pnpm --filter @open-agent-toolkit/control-plane exec vitest run`
Expected: pass; the new cycle test fails with the lookup reverted (neutralize, observe, restore).

**Step 4: Commit**

```bash
git add packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/state/parser.test.ts
git commit -m "fix(p09-t03): newest passed review wins, tolerant scope labels, normalized id lists"
```

---

## Phase 10: Goal CLI: validation, delivery registry, refresh and closeout (v1.5)

### Task p10-t01: Goal validation profile

**Files:** `validate-plan/profiles.ts` (+test): `goal` rules (`goal-milestones-missing`, `goal-duplicate-milestone`, `goal-milestone-unknown-phase`, `goal-phase-in-multiple-milestones`, `goal-phase-without-milestone` (B1; every executable phase incl. `p-revN`), `goal-shipped-milestone-changed`, `goal-delivered-scope-changed` (B2; a frozen delivery scope lost or reassigned a phase — appending a correction phase to its recovery milestone is permitted), `goal-group-crosses-milestone`, `goal-plan-source` (B1; `oat_plan_source: goal`)); the profile consumes the shared Milestones reader from p09-t01 and maps its codes onto the reader's error codes (`milestones-missing`, `milestones-malformed`, `milestone-duplicate`, `milestone-empty`, `milestone-unknown-phase`, `phase-in-multiple-milestones`, `phase-without-milestone`) rather than re-parsing (carried from the p09 review); non-canonical phase ids in persisted registry lists are reported as a validation error.

**Verify:** scoped vitest with one accepted fixture per rule and the matching rejection; the B2 pair (append permitted, removal/reassignment refused). Guard `goal-profile-rules`: for each new rule code, neutralize the rule and show its rejection fixture validates; restore and show the code; the shared valid fixture passes every rule. **Commit:** `feat(p10-t01): goal plan profile rules`

---

### Task p10-t02: Delivery refresh command and the delivery-evidence evaluator

**Files:** `packages/cli/src/commands/project/delivery/{index,refresh,check,evidence}.ts` (+tests; registry types imported from p09-t01): `refresh` reads and writes `oat_deliveries` per `design.md` "Delivery registry", calling `gh pr view … --json state,headRefOid,baseRefOid` through an injectable dependency, records observations and derived freshness only (`integrated_review.disposition` and `oat_milestone_gates[mNN].exit.freshness`/`freshness_reason`), and never overwrites reviewed revisions or the first observed endpoint attainment (A4); `evidence.ts` is the shared delivery-evidence evaluator (A2): keeps actual reviewed revisions, inspects every successor commit (incl. merge-introduced changes) against the bookkeeping path allowlist and the substantive-change rules, distinguishes carrier outcome from freshness, validates member base independently, fails closed on missing objects or unknown paths; `refresh` never writes `oat_milestone_status` or `oat_goal_recovery`; `check` is `oat project delivery check --project <path> --subject <milestone|delivery> --json`, read-only, running `evidence.ts` for a milestone scope before registration and reporting carrier and review freshness with reasons; `packages/cli/src/commands/project/index.ts` registration; help snapshots for both commands.

**Verify:** scoped vitest with a stubbed `gh` and a scratch git repo for the evaluator; help snapshot. Negative controls (A2): a paths-only evaluator accepts an Outcome or authority change inside allowed `plan.md` — the corrected evaluator rejects it; also reject a substantive-then-reverted commit, a non-ancestor head and a changed base. Valid control: head-recording → receive/archive → registration commits pass with the reviewed SHA unchanged; positive regression: the exact-head comparison rejects that chain and the successor evaluator accepts it; `delivery check` on a scratch repo returns stale for a substantive successor and writes nothing; refresh guard: neutralize the never-overwrite rule and show a reviewed revision or the first endpoint attainment rewritten by an observation, restore and show them preserved, with a plain refresh still updating `observed_*`. **Commit:** `feat(p10-t02): delivery registry refresh command and the delivery-evidence evaluator`

---

### Task p10-t03: Closeout boundary inputs, coverage predicate and gate carriers

**Files:** `closeout-check/closeout-invariant.ts` (`EvaluateCloseoutOptions` gains `planContent`, `implementationContent`, declaration/audit, extracted-child facts sufficient to validate `oat_extracted_from` backlinks (not `childLifecycles` alone), and current delivery observations as data; the pure evaluator stays separate from I/O; coverage predicate per design (A4): reciprocal replacement links validated, chains resolved transitively to the terminal delivery, effective scope = union of frozen scopes, inherited obligations counted once, disjoint terminal scopes, evidence bound to the entire effective scope via the p10-t02 evaluator and immutable subject bindings (A2); terminal boundary requires `declared_met` and an exhaustive A3 audit validated through p09-t01's `validateGoalOutcomeAudit` (no second predicate) before either success return), `closeout-check/index.ts` and `complete-state/index.ts` (load inputs through `checkProjectCloseout`; read-only host observation without writes; `complete-state` writes nothing on refusal; diagnostics name the next owner), `oat_milestone_gates` carrier validation with nullable `reviewed_head` and subject binding; tests including identical state with different journal or child facts.

**Verify:** scoped vitest; one end-to-end goal fixture combining extraction, changed member revision, stale milestone gate, correction supersession and terminal coverage without a duplicate PR. Negative controls: (A3) valid coverage plus a completed snapshot with the declaration omitted, then independently one pending/provisional phase and one outcome omitted from the audit — the old boundary accepts, the corrected boundary refuses each for its reason and `complete-state` writes nothing; the omitted-declaration case repeated through the `not_required` path; a wrong child backlink fails and the matching completed child passes; (A4) against a one-hop predicate a terminal replacement whose review lists only its new revision phase is accepted despite inherited phases — corrected coverage rejects it; a cycle, a missing link, a mismatched reciprocal link and overlapping terminal scopes each refuse; valid control `d01 → d02 → d03` with full effective-scope evidence on d03 passes and counts every inherited phase once. router and closeout agree on the same audit fixture; carrier guard: neutralize the subject-binding check and show a `no_gate` carrier with a fabricated `reviewed_head` or a changed subject accepted, restore and show it refused, with an unchanged `no_gate` control passing.

**Commit:** `feat(p10-t03): goal closeout coverage predicate and milestone gate carriers`

---

### Task p10-t04: Goal → quick promotion at a settled delivery boundary (B3)

**Files:** `packages/cli/src/commands/project/promote/{promote,index}.ts` (+command and migration tests; `packages/cli/src/commands/help-snapshots.test.ts` description), `.agents/skills/oat-project-quick-start/SKILL.md` (promotion resume generalized to `oat_promoted_from: brief | goal`), `.agents/skills/oat-project-brief/references/brief-contract.md` (goal promotion rule).

**Steps:** accept `goal` only when `oat_milestone_status: delivered`, every `oat_deliveries` entry has registry status `at_endpoint` or `superseded` (none `registering` or `open`), `oat_goal_recovery` is null and no phase is extracted (keep the landed refusal for any extracted phase, matching the migration table); retain `oat_deliveries`, `oat_milestone_gates` and `oat_goal_outcome_audit` verbatim in the promoted `state.md` frontmatter and copy them into `references/brief-archive.md`; write `oat_promoted_from: goal`; keep historical `## Reviews` cells and name the actual source mode in the provenance line; reuse the existing `oat_promotion_pending_phases` readiness clause — no second readiness predicate.

**Verify:** scoped vitest: a settled goal promotes and resumes through quick-start; an active milestone, a `registering` or `open` delivery, a pending recovery and an extracted phase each refuse without writes (assert the tree is unchanged); guard `goal-promotion-unsettled`: neutralize the settled-boundary check and show the `open`-delivery fixture promoted, restore and show it refused; the brief → quick path is unchanged (`promote.brief.test.ts` green).

**Commit:** `feat(p10-t04): promote settled goal projects to quick`

---

### Task p10-t05: (review) `--cwd` for the goal journal read, set-once delivery `exit_gate`, and the `delivery check` report contract

**Source:** p10 review round 1 (reviews/archived/p10-review-2026-10-11T135002Z.md) M1, M2, L1, L2, L3, L6.

**Files:** `validate-plan/index.ts` (+test): the goal-only `implementation.md` read uses the cwd-resolved `projectPath`; a `--cwd` test runs the goal profile with a journal-extracted phase from a foreign cwd and expects `{ valid: true }` (M1). `delivery/evidence.ts` (+test): `judgeDeliveries` treats `oat_deliveries[].exit_gate` as set-once except in a commit that also records new integrated-review evidence for that delivery; the `decided_at` rerun escape stays in `judgeMilestoneGates` only; tests: a successor rewriting `d01.exit_gate` with a new `decided_at` is `substantive-change`, the registration commit that first sets it stays `bookkeeping-successor` (M2). `delivery/check.ts` (+test, help snapshot if the description changes): `exit.source: 'milestone-carrier' | 'delivery-binding'` on the report (L1); `status: 'undeliverable'` when `deliverable` is false (L2). `delivery/refresh.ts` (+test): `mayReplaceStoredValue` is path-aware (member `observed_head|observed_base|status`, delivery `status` only while stored `open`, `integrated_review.disposition`, carrier `freshness|freshness_reason`) (L3). `promote/promote.ts` (+test): refuse `goal-delivery-unsettled` when `oat_milestone_status: delivered` and `oat_deliveries` is empty (L6).

**Verify:** scoped vitest for the five modules plus help snapshots; the M1 fix reproduced with the built CLI from `/` with `--cwd`; prove-it-can-fail for M2 (restore the rerun escape in `judgeDeliveries`, the new test fails). **Commit:** `fix(p10-t05): cwd-resolved goal journal, set-once delivery exit gate, delivery check report contract` (shortened at commit time: the planned message was 105 characters and commitlint's header limit is 100)

---

### Task p10-t06: (review) Order-insensitive review identity in the delivery exit-gate unlock

**Source:** p10 review round 2 (reviews/archived/p10-review-2026-10-11T140916Z.md) L1.

**Files:** `delivery/evidence.ts` (+test): `recordsNewReview` compares the review identity fields order-insensitively (or unlocks only on an `artifact` change), so a commit that reorders `integrated_review.scope` with the same set and swaps `exit_gate` is `substantive-change`; the accepted case (new artifact plus replacement binding in one commit) still passes.

**Verify:** scoped vitest for `delivery/`; prove-it-can-fail by restoring the order-sensitive comparison. **Commit:** `fix(p10-t06): order-insensitive review identity in the exit-gate unlock`

---

## Phase 11: Goal skills and roles (v1.5)

### Task p11-t01: `oat-project-goal` skill and goal sections of the brief contract

**Files:** `.agents/skills/oat-project-goal/SKILL.md` (gateable; brief steps plus the canonical Milestones table, milestone state, `plan` carrier bound to the approved brief/amendment and membership at activation (A2), re-alignment entry at `delivered` that may draft and review the next milestone but activates it only at the agreed endpoint (B4), terminal declaration entry that alone writes `declared_met` and authors the exhaustive outcome audit with phase and outcome dispositions (A3); implement consumes the declaration and never declares the goal met), `oat-project-brief/references/brief-contract.md` goal sections (the Milestones table grammar verbatim from `state/milestones.ts` — header cells `Milestone`/`Phases`, separator row, one `mNN` per row with `m1` → `m01`, comma-separated optionally backticked phase ids normalized, row order = ordered phase set, trailing columns ignored, extracted phases exempt from `phase-without-milestone`, the seven error codes — carried from the p09 review; the Scope-cell rule for goal integrated reviews; the approval-evidence rule: `plan.md` `oat_status: complete` once, then each milestone's `plan` carrier written `allowed` only after that milestone's artifact review, gate and approval — p11-t01 owns that write order; plan versus code gate subjects with nullable `reviewed_head`, the bounded bookkeeping-successor rule, explicit goal review scopes, the goal exception to the shared ladder), `packages/cli/src/commands/shared/frontmatter.ts` `GATE_AWARE_SKILLS`, pack manifest and bundle inputs, `.agents/docs/autonomy-contract.md` GOAL rows and the 18th root, `apps/oat-docs/skill-docs.json` mapping and a minimal docs section.

**Carried from p10 (amendment 5.1):** the brief-contract goal sections state (1) the snapshot field `satisfied_by: { pr: delivery-coverage }` (goal only, `pr` step only, once `pr` is in the completed prefix); (2) the extracted-child deferral shape (disposition stays `extracted` with non-empty `reason` and `scope_decision_ref`; the audit must be `met_with_deferrals`, refused as `child-deferral-under-met` under `met`); (3) `oat project delivery check` judges the milestone's current working exit carrier (`exit.source: milestone-carrier`) while the closeout boundary judges the exit gate persisted with each delivery — two consumers, named as such; (4) `goal-delivery-unsettled` also covers a `delivered` milestone whose `oat_deliveries` is empty or missing; (5) the two accepted evaluator leniencies: a modified review artifact is accepted without a frontmatter identity check (tracked records are authoritative), and a recorded `**Head:**` may be rewritten in a bookkeeping commit under the late-fix rule. Project log: `oat-project-goal` appends exactly one structural entry through `oat project log append --structural --producer oat-project-goal --ref mNN` at milestone activation and one at each re-alignment entry, and "learnings captured" (the `delivered → aligning` prerequisite) is defined as a concrete write: a judgment entry (`worked-well`/`friction`) in the project log when enabled, otherwise a dated entry in `oat-execution-learnings.md`; the skill never pre-checks log configuration because the helper no-ops when logging is disabled.

**Verify:** `pnpm oat:validate-skills`; gate resolve on a scratch goal project after a CLI build; the log-append and learnings clauses present at cited lines. **Commit:** `feat(p11-t01): oat-project-goal skill and goal brief contract`

---

### Task p11-t02: Delivery registration, terminal delivery and review-loop owners

**Files:** `oat-project-pr-progress/SKILL.md` (goal: idempotent registration with persisted lookup keys, delivery prerequisites checked through `oat project delivery check`, refresh before registration, reciprocal `covers_scope_of`/`superseded_by` links and the exit-gate result captured with the delivery evidence (A4); when refresh reports the integrated review or `exit` carrier stale under the successor contract, write `oat_milestone_status: reviewing` and `oat_goal_recovery: { milestone, delivery_id, phase_ids, stage }` with the stage chosen by the A1 missing-evidence rule when the stale delivery belongs to the active milestone, and stop before registration; for an older milestone's delivery write only the targeted recovery record and evidence, leaving the active milestone's ID, status and both pointers unchanged; clears the record after the targeted delivery is refreshed fresh), `oat-project-pr-final/SKILL.md` (goal: terminal delivery registration for uncovered accepted phases after the A3 audit is valid), `oat-project-review-provide/SKILL.md` (goal: records `received`, never `delivering`; accepts only an explicit milestone/delivery identity with its ordered phase set and preserves it in provenance while disclosing a wider Git range (B2); advances a pending recovery record to `receiving`), `oat-project-review-receive/SKILL.md` (goal: owns `reviewing → delivering` on a clean receive after writing `passed` and re-validating scope, revisions and exit carrier; queued fixes invalidate review and exit-gate evidence; persists the authoritative scope, revision and disposition evidence in tracked records before local archival (A1, A4); late corrections assigned to their recovery milestone without moving the active one; creates `oat_goal_recovery` (stage `implementing`) when fixes target an older delivery and moves it to `delivering` on a clean receive or back to `implementing` when fixes are queued; invalidation writes `exit.freshness: stale` from `delivery check` output), `oat-project-reconcile/SKILL.md` (repairs an interrupted `oat_goal_recovery` record; never creates one for the active milestone), `oat-project-revise/SKILL.md` (goal: requires an explicit milestone/delivery target; phase-only `p-revN` with exact membership; invalidates the targeted delivery's review and exit-gate evidence; for an older delivery creates/advances `oat_goal_recovery` instead of writing the global pointer or status; the open-PR brainstorm hand-off in `oat-brainstorm/SKILL.md:766` names the target the same way), `oat-project-complete/SKILL.md` (goal completion decision consumes validated goal coverage: with an exhaustive declaration/audit, merged deliveries and a coverage-satisfied `pr` step it sets no `SHOULD_OPEN_PR` and calls no `gh pr create` even when `workflow.createPrOnComplete` is true; genuinely uncovered delivery work routes to the goal registration owner; a separately intended bookkeeping PR is distinguished from a goal delivery; non-goal behavior unchanged), `oat-project-implement/references/*` (milestone closeout: scope-limited exit gate carrier that precedes the integrated review, `reviewing` transition, scoped closeout as the A1 recovery owner for a missing or stale carrier, carrier freshness read through `oat project delivery check` before registration and persisted as `oat_milestone_gates[mNN].exit.freshness` with `freshness_reason`, advances `oat_goal_recovery.stage` to `exit_gate` then `reviewing` for a recovery scope, snapshot `pr` step satisfied at its position; the bounded successor rule applied to carrier freshness (A2)), `oat-brainstorm` goal fold-back routing, `oat-project-autonomous` (goal excluded), agent roles goal branches, regenerated projections and sync manifest via `oat sync --scope project` (never `--scope all`).

**Verify:** `pnpm oat:validate-skills`; `rg -n 'goal' .agents/skills/{oat-project-pr-progress,oat-project-pr-final,oat-project-review-provide,oat-project-review-receive,oat-project-reconcile}/SKILL.md .agents/skills/oat-project-implement/references` shows each A/B clause at a cited line recorded in the report; `oat sync --scope project` then `git status --short` show only project-scope projections; the goal ladder exception and the bookkeeping-successor rule are stated in `brief-contract.md` (the winning artifact) and only referenced from the skills; guards `goal-recovery-evidence`, `goal-explicit-review-scope` and `goal-registration-resume` per the supplement; the registration log-append clause present in both PR skills. **Carried from p10 (amendment 5.1):** `oat-project-pr-progress` appends one structural project-log entry per delivery registration (`--producer oat-project-pr-progress --ref dNN`, after the registration commit, owned and committed by the same step) and `oat-project-pr-final` one for the terminal delivery; review-receive's goal invalidation reads `exit.source` and `status: undeliverable` from `delivery check` output as landed in p10-t05. **Commit:** `feat(p11-t02): goal delivery registration, terminal delivery and review-loop ownership`

---

### Task p11-t03: Planning surfaces and summary recognize goal

**Files:** `.agents/skills/{oat-project-plan-writing,oat-project-plan,oat-project-next,oat-project-progress,oat-project-discover,oat-project-capture,oat-docs,oat-pjm-review-backlog,oat-wave-execute}/SKILL.md` (goal mentions mirroring p05-t02: the plan gate stops goal and routes to `oat-project-goal`; plan-writing `oat_plan_source` adds `goal`; next's routing table mirrors the p09-t02 goal routes; progress counts phase-units per active milestone and shows the milestone gates beside `Brief Gate:`), `.agents/skills/oat-project-summary/SKILL.md` (goal fingerprint fragment: delivery IDs at endpoint), `.agents/skills/oat-project-document/SKILL.md` (the reduced-artifact branch at `:220` generalizes from `brief` to brief/goal; goal sources are the brief, the journal, the outcome audit and the delivery registry; absent discovery/spec/design accepted), and `.agents/docs/autonomy-contract.md` mapping every prompt site re-keyed by p10-t04, p11-t02 and this task in the same commit.

**Verify:** `pnpm oat:validate-skills`; `rg -n 'brief' <same file set> | rg -v 'goal'` lists only lines that are deliberately brief-only, each justified in the commit body; `autonomy-gate-inventory.test.ts` green.

**Commit:** `feat(p11-t03): planning surfaces and summary recognize goal mode`

---

## Phase 12: Goal contracts, docs, records and the final PR (v1.5)

### Task p12-t01: Skill contract tests and autonomy coverage for goal

**Files:** `packages/cli/src/validation/skills.test.ts` (six-mode forms of the pins p11 broke: `:8674`, `:8697`, `:8725` and any sibling; a `goal mode skill contracts` block mirroring the brief block: entry surfaces, inventory guard, gateable, roles), `packages/cli/src/validation/named-skill-load-contract.test.ts` (classify every `oat-project-goal` sentence; `report.unclassified` empty, one live site per row), `packages/cli/src/commands/init/tools/shared/{gate-approval-record-contracts,project-start-preflight-contracts,post-implement-sequence-contracts,review-skill-contracts}.test.ts` (`VENDORING_SKILLS`, `PROJECT_START_SKILLS`, `GATE_POSTURE_CALLER_SKILLS` and sequence inventories gain `oat-project-goal`), `packages/cli/src/commands/tools/shared/pack-manifest.test.ts`, `.agents/docs/autonomy-contract.md` (only re-keys introduced by p12 edits, if any; `autonomy-gate-inventory.test.ts` green).

**Step 1 (RED):** the goal block fails against a deliberately omitted mention (temporarily revert one p11-t03 edit) and passes after restore; record as the prove-it-can-fail evidence. **Step 2 (GREEN):** `FH=$(mktemp -d); pnpm --filter @open-agent-toolkit/control-plane build && HOME=$FH pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared src/commands/tools/shared src/commands/shared`.

**Commit:** `test(p12-t01): skill contract and autonomy coverage for goal mode`

---

### Task p12-t02: Real-artifact goal probe

**Files:** `implementation.md` Phase 12 evidence entry only (scratch under `mktemp -d`, one fake HOME for the whole probe, no tracked fixtures).

**Steps:** `pnpm build`; scaffold a goal project with two milestones; register one delivery against a stubbed `gh`; a bookkeeping-successor chain accepted and a substantive successor rejected by `delivery check`; an older-delivery recovery that leaves the active milestone untouched; re-alignment while awaiting a merged endpoint (planning permitted, activation refused) and activation once the endpoint is observed; a settled goal → quick promotion; terminal closeout refused without a declaration and accepted with an exhaustive audit; completion with `workflow.createPrOnComplete=true`, merged deliveries and a coverage-satisfied `pr` step makes no redundant delivery-creation call (stubbed `gh` records zero `pr create` invocations); the document flow on a goal project whose only authored requirements artifact is `plan.md` uses the brief and journal and accepts the absent upstream files; the `oat-project-retro` evidence inventory (its references/evidence-and-lanes.md reading order) run read-only against the goal probe project and against a scaffolded brief project, confirming it finds the project-log milestone and delivery entries, the journal execution records and the learnings write (amendment 5.1); the guard-neutralization results from p09–p11 referenced by guard name.

**Verify:** every probed command returns its expected categorical result; failures are fixed in the owning phase's files and re-probed. **Commit:** `chore(p12-t02): record real-artifact probe for goal mode`

---

### Task p12-t03: Docs, lane diagram and root AGENTS.md for goal

**Files:** the docs pages p08-t04 touched (choose-workflow, lifecycle lanes incl. milestones, deliveries, recovery and the goal → quick promotion path, state machine, artifacts, directory structure, CLI reference for `delivery refresh`, `delivery check` and the goal `promote` boundary, approvals-and-automation, starting-projects), `apps/oat-docs/public/diagrams/project-lifecycle-9-goal-lane-{light,dark}.svg` and the state-machine SVGs, `AGENTS.md` (Workflow Options: goal no longer "v1.5"; heuristic row), `apps/oat-docs/docs/skills/index.md` via `pnpm docs:skills:generate`, `apps/oat-docs/index.md` via `oat docs generate-index`.

**Verify:** `pnpm build:docs` and `pnpm --filter oat-docs check` pass; `git diff --stat apps/oat-docs/index.md` shows only generated changes. **Commit:** `docs(p12-t03): goal workflow mode across docs, diagrams and workflow options`

---

### Task p12-t04: Decision records and backlog for goal

**Files:** after `node packages/cli/dist/index.js pjm doctor --json` confirms adoption: decision records `goal-milestone-loop`, `delivery-registry-and-coverage`, `milestone-extraction`, `bookkeeping-successor-freshness`, `terminal-declaration-audit` (via `oat decision new`); backlog items for anything deferred in p09–p11; `oat decision regenerate-index`.

**Verify:** the index regenerates without conflict; `git status --short` clean after commit. **Commit:** `docs(p12-t04): decision records and backlog for goal workflow mode`

---

### Task p12-t05: Version bumps and the full gate run for goal

**Files:** `git fetch origin main` first; bump every skill and agent role (`oat-phase-implementer.md`, `oat-reviewer.md`) changed in p09–p11 whose version is not already strictly greater than `origin/main`, and `oat-project-goal` new at 1.0.0; every exact version pin that names a bumped skill or role via the p08-t06 sweep (`rg -n "toBe\(expectedVersion\)|\['oat-project-[a-z-]+', '[0-9]+\.[0-9]+\.[0-9]+'\]|toBe\('[0-9]+\.[0-9]+\.[0-9]+'\)|toBe\(version\)|version: '[0-9]+\.[0-9]+\.[0-9]+'" packages/cli/src`); lockstep versions in the five public `package.json` files and `packages/cli/assets/public-package-versions.json` strictly greater than fetched `origin/main` (if the v1 progress PR from this branch is still unmerged, 0.3.19 already qualifies unless main moved; otherwise bump once more); regenerated projections via `oat sync --scope project`.

**Steps:** `FH=$(mktemp -d)` once for the phase; run every gate as its own line with a captured exit code, exactly the p08-t06 block (`pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`, `HOME=$FH pnpm exec turbo run test --force`, `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, `pnpm lint`, `pnpm format`), `pnpm build` before the smoke suite.

**Verify:** every exit code 0 and the forced test log shows no `FULL TURBO` replay; failures fixed in the owning files before the phase closes; `git status --short` clean after the commit. **Commit:** `chore(p12-t05): version bumps for goal workflow mode`

If the v1 progress PR from this branch is still open, `pr-final` retitles and updates that PR rather than creating a new one (`gh` cannot open a second PR from the same head branch to the same base).

After p12 is accepted, the final integrated review, summary, document and `pr-final` run per the configured sequence; the final PR is linked and left for Thomas to merge.

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                                                                                                                                                                            | Reviewed Head                            | Invocation | Gate Target                                                                                                         |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| p01    | code     | passed          | 2026-10-11 | reviews/archived/p01-review-2026-10-11T024911Z.md                                                                                                                                                                   | 2ac285d80a0035837150bd77943331a86f51db29 | auto       | -                                                                                                                   |
| p01    | code     | passed          | 2026-10-11 | reviews/archived/p01-review-2026-10-11T030140Z.md                                                                                                                                                                   | f73b4e904b96de4be741daf526d0afcacfdbe05c | auto       | -                                                                                                                   |
| p02    | code     | passed          | 2026-10-11 | reviews/archived/p02-review-2026-10-11T031650Z.md                                                                                                                                                                   | 2826da694b6dce2df126f36599d97b7daecac265 | auto       | -                                                                                                                   |
| p02    | code     | passed          | 2026-10-11 | reviews/archived/p02-review-2026-10-11T032434Z.md                                                                                                                                                                   | d0e1f817ec779d27af4accf8882090d817083c5d | auto       | -                                                                                                                   |
| p03    | code     | passed          | 2026-10-11 | reviews/archived/p03-review-2026-10-11T032218Z.md                                                                                                                                                                   | 2a5c52f241e48395054efb6399b101a257eaa801 | auto       | -                                                                                                                   |
| p03    | code     | passed          | 2026-10-11 | reviews/archived/p03-review-2026-10-11T033254Z.md                                                                                                                                                                   | ca17285004fa03fc011272636199a6efce891a9c | auto       | -                                                                                                                   |
| p04    | code     | passed          | 2026-10-11 | reviews/archived/p04-review-2026-10-11T033122Z.md                                                                                                                                                                   | 449cdc606a162b5e90966114e35479843c8c7506 | auto       | -                                                                                                                   |
| p04    | code     | passed          | 2026-10-11 | reviews/archived/p04-review-2026-10-11T035054Z.md                                                                                                                                                                   | 7e3966dcc47c53dbdd6a693789fb82c96c6bc936 | auto       | -                                                                                                                   |
| p05    | code     | passed          | 2026-10-11 | reviews/archived/p05-review-2026-10-11T043436Z.md                                                                                                                                                                   | a4585a9cbe09a2208b54f3f38c3c4cf523cc04e8 | auto       | fixes at c86f8558c                                                                                                  |
| p06    | code     | fixes_added     | 2026-10-11 | reviews/archived/p06-review-2026-10-11T051021Z.md                                                                                                                                                                   | 95a3a0bfa1dacc87935512dab62308a04338dacc | auto       | -                                                                                                                   |
| p06    | code     | passed          | 2026-10-11 | reviews/archived/p06-review-2026-10-11T052142Z.md                                                                                                                                                                   | eebab37c3aa981c0f773ae85f39d5b9e7e7d29f2 | auto       | round 2; fixes e2fd29c93, 578e88b0c, 1e2ff01dd                                                                      |
| p07    | code     | passed          | 2026-10-11 | reviews/archived/p07-review-2026-10-11T060048Z.md                                                                                                                                                                   | f2cb39c80effd19effb9f49a05c9053be7cc299c | auto       | fixes at b65dbad79                                                                                                  |
| p08    | code     | passed          | 2026-10-11 | reviews/archived/p08-review-2026-10-11T070155Z.md                                                                                                                                                                   | 7b268c896b86b8efd20486a2cacb8d2909821b6a | auto       | fixes at 5b334a4e7                                                                                                  |
| plan   | plan     | fixes_added     | 2026-10-11 | reviews/archived/plan-review-2026-10-11T074747Z.md                                                                                                                                                                  | 58a72155629389789ab869c2eb4967a7d9537040 | auto       | revision 5 (p09–p12); fixes applied in root bookkeeping                                                             |
| plan   | plan     | fixes_added     | 2026-10-11 | reviews/archived/plan-review-2026-10-11T075449Z.md                                                                                                                                                                  | aca271b6513fc0ba8c384a3a50a3a74d028dd533 | auto       | round 2 (1H/2M/3L); fixes applied in root bookkeeping                                                               |
| plan   | plan     | passed          | 2026-10-11 | reviews/archived/plan-review-2026-10-11T075745Z.md                                                                                                                                                                  | dc9409c6a83efae643450de64696cd03b6337bc5 | auto       | round 3 (0/0/0/1 Low, applied); plan revision 5 approved by the orchestrator per the run rules                      |
| plan   | artifact | fixes_added     | 2026-10-11 | reviews/archived/artifact-plan-review-2026-10-11T080913Z.md                                                                                                                                                         | f5548ebfdef3f98819b9a24320c72d3597f803da | gate       | configured plan gate rerun on revision 5 (0/2/2/0); fixes applied in root bookkeeping, gate rerun attempt 2 follows |
| plan   | artifact | passed          | 2026-10-11 | reviews/archived/artifact-plan-review-2026-10-11T081731Z.md                                                                                                                                                         | 1de4aac6840ff1fa99b59f37ec673c11f8581396 | gate       | configured plan gate attempt 2 on revision 5: 0/0/0/0; `oat_quick_start_gate` refreshed                             |
| p09    | code     | passed          | 2026-10-11 | reviews/archived/p09-review-2026-10-11T090259Z.md                                                                                                                                                                   | 29a4b914f311343c4f51e6431874d72e56814cb5 | auto       | fixes at 611596345                                                                                                  |
| p09    | code     | passed          | 2026-10-11 | reviews/archived/p09-review-2026-10-11T091238Z.md                                                                                                                                                                   | 8113ced43022a83572d635b22db9ecd7ee287862 | auto       | round 2 (0/0/0/0)                                                                                                   |
| p10    | code     | fixes_added     | 2026-10-11 | reviews/archived/p10-review-2026-10-11T135002Z.md                                                                                                                                                                   | bb69bb0650dc1cc076b5d432b8a53702bd6190c1 | auto       | 0/0/2/6; M1, M2, L1, L2, L3, L6 → p10-t05; L4 carried to p11-t01 contract text; L5 design edit in root bookkeeping  |
| p10    | code     | passed          | 2026-10-11 | reviews/archived/p10-review-2026-10-11T140916Z.md                                                                                                                                                                   | 7a18e197e68831359e977fba46fcf0600466057a | auto       | round 2 (0/0/0/1); fixes b290081e2; L1 → p10-t06 (no re-review, Low-only on a passing review)                       |
| p11    | code     | pending         | -          | -                                                                                                                                                                                                                   | -                                        | -          | -                                                                                                                   |
| p12    | code     | pending         | -          | -                                                                                                                                                                                                                   | -                                        | -          | -                                                                                                                   |
| final  | code     | pending         | -          | -                                                                                                                                                                                                                   | -                                        | -          | -                                                                                                                   |
| design | artifact | pending         | -          | -                                                                                                                                                                                                                   | -                                        | -          | -                                                                                                                   |
| plan   | artifact | fixes_completed | 2026-10-10 | structured in-memory (oat-reviewer, Claude Opus 5.5 high, initial + 2 re-dispatches; retry bound exhausted; residual M1/L1–L3 applied in revision 4; Astra plan round 1 ALIGNED WITH CHANGES applied in revision 2) | -                                        | auto       | -                                                                                                                   |
| plan   | artifact | passed          | 2026-10-11 | reviews/archived/artifact-plan-review-2026-10-11T014430Z.md                                                                                                                                                         | -                                        | gate       | codex-6-sol-xhigh                                                                                                   |
| plan   | artifact | received        | 2026-10-11 | reviews/artifact-plan-review-2026-10-11T014430Z.md                                                                                                                                                                  | -                                        | -          | -                                                                                                                   |
| plan   | artifact | received        | 2026-10-11 | reviews/artifact-plan-review-2026-10-11T080913Z.md                                                                                                                                                                  | -                                        | -          | -                                                                                                                   |
| plan   | artifact | received        | 2026-10-11 | reviews/artifact-plan-review-2026-10-11T081731Z.md                                                                                                                                                                  | -                                        | -          | -                                                                                                                   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks - Control-plane registry, phase-unit parsing, scope seam and readers, readiness clause, two review fixes
- Phase 2: 5 tasks - Router routes, brief-unit guard, dashboard parity, two review fixes
- Phase 3: 3 tasks - Templates with bundle registration, scaffold behavior, one review fix
- Phase 4: 6 tasks - Plan profiles, brief → quick promotion, four review fixes
- Phase 5: 3 tasks - Brief entry skill, contract, gate and autonomy entries; planning-surface skills; one review fix
- Phase 6: 6 tasks - Implement references, agent roles and projections, quick-start resume contract; three review fixes
- Phase 7: 4 tasks - Review-provide anchors, review-receive and reconcile, record and closeout skills; one review fix
- Phase 8: 7 tasks - Contract tests, sync and integration, real-artifact probe, docs, decision records, version bumps and gates (v1 progress PR); one review fix
- Phase 9: 3 tasks - Goal registration and routing (v1.5); one review fix
- Phase 10: 6 tasks - Goal validation, delivery refresh and evidence evaluator, closeout coverage, goal → quick promotion (v1.5); two review fixes
- Phase 11: 3 tasks - Goal skills, registration and review-loop ownership, planning surfaces (v1.5)
- Phase 12: 5 tasks - Goal contract tests, probe, docs, records, bumps and the final PR (v1.5)

**Total: 57 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (lightweight design, revision 4.0; A1–A4/B1–B4 applied, "Carried to the v1.5 review" resolved)
- Astra v1.5 review: `references/astra-v15-round-1.md`, `references/astra-v15-round-2.md`
- Discovery: `discovery.md`
- Consensus record: `.oat/repo/analysis/freestyle-brainstorm/consensus-proposal.md` (machine-local) and `design-overview.html`
- Precedent: PR #264 (`0f47bf700`), the lite workflow mode
