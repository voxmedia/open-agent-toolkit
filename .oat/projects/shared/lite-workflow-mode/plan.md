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
---

# Implementation Plan: lite-workflow-mode

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Add a `lite` workflow mode for single-sitting changes: one authored `plan.md` carrying spec sections and a single-phase task list, a batched-interview entry skill with one approval gate, a CLI promote command for lite-to-quick escalation, an import-plan offer to run single-phase imports as lite, and lite awareness across every mode-aware surface.

**Architecture:** Lite is a fourth value in a single, array-derived `WorkflowMode` declaration consumed by parser, scaffold, and both routing tables. The scaffold maps a new `plan-lite.md` template onto `plan.md`. A new `oat project promote --to quick` command owns escalation mechanics; the new `oat-project-lite` skill owns the human flow. See `design.md`.

**Tech Stack:** TypeScript ESM, Commander, vitest, pnpm/Turborepo, markdown skills and templates, Fumadocs.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add lite to WORKFLOW_MODES`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Phase 1 is the foundation: it changes the shared `WorkflowMode` declaration, which every later phase compiles against, and exports the two scaffold helpers the promote command reuses, so nothing can run beside it.

Phase 2 (routing) and Phase 3 (promote command and split hardening) both depend only on Phase 1 and have disjoint write sets. Phase 2 writes `packages/control-plane/src/recommender/router.ts`, `packages/cli/src/commands/state/generate.ts`, and their tests. Phase 3 writes a new `packages/cli/src/commands/project/promote/` directory, one registration line in `packages/cli/src/commands/project/index.ts`, `packages/cli/src/commands/project/split/run.ts`, the split runner test under `split/__tests__/`, and the help snapshot. Neither touches the other's files, each has independent scoped verification, and neither depends on the other's behavior. They are declared as one parallel group.

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

- Modify: `packages/control-plane/src/types.ts` (the constant and derived type live here; `index.ts` already re-exports `./types`)
- Modify: `packages/control-plane/src/state/parser.ts`
- Modify: `packages/control-plane/src/state/parser.test.ts`

**Step 1: Write test (RED)**

Add parser cases: `oat_workflow_mode: lite` parses to `'lite'`; `oat_workflow_mode: bogus` still normalizes to `null`; `WORKFLOW_MODES` is importable from the package root and contains exactly `spec-driven`, `quick`, `import`, `lite` in that order.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts`
Expected: the `lite` case and the `WORKFLOW_MODES` import fail (RED)

**Step 2: Implement (GREEN)**

In `types.ts`, replace the union with a single exported constant and derive the type from it:

```typescript
export const WORKFLOW_MODES = [
  'spec-driven',
  'quick',
  'import',
  'lite',
] as const;
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];
```

Parser imports `WORKFLOW_MODES` from `../types` and deletes its local array.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

None beyond the deleted duplicate.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane type-check && pnpm --filter @open-agent-toolkit/control-plane exec vitest run`
Expected: type-check clean; control-plane suite green. Note: `getWorkflowRoutes` in the recommender has a `default` branch, so control-plane compiles before Phase 2 adds lite routes.

**Step 5: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/state/parser.test.ts
git commit -m "feat(p01-t01): add lite to array-derived WORKFLOW_MODES"
```

---

### Task p01-t02: Add the plan-lite.md template and register it in the bundle inventory

**Files:**

