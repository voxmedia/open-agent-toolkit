---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-06
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p06'] # phases to pause AFTER completing (empty = every phase)
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p02', 'p03']] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: false
---

# Implementation Plan: lite-workflow-mode

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Add a `lite` workflow mode for single-sitting changes: one authored `plan.md` carrying spec sections and a single-phase task list, a batched-interview entry skill with one approval gate, a CLI promote command for lite-to-quick escalation, an import-plan offer to run single-phase imports as lite, and lite awareness across every mode-aware surface.

**Architecture:** Lite is a fourth value in a single, array-derived `WorkflowMode` declaration consumed by parser, scaffold, and both routing tables. The scaffold maps a new `plan-lite.md` template onto `plan.md`. A new `oat project promote --to quick` command owns escalation mechanics; the new `oat-project-lite` skill owns the human flow. See `design.md`.

**Tech Stack:** TypeScript ESM, Commander, vitest, pnpm/Turborepo, markdown skills and templates, Fumadocs.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add lite to WORKFLOW_MODES`

**Formatting Contract:** every task's Step 3 runs the repository's write command `pnpm exec oxfmt --write <files>` over every file that task created or edited, listed explicitly. Never format a project `state.md` or the `.oat/templates/state.md` template (oxfmt corrupts their commented YAML frontmatter blocks; edit them with targeted replacements). p01-t02's omission of the template from its format command is deliberate. Never format generated or sync-managed outputs (`apps/oat-docs/index.md` is regenerated, not formatted; `.oat/sync/manifest.json`, `.codex/agents/`, `.cursor/agents/`, and `.claude/skills/` are owned by `oat sync`; `pnpm-lock.yaml` is owned by pnpm).

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Phase 1 is the foundation: it changes the shared `WorkflowMode` declaration, which every later phase compiles against, and exports the two scaffold helpers the promote command reuses, so nothing can run beside it.

Phase 2 (routing) and Phase 3 (promote command and split hardening) both depend only on Phase 1 and have disjoint write sets. Phase 2 writes `packages/control-plane/src/recommender/router.ts`, `packages/cli/src/commands/state/generate.ts`, and their tests. Phase 3 writes a new `packages/cli/src/commands/project/promote/` directory, one registration line in `packages/cli/src/commands/project/index.ts`, `packages/cli/src/commands/project/split/run.ts`, the split runner test under `split/__tests__/`, the `validate-plan/` directory, and the help snapshot. Neither touches the other's files, each has independent scoped verification, and neither depends on the other's behavior. They are declared as one parallel group.

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
- Modify: `packages/control-plane/README.md` (public API section documents the exported `WORKFLOW_MODES` constant and its four values)

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

Parser adds `WORKFLOW_MODES` to its existing `import { ... } from '../types'` statement (line 13 today) and deletes its local array. No new cross-directory import is introduced; the control-plane package has no path alias configured and every module in it already imports `../types` this way, so introducing an alias is out of scope for this project and noted as a follow-up for the package.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor and format**

None beyond the deleted duplicate.

Format every file this task created or edited: `pnpm exec oxfmt --write packages/control-plane/src/types.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/README.md`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane type-check && pnpm --filter @open-agent-toolkit/control-plane exec vitest run`
Expected: type-check clean; control-plane suite green. Note: `getWorkflowRoutes` in the recommender has a `default` branch, so control-plane compiles before Phase 2 adds lite routes.

**Step 5: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/README.md
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

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write .oat/templates/plan-lite.md .oat/templates/plan.md packages/cli/scripts/bundle-inputs.mjs packages/cli/src/commands/tools/shared/pack-manifest.ts`

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

Scaffold tests: `--mode lite` creates exactly `state.md`, `plan.md`, `implementation.md` and no `discovery.md`; the created `plan.md` contains a `## Validation Criteria` heading (proving it came from `plan-lite.md`) and still carries `oat_template: true` in its frontmatter (the renderer strips it for other modes); extend the "renders every real $mode scaffold artifact without unresolved OAT placeholders" `it.each` with `lite`; the existing spec-driven, quick, and import "creates ... artifacts only" tests are unchanged. Index tests: `--mode lite` passes through; the option's choices equal `WORKFLOW_MODES`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/project/new/index.test.ts`
Expected: every lite case fails because `TEMPLATES_BY_MODE` has no lite key and the CLI rejects the choice (RED)

**Step 2: Implement (GREEN)**

- Replace `ProjectScaffoldMode` with `import type { WorkflowMode } from '@open-agent-toolkit/control-plane'` (keep a deprecated alias export if anything else imports the old name).
- Change `TEMPLATES_BY_MODE` entries to `string | { source: string; target: string }` with a normalizer, add `lite: ['state.md', { source: 'plan-lite.md', target: 'plan.md' }, 'implementation.md']`.
- Copy loop resolves `source` through `resolveTemplateSource` and writes to `target`; `createdFiles` records the target name.
- Add the lite `STATE_TEMPLATE_BY_MODE` entry: phase `plan`, status `in_progress`, HiLL checkpoints `[]`, artifacts naming plan and implementation only, next milestone "run oat-project-lite".
- Build `--mode` choices from `WORKFLOW_MODES`; keep the default `spec-driven`.
- `applyTemplateReplacements` strips `oat_template: true` and `oat_template_name` from every rendered artifact. For lite only, after rendering the `plan.md` target, restore `oat_template: true` in its frontmatter so the control-plane boundary detector keeps the untouched and authored-but-unapproved plan at tier 3 and `LITE_ROUTES` keeps ownership with `oat-project-lite`. Existing modes stay byte-identical because the restore is gated on `mode === 'lite'` and the plan target. The lite skill sets it `false` only at its Step 7 completion boundary.
- Export `applyTemplateReplacements` and `resolveTemplateSource` (currently module-private) so the Phase 3 promote command can reuse them without touching this file. Note `applyTemplateReplacements(template, projectName, today, nowUtc, mode)` reads `STATE_TEMPLATE_BY_MODE[mode]`, so callers rendering quick artifacts must pass `'quick'`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts src/commands/project/new/index.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Ensure the normalizer keeps the three existing modes byte-identical: add an assertion that each existing mode's `createdFiles` list matches the pre-change list.

