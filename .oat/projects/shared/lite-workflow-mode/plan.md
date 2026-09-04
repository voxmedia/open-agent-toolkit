---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-04
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: [['p02', 'p03']] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: true
oat_template_name: plan
---

# Implementation Plan: lite-workflow-mode

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Add a `lite` workflow mode for single-sitting changes: one authored `plan.md` carrying spec sections and a single-phase task list, a batched-interview entry skill with one approval gate, a CLI promote command for lite-to-quick escalation, an import-plan offer to run single-phase imports as lite, and lite awareness across every mode-aware surface.

**Architecture:** Lite is a fourth value in a single, array-derived `WorkflowMode` declaration consumed by parser, scaffold, and both routing tables. The scaffold maps a new `plan-lite.md` template onto `plan.md`. A new `oat project promote --to quick` command owns escalation mechanics; the new `oat-project-lite` skill owns the human flow. See `design.md`.

**Tech Stack:** TypeScript ESM, Commander, vitest, pnpm/Turborepo, markdown skills and templates, Fumadocs.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): export WORKFLOW_MODES with lite`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Phase 1 is the foundation: it changes the shared `WorkflowMode` declaration, which every later phase compiles against, so nothing can run beside it.

Phase 2 (routing) and Phase 3 (promote command and split hardening) both depend only on Phase 1 and have disjoint write sets. Phase 2 writes `packages/control-plane/src/recommender/router.ts`, `packages/cli/src/commands/state/generate.ts`, and their tests. Phase 3 writes a new `packages/cli/src/commands/project/promote/` directory, one registration line in `packages/cli/src/commands/project/index.ts`, `packages/cli/src/commands/project/split/run.ts`, and their tests. Neither touches the other's files, each has independent scoped verification, and neither depends on the other's behavior. They are declared as one parallel group.

Phase 4 (the lite entry skill plus the end-to-end integration test) needs both routing and scaffold merged, so it follows the group. Phase 5 (mode-aware prose across many skills, the import-plan offer, and the skill-contract test rewrite) shares `packages/cli/src/validation/skills.test.ts` with Phase 4's pack-manifest assertions and edits many skill files, so it stays sequential. Phase 6 (docs, triage, lockstep bump, release validation, manual run) must be last because the version gates compare against the final diff.

```yaml
oat_plan_parallel_groups: [['p02', 'p03']]
```

---

## Dispatch Profile

_No explicit constraints. Runtime selection chooses within the project ceiling._

---

## Phase 1: Single Mode Definition and Lite Scaffold

### Task p01-t01: Export an array-derived WorkflowMode with lite

**Files:**

- Modify: `packages/control-plane/src/types.ts`
- Modify: `packages/control-plane/src/state/parser.ts`
- Modify: `packages/control-plane/src/index.ts` (export `WORKFLOW_MODES`)
- Modify: `packages/control-plane/src/state/parser.test.ts`
- Modify: `packages/control-plane/src/project.ts` (only if a `Record<WorkflowMode, ...>` there fails to compile)

**Step 1: Write test (RED)**

Add parser cases: `oat_workflow_mode: lite` parses to `'lite'`; `oat_workflow_mode: bogus` still normalizes to `null`; `WORKFLOW_MODES` is exported and contains exactly `spec-driven`, `quick`, `import`, `lite` in that order.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts`
Expected: new cases fail (RED)

**Step 2: Implement (GREEN)**

Move the mode list to a single exported constant and derive the type from it:

```typescript
export const WORKFLOW_MODES = [
  'spec-driven',
  'quick',
  'import',
  'lite',
] as const;
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];
```

Parser imports `WORKFLOW_MODES` instead of its local copy. Re-export from the package index.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

Remove the now-duplicate local array in the parser. No other behavior change.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane type-check && pnpm --filter @open-agent-toolkit/control-plane exec vitest run`
Expected: type-check clean; control-plane suite green

**Step 5: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/index.ts packages/control-plane/src/state/parser.test.ts
git commit -m "feat(p01-t01): export array-derived WORKFLOW_MODES with lite"
```

---

### Task p01-t02: Unify the scaffold mode type and add source/target template mapping

**Files:**