- Create: `.oat/templates/plan-lite.md`
- Modify: `.oat/templates/state.md` (enum comment `spec-driven | quick | import | lite`)
- Modify: `.oat/templates/plan.md` (enum comment `spec-driven | quick | imported | lite`)
- Modify: `packages/cli/scripts/bundle-inputs.mjs` (`templateFiles` gains `plan-lite.md`)
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts` (workflow template list near the `state.md ... project-retro.md` block gains `plan-lite.md`)

**Step 1: Write test (RED)**

The bundle inventory is explicit, not a directory copy: `bundle-inputs.mjs` lists template names and `bundle-consistency.test.ts` asserts the manifest and the bundle agree. Add `plan-lite.md` to the pack-manifest template list first and run the consistency test.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: only "bundles every workflow template, including the project log" fails, because `bundle-inputs.mjs` does not yet list `plan-lite.md` (RED). "only bundles templates that exist" guards the reverse ordering and stays green here.

**Step 2: Implement (GREEN)**

Author `plan-lite.md` with frontmatter (`oat_plan_source: lite`, `oat_plan_parallel_groups: []`, import fields null, `oat_template: true`, `oat_template_name: plan-lite`) and sections in this order: title, goal line, `## Summary`, `## Decisions`, `## Assumptions`, `## Out of Scope`, `## Validation Criteria` (each criterion names its check command), `## Parallelism` (single sentence: one phase, sequential), `## Phase 1: {Phase Name}` with two example tasks in the standard grammar, `## Reviews` (same table as `plan.md`, including `spec` and `design` rows), `## Implementation Complete`, `## References`. Use only placeholders that `applyTemplateReplacements` resolves; copy the allowed set from `.oat/templates/plan.md`. Add `plan-lite.md` to `bundle-inputs.mjs` `templateFiles`. Update the two enum comments.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

Run `pnpm exec oxfmt --write .oat/templates/plan-lite.md`.

**Step 4: Verify**

Run: `test -f .oat/templates/plan-lite.md && pnpm exec oxfmt --check .oat/templates/plan-lite.md && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`
Expected: file present and formatted; existing scaffold suite unchanged (lite is not scaffolded yet)

**Step 5: Commit**

```bash
git add .oat/templates/plan-lite.md .oat/templates/state.md .oat/templates/plan.md packages/cli/scripts/bundle-inputs.mjs packages/cli/src/commands/tools/shared/pack-manifest.ts
git commit -m "feat(p01-t02): add plan-lite template to the bundle inventory"
```

---

### Task p01-t03: Unify the scaffold mode type, add source/target mapping, scaffold lite

**Files:**

- Modify: `packages/cli/src/commands/project/new/scaffold.ts`
- Modify: `packages/cli/src/commands/project/new/index.ts`
- Modify: `packages/cli/src/commands/project/new/index.test.ts`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`

**Step 1: Write test (RED)**

Scaffold tests: `--mode lite` creates exactly `state.md`, `plan.md`, `implementation.md` and no `discovery.md`; the created `plan.md` contains a `## Validation Criteria` heading (proving it came from `plan-lite.md`); extend the "renders every real $mode scaffold artifact without unresolved OAT placeholders" `it.each` with `lite`; the existing spec-driven, quick, and import "creates ... artifacts only" tests are unchanged. Index tests: `--mode lite` passes through; the option's choices equal `WORKFLOW_MODES`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/project/new/index.test.ts`
Expected: every lite case fails because `TEMPLATES_BY_MODE` has no lite key and the CLI rejects the choice (RED)

**Step 2: Implement (GREEN)**

- Replace `ProjectScaffoldMode` with `import type { WorkflowMode } from '@open-agent-toolkit/control-plane'` (keep a deprecated alias export if anything else imports the old name).
- Change `TEMPLATES_BY_MODE` entries to `string | { source: string; target: string }` with a normalizer, add `lite: ['state.md', { source: 'plan-lite.md', target: 'plan.md' }, 'implementation.md']`.
- Copy loop resolves `source` through `resolveTemplateSource` and writes to `target`; `createdFiles` records the target name.
- Add the lite `STATE_TEMPLATE_BY_MODE` entry: phase `plan`, status `in_progress`, HiLL checkpoints `[]`, artifacts naming plan and implementation only, next milestone "run oat-project-lite".
- Build `--mode` choices from `WORKFLOW_MODES`; keep the default `spec-driven`.
- Export `applyTemplateReplacements` and `resolveTemplateSource` (currently module-private) so the Phase 3 promote command can reuse them without touching this file. Note `applyTemplateReplacements(template, projectName, today, nowUtc, mode)` reads `STATE_TEMPLATE_BY_MODE[mode]`, so callers rendering quick artifacts must pass `'quick'`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/project/new/index.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