Format every file this task created or edited: `pnpm exec oxfmt --write packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/index.ts packages/cli/src/commands/project/new/index.test.ts packages/cli/src/commands/project/new/scaffold.test.ts`

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

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write packages/cli/src/commands/help-snapshots.test.ts`

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

**Step 3: Refactor and format**

None; the two routing tables intentionally stay separate (design decision 4).

Format every file this task created or edited: `pnpm exec oxfmt --write packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts`

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

Load-bearing assertions: `lite:plan:in_progress` → `oat-project-lite` (today the shared map yields `oat-project-plan`), and the rendered no-project dashboard's Quick Commands list contains `oat-project-lite`. Regression guards: `lite:plan:complete` → `oat-project-implement` already holds via `sharedMap['plan:complete']`, and the rendered dashboard table shows `| Mode | lite |` once Phase 1 parses lite. Extend the existing "routes computeNextStep correctly for spec-driven/quick/import modes" case with these fixtures.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts`
Expected: the in_progress case fails (RED); guards pass

**Step 2: Implement (GREEN)**

Add only the `lite:plan:in_progress` entry to `routeMap` with reason "Continue lite planning". Do not duplicate the `plan:complete` route that `sharedMap` already provides. Separately, the dashboard's hard-coded Quick Commands project-entry list (`generate.ts` near lines 651-653) gains an `oat-project-lite` line beside the spec-driven, quick, and import entries.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts`

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
- Modify: `packages/cli/src/commands/state/generate.ts`
- Modify: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Write test (RED)**

Load-bearing assertion: mode `lite`, implement phase, final review `passed`, no complete `summary.md` → `oat-project-pr-final`. Today the closeout branch near router.ts:199-211 returns `oat-project-summary` whenever the summary artifact is missing or incomplete, regardless of mode. Regression guard: the same state under `quick` still routes to `oat-project-summary`. Dashboard load-bearing assertion: lite, implement phase complete, `oat_docs_updated` unset → `oat-project-pr-final`; today `computeNextStep` sends that state to `oat-project-document`. Guard: quick in the same state still routes to `oat-project-document`.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`
Expected: the lite case fails (RED); the quick guard passes

**Step 2: Implement (GREEN)**

In the closeout branch, when `state.workflowMode === 'lite'`, skip the summary requirement and return `oat-project-pr-final` with reason "Final review passed; lite mode synthesizes the PR from plan and implementation". Leave every other mode unchanged. In `generate.ts`, add a lite branch to the implement-complete route so unset docs state routes to `oat-project-pr-final`; other modes keep the documentation route.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender/router.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write packages/control-plane/src/recommender/router.ts packages/control-plane/src/recommender/router.test.ts packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts`

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

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write packages/cli/src/commands/project/split/run.ts packages/cli/src/commands/project/split/__tests__/run.test.ts`

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
- Refusals, each asserting no file was written: mode is `quick`; `references/lite-plan.md` already exists; `--to spec-driven`; scope resolution fails; the lite `plan.md` has not been authored, meaning any of the five spec sections is missing or still contains a `{...}` scaffold placeholder. The `oat_template: true` flag is not the signal: lite keeps it set until the Step 7 completion boundary so the recommender keeps routing to `oat-project-lite`, and an authored plan that still carries the flag must promote.
- `--json` emits `{ status: 'promoted' | 'refused', reason, files }`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote/promote.test.ts`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Follow the `complete-discovery` command shape for Commander wiring and dependency injection only. For scope and persistence, follow `packages/cli/src/commands/project/split/run.ts`: import `resolveProjectScope` from `@commands/shared/project-scope` (refuse when it returns null), and inject `gitRunner` (`defaultGitRunner` and `GitRunner` from `@commands/project/sync/git`) and `pushSynced` (from `@commands/project/sync/ref-sync`) as dependencies so tests can stub them. Ordering is strict:

1. Read-only validation: mode is `lite`, `--to` is `quick`, `references/lite-plan.md` is absent, all five spec sections are present without scaffold placeholders (ignore `oat_template`), and `resolveProjectScope` returns a scope. Any failure refuses before any write.
2. Every file write: render `discovery.md` and the fresh quick `plan.md` with the exported `applyTemplateReplacements` (pass `'quick'`) and `resolveTemplateSource` from the scaffold module; move `plan.md` to `references/lite-plan.md`; update `state.md`.
3. Only after every write succeeded: `gitRunner` adds the exact project paths and commits, or `pushSynced` for synced scope.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote/promote.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Extract the lite section parser into a small pure function with its own tests so import-plan guidance (Phase 5) can reference its shape.