- Modify: `packages/cli/src/commands/project/new/scaffold.ts`
- Modify: `packages/cli/src/commands/project/new/index.ts`
- Modify: `packages/cli/src/commands/project/new/index.test.ts`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`

**Step 1: Write test (RED)**

Scaffold tests: `--mode lite` creates exactly `state.md`, `plan.md`, `implementation.md` and no `discovery.md`; the created `plan.md` contains a `## Validation Criteria` heading (proving it came from `plan-lite.md`); the existing spec-driven, quick, and import "creates ... artifacts only" tests are unchanged and still pass. Index tests: `--mode lite` passes through; the option's choices equal `WORKFLOW_MODES`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/project/new/index.test.ts`
Expected: lite cases fail (RED)

**Step 2: Implement (GREEN)**

- Replace `ProjectScaffoldMode` with `import type { WorkflowMode } from '@open-agent-toolkit/control-plane'` (keep a deprecated alias export if anything else imports the old name).
- Change `TEMPLATES_BY_MODE` entries to `string | { source: string; target: string }` with a normalizer, add `lite: ['state.md', { source: 'plan-lite.md', target: 'plan.md' }, 'implementation.md']`.
- Copy loop resolves `source` through `resolveTemplateSource` and writes to `target`; `createdFiles` records the target name.
- Add the lite `STATE_TEMPLATE_BY_MODE` entry: phase `plan`, status `in_progress`, HiLL checkpoints `[]`, artifacts naming plan and implementation only, next milestone "run oat-project-lite".
- Build `--mode` choices from `WORKFLOW_MODES`; keep the default `spec-driven`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/project/new/index.test.ts`
Expected: pass (GREEN). This task depends on p01-t03's template existing on disk; implement t03's template file first if the render test needs it, but commit them separately.

**Step 3: Refactor**

Ensure the normalizer keeps the three existing modes byte-identical: add an assertion that each existing mode's `createdFiles` list matches the pre-change list.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check`
Expected: no errors; every `Record<WorkflowMode, ...>` now has a lite entry

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/index.ts packages/cli/src/commands/project/new/index.test.ts packages/cli/src/commands/project/new/scaffold.test.ts
git commit -m "feat(p01-t02): scaffold lite projects from plan-lite template"
```

---

### Task p01-t03: Add the plan-lite.md template and mode enum comments

**Files:**

- Create: `.oat/templates/plan-lite.md`
- Modify: `.oat/templates/state.md` (enum comment `spec-driven | quick | import | lite`)
- Modify: `.oat/templates/plan.md` (enum comment `spec-driven | quick | imported | lite`)
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts` (the `it.each` placeholder-free render test gains `lite`)

**Step 1: Write test (RED)**

Extend the "renders every real $mode scaffold artifact without unresolved OAT placeholders" `it.each` with `lite`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts -t "renders every real"`
Expected: lite fails because the template is missing (RED)

**Step 2: Implement (GREEN)**

Author `plan-lite.md` with frontmatter (`oat_plan_source: lite`, `oat_plan_parallel_groups: []`, import fields null, `oat_template: true`, `oat_template_name: plan-lite`) and sections in this order: title, goal line, `## Summary`, `## Decisions`, `## Assumptions`, `## Out of Scope`, `## Validation Criteria` (each criterion names its check command), `## Parallelism` (single sentence: one phase, sequential), `## Phase 1: {Phase Name}` with two example tasks in the standard grammar, `## Reviews` (same table as `plan.md`, including `spec` and `design` rows), `## Implementation Complete`, `## References`. Use only placeholders that `applyTemplateReplacements` resolves; check the existing `plan.md` template for the allowed set.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts -t "renders every real"`
Expected: pass (GREEN)

**Step 3: Refactor**

Run `pnpm exec oxfmt --write .oat/templates/plan-lite.md` and confirm the file still renders.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`
Expected: entire scaffold suite green. Note the bundle step copies `.oat/templates` into CLI assets at build time; no manual mirror.

**Step 5: Commit**

```bash
git add .oat/templates/plan-lite.md .oat/templates/state.md .oat/templates/plan.md packages/cli/src/commands/project/new/scaffold.test.ts
git commit -m "feat(p01-t03): add plan-lite template and lite enum comments"
```

---

### Task p01-t04: Regenerate the help snapshot for the lite choice

**Files:**

- Modify: `packages/cli/src/commands/help-snapshots.test.ts` (golden text for `--mode`)

**Step 1: Write test (RED)**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts`
Expected: the `--mode` golden fails because choices now include `lite` (RED, confirms the snapshot is live)

**Step 2: Implement (GREEN)**