Ensure the normalizer keeps the three existing modes byte-identical: add an assertion that each existing mode's `createdFiles` list matches the pre-change list.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new`
Expected: no errors; every `Record<WorkflowMode, ...>` now has a lite entry. Add a lite variant of the bundled-tier case "uses bundled templates when neither installed tier exists" and run it through `pnpm exec turbo run test --filter=@open-agent-toolkit/cli`, whose test task depends on build; the bundled assets directory is gitignored and only `scripts/bundle-assets.sh` populates it, so a bare `vitest run` does not exercise the bundled tier.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/index.ts packages/cli/src/commands/project/new/index.test.ts packages/cli/src/commands/project/new/scaffold.test.ts
git commit -m "feat(p01-t03): scaffold lite projects from the plan-lite template"
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

Load-bearing assertion: mode `lite`, plan in_progress tier 3 → `oat-project-lite`. This is the only case that can fail today, because `getWorkflowRoutes` falls back to `SPEC_DRIVEN_ROUTES` for unknown modes and that table already routes tier 2, plan complete, and implement to `oat-project-implement`. Add those three as regression guards, plus a discovery-phase lite case asserting the current-phase default and no throw.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`
Expected: the tier-3 case fails (RED); guards pass

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

### Task p02-t02: Add the lite planning row to the dashboard route map

**Files:**

- Modify: `packages/cli/src/commands/state/generate.ts`
- Modify: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Write test (RED)**

Load-bearing assertion: `lite:plan:in_progress` → `oat-project-lite` (today the shared map yields `oat-project-plan`). Regression guards: `lite:plan:complete` → `oat-project-implement` already holds via `sharedMap['plan:complete']`, and the rendered dashboard table shows `| Mode | lite |` once Phase 1 parses lite. Extend the existing "routes computeNextStep correctly for spec-driven/quick/import modes" case with these fixtures.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts`
Expected: the in_progress case fails (RED); guards pass

**Step 2: Implement (GREEN)**

Add only the `lite:plan:in_progress` entry to `routeMap` with reason "Continue lite planning". Do not duplicate the `plan:complete` route that `sharedMap` already provides.

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
git commit -m "feat(p02-t02): route lite planning on the repo dashboard"
```

---

### Task p02-t03: Route a lite project's passed final review straight to PR creation

**Files:**

- Modify: `packages/control-plane/src/recommender/router.ts`
- Modify: `packages/control-plane/src/recommender/router.test.ts`
- Modify: `packages/cli/src/commands/state/generate.ts` and `generate.test.ts` (only if the dashboard's implement-complete route also prefers summary)

**Step 1: Write test (RED)**

Load-bearing assertion: mode `lite`, implement phase, final review `passed`, no complete `summary.md` → `oat-project-pr-final`. Today the closeout branch near router.ts:199-211 returns `oat-project-summary` whenever the summary artifact is missing or incomplete, regardless of mode. Regression guard: the same state under `quick` still routes to `oat-project-summary`.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`
Expected: the lite case fails (RED); the quick guard passes

**Step 2: Implement (GREEN)**

In the closeout branch, when `state.workflowMode === 'lite'`, skip the summary requirement and return `oat-project-pr-final` with reason "Final review passed; lite mode synthesizes the PR from plan and implementation". Leave every other mode unchanged. Check `generate.ts` for an equivalent implement-complete route and mirror it if present.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run && pnpm --filter @open-agent-toolkit/control-plane type-check && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts`
Expected: green

**Step 5: Commit**

```bash
git add packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts
git commit -m "feat(p02-t03): route lite closeout from passed final review to pr-final"
```

---

## Phase 3: Promote Command and Split Hardening

### Task p03-t01: Guard the split detector's discovery.md append

**Files:**

- Modify: `packages/cli/src/commands/project/split/run.ts`
- Modify: `packages/cli/src/commands/project/split/__tests__/run.test.ts`

**Step 1: Write test (RED)**

Negative control first. Model a new case on the non-interactive detected-origin tests in `split/__tests__/run.test.ts` (around lines 300-360), but omit the `discovery.md` pre-write. Assert the observable outcome: `discovery.md` does not exist under the active project root after the run, and the captured logger output contains the single skip line. The harness in that file uses the real `appendFile` and `recordDetectedRecommendation` returns void, so assert on the filesystem and logger rather than a spy. On current code node's `appendFile` creates the file. Preserve the fixture and expected outcome in the test description.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split/__tests__/run.test.ts`
Expected: the new case fails on current code (RED, proves the guard is load-bearing)