Format every file this task created or edited: `pnpm exec oxfmt --write packages/cli/src/commands/project/promote/index.ts packages/cli/src/commands/project/promote/promote.ts packages/cli/src/commands/project/promote/promote.test.ts packages/cli/src/commands/project/index.ts packages/cli/src/commands/help-snapshots.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/promote src/commands/help-snapshots.test.ts`
Expected: green; update the help snapshot if the new subcommand appears in a golden

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/promote packages/cli/src/commands/project/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p03-t02): add oat project promote --to quick for lite projects"
```

---

### Task p03-t03: Enforce the single-phase invariant for lite plans in validate-plan

**Files:**

- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.ts`
- Modify: `packages/cli/src/commands/project/validate-plan/index.ts` (read `oat_workflow_mode` from the project's `state.md`)
- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.test.ts`
- Modify: `packages/cli/src/commands/project/validate-plan/index.test.ts`

**Step 1: Write test (RED)**

Negative controls, preserved as fixtures with their expected categorical outcome. Test the new pure function `validateLitePlan(planContent, workflowMode)` directly so each clause has its own RED: (a) a lite plan with two `## Phase` headings returns a `lite-multi-phase` error naming the invariant; (b) a lite plan with non-empty `oat_plan_parallel_groups` returns a `lite-parallel-groups` error; (c) a lite plan whose Validation Criteria contains a bullet with no backtick span and no `manual:` prefix returns `lite-criterion-without-command`, while a plan whose every criterion names a command passes. Clause (b) cannot be proven through the command alone because the existing singleton-group rule already rejects a one-phase plan with any group, so assert the categorical error from the pure function, not merely non-zero exit. Command-level cases: a lite project with exactly one phase passes; a quick project with two phases still passes.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan`
Expected: both pure-function cases fail on current code because the function does not exist (RED); the two command-level pass cases stay green

**Step 2: Implement (GREEN)**

Add the exported pure function `validateLitePlan(planContent, workflowMode)` in `validate-plan.ts` returning `{ ok: true } | { ok: false; code: 'lite-multi-phase' | 'lite-parallel-groups' | 'lite-criterion-without-command'; message }` (the third fires when any bullet under `## Validation Criteria` lacks a backtick span or a `manual:` prefix, so an authored lite plan cannot erase the template's command-bearing shape), and run it before `validateParallelGroups` in the command so the lite-specific error is the one reported; `index.ts` parses `state.md` frontmatter for the mode using the existing frontmatter helper and passes it through. Because the implement skill's preflight already runs `oat project validate-plan --project-path`, this single check enforces the invariant both at planning time and before implementation, so p05-t03's checkpoint bypass can never apply to a multi-phase plan.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write packages/cli/src/commands/project/validate-plan/validate-plan.ts packages/cli/src/commands/project/validate-plan/index.ts packages/cli/src/commands/project/validate-plan/validate-plan.test.ts packages/cli/src/commands/project/validate-plan/index.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan src/commands/help-snapshots.test.ts`
Expected: green

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/validate-plan
git commit -m "feat(p03-t03): reject multi-phase lite plans in validate-plan"
```

---

## Phase 4: Lite Entry Skill and End-to-End Test

### Task p04-t01: Author the oat-project-lite skill and register it in the workflows pack

**Files:**

- Create: `.agents/skills/oat-project-lite/SKILL.md`
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts` (`WORKFLOW_SKILL_NAMES`)
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.test.ts`
- Modify: `packages/cli/scripts/bundle-inputs.mjs` (`skills` gains `oat-project-lite`)
- Modify: `.agents/docs/autonomy-contract.md` (canonical; the skill-local `references/docs/autonomy-contract.md` paths are symlinked read-only views; gate inventory gains `LITE-01` inherited dirty tree, `LITE-02` missing name or description, `LITE-03` batched interview, `LITE-04` escalation to quick, `LITE-05` plan approval gate, `LITE-06` dispatch-ladder scope, `LITE-07` project dispatch policy, `LITE-08` artifact-review findings, `LITE-09` exit gate; each with interactive behavior, autonomous resolution, classification, and provenance mirroring the QS rows)
- Modify: `packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts` (enumeration gains `oat-project-lite`; the skill must carry the exact inherited-git preflight contract those assertions check: unsafe porcelain handling and scoped staging)
- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts` (enumeration gains `oat-project-lite`; asserts canonical global `--json` placement and target neutrality in its Gate Execution)
- Modify: `.agents/skills/oat-doctor/SKILL.md` (workflow-pack skill inventory gains `oat-project-lite`; version bump and pin update)
- Modify: `packages/cli/src/validation/autonomy-gate-inventory.test.ts` (expected skill-root count 15 → 16; stable prompt-site keys for every `oat-project-lite` prompt; mirrored-contract equality checks preserved)
- Modify: `packages/cli/src/validation/skills.test.ts` (the two explicit gateable-skill lists near lines 1741 and 1758 gain `oat-project-lite`, and the gate-ordering table in "runs lifecycle exit gates before their completion boundaries" gains a row: version `1.0.0`, finalizedHeading = the Step 6 review-loop heading, gateHeading `### Gate Execution`, completionHeading = the Step 7 heading, and the matching noGateNextStep, plus an assertion that a scoped-commit persistence step precedes the gate heading; plus a new test "oat-project-lite enforces the single-pause interaction contract" asserting the skill has exactly one interview step that batches questions, a conditional second round only for questions the first created, a promote call at the escalation check, exactly one AskUserQuestion approval gate before plan completion, and no HiLL checkpoint or phase-gate setup step; and a test "oat-project-lite registers every interactive gate in the autonomy inventory" asserting every prompt in the skill cites a `LITE-0N` row that exists in the inventory and that the skill loads the autonomy contract under `OAT_AUTONOMOUS=1`)

**Step 1: Write test (RED)**

Pack-manifest test asserts `oat-project-lite` is in the workflows pack. Add `oat-project-lite` to both gateable-skill lists in `skills.test.ts` so the `### Gate Execution` and `oat gate ` invocation assertions cover it. Add the `LITE-01..09` rows and the `## HEAD prompt-site coverage` mappings for `oat-project-lite/SKILL.md` to the canonical `.agents/docs/autonomy-contract.md` and raise the expected root count in `autonomy-gate-inventory.test.ts` to 16; that test fails until the skill file exists with matching prompt sites. Add the name to `WORKFLOW_SKILL_NAMES` and run the bundle-consistency test: "bundles every workflow skill" fails until `bundle-inputs.mjs` lists it.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/autonomy-gate-inventory.test.ts`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Write the skill at `version: 1.0.0`. Its preflight and Gate Execution sections must reproduce the exact testable clauses the shared contract suites check (porcelain codes, `git add -- <path>` staging, `oat --json gate review --project "$PROJECT_PATH" ...` placement, no `--target`), not a prose-only pointer to quick-start. Its Mode Assertion states: when `OAT_AUTONOMOUS=1`, read the canonical `.agents/docs/autonomy-contract.md` (the skill-local `references/docs/autonomy-contract.md` views are symlinks to it), keep `OAT_NON_INTERACTIVE=1`, and resolve every interactive decision through its `LITE-0N` row (batched interview answers from repository evidence with recorded assumptions; escalation by the documented heuristic; approval gate auto-confirmed with the requirement set recorded; ladder scope and policy per the QS-08 and QS-09 rules; artifact-review findings per IMPORT-08's shape; exit gate per the shared contract), stopping at a boundary only where the row says so. Frontmatter matches `oat-project-quick-start` (`oat_gateable: true`, `disable-model-invocation: true`, `user-invocable: true`, `allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion`). Required sections: Mode Assertion (blocked: no design or spec authoring, no multi-phase plans, no implementation code), Progress Indicators with the `OAT ▸ LITE` banner, Step 0 git preflight by reference to quick-start's contract, Step 0.5 resolve active project or scaffold with `--mode lite`, Step 1 read repo knowledge, Step 2 batched critical interview (one round, second round only for questions the first created, "just proceed" records careful assumptions), Step 3 author `plan.md` from the interview result: Summary, Decisions, Assumptions, Out of Scope, Validation Criteria (every criterion is one bullet that names its check as a backticked command, test name, or `manual:` visual-proof instruction; a criterion without one is a defect), and the single-phase task list in plan-writing grammar, written to disk before any escalation decision, Step 3.5 escalation check that reads the now-populated plan and calls `oat project promote "$PROJECT_PATH" --to quick --json` when the task list will not fit one sitting or a design decision is unresolvable, stopping with a pointer to quick-start (promotion consumes the authored sections, so interview content is never lost), Step 4 single approval gate via AskUserQuestion, Step 5 dispatch ceiling by reference to the shared contract with no phase-gate setup, Step 6 plan artifact review loop by reference (structured mode, no user pause), an `## Artifact Persistence (Required)` section by reference to quick-start's contract with scoped commits of `plan.md`, `state.md`, and `implementation.md` after Step 3 authoring and before the Step 4 approval gate, again after the structured review loop and before Gate Execution (so `oat gate review` sees a committed core-artifact baseline), with post-gate receive bookkeeping and the Step 7 completion transition as separate scoped commits; a `### Gate Execution` step by reference to quick-start's Gate Execution contract (the skill keeps `oat_gateable: true`, so a configured gate runs after artifact review and before completion), Step 7 mark complete, sync state, initialize implementation.md, commit, hand off to implement, Success Criteria. Add `oat-project-lite` to `bundle-inputs.mjs` `skills`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts src/validation/autonomy-gate-inventory.test.ts src/commands/init/tools/shared/project-start-preflight-contracts.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Run `pnpm exec oxlint .agents/skills`.

Format every file this task created or edited: `pnpm exec oxfmt --write .agents/skills/oat-project-lite/SKILL.md packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/scripts/bundle-inputs.mjs .agents/docs/autonomy-contract.md packages/cli/src/validation/autonomy-gate-inventory.test.ts packages/cli/src/validation/skills.test.ts .agents/skills/oat-doctor/SKILL.md packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm run cli -- sync --scope all --dry-run`
Expected: validator green for the authored skill; sync dry-run lists the new skill for provider views without drift errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-lite/SKILL.md .agents/skills/oat-doctor/SKILL.md .agents/docs/autonomy-contract.md packages/cli/src/validation/autonomy-gate-inventory.test.ts packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/scripts/bundle-inputs.mjs packages/cli/src/validation/skills.test.ts
git commit -m "feat(p04-t01): add oat-project-lite entry skill"
```

---

### Task p04-t02: End-to-end lite scaffold, dashboard, and promotion

**Files:**

- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Write test (RED)**

Two integration cases with an isolated HOME (see AGENTS.md on the bundle tier), named "project new creates lite-mode scaffold artifacts and routes to oat-project-lite" and "project promote --to quick converts a lite project": (a) `project new x --mode lite` then `state refresh` produces a dashboard with mode `lite` and next step `oat-project-lite`; (b) starting from the untouched lite scaffold, write interview-derived Summary, Decisions, Assumptions, Out of Scope, and Validation Criteria sections plus one task into plan.md exactly as the skill's Step 3 would, then `project promote x --to quick`, and assert each of those answers appears verbatim in the resulting discovery.md, the project is quick, the dashboard routes to quick-start, and `references/lite-plan.md` exists; (c) `project promote x --to quick` against the untouched scaffold is refused because its spec sections are unauthored and writes nothing, while case (b)'s plan still carries `oat_template: true` and promotes; (d) through the control-plane recommendation (`getProjectState` on the scaffolded project, or `oat project status --json` if it exposes the recommendation), the untouched lite scaffold recommends `oat-project-lite`, an authored-but-unapproved plan still carrying `oat_template: true` recommends `oat-project-lite`, and a plan with `oat_status: complete`, `oat_ready_for: oat-project-implement`, and `oat_template: false` recommends `oat-project-implement`. Case (d) exercises the control-plane boundary tier, not only the dashboard's mode route map.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/commands.integration.test.ts -t "lite"`
Expected: fail before the assertions are satisfied (RED)

**Step 2: Implement (GREEN)**

Only test code; if a real defect surfaces, fix it in the owning module and note the divergence in implementation.md.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/commands.integration.test.ts -t "lite"`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write packages/cli/src/commands/commands.integration.test.ts`

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
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md` (mode table row, `oat_plan_source` enum, and the consumer list in the Managed Dispatch Readiness contract preamble gains lite planning; version bump)
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` (every mode-sensitive branch gains lite: code-review prerequisites require only `plan.md` and `implementation.md`; artifact file gathering for `plan` reviews gathers only `plan.md`; the Review Scope payload passes the resolved `workflow_mode` explicitly for every mode so `oat-reviewer` never falls to its spec-driven default; code-review alignment uses the five lite plan contract sections; version bump)
- Modify: `.agents/skills/oat-project-pr-final/SKILL.md` (lite proceeds with reduced-assurance note, version bump)
- Modify: `.agents/skills/oat-project-plan/SKILL.md` (lite stop branch, version bump)
- Modify: `.agents/skills/oat-project-discover/SKILL.md` (lite route: "continue with `oat-project-lite` / `oat-project-progress`"; its no-project branch near line 18 offers `oat-project-lite` beside quick-start and new; version bump)
- Modify: `.agents/skills/oat-project-progress/SKILL.md` (Lite mode routing table; the supported-mode statement; the "Start a new project" and "Workflow" no-project listings gain `oat-project-lite - Start a lite workflow (interview -> plan -> implement)` and the promote line reads "quick/import/lite"; version bump)
- Modify: `.agents/skills/oat-project-next/SKILL.md` (Lite routing table; the empty-projects suggestion list gains `oat-project-lite`; the supported-mode inventory near the routing preamble names lite; version bump)
- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (fold-back handoff row; fold-back artifact selection gains a lite rule: when `oat_workflow_mode` is `lite`, `ARTIFACT_PATH` is `plan.md`, the appended section is `## Brainstorming Update` above `## Phase 1`, and the confirmation and commit wording name plan.md; version bump)
- Modify: `.agents/skills/oat-docs/SKILL.md` (the \"two main approaches\" guidance near line 161 becomes three, naming lite for single-sitting work; version bump and pin update)
- Modify: `.agents/skills/oat-project-capture/SKILL.md` (not-yet-started work may route to `oat-project-lite`; version bump and pin update)
- Modify: `.agents/skills/oat-pjm-review-backlog/SKILL.md` (backlog kickoff guidance near line 258 offers lite beside quick and spec-driven; version bump and pin update)
- Modify: `.agents/skills/oat-project-autonomous/SKILL.md` (new-goal review-density selection gains the lite heuristic for single-sitting goals; the resume routing table gains "Lite plan incomplete → `oat-project-lite`"; the completion report's workflow-mode field accepts `lite`; ALLOWED Activities and Success Criteria no longer limit selection to quick or spec-driven; version bump and pin update if present)
- Modify: `.agents/skills/oat-project-promote-spec-driven/SKILL.md` (state that lite promotes via quick, version bump)
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md` (lite requirement source is the five plan.md contract sections, version bump)
- Modify: `.agents/agents/oat-reviewer.md` (`lite` in the workflow_mode input, a Mode Contract line stating plan.md is expected and discovery/spec/design are absent by design, the Step 1 read rule, the Step 3 requirement-source line pointing at all five plan.md contract sections (Summary, Decisions, Assumptions, Out of Scope, Validation Criteria), and the plan-review upstream set; version bump)
- Modify: `.agents/agents/oat-phase-implementer.md` (`lite` in the input enum and an Artifact Reads bullet that reads the whole plan.md: the assigned phase section plus Summary, Decisions, Assumptions, Out of Scope, and Validation Criteria, since those five sections are lite's only requirements contract; version bump)
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Write test (RED)**

Skill-contract changes, using each skill's real marker strings:

- Progress: markers are `**Spec-Driven mode (`, `**Quick mode (`, `**Import mode (`; add `**Lite mode (`oat_workflow_mode: lite`):**` after the import block and make the import slice end at `**Lite mode` instead of running to end of file.
- Next: markers are `**Spec-Driven Mode**`, `**Quick Mode:**`, `**Import Mode:**`; add `**Lite Mode:**` before `### Step 4:`, make the import slice end at `**Lite Mode:**`, and slice the lite table from `**Lite Mode:**` to `### Step 4:`.
- Assert lite routing text in both skills (plan tier 3 → `oat-project-lite`), and assert `oat-project-lite` appears in progress's no-project "Start a new project" and "Workflow" listings, in next's empty-projects suggestion list, and in plan-writing's consumer list, so lite is discoverable when no project is active, not only routable when one is.
- Review-provide and pr-final: assert lite proceeds without spec or design and carries the reduced-assurance note. Add artifact-plan and code-final contract tests for review-provide asserting the dispatched Review Scope payload carries `workflow_mode: lite` explicitly and declares no required discovery, spec, design, or import-reference dependency. Keep the review-provide sentence "reviewing `design` in `quick/import` mode requires only `discovery.md`" byte-identical (review-skill-contracts.test.ts asserts it literally) and add lite guidance as a separate line.
- Assert that both agent files name `lite` in their mode inputs, that the reviewer's Mode Contract has a lite line, that the reviewer's lite requirement source names all five contract sections, and that the implementer's lite Artifact Reads names the phase section plus all five contract sections.
- Assert the brainstorm fold-back rule: for lite, artifact selection resolves to `plan.md`, and add a filesystem-level contract test (temp lite project with only plan.md, state.md, implementation.md) proving the documented fold-back append lands in `plan.md` and creates no `discovery.md`.
- Add a repository-wide inventory guard test: scan every `.agents/skills/*/SKILL.md` and `.agents/agents/*.md` for sentences that enumerate workflow modes or project-entry skills (patterns such as `quick or spec-driven`, `spec-driven or quick`, `quick/import`, `quick-start` beside `oat-project-new`) and require each hit to also name `lite` or `oat-project-lite`, with an explicit allowlist for the promote-spec-driven eligibility sentence and any historical text. Fix every hit in this task; the guard keeps future mode additions from leaving two-mode wording behind.
- Assert the docs, capture, review-backlog, and discover no-project entry guidance route single-sitting work to `oat-project-lite`.
- Assert the autonomous skill's new-goal selection names lite with its heuristic, its resume table routes an incomplete lite plan to `oat-project-lite`, its report accepts `lite`, and no quick-or-spec-driven-only selection sentence remains in its ALLOWED Activities or Success Criteria; add a persisted-lite resume fixture.
- Update every pinned version assertion for the bumped skills and agents in `skills.test.ts` and `review-skill-contracts.test.ts` (find them with `grep -n "'2\.3\.1'\|'1\.5\.3'\|'1\.0\.12'\|'1\.3\.0'\|'1\.4\.6'\|'1\.2\.21'\|'1\.6\.0'\|'2\.2\.2'\|'1\.2\.1'\|'1\.1\.1'"` across both files before editing; several pins are bare array entries without `toBe`, the reviewer agent is pinned at 1.2.1 in both files, and the `'1.1.1'` hit for `oat-review-provide-remote` near line 5331 is out of scope and must not change) to the new versions chosen in Step 2.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: fail on the lite assertions and the version pins (RED)

**Step 2: Implement (GREEN)**

Apply only the one-line or one-branch changes for the files listed in this task's Files section (implement payload enum, plan-writing table and enum, review-provide across all four mode-sensitive branches plus explicit `workflow_mode` in its payload, pr-final artifact gate, spec-driven planner stop branch, discover route, progress and next routing tables, progress and next supported-mode statements and no-project entry-workflow listings, plan-writing consumer list, oat-docs approach guidance, capture and review-backlog entry routing, discover no-project branch, brainstorm fold-back handoff row and lite artifact-selection rule, autonomous new-goal selection, resume route, and report field, promote-spec-driven note, pr-progress requirement source, and both agent contracts). Do not touch plan-and-resume.md, completion-and-closeout.md, or the closeout branches of next and pr-final; those belong to p05-t03 and p05-t04. Bump each changed skill's and agent's `version:` once (patch for prose-only additions, minor for progress and next which gain a routing table).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write .agents/skills/oat-project-implement/references/phase-execution.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-discover/SKILL.md .agents/skills/oat-project-progress/SKILL.md .agents/skills/oat-project-next/SKILL.md .agents/skills/oat-brainstorm/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md .agents/skills/oat-project-promote-spec-driven/SKILL.md .agents/skills/oat-project-pr-progress/SKILL.md .agents/agents/oat-reviewer.md .agents/agents/oat-phase-implementer.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts .agents/skills/oat-docs/SKILL.md .agents/skills/oat-project-capture/SKILL.md .agents/skills/oat-pjm-review-backlog/SKILL.md`

**Step 4: Verify**

Run: `pnpm oat:validate-skills && git fetch origin main && pnpm run check:skill-bumps`
Expected: both green

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement .agents/skills/oat-project-plan-writing .agents/skills/oat-project-review-provide .agents/skills/oat-project-pr-final .agents/skills/oat-project-plan .agents/skills/oat-project-discover .agents/skills/oat-project-progress .agents/skills/oat-project-next .agents/skills/oat-brainstorm .agents/skills/oat-project-autonomous .agents/skills/oat-project-promote-spec-driven .agents/skills/oat-project-pr-progress .agents/skills/oat-docs .agents/skills/oat-project-capture .agents/skills/oat-pjm-review-backlog .agents/agents/oat-reviewer.md .agents/agents/oat-phase-implementer.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
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

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write .agents/skills/oat-project-import-plan/SKILL.md packages/cli/src/validation/skills.test.ts`

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

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write .agents/skills/oat-project-implement/references/plan-and-resume.md .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-implement/SKILL.md packages/cli/src/validation/skills.test.ts`

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
- Modify: `.agents/skills/oat-project-summary/SKILL.md` (lite branch: Overview and Key Decisions come from plan.md Summary, Decisions, Assumptions, Out of Scope, and Validation Criteria; shipped results from implementation.md; discovery/spec/design accepted as absent; version bump and pin update)
- Modify: `.agents/skills/oat-project-document/SKILL.md` (lite branch: requirements and design source is the five plan.md contract sections; do not read discovery.md unconditionally; accept absent spec/design beyond the existing quick carve-out; version bump and pin update)
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Authoritative lite closeout policy: the generic configured `workflow.postImplementSequence.preApproval` array (this repository sets `[summary, document, pr]`) is NOT a lite opt-in. For a lite project, completion-and-closeout.md deterministically transforms the configured snapshot to `[pr]`, and summary or document run only when the lite-specific key `workflow.postImplementSequence.lite.preApproval` explicitly lists them; `retro` is never added. Assert this with a contract test that feeds the repository's actual `[summary, document, pr]` configuration and expects the lite effective sequence `[pr]`, and a second case with `workflow.postImplementSequence.lite.preApproval: [summary, pr]` expecting `[summary, pr]`. Assert: the summary and document skills each carry a lite branch that names all five plan.md contract sections as the requirements source and implementation.md as the shipped-result source, and neither reads discovery.md unconditionally, so the lite opt-in path works when chosen. Assert: completion-and-closeout.md resolves the lite pre-approval sequence to `[pr]` with summary and document opt-in only when explicitly configured, and never adds retro; oat-project-next routes a lite project with a passed final review to `oat-project-pr-final` rather than `oat-project-summary`; pr-final Step 3.0 states that for lite it does not generate `summary.md` and synthesizes the PR body from plan.md Summary, Decisions, Validation Criteria, and implementation.md Final Summary, with the reduced-assurance note.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "lite collapses closeout"`
Expected: fail (RED)

**Step 2: Implement (GREEN)**

Add the five branches (closeout sequence, next, pr-final, summary, document). Keep the default sequence for every other mode byte-identical.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "lite collapses closeout"`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-next/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-summary/SKILL.md .agents/skills/oat-project-document/SKILL.md packages/cli/src/validation/skills.test.ts`

**Step 4: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: green

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-next/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-summary/SKILL.md .agents/skills/oat-project-document/SKILL.md packages/cli/src/validation/skills.test.ts
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
- Modify: `apps/oat-docs/index.md` (generated; regenerate with the command in Step 3, never hand-edit)
- Modify: `apps/oat-docs/docs/reference/cli-reference.md` (project command map gains `oat project promote <path> --to quick`: supported transition, refusal cases, and the `--json` status contract; `validate-plan` entry notes the lite single-phase rule)

**Step 1: Write test (RED)**

Not test-driven; markdownlint and the docs build are the checks.

**Step 2: Implement (GREEN)**

Add the lite entries. In AGENTS.md the option reads: "Lite workflow — batched interview → single plan.md with validation criteria → one approval → implement. Best for single-sitting changes: one component, one bug fix, one small refactor. → Use `oat-project-lite`." Heuristic line: "Single-sitting change with a clear outcome → Recommend lite."

**Step 3: Refactor and format**

Then regenerate the docs index (never format it): `pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`.

Format every file this task created or edited: `pnpm exec oxfmt --write AGENTS.md apps/oat-docs/docs/workflows/index.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/workflows/projects/pr-flow.md apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/workflows/skills/index.md apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/workflows/projects/reviews.md apps/oat-docs/docs/reference/cli-reference.md`

**Step 4: Verify**

Run: `pnpm check > gate-check.log 2>&1; echo "exit=$?"; pnpm build:docs > gate-docs.log 2>&1; echo "exit=$?"; git diff --quiet -- apps/oat-docs/index.md && echo "index stable"`
Expected: both `exit=0`, and the docs build's own index regeneration leaves no diff (`index stable`); confirm neither gate was a cache replay

**Step 5: Commit**

```bash
git add AGENTS.md apps/oat-docs/docs/workflows/index.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/workflows/projects/pr-flow.md apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/workflows/skills/index.md apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/workflows/projects/reviews.md apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/index.md
git commit -m "docs(p06-t01): document lite workflow mode"
```

---

### Task p06-t02: Manual lite run and sync of provider views

**Files:**

- Modify: `.oat/projects/shared/lite-workflow-mode/implementation.md` (record the run)
- Modify: `.claude/skills/oat-project-lite`, `.codex/agents/` (base roles plus every supported-catalogue `oat-reviewer-*` and `oat-phase-implementer-*` variant), `.cursor/agents/` (every supported-catalogue `oat-reviewer-*` and `oat-phase-implementer-*` variant), and `.oat/sync/manifest.json`, all regenerated by `oat sync --scope all`. The `.claude/agents/*.md` and base `.cursor/agents/*.md` entries are symlinks to the canonical agents and do not change. The variant files embed the full agent body, so they carry the three-mode `workflow_mode` line until regenerated; leaving them uncommitted would reintroduce the gap p05-t01 closes for any reviewer or implementer dispatched through a variant role.

**Step 1: Write test (RED)**

Not test-driven. This is the manual verification the testing strategy requires.

**Step 2: Implement (GREEN)**

Run `pnpm run cli -- sync --scope all` so the new skill appears in provider views. Then, in a scratch worktree or a throwaway branch, run `pnpm run cli -- project new lite-smoke --mode lite`, invoke `oat-project-lite` on a trivial change (for example, adding a one-line docs note), confirm the interview is one batched round, the approval gate fires once, the ceiling resolves, and `oat-project-implement` runs the single phase and final review. Continue through `oat-project-pr-final` far enough to generate the PR description artifact under the project's `pr/` directory, then decline external PR creation. Record that the route went from passed final review straight to pr-final, that no `summary.md` or documentation run was produced by default, and that the generated body was sourced from the lite plan's Summary, Decisions, Validation Criteria and the implementation.md Final Summary. Delete the smoke project afterwards.

**Step 3: Refactor and format**

Format every file this task created or edited: `pnpm exec oxfmt --write .oat/projects/shared/lite-workflow-mode/implementation.md`

**Step 4: Verify**

Record in implementation.md: the commands run, the number of user pauses observed, and any friction. Run `git status --porcelain` and confirm only intended sync outputs changed: every changed file under `.codex/agents` and `.cursor/agents` carries the `# oat-owner: supported-catalogue` header, and `grep -L lite` over the regenerated `oat-reviewer-*` variants returns nothing.

**Step 5: Commit**

```bash
git add .claude/skills/oat-project-lite .codex/agents .cursor/agents .oat/sync/manifest.json .oat/projects/shared/lite-workflow-mode/implementation.md
git commit -m "chore(p06-t02): sync provider views and record manual lite run"
```

---

### Task p06-t03: Lockstep version bump and release gates

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json` (if the release tooling requires it)
- Modify: `.agents/docs/autonomy-contract.md` (canonical target behind the skill reference; refresh the HEAD prompt-site coverage mappings for the intentional lite closeout wording)
- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts` (align the exact assertion with the non-lite-qualified contract)
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs` (align the section boundary with the non-lite-qualified recap heading)

**Step 1: Write test (RED)**

Run: `git fetch origin main && pnpm release:check-versions`
Expected: fails because versions equal `origin/main` (RED)

Preserve the reproduced contract RED evidence from the pre-commit terminal run:

- `packages/cli/src/validation/autonomy-gate-inventory.test.ts` rejects stale and unmapped prompt-site keys introduced by the intentional lite closeout wording.
- `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts` expects the pre-lite sentence without its new `For non-lite workflows only` qualification.
- `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs` searches for the old `**Implementation-Tail Project Recap:**` heading instead of the qualified `**Implementation-Tail Project Recap (non-lite only):**` heading.

**Step 2: Implement (GREEN)**

Bump all five lockstep packages to the next patch (from 0.2.54 unless main moved) and regenerate the lockfile if it references package versions. Then rerun `pnpm run cli -- sync --scope all` so `.oat/sync/manifest.json` and any managed outputs are restamped at the new CLI version, and confirm `pnpm run cli -- sync --scope all --dry-run` reports no operations and no version skew.

Repair only the three reproduced contract drifts without changing runtime behavior:

1. Refresh the `oat-project-implement` HEAD prompt-site coverage table from the inventory test's exact stale/unmapped report, mapping each reachable site to its existing gate ID and each non-gate site to `NG`; remove replaced stale keys.
2. Update the post-implement sequence assertion to include the contract's explicit non-lite qualification.
3. Update the explainer-kit completion test's section start marker to the qualified non-lite recap heading.

Run: `pnpm release:check-versions`
Expected: pass (GREEN)

**Step 3: Refactor and format**

Format every non-generated file this task created or edited: `pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json .agents/docs/autonomy-contract.md packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs` Do not format `pnpm-lock.yaml`, `.oat/sync/manifest.json`, or the sync-managed agent and skill views.

**Step 4: Verify**

This is the last task in the plan by design: p06-t02 has already regenerated provider views and recorded the manual run, and this task reruns sync after the bump, so the evidence below covers the branch's terminal tree. Run the full definition-of-done sequence in AGENTS.md order, capturing each exit code. `pnpm test` is gate 3 and includes the release tests; the forced Turbo run is supplemental evidence, not a substitute. If anything changes after this task, repeat the whole sequence before the final commit:

Before the full sequence, run the focused controls:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs
```

Expected: both focused commands exit 0, while reverting each assertion/mapping repair reproduces its categorical failure.

```bash
pnpm check > g1.log 2>&1; echo "check=$?"
pnpm type-check > g2.log 2>&1; echo "type=$?"
pnpm test > g3.log 2>&1; echo "test=$?"
# Supplemental evidence that gate 3 was not a cache replay (package test tasks only; test:release already ran inside pnpm test above):
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
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json pnpm-lock.yaml .oat/sync/manifest.json .codex/agents .cursor/agents .claude/skills/oat-project-lite .agents/docs/autonomy-contract.md packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs
git commit -m "chore(p06-t03): bump lockstep package versions for lite mode"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status   | Date       | Artifact                                                                        | Reviewed Head                            | Invocation | Gate Target                   |
| ------ | -------- | -------- | ---------- | ------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------------------- |
| p01    | code     | passed   | 2026-09-05 | reviews/code-p01-review-2026-09-05T204609Z.md                                   | 3427d2176a86b3f6a95219f6557b4d4798a6f1a2 | manual     | -                             |
| p02    | code     | passed   | 2026-09-05 | reviews/code-p02-review-2026-09-05T210504Z.md                                   | 948434796085b5c537542213fd562194827a822c | manual     | -                             |
| p03    | code     | passed   | 2026-09-05 | reviews/code-p03-review-2026-09-05T210747Z.md                                   | 4b1eb65a41ffe179793cd9eca7e7f3d963ec6766 | manual     | -                             |
| p04    | code     | passed   | 2026-09-05 | reviews/code-p04-review-2026-09-05T223510Z.md                                   | 3e89f14de30836512bb5aa16e46b7a68323503bd | manual     | -                             |
| p05    | code     | passed   | 2026-09-05 | reviews/p05-review-2026-09-05T231617Z.md                                        | c11a1150239dc179c60b0b82defc9c350999955d | manual     | -                             |
| p06    | code     | received | 2026-09-06 | reviews/p06-review-2026-09-06T005620Z.md                                        | cfcaae8fd81da49b1f75862be2260a65eec2c5e7 | manual     | -                             |
| final  | code     | pending  | -          | -                                                                               | -                                        | -          | -                             |
| spec   | artifact | pending  | -          | -                                                                               | -                                        | -          | -                             |
| design | artifact | pending  | -          | -                                                                               | -                                        | -          | -                             |
| plan   | artifact | received | 2026-09-04 | reviews/archived/artifact-plan-review-2026-09-04T231105Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T141656Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T150544Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T151613Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T152744Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T181952Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T185313Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T190345Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T195731Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T200630Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | received | 2026-09-05 | reviews/archived/artifact-plan-review-2026-09-05T201454Z.md                     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan   | artifact | passed   | 2026-09-06 | dispatch/lite-plan-revision-rereview1-60cc80ff-7013-4da9-a678-45e17246b821.json | -                                        | auto       | oat-reviewer-gpt-5-6-sol-high |

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

**Plan artifact review disposition (2026-09-05):** the structured `oat-reviewer` loop ran three attempts (bound 2) and the configured cross-family gate (`cursor-gpt-5-6-sol-xhigh`, threshold important) ran six times; every finding from all runs was resolved in this plan and `design.md` and is archived under `reviews/archived/`. The gate never returned clean: each run surfaced new mode-aware surfaces rather than regressions. The user explicitly overrode the exhausted gate budget on 2026-09-05, first directing completion after the sixth review, then choosing to keep running until a round returned zero Important findings. Eleven gate rounds ran in total (Important counts 5, 4, 2, 2, 3, 1, 1, 1, 2, 2, 2); every finding was applied and is recorded in implementation.md. On 2026-09-05 the user directed a stop after round eleven and handoff to implementation, accepting that further mode-aware misses will be caught by per-phase root reviews and the final code review. The `plan` artifact rows therefore remain `received`, not `passed`. Residual risk: further mode-aware misses are expected to surface during implementation and are to be handled by per-phase root reviews and the final review, which run regardless.

**Bounded p06-t03 revision review (2026-09-06):** managed-high structured
review attempt 1 found one Important canonical-path ownership defect. The plan
was corrected to name, format, and stage `.agents/docs/autonomy-contract.md`;
fresh attempt 2 passed with no findings. The earlier historical plan-review
rows remain unchanged.

---

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks - single mode definition, plan-lite template and bundle inventory, lite scaffold, help snapshot
- Phase 2: 3 tasks - recommender and dashboard routing, lite closeout route
- Phase 3: 3 tasks - split-detector guard, promote command, lite single-phase validator
- Phase 4: 2 tasks - oat-project-lite skill, end-to-end integration test
- Phase 5: 4 tasks - mode-aware skill branches, import-to-lite offer, checkpoint bypass, collapsed closeout
- Phase 6: 3 tasks - docs and triage, manual run and sync, lockstep bump and gates (last)

**Total:** 19 tasks across 6 phases

**Definition of done:** every gate in AGENTS.md exits 0 with evidence captured; the manual lite run is recorded in implementation.md.

---

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Backlog companion: `.oat/repo/pjm/backlog/items/BL-260904-make-quick-the-default-oat.md`
- Plan-writing contract: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Quick-start (reference for lite skill structure): `.agents/skills/oat-project-quick-start/SKILL.md`
- Warp factory spec-agent prompt (external reference shared during brainstorming; not vendored)