Update the golden string to the new choices output. Review the diff by eye: only the choices list changes.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new src/commands/help-snapshots.test.ts`
Expected: green

**Step 5: Commit**

```bash
git add packages/cli/src/commands/help-snapshots.test.ts
git commit -m "test(p01-t04): update help snapshot for lite mode choice"
```

---

## Phase 2: Routing

### Task p02-t01: Add LITE_ROUTES to the recommender

**Files:**

- Modify: `packages/control-plane/src/recommender/router.ts`
- Modify: `packages/control-plane/src/recommender/router.test.ts`

**Step 1: Write test (RED)**

Cases for mode `lite`: plan in_progress tier 3 → `oat-project-lite`; plan in_progress tier 2 → `oat-project-implement`; plan complete tier 1 → `oat-project-implement`; implement in_progress → `oat-project-implement`; discovery phase under lite falls through to the current-phase default without throwing.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`
Expected: lite cases fail (RED)

**Step 2: Implement (GREEN)**

Add `LITE_ROUTES` mirroring `IMPORT_ROUTES` with `oat-project-lite` in the early-tier plan slot, and a `case 'lite'` in `getWorkflowRoutes`.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

None; the two routing tables intentionally stay separate (design decision 4).

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run && pnpm --filter @open-agent-toolkit/control-plane type-check`
Expected: green

**Step 5: Commit**

```bash
git add packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts
git commit -m "feat(p02-t01): route lite projects in the recommender"
```

---

### Task p02-t02: Add lite rows to the dashboard route map

**Files:**

- Modify: `packages/cli/src/commands/state/generate.ts`
- Modify: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Write test (RED)**

Extend "routes computeNextStep correctly for spec-driven/quick/import modes" with lite fixtures: `lite:plan:in_progress` → `oat-project-lite`; `lite:plan:complete` → `oat-project-implement`; the rendered dashboard table shows `| Mode | lite |`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts`
Expected: lite cases fail (RED)

**Step 2: Implement (GREEN)**

Add the two `lite:plan:*` entries to `routeMap` with reasons "Continue lite planning" and "Begin lite implementation".

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check`
Expected: no errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts
git commit -m "feat(p02-t02): route lite projects on the repo dashboard"
```

---

## Phase 3: Promote Command and Split Hardening

### Task p03-t01: Guard the split detector's discovery.md append

**Files:**

- Modify: `packages/cli/src/commands/project/split/run.ts`
- Modify: `packages/cli/src/commands/project/split/run.test.ts` (or the nearest existing test file for `recordDetectedRecommendation`)

**Step 1: Write test (RED)**

Negative control first: with an active project that has no `discovery.md`, `recordDetectedRecommendation` currently calls `appendFile` and would create the file. Assert that it does not append and instead reports a skipped recommendation record. Preserve the fixture and expected outcome in the test description.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split/run.test.ts`
Expected: fails on current code (RED, proves the guard is load-bearing)

**Step 2: Implement (GREEN)**

Check existence via the dependencies' file-exists helper before appending; when absent, return a structured "skipped: no discovery.md for mode" result and log one line.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split/run.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split`
Expected: split suite green

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/split/run.ts packages/cli/src/commands/project/split/run.test.ts
git commit -m "fix(p03-t01): skip split recommendation append when discovery.md is absent"
```

---

### Task p03-t02: Implement `oat project promote --to quick`

**Files:**

- Create: `packages/cli/src/commands/project/promote/index.ts`
- Create: `packages/cli/src/commands/project/promote/promote.ts`
- Create: `packages/cli/src/commands/project/promote/promote.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts` (register the subcommand)

**Step 1: Write test (RED)**

Unit tests against a temp project directory:

- Happy path: lite plan with all five spec sections → `discovery.md` has Initial Request from Summary, Key Decisions from Decisions, Assumptions, Out of Scope, Success Criteria from Validation Criteria; `references/lite-plan.md` is byte-equal to the original `plan.md`; new `plan.md` is the quick template render; `state.md` reads mode `quick`, phase `discovery`, status `complete`, `oat_ready_for: oat-project-quick-start`, stamped `oat_project_state_updated`; `oat_workflow_origin` unchanged for both `native` and `imported` fixtures.
- Refusals, each asserting no file was written: mode is `quick`; `references/lite-plan.md` already exists; `--to spec-driven`; scope resolution fails.
- `--json` emits `{ status: 'promoted' | 'refused', reason, files }`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote/promote.test.ts`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Follow the `complete-discovery` command shape for Commander wiring and dependency injection. Reuse `resolveTemplateSource` and `applyTemplateReplacements` from the scaffold module for the discovery and quick plan renders. Perform all file writes, then resolve scope with the same fail-closed helper the CLI uses elsewhere, then commit only the project paths (or `oat project push` for synced). Refusals happen before any write.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote/promote.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