**Step 2: Implement (GREEN)**

Widen the dependencies pick so the guard can use the injected `exists` helper (which needs `stat`), check existence before appending, and when absent log one line "skipped split recommendation: no discovery.md for this project" and return without writing.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split/__tests__/run.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split`
Expected: split suite green

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/split/run.ts packages/cli/src/commands/project/split/__tests__/run.test.ts
git commit -m "fix(p03-t01): skip split recommendation append when discovery.md is absent"
```

---

### Task p03-t02: Implement `oat project promote --to quick`

**Files:**

- Create: `packages/cli/src/commands/project/promote/index.ts`
- Create: `packages/cli/src/commands/project/promote/promote.ts`
- Create: `packages/cli/src/commands/project/promote/promote.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts` (register the subcommand)
- Modify: `packages/cli/src/commands/help-snapshots.test.ts` (if the new subcommand appears in a golden)

**Step 1: Write test (RED)**

Unit tests against a temp project directory:

- Happy path: lite plan with all five spec sections → `discovery.md` has Initial Request from Summary, Key Decisions from Decisions, Assumptions, Out of Scope, Success Criteria from Validation Criteria; `references/lite-plan.md` is byte-equal to the original `plan.md`; new `plan.md` is the quick template render; `state.md` reads mode `quick`, phase `discovery`, status `complete`, `oat_ready_for: oat-project-quick-start`, stamped `oat_project_state_updated`; `oat_workflow_origin` unchanged for both `native` and `imported` fixtures.
- Refusals, each asserting no file was written: mode is `quick`; `references/lite-plan.md` already exists; `--to spec-driven`; scope resolution fails.
- `--json` emits `{ status: 'promoted' | 'refused', reason, files }`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote/promote.test.ts`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Follow the `complete-discovery` command shape for Commander wiring and dependency injection only. For scope and persistence, follow `packages/cli/src/commands/project/split/run.ts`: import `resolveProjectScope` from `@commands/shared/project-scope` (refuse when it returns null), and inject `gitRunner` (`defaultGitRunner` and `GitRunner` from `@commands/project/sync/git`) and `pushSynced` (from `@commands/project/sync/ref-sync`) as dependencies so tests can stub them. Ordering is strict:

1. Read-only validation: mode is `lite`, `--to` is `quick`, `references/lite-plan.md` is absent, and `resolveProjectScope` returns a scope. Any failure refuses before any write.
2. Every file write: render `discovery.md` and the fresh quick `plan.md` with the exported `applyTemplateReplacements` (pass `'quick'`) and `resolveTemplateSource` from the scaffold module; move `plan.md` to `references/lite-plan.md`; update `state.md`.
3. Only after every write succeeded: `gitRunner` adds the exact project paths and commits, or `pushSynced` for synced scope.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote/promote.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

Extract the lite section parser into a small pure function with its own tests so import-plan guidance (Phase 5) can reference its shape.

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
- Modify: `packages/cli/scripts/bundle-inputs.mjs` (`skills` gains `oat-project-lite`)
- Modify: `packages/cli/src/validation/skills.test.ts` (the two explicit gateable-skill lists near lines 1741 and 1758 gain `oat-project-lite`, and the gate-ordering table in "runs lifecycle exit gates before their completion boundaries" gains a row: version `1.0.0`, finalizedHeading = the Step 6 review-loop heading, gateHeading `### Gate Execution`, completionHeading = the Step 7 heading, and the matching noGateNextStep; plus a new test "oat-project-lite enforces the single-pause interaction contract" asserting the skill has exactly one interview step that batches questions, a conditional second round only for questions the first created, a promote call at the escalation check, exactly one AskUserQuestion approval gate before plan completion, and no HiLL checkpoint or phase-gate setup step)