Extract the lite section parser into a small pure function with its own tests so import-plan (Phase 5) can reuse it.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote src/commands/help-snapshots.test.ts`
Expected: green; update the help snapshot if the new subcommand appears in a golden

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/promote packages/cli/src/commands/project/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p03-t02): add oat project promote --to quick for lite projects"
```

---

## Phase 4: Lite Entry Skill and End-to-End Test

### Task p04-t01: Author the oat-project-lite skill and register it in the workflows pack

**Files:**

- Create: `.agents/skills/oat-project-lite/SKILL.md`
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts` (`WORKFLOW_SKILL_NAMES`)
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.test.ts`

**Step 1: Write test (RED)**

Pack-manifest test asserts `oat-project-lite` is in the workflows pack. Run `pnpm oat:validate-skills` to see the validator reject the missing skill.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Write the skill at `version: 1.0.0` with frontmatter matching `oat-project-quick-start` (`oat_gateable: true`, `disable-model-invocation: true`, `user-invocable: true`, `allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion`). Required sections: Mode Assertion (blocked: no design or spec authoring, no multi-phase plans, no implementation code), Progress Indicators with the `OAT ▸ LITE` banner, Step 0 git preflight by reference to quick-start's contract, Step 0.5 resolve active project or scaffold with `--mode lite`, Step 1 read repo knowledge, Step 2 batched critical interview (one round, second round only for questions the first created, "just proceed" records careful assumptions), Step 2.5 escalation check calling `oat project promote "$PROJECT_PATH" --to quick --json` and stopping with a pointer to quick-start, Step 3 author `plan.md` sections and single-phase tasks in plan-writing grammar, Step 4 single approval gate via AskUserQuestion, Step 5 dispatch ceiling by reference to the shared contract with no phase-gate setup, Step 6 plan artifact review loop by reference, Step 7 mark complete, sync state, initialize implementation.md, commit, hand off to implement, Success Criteria.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts && pnpm oat:validate-skills`
Expected: pass (GREEN)

**Step 3: Refactor**

Run `pnpm exec oxfmt --write .agents/skills/oat-project-lite/SKILL.md` and `pnpm exec oxlint .agents/skills`.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm run cli -- sync --scope all --dry-run`
Expected: validator green; sync dry-run lists the new skill for provider views without drift errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-lite/SKILL.md packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts
git commit -m "feat(p04-t01): add oat-project-lite entry skill"
```

---

### Task p04-t02: End-to-end lite scaffold, dashboard, and promotion

**Files:**

- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Write test (RED)**

Two integration cases with an isolated HOME (see AGENTS.md on the bundle tier): (a) `project new x --mode lite` then `state refresh` produces a dashboard with mode `lite` and next step `oat-project-lite`; (b) after writing a minimal lite plan, `project promote x --to quick` yields a quick project whose dashboard routes to quick-start and whose `references/lite-plan.md` exists.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/commands.integration.test.ts -t "lite"`
Expected: fail before the assertions are satisfied (RED)

**Step 2: Implement (GREEN)**

Only test code; if a real defect surfaces, fix it in the owning module and note the divergence in implementation.md.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/commands.integration.test.ts -t "lite"`
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm exec turbo run test --force --filter=@open-agent-toolkit/cli`
Expected: full CLI suite green with cache bypassed

**Step 5: Commit**

```bash
git add packages/cli/src/commands/commands.integration.test.ts
git commit -m "test(p04-t02): cover lite scaffold, dashboard routing, and promotion end to end"
```

---

## Phase 5: Mode-Aware Skills and Import-to-Lite Offer

### Task p05-t01: Add lite branches to mode-aware skills

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md` (workflow_mode enum)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (version bump only)
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md` (mode table row, `oat_plan_source` enum, version bump)
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` (plan case for lite, version bump)
- Modify: `.agents/skills/oat-project-pr-final/SKILL.md` (lite proceeds with reduced-assurance note, version bump)
- Modify: `.agents/skills/oat-project-plan/SKILL.md` (lite stop branch, version bump)
- Modify: `.agents/skills/oat-project-progress/SKILL.md` (Lite mode routing table, version bump)
- Modify: `.agents/skills/oat-project-next/SKILL.md` (Lite routing table, version bump)
- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (fold-back handoff row, version bump)
- Modify: `.agents/skills/oat-project-promote-spec-driven/SKILL.md` (state that lite promotes via quick, version bump)
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Write test (RED)**