**Step 1: Write test (RED)**

Pack-manifest test asserts `oat-project-lite` is in the workflows pack. Add `oat-project-lite` to both gateable-skill lists in `skills.test.ts` so the `### Gate Execution` and `oat gate ` invocation assertions cover it. Add the name to `WORKFLOW_SKILL_NAMES` and run the bundle-consistency test: "bundles every workflow skill" fails until `bundle-inputs.mjs` lists it.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Write the skill at `version: 1.0.0` with frontmatter matching `oat-project-quick-start` (`oat_gateable: true`, `disable-model-invocation: true`, `user-invocable: true`, `allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion`). Required sections: Mode Assertion (blocked: no design or spec authoring, no multi-phase plans, no implementation code), Progress Indicators with the `OAT ▸ LITE` banner, Step 0 git preflight by reference to quick-start's contract, Step 0.5 resolve active project or scaffold with `--mode lite`, Step 1 read repo knowledge, Step 2 batched critical interview (one round, second round only for questions the first created, "just proceed" records careful assumptions), Step 2.5 escalation check calling `oat project promote "$PROJECT_PATH" --to quick --json` and stopping with a pointer to quick-start, Step 3 author `plan.md` sections and single-phase tasks in plan-writing grammar, Step 4 single approval gate via AskUserQuestion, Step 5 dispatch ceiling by reference to the shared contract with no phase-gate setup, Step 6 plan artifact review loop by reference (structured mode, no user pause), a `### Gate Execution` step by reference to quick-start's Gate Execution contract (the skill keeps `oat_gateable: true`, so a configured gate runs after artifact review and before completion), Step 7 mark complete, sync state, initialize implementation.md, commit, hand off to implement, Success Criteria. Add `oat-project-lite` to `bundle-inputs.mjs` `skills`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

Run `pnpm exec oxfmt --write .agents/skills/oat-project-lite/SKILL.md` and `pnpm exec oxlint .agents/skills`.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm run cli -- sync --scope all --dry-run`
Expected: validator green for the authored skill; sync dry-run lists the new skill for provider views without drift errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-lite/SKILL.md packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/scripts/bundle-inputs.mjs packages/cli/src/validation/skills.test.ts
git commit -m "feat(p04-t01): add oat-project-lite entry skill"
```

---

### Task p04-t02: End-to-end lite scaffold, dashboard, and promotion

**Files:**

- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Write test (RED)**

Two integration cases with an isolated HOME (see AGENTS.md on the bundle tier), named "project new creates lite-mode scaffold artifacts and routes to oat-project-lite" and "project promote --to quick converts a lite project": (a) `project new x --mode lite` then `state refresh` produces a dashboard with mode `lite` and next step `oat-project-lite`; (b) after writing a minimal lite plan, `project promote x --to quick` yields a quick project whose dashboard routes to quick-start and whose `references/lite-plan.md` exists.

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
- Modify: `.agents/skills/oat-project-discover/SKILL.md` (lite route: "continue with `oat-project-lite` / `oat-project-progress`", version bump)
- Modify: `.agents/skills/oat-project-progress/SKILL.md` (Lite mode routing table, version bump)
- Modify: `.agents/skills/oat-project-next/SKILL.md` (Lite routing table, version bump)
- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (fold-back handoff row, version bump)
- Modify: `.agents/skills/oat-project-promote-spec-driven/SKILL.md` (state that lite promotes via quick, version bump)
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md` (lite requirement source is plan.md Summary and Validation Criteria, version bump)
- Modify: `.agents/agents/oat-reviewer.md` (`lite` in the workflow_mode input, a Mode Contract line stating plan.md is expected and discovery/spec/design are absent by design, the Step 1 read rule, the Step 3 requirement-source line pointing at plan.md Summary, Decisions, and Validation Criteria, and the plan-review upstream set; version bump)
- Modify: `.agents/agents/oat-phase-implementer.md` (`lite` in the input enum and an Artifact Reads bullet reading only the phase section from plan.md; version bump)
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Write test (RED)**

Skill-contract changes, using each skill's real marker strings:

- Progress: markers are `**Spec-Driven mode (`, `**Quick mode (`, `**Import mode (`; add `**Lite mode (`oat_workflow_mode: lite`):**` after the import block and make the import slice end at `**Lite mode` instead of running to end of file.
- Next: markers are `**Spec-Driven Mode**`, `**Quick Mode:**`, `**Import Mode:**`; add `**Lite Mode:**` before `### Step 4:`, make the import slice end at `**Lite Mode:**`, and slice the lite table from `**Lite Mode:**` to `### Step 4:`.
- Assert lite routing text in both skills (plan tier 3 → `oat-project-lite`).
- Review-provide and pr-final: assert lite proceeds without spec or design and carries the reduced-assurance note. Keep the review-provide sentence "reviewing `design` in `quick/import` mode requires only `discovery.md`" byte-identical (review-skill-contracts.test.ts asserts it literally) and add lite guidance as a separate line.
- Assert that both agent files name `lite` in their mode inputs and that the reviewer's Mode Contract has a lite line.
- Update every pinned version assertion for the bumped skills and agents in `skills.test.ts` and `review-skill-contracts.test.ts` (find them with `grep -n "'2\.3\.1'\|'1\.5\.3'\|'1\.0\.12'\|'1\.3\.0'\|'1\.4\.6'\|'1\.2\.21'\|'1\.6\.0'\|'2\.2\.2'\|'1\.2\.1'\|'1\.1\.1'"` across both files before editing; several pins are bare array entries without `toBe`, the reviewer agent is pinned at 1.2.1 in both files, and the `'1.1.1'` hit for `oat-review-provide-remote` near line 5331 is out of scope and must not change) to the new versions chosen in Step 2.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: fail on the lite assertions and the version pins (RED)

**Step 2: Implement (GREEN)**

Apply each one-line or one-branch change listed in design component 7, including the discover and pr-progress skills and both agent contracts. Bump each changed skill's and agent's `version:` once (patch for prose-only additions, minor for progress and next which gain a routing table).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor**

`pnpm exec oxfmt --write` on the touched skill files only.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && git fetch origin main && pnpm run check:skill-bumps`
Expected: both green

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement .agents/skills/oat-project-plan-writing .agents/skills/oat-project-review-provide .agents/skills/oat-project-pr-final .agents/skills/oat-project-plan .agents/skills/oat-project-discover .agents/skills/oat-project-progress .agents/skills/oat-project-next .agents/skills/oat-brainstorm .agents/skills/oat-project-promote-spec-driven .agents/skills/oat-project-pr-progress .agents/agents/oat-reviewer.md .agents/agents/oat-phase-implementer.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p05-t01): add lite branches to mode-aware skills"
```

---

### Task p05-t02: Offer lite for single-phase imported plans

**Files:**

- Modify: `.agents/skills/oat-project-import-plan/SKILL.md` (new Step 3.5, Step 4.25 skip note, Step 5 state write branch, version bump)
- Modify: `packages/cli/src/validation/skills.test.ts` (new test named "import-plan offers lite for single-phase plans and preserves import provenance"; update the import-plan version pin)

**Step 1: Write test (RED)**

Assert the import-plan skill contains a `### Step 3.5: Lite Offer` heading between Step 3 normalization and Step 4 metadata, that the offer fires only for one `## Phase` heading with empty `oat_plan_parallel_groups`, and that the accepted branch writes `oat_workflow_mode: lite` in Step 5 while keeping `oat_workflow_origin: imported` and the `oat_import_*` fields, and skips Step 4.25 phase-gate setup.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "import-plan offers lite"`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Add Step 3.5 "Lite Offer" after Step 3: detect one `## Phase` heading and empty `oat_plan_parallel_groups`; present the offer via AskUserQuestion with lite recommended and the tradeoff stated (single-phase plans can still be multi-session work); on accept, reshape `plan.md` into the `plan-lite.md` section order, lifting Summary, Decisions, Assumptions, and Out of Scope from the external plan's prose where present and otherwise writing explicit assumptions, and deriving Validation Criteria from task verification steps. Note in Step 4.25 that an accepted lite offer skips phase-gate setup. In Step 5, write `oat_workflow_mode: lite` on the accepted branch with origin and import fields preserved; `oat_plan_source` stays `imported`. Bump the skill version and its pin.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "import-plan offers lite"`
Expected: pass (GREEN)

**Step 3: Refactor**

Format the skill file.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: green

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-import-plan/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "feat(p05-t02): offer lite mode for single-phase imported plans"
```

---

### Task p05-t03: Bypass implementation checkpoint prompts for lite projects

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/plan-and-resume.md` (Step 2.5 lite branch)
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md` (final HiLL approval lite branch)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (same single version bump as p05-t01; do not bump twice)
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Assert that plan-and-resume.md Step 2.5 contains a lite branch stating: when `oat_workflow_mode` is `lite`, checkpoint state is resolved as "none" without reading `oat_plan_hill_phases` semantics (an empty list means every phase for other modes, so lite must not rely on it), the workflow-preference prompt, the standard checkpoint prompt, and the auto-review preference prompt are all skipped, and `oat_auto_review_at_hill_checkpoints` is written as `false` with a `# lite: no checkpoints` comment. Assert completion-and-closeout.md states that lite has no final HiLL approval step and proceeds from a passed final review to closeout. Assert the phase-execution payload comment notes lite is always a single phase.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "lite bypasses implementation checkpoints"`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Add the lite branch at the top of Step 2.5 in plan-and-resume.md, before the autonomous checkpoint resolution, so it applies in both interactive and autonomous runs. Add the lite branch to the final HiLL section of completion-and-closeout.md. Keep the per-phase root review and the final review unchanged; only HiLL approval pauses are removed.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "lite bypasses implementation checkpoints"`
Expected: pass (GREEN)

**Step 3: Refactor**

Format the touched reference files.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: green

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/references/plan-and-resume.md .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-implement/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "feat(p05-t03): bypass HiLL checkpoint prompts for lite projects"
```

---

### Task p05-t04: Collapse the post-implementation path for lite

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md` (lite closeout sequence)
- Modify: `.agents/skills/oat-project-next/SKILL.md` (lite: passed final review → `oat-project-pr-final`; same single bump as p05-t01)
- Modify: `.agents/skills/oat-project-pr-final/SKILL.md` (Step 3.0 lite branch; same single bump as p05-t01)
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Assert: completion-and-closeout.md resolves the lite pre-approval sequence to `[pr]` with summary and document opt-in only when explicitly configured, and never adds retro; oat-project-next routes a lite project with a passed final review to `oat-project-pr-final` rather than `oat-project-summary`; pr-final Step 3.0 states that for lite it does not generate `summary.md` and synthesizes the PR body from plan.md Summary, Decisions, Validation Criteria, and implementation.md Final Summary, with the reduced-assurance note.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "lite collapses closeout"`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Add the three branches. Keep the default sequence for every other mode byte-identical.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "lite collapses closeout"`
Expected: pass (GREEN)

**Step 3: Refactor**

Format the touched skill files.

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: green

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-next/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "feat(p05-t04): collapse lite closeout to PR creation"
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
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md` (gate-aware skill lists near lines 65 and 528 gain `oat-project-lite`)
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md` (the plan-producing workflows that run the structured plan review loop gain `oat-project-lite`)

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
git add AGENTS.md apps/oat-docs/docs/workflows/index.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/workflows/projects/pr-flow.md apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/workflows/skills/index.md apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/workflows/projects/reviews.md
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

Run the full definition-of-done sequence in AGENTS.md order, capturing each exit code. `pnpm test` is gate 3 and includes the release tests; the forced Turbo run is supplemental evidence, not a substitute:

```bash
pnpm check > g1.log 2>&1; echo "check=$?"
pnpm type-check > g2.log 2>&1; echo "type=$?"
pnpm test > g3.log 2>&1; echo "test=$?"
# Supplemental evidence that gate 3 was not a cache replay (it also runs test:release):
HOME=$(mktemp -d) pnpm exec turbo run test --force > g3a.log 2>&1; echo "test-forced=$?"
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
- Modify: `.claude/skills/oat-project-lite`, `.codex/agents/` (base roles plus every supported-catalogue `oat-reviewer-*` and `oat-phase-implementer-*` variant), `.cursor/agents/` (every supported-catalogue `oat-reviewer-*` and `oat-phase-implementer-*` variant), and `.oat/sync/manifest.json`, all regenerated by `oat sync --scope all`. The `.claude/agents/*.md` and base `.cursor/agents/*.md` entries are symlinks to the canonical agents and do not change. The variant files embed the full agent body, so they carry the three-mode `workflow_mode` line until regenerated; leaving them uncommitted would reintroduce the gap p05-t01 closes for any reviewer or implementer dispatched through a variant role.

**Step 1: Write test (RED)**

Not test-driven. This is the manual verification the testing strategy requires.

**Step 2: Implement (GREEN)**

Run `pnpm run cli -- sync --scope all` so the new skill appears in provider views. Then, in a scratch worktree or a throwaway branch, run `pnpm run cli -- project new lite-smoke --mode lite`, invoke `oat-project-lite` on a trivial change (for example, adding a one-line docs note), confirm the interview is one batched round, the approval gate fires once, the ceiling resolves, and `oat-project-implement` runs the single phase and final review. Delete the smoke project afterwards.

**Step 3: Refactor**

None.

**Step 4: Verify**

Record in implementation.md: the commands run, the number of user pauses observed, and any friction. Run `git status --porcelain` and confirm only intended sync outputs changed: every changed file under `.codex/agents` and `.cursor/agents` carries the `# oat-owner: supported-catalogue` header, and `grep -L lite` over the regenerated `oat-reviewer-*` variants returns nothing.

**Step 5: Commit**

```bash
git add .claude/skills/oat-project-lite .codex/agents .cursor/agents .oat/sync/manifest.json .oat/projects/shared/lite-workflow-mode/implementation.md
git commit -m "chore(p06-t03): sync provider views and record manual lite run"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status   | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target              |
| ------ | -------- | -------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ------------------------ |
| p01    | code     | pending  | -          | -                                                           | -             | -          | -                        |
| p02    | code     | pending  | -          | -                                                           | -             | -          | -                        |
| p03    | code     | pending  | -          | -                                                           | -             | -          | -                        |
| p04    | code     | pending  | -          | -                                                           | -             | -          | -                        |
| p05    | code     | pending  | -          | -                                                           | -             | -          | -                        |
| p06    | code     | pending  | -          | -                                                           | -             | -          | -                        |
| final  | code     | pending  | -          | -                                                           | -             | -          | -                        |
| spec   | artifact | pending  | -          | -                                                           | -             | -          | -                        |
| design | artifact | pending  | -          | -                                                           | -             | -          | -                        |
| plan   | artifact | received | 2026-09-04 | reviews/archived/artifact-plan-review-2026-09-04T231105Z.md | -             | gate       | cursor-gpt-5-6-sol-xhigh |

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

- Phase 1: 4 tasks - single mode definition, plan-lite template and bundle inventory, lite scaffold, help snapshot
- Phase 2: 3 tasks - recommender and dashboard routing, lite closeout route
- Phase 3: 2 tasks - split-detector guard, promote command
- Phase 4: 2 tasks - oat-project-lite skill, end-to-end integration test
- Phase 5: 4 tasks - mode-aware skill branches, import-to-lite offer, checkpoint bypass, collapsed closeout
- Phase 6: 3 tasks - docs and triage, lockstep bump and gates, manual run and sync

**Total:** 18 tasks across 6 phases

**Definition of done:** every gate in AGENTS.md exits 0 with evidence captured; the manual lite run is recorded in implementation.md.

---

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Backlog companion: `.oat/repo/pjm/backlog/items/BL-260904-make-quick-the-default-oat.md`
- Plan-writing contract: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Quick-start (reference for lite skill structure): `.agents/skills/oat-project-quick-start/SKILL.md`
- Warp factory spec-agent prompt (external reference shared during brainstorming; not vendored)