Rewrite the progress/next mode-section slicing to find all four markers by position (`**Spec-Driven mode**`, `**Quick mode**`, `**Import mode**`, `**Lite mode**`) and assert lite routing text in both skills. Add review-contract assertions that review-provide's plan case and pr-final's gate mention lite alongside quick and import.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Apply each one-line or one-branch change listed in design component 7. Bump each changed skill's `version:` once (patch for prose-only additions, minor for progress/next which gain a routing table).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

`pnpm exec oxfmt --write '.agents/skills/**/*.md'` on the touched files only.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: both green (fetch `origin/main` first for the bump gate)

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement .agents/skills/oat-project-plan-writing .agents/skills/oat-project-review-provide .agents/skills/oat-project-pr-final .agents/skills/oat-project-plan .agents/skills/oat-project-progress .agents/skills/oat-project-next .agents/skills/oat-brainstorm .agents/skills/oat-project-promote-spec-driven packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p05-t01): add lite branches to mode-aware skills"
```

---

### Task p05-t02: Offer lite for single-phase imported plans

**Files:**

- Modify: `.agents/skills/oat-project-import-plan/SKILL.md` (new step after normalization, Step 5 state write branch, version bump)
- Modify: `packages/cli/src/validation/skills.test.ts` (assert the offer text and origin-preserving state write)

**Step 1: Write test (RED)**

Assert the import-plan skill contains the lite-offer step (single phase, no parallel groups, offer with recommendation) and that the accepted branch writes `oat_workflow_mode: lite` while keeping `oat_workflow_origin: imported` and the `oat_import_*` fields.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "import-plan"`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Add Step 4.5 "Lite Offer" to import-plan: detect one `## Phase` heading and empty `oat_plan_parallel_groups`; present the offer via AskUserQuestion with lite recommended; on accept, reshape `plan.md` into the `plan-lite.md` section order, lifting Summary, Decisions, Assumptions, and Out of Scope from the external plan's prose where present and otherwise writing explicit assumptions, and deriving Validation Criteria from task verification steps; set `oat_plan_source: imported` unchanged and mode `lite` in Step 5. Reference the section parser extracted in p03-t02 for shape guidance.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "import-plan"`
Expected: pass (GREEN)

**Step 3: Refactor**

Format the skill file.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: green

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-import-plan/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "feat(p05-t02): offer lite mode for single-phase imported plans"
```

---

## Phase 6: Docs, Triage, Release Gates, and Manual Run

### Task p06-t01: Document lite mode and update the triage table

**Files:**

- Modify: `AGENTS.md` (Feature Planning Triage: add "Lite workflow" option and heuristic line)
- Modify: `apps/oat-docs/docs/workflows/index.md` (Workflow Modes In Practice)
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md` (lite lane diagram, description)
- Modify: `apps/oat-docs/docs/workflows/projects/artifacts.md` (lite row)
- Modify: `apps/oat-docs/docs/workflows/projects/pr-flow.md` (lite row)
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md` (lite artifact list)
- Modify: `apps/oat-docs/docs/workflows/skills/index.md` (mention `oat-project-lite`)

**Step 1: Write test (RED)**

Not test-driven; markdownlint and the docs build are the checks.

**Step 2: Implement (GREEN)**

Add the lite entries. In AGENTS.md the option reads: "Lite workflow — batched interview → single plan.md with validation criteria → one approval → implement. Best for single-sitting changes: one component, one bug fix, one small refactor. → Use `oat-project-lite`." Heuristic line: "Single-sitting change with a clear outcome → Recommend lite."

**Step 3: Refactor**

`pnpm exec oxfmt --write` on the touched markdown files.

**Step 4: Verify**

Run: `pnpm check > gate-check.log 2>&1; echo "exit=$?"; pnpm build:docs > gate-docs.log 2>&1; echo "exit=$?"`
Expected: both `exit=0`; confirm neither was a cache replay

**Step 5: Commit**

```bash
git add AGENTS.md apps/oat-docs/docs/workflows/index.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/workflows/projects/pr-flow.md apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/workflows/skills/index.md
git commit -m "docs(p06-t01): document lite workflow mode"
```

---

### Task p06-t02: Lockstep version bump and release gates

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json` (if the release tooling requires it)

**Step 1: Write test (RED)**

Run: `git fetch origin main && pnpm release:check-versions`
Expected: fails because versions equal `origin/main` (RED)

**Step 2: Implement (GREEN)**

Bump all five lockstep packages to the next patch (from 0.2.54 unless main moved) and regenerate the lockfile if it references package versions.

Run: `pnpm release:check-versions`
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run the full definition-of-done sequence, capturing each exit code:

```bash
pnpm check > g1.log 2>&1; echo "check=$?"
pnpm type-check > g2.log 2>&1; echo "type=$?"
HOME=$(mktemp -d) pnpm exec turbo run test --force > g3.log 2>&1; echo "test=$?"
pnpm test:smoke > g3b.log 2>&1; echo "smoke=$?"
pnpm test:skills > g3c.log 2>&1; echo "skills=$?"
pnpm build > g4.log 2>&1; echo "build=$?"
pnpm run check:skill-bumps > g5.log 2>&1; echo "bumps=$?"
pnpm release:check-versions > g6.log 2>&1; echo "versions=$?"
pnpm release:validate > g7.log 2>&1; echo "validate=$?"
pnpm build:docs > g8.log 2>&1; echo "docs=$?"
pnpm lint > g9.log 2>&1; echo "lint=$?"
pnpm format > g10.log 2>&1; echo "format=$?"
```

Expected: every line prints `=0`

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json pnpm-lock.yaml
git commit -m "chore(p06-t02): bump lockstep package versions for lite mode"
```

---

### Task p06-t03: Manual lite run and sync of provider views

**Files:**

- Modify: `.oat/projects/shared/lite-workflow-mode/implementation.md` (record the run)
- Modify: provider views regenerated by `oat sync --scope all` (`.claude/skills/...`, `.oat/sync/manifest.json`)

**Step 1: Write test (RED)**

Not test-driven. This is the manual verification the testing strategy requires.

**Step 2: Implement (GREEN)**

Run `pnpm run cli -- sync --scope all` so the new skill appears in provider views. Then, in a scratch worktree or a throwaway branch, run `pnpm run cli -- project new lite-smoke --mode lite`, invoke `oat-project-lite` on a trivial change (for example, adding a one-line docs note), confirm the interview is one batched round, the approval gate fires once, the ceiling resolves, and `oat-project-implement` runs the single phase and final review. Delete the smoke project afterwards.

**Step 3: Refactor**

None.

**Step 4: Verify**

Record in implementation.md: the commands run, the number of user pauses observed, and any friction. Run `git status --porcelain` and confirm only intended sync outputs changed.

**Step 5: Commit**

```bash
git add .claude .oat/sync/manifest.json .oat/projects/shared/lite-workflow-mode/implementation.md
git commit -m "chore(p06-t03): sync provider views and record manual lite run"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| p02    | code     | pending | -    | -        | -             | -          | -           |
| p03    | code     | pending | -    | -        | -             | -          | -           |
| p04    | code     | pending | -    | -        | -             | -          | -           |
| p05    | code     | pending | -    | -        | -             | -          | -           |
| p06    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| spec   | artifact | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |
| plan   | artifact | pending | -    | -        | -             | -          | -           |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks - single mode definition, lite scaffold, plan-lite template, help snapshot
- Phase 2: 2 tasks - recommender and dashboard routing
- Phase 3: 2 tasks - split-detector guard, promote command
- Phase 4: 2 tasks - oat-project-lite skill, end-to-end integration test
- Phase 5: 2 tasks - mode-aware skill branches, import-to-lite offer
- Phase 6: 3 tasks - docs and triage, lockstep bump and gates, manual run and sync

**Total:** 15 tasks across 6 phases

**Definition of done:** every gate in AGENTS.md exits 0 with evidence captured; the manual lite run is recorded in implementation.md.

---

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Backlog companion: `.oat/repo/pjm/backlog/items/BL-260904-make-quick-the-default-oat.md`
- Plan-writing contract: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Quick-start (reference for lite skill structure): `.agents/skills/oat-project-quick-start/SKILL.md`
- Warp factory spec-agent prompt (external reference shared during brainstorming; not vendored)
