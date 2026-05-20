---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-20
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p02', 'p04']
oat_plan_parallel_groups: [['p02', 'p03']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: oat-project-split

> Execute this plan using `oat-project-implement`. Phases p02 and p03 run in parallel (disjoint write sets); p04 and p05 are sequential after.

**Goal:** Ship a standalone `oat-project-split` skill that decomposes a single discovery/brainstorm into N coordinated child projects with a coordination-only parent — invoked from both `oat-project-discover` and `oat-brainstorm`.

**Architecture:** Standalone skill owns split mechanics end-to-end; existing skills carry thin detect/handoff hooks. Coordination parent is a `oat_kind: coordination` project record with no executable-phase files, marked `decomposition + complete` in place (never relocated). See `design.md` for full architecture.

**Tech Stack:** TypeScript (`packages/cli/src/`), vitest for unit tests, OAT skill prose (Markdown SKILL.md files).

**Commit Convention:** `{type}(p0X-t0Y): {description}` — e.g., `feat(p01-t03): add signal evaluator`.

## Planning Checklist

- [ ] Confirmed HiLL checkpoints with user (`p02`, `p04`)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

**Declared groups:** `[['p02', 'p03']]`.

**Reasoning.** After p01 lands the pure-logic foundation, p02 (the split skill) and p03 (listings/dashboard filter) have **disjoint write boundaries** and independent verification:

- p02 writes only inside `.agents/skills/oat-project-split/` (new files) and possibly small adapters in `packages/cli/src/projects/split/` (new files).
- p03 writes inside `packages/cli/src/projects/list/` and `packages/cli/src/state/dashboard/` (existing files; modifications).

p02's tests are skill + integration fixtures; p03's tests are CLI unit tests. Neither phase depends on the other's output for verification.

**Why not other groups.**

- p04 cannot run in parallel with p02: the detection/handoff hooks in `oat-project-discover` and `oat-brainstorm` must delegate to a skill that _exists_, so p02 must complete first.
- p05 cannot run in parallel with p02–p04: dogfood scenarios need the whole feature wired end-to-end, and the `bl-3a4a` reconciliation references the shipped behavior.

**Why not fully sequential.** p02 is the longest phase; running p03 in parallel cuts wall time without coordination cost (no shared files).

---

## Phase 1: Schema & pure-logic foundation

Pure TypeScript primitives and OAT template additions. No skill changes yet. All five tasks unblock both p02 and p03.

### Task p01-t01: Add `oat_kind` + `decomposition` phase to OAT state schema

**Files:**

- Modify: `.oat/templates/state.md` (add `oat_kind` field, default `implementation`; document `decomposition` as valid `oat_phase` value)
- Modify: `packages/cli/src/commands/shared/frontmatter.ts` (frontmatter parsing — recognize `oat_kind` and the `decomposition` phase value)
- Modify: `packages/cli/src/commands/project/complete-state/state-utils.ts` (state-update helper — accept the new phase value and cross-validate against `oat_kind`)

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/shared/frontmatter.test.ts
//   + packages/cli/src/commands/project/complete-state/state-utils.test.ts
describe('state frontmatter — coordination additions', () => {
  it('accepts oat_kind: coordination on a project state', () => {
    /* … */
  });
  it('accepts oat_phase: decomposition only when oat_kind == coordination', () => {
    /* … */
  });
  it('rejects oat_phase: decomposition on an implementation project', () => {
    /* … */
  });
  it('defaults oat_kind to implementation when absent', () => {
    /* … */
  });
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/frontmatter.test.ts src/commands/project/complete-state/state-utils.test.ts`
Expected: Tests fail (RED).

**Step 2: Implement (GREEN)** — Add `oat_kind` recognition (`"coordination" | "implementation"`, default `"implementation"`) to the frontmatter parser; extend the accepted `oat_phase` values to include `"decomposition"`; add cross-field validation in the state-utils helper that `decomposition` requires `oat_kind == "coordination"`.

Run the same vitest command. Expected: GREEN.

**Step 3: Refactor** — Move the cross-field validator into a single helper if duplicated.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add .oat/templates/state.md packages/cli/src/commands/shared/frontmatter.ts packages/cli/src/commands/shared/frontmatter.test.ts packages/cli/src/commands/project/complete-state/state-utils.ts packages/cli/src/commands/project/complete-state/state-utils.test.ts
git commit -m "feat(p01-t01): add oat_kind and decomposition phase to OAT state frontmatter"
```

---

### Task p01-t02: Add parent/sibling/depends-on + inherited-revalidated fields

**Files:**

- Modify: `.oat/templates/state.md` (add `oat_parent`, `oat_siblings`, `oat_depends_on`, `oat_children` — all optional in the template)
- Modify: `packages/cli/src/commands/shared/frontmatter.ts` (frontmatter parsing — recognize the new optional fields, including `oat_inherited_context_revalidated`)
- Modify: `packages/cli/src/commands/project/complete-state/state-utils.ts` (validation: parent must exist with `oat_kind: coordination`; siblings DAG; reject `oat_status: complete` on a child discovery while `oat_inherited_context_revalidated == false`)

**NOT** modified: `.oat/templates/discovery.md` — the `oat_inherited_context_revalidated` flag is **not** added to the shared discovery template. It is written **only by the split child seeder** (`p02-t03`) onto split-created child discoveries. The TS validation activates only when the field is present (i.e., when `oat_parent` is set), keeping ordinary single-project discovery untouched.

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/project/complete-state/state-utils.test.ts (additions)
describe('child linkage validation', () => {
  it('rejects oat_parent pointing to a non-coordination project', () => {
    /* … */
  });
  it('rejects oat_depends_on slugs not in oat_siblings', () => {
    /* … */
  });
  it('rejects cycles across siblings depends_on', () => {
    /* … */
  });
  it('rejects child discovery oat_status: complete while oat_inherited_context_revalidated is false', () => {
    /* … */
  });
  it('does NOT enforce the revalidated flag when oat_parent is absent (ordinary discovery untouched)', () => {
    /* … */
  });
});
```

Expected: RED.

**Step 2: Implement (GREEN)** — Add the new optional fields to `.oat/templates/state.md` and to the frontmatter parser; add the linkage and revalidation validation rules to state-utils per Data Models in `design.md`. **Do not modify `.oat/templates/discovery.md`.**

**Step 3 / 4 / 5:** Refactor as needed; `pnpm lint && pnpm type-check`; commit as `feat(p01-t02): add parent/sibling/depends-on + inherited-revalidated fields`.

---

### Task p01-t03: Signal evaluator module + unit tests

**Files:**

- Create: `packages/cli/src/projects/split/signals.ts`
- Create: `packages/cli/src/projects/split/__tests__/signals.test.ts`

**Step 1: Write test (RED)**

```typescript
import { evaluateSignals } from '../signals';

describe('evaluateSignals', () => {
  it('returns confidence "below" with zero signals fired', () => {
    expect(evaluateSignals({ fired: [] }).confidence).toBe('below');
  });
  it('returns confidence "high" when both load-bearing signals fire', () => {
    expect(
      evaluateSignals({
        fired: ['independently-shippable', 'no-shared-design-surface'],
      }).confidence,
    ).toBe('high');
  });
  it('returns confidence "soft" when 2+ fire without both load-bearing', () => {
    expect(
      evaluateSignals({ fired: ['expect-separate-prs', 'distinct-subsystems'] })
        .confidence,
    ).toBe('soft');
  });
  it('triggered === (fired.length >= 2)', () => {
    /* … */
  });
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/projects/split/__tests__/signals.test.ts`
Expected: RED.

**Step 2: Implement (GREEN)**

```typescript
// packages/cli/src/projects/split/signals.ts
export type Signal =
  | 'independently-shippable' // load-bearing
  | 'no-shared-design-surface' // load-bearing
  | 'expect-separate-prs'
  | 'distinct-subsystems';

export interface SignalEvaluation {
  fired: Signal[];
  triggered: boolean;
  confidence: 'high' | 'soft' | 'below';
}

const LOAD_BEARING: ReadonlySet<Signal> = new Set([
  'independently-shippable',
  'no-shared-design-surface',
]);

export function evaluateSignals(input: { fired: Signal[] }): SignalEvaluation {
  /* … */
}
```

Expected: GREEN.

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p01-t03): add signal evaluator with confidence tiers`.

---

### Task p01-t04: `ChildPlan` normalization module + unit tests

**Files:**

- Create: `packages/cli/src/projects/split/child-plan.ts`
- Create: `packages/cli/src/projects/split/__tests__/child-plan.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('normalizeChildPlan', () => {
  it('normalizes declared SplitPayload into a ChildPlan with foundationChild slug', () => {
    /* … */
  });
  it('normalizes detected-convergence SplitPayload (no declaredChildren) using priorDiscovery', () => {
    /* … */
  });
  it('produces equivalent ChildPlan for all four origins given equivalent inputs', () => {
    /* … */
  });
  it('resolves initialActiveChild to foundationChild when present', () => {
    /* … */
  });
  it('orders children by oat_depends_on DAG, foundation first', () => {
    /* … */
  });
});
```

Expected: RED.

**Step 2: Implement (GREEN)** — Define `SplitPayload` and `ChildPlan` interfaces per design Component 1; implement `normalizeChildPlan(payload: SplitPayload): ChildPlan` with the three input-source branches collapsing to one output.

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p01-t04): add ChildPlan normalization for all SplitPayload origins`.

---

### Task p01-t05: DAG validator + slug-collision detector + unit tests

**Files:**

- Create: `packages/cli/src/projects/split/validation.ts`
- Create: `packages/cli/src/projects/split/__tests__/validation.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('validateChildPlan', () => {
  it('detects slug collisions against existing projects', () => {
    /* … */
  });
  it('detects parent-slug collision with a child slug', () => {
    /* … */
  });
  it('detects cycles in cross-child depends_on (direct, transitive, longer)', () => {
    /* … */
  });
  it('rejects depends_on edges to non-sibling slugs', () => {
    /* … */
  });
  it('rejects foundationChild / initialActiveChild not in children', () => {
    /* … */
  });
  it('accepts a well-formed ChildPlan', () => {
    /* … */
  });
});
```

Expected: RED.

**Step 2: Implement (GREEN)** — `validateChildPlan(plan: ChildPlan, existingSlugs: Set<string>): ValidationResult` returning `{ ok: true } | { ok: false, errors: ValidationError[] }`. Use a topological sort for cycle detection.

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p01-t05): add DAG validation and slug collision detection for ChildPlan`.

---

### Task p01-t06: Expose split primitives via `oat project split` CLI subcommands

**Files:**

- Create: `packages/cli/src/commands/project/split/index.ts` (top-level subcommand wiring)
- Create: `packages/cli/src/commands/project/split/evaluate-signals.ts`
- Create: `packages/cli/src/commands/project/split/validate-plan.ts`
- Create: `packages/cli/src/commands/project/split/run.ts` (orchestrates the end-to-end split given a `ChildPlan`)
- Create: `packages/cli/src/commands/project/split/__tests__/{index,evaluate-signals,validate-plan,run}.test.ts`

These are thin adapters that expose the Phase 1 pure-logic modules (`signals.ts`, `child-plan.ts`, `validation.ts`) as CLI subcommands. The `oat-project-split` skill (Phase 2) and the integration hooks in `oat-project-discover` / `oat-brainstorm` (Phase 4) invoke these subcommands rather than calling TS directly — Markdown skills run in the LLM context and can only call CLI surfaces.

**Subcommand contract:**

- `oat project split evaluate-signals --fired <comma-list>` → emits JSON `{ fired, triggered, confidence }`. Used by `oat-project-discover`'s mid-stream and convergence hooks.
- `oat project split validate-plan --plan-file <path>` → emits JSON validation result (or non-zero exit on failure). Used at the pre-write checkpoint.
- `oat project split run --plan-file <path> [--non-interactive]` → executes the full split flow (parent write, child seed, parent completion, active-child selection, dashboard refresh). Used by the split skill itself.

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/project/split/__tests__/evaluate-signals.test.ts
describe('oat project split evaluate-signals', () => {
  it('emits JSON with confidence: high when both load-bearing signals fire', () => {
    /* spawn CLI, parse stdout JSON */
  });
  it('exits non-zero on invalid signal names', () => {
    /* … */
  });
});

// packages/cli/src/commands/project/split/__tests__/validate-plan.test.ts
describe('oat project split validate-plan', () => {
  it('returns ok: true for a well-formed ChildPlan', () => {
    /* … */
  });
  it('returns errors[] for cycles in oat_depends_on', () => {
    /* … */
  });
});

// packages/cli/src/commands/project/split/__tests__/run.test.ts
describe('oat project split run', () => {
  it('produces parent + N children + activates initial child for a valid plan', () => {
    /* … */
  });
  it('fails fast in --non-interactive mode when payload origin is detected', () => {
    /* … */
  });
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/split/`
Expected: RED.

**Step 2: Implement (GREEN)** — Wire the subcommand handlers as thin adapters over `signals.ts`, `child-plan.ts`, `validation.ts`, `write-parent.ts`, `seed-children.ts`, `finalize.ts`, and `resume.ts`. JSON output for `evaluate-signals` and `validate-plan` is the stable contract Markdown skills consume.

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p01-t06): expose split primitives via oat project split CLI subcommands`.

---

## Phase 2: `oat-project-split` skill

Implements the standalone skill plus the underlying step-by-step library functions. The skill is a Markdown skill; it orchestrates via the `oat project split run` CLI command introduced in `p01-t06`, which internally invokes the functions implemented in `p02-t02`–`p02-t05`. The skill never calls TS directly. **HiLL checkpoint fires after this phase merges back from the p02/p03 parallel group.**

### Task p02-t01: Create `oat-project-split` SKILL.md skeleton

**Files:**

- Create: `.agents/skills/oat-project-split/SKILL.md`

**Step 1: Write test (RED)**

Skills are validated by `pnpm oat:validate-skills`. Add a fixture assertion that the new skill is discoverable and has required frontmatter (name, description, version, allowed-tools).

```bash
pnpm oat:validate-skills
```

Expected: a missing-skill or missing-section failure that pins the new skill's requirements.

**Step 2: Implement (GREEN)** — Write the SKILL.md skeleton with required frontmatter (`name`, `description`, `version: 1.0.0`, `allowed-tools`), mode-assertion section, progress-indicator banner, and a placeholder Process section listing the steps (parent write, child seed, completion, activation). Bodies for each step land in later tasks.

```bash
pnpm oat:validate-skills
```

Expected: validation passes.

**Step 3 / 4 / 5:** Run `oat sync --scope project` to refresh provider views; commit as `feat(p02-t01): scaffold oat-project-split SKILL.md skeleton`.

---

### Task p02-t02: Coordination parent writer (scaffold + normalize)

**Files:**

- Modify: `.agents/skills/oat-project-split/SKILL.md` (Process Step: "Write coordination parent")
- Create: `packages/cli/src/projects/split/write-parent.ts`
- Create: `packages/cli/src/projects/split/__tests__/write-parent.test.ts`

**Step 1: Write test (RED)** — Fixture test: invoke `writeCoordinationParent(plan, ctx)` against a temp `.oat/projects/<scope>/` directory; assert the parent dir contains `discovery.md` + `state.md` only, with `oat_kind: coordination`, populated `oat_children`, and an integration-sketch section in `discovery.md`. Crucially, **assert `spec.md` / `design.md` / `plan.md` / `implementation.md` are absent**.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/projects/split/__tests__/write-parent.test.ts
```

Expected: RED.

**Step 2: Implement (GREEN)** — Implement `writeCoordinationParent(plan, ctx)`:

1. Call `oat project new <parentSlug> --mode quick` (existing CLI).
2. Re-flag the scaffolded `state.md`: set `oat_kind: coordination`, `oat_workflow_mode: quick`, populate `oat_children` from `plan.children[].slug` in `plan.children[].order`.
3. Delete `spec.md` (if present), `design.md` (if present), `plan.md`, `implementation.md`.
4. Populate the parent's `discovery.md` with broad context + integration-sketch section (if `plan.integrationSketch`).

Expected: GREEN.

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p02-t02): implement coordination parent writer with file invariant`.

---

### Task p02-t03: Child scaffolder + seeder

**Files:**

- Modify: `.agents/skills/oat-project-split/SKILL.md` (Process Step: "Scaffold + seed children")
- Create: `packages/cli/src/projects/split/seed-children.ts`
- Create: `packages/cli/src/projects/split/__tests__/seed-children.test.ts`

**Step 1: Write test (RED)** — For each child in a fixture plan, assert the child directory exists; `state.md` has `oat_parent`, `oat_siblings`, `oat_depends_on`; `discovery.md` contains all seven seeded sections in order and `oat_inherited_context_revalidated: false`.

Expected: RED.

**Step 2: Implement (GREEN)** — `seedChildren(plan, ctx)`:

1. For each child in plan order: `oat project new <child.slug>`.
2. **Write the seeded `discovery.md` from scratch.** Do **not** copy from `.oat/templates/discovery.md` — that template is for ordinary single-project discoveries and stays unchanged. The seeded body has the 7 sections (Origin, Inherited Context, Child Scope, Known Dependencies, Assumptions To Revalidate, Likely Workflow Mode, Sibling Projects); the frontmatter includes `oat_inherited_context_revalidated: false` (this field exists **only** on seeded child discoveries — it is what marks a discovery as split-created).
3. Update child `state.md` frontmatter: `oat_parent`, `oat_siblings`, `oat_depends_on`.

Expected: GREEN.

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p02-t03): implement child scaffolder and seeder`.

---

### Task p02-t04: Parent completion + active-child selection

**Files:**

- Modify: `.agents/skills/oat-project-split/SKILL.md` (Process Steps: "Mark parent terminal" + "Select active child")
- Create: `packages/cli/src/projects/split/finalize.ts`
- Create: `packages/cli/src/projects/split/__tests__/finalize.test.ts`

**Step 1: Write test (RED)** — Assert parent transitions `oat_phase: discovery → decomposition`, `oat_phase_status: in_progress → complete`; assert `activeProject` is set to `plan.initialActiveChild`.

Expected: RED.

**Step 2: Implement (GREEN)** — `finalizeSplit(plan, ctx)`: update parent `state.md` to terminal; call `oat config set activeProject <plan.initialActiveChild>`.

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p02-t04): finalize split — parent terminal + active child selection`.

---

### Task p02-t05: Resume mode (partial-state detection + reconstruction)

**Files:**

- Modify: `.agents/skills/oat-project-split/SKILL.md` (Process Step: "Resume from partial state")
- Create: `packages/cli/src/projects/split/resume.ts`
- Create: `packages/cli/src/projects/split/__tests__/resume.test.ts`

**Step 1: Write test (RED)** — Fixture: parent created with `oat_kind: coordination`, `oat_phase: decomposition`, `oat_phase_status: in_progress`, `oat_children: ['a', 'b', 'c']`, but only `a/` and `b/` exist on disk. Assert `detectPartialSplit(<parent-path>)` returns the reconstructed `ChildPlan` with `c` missing; assert `resumeSplit` completes `c` and finalizes the parent. Also test: re-invocation on a completed parent (`status: complete`) is a User Error, not resume.

Expected: RED.

**Step 2: Implement (GREEN)** — `detectPartialSplit` reads parent + scans `oat_children` against disk; `resumeSplit` runs `seedChildren` for missing slugs and then `finalizeSplit`. Surface the reconstructed plan to the user before any writes (per design: "user must approve the recovered plan").

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p02-t05): implement resume mode for partial splits`.

---

### Task p02-t06: Integration test suite (fixture-based)

**Files:**

- Create: `packages/cli/src/projects/split/__tests__/integration/*.test.ts`

**Step 1: Write tests (RED)** — Mirror the Integration Tests Key Test Cases in `design.md`:

1. Declared happy path (3 children, foundation child).
2. **Coordination-parent file invariant** — asserted in every case that produces a parent.
3. Detected mid-stream (skill-simulation via transcript fixture).
4. Detected at convergence (high/soft confidence wording).
5. Brainstorm picker option.
6. Resume mode (covered partly in p02-t05; this round runs the full skill end-to-end).
7. Non-interactive detected (`OAT_NON_INTERACTIVE=1`, `## Detected Split Recommendation` section, non-zero exit).
8. Re-invocation on completed parent (User Error).
9. Post-manual-mutation validation.

Expected: RED for any case not already passing from the unit-level tests.

**Step 2: Implement (GREEN)** — Wire up any missing skill-level glue so the end-to-end cases pass.

**Step 3 / 4 / 5:** `pnpm lint && pnpm type-check`; commit as `test(p02-t06): integration suite for oat-project-split`.

---

## Phase 3: Listings & dashboard filter

Parallel to Phase 2. Touches only `oat project list` and dashboard generator — no overlap with split-skill files.

### Task p03-t01: `oat project list` filter + `--include-coordination` flag

**Files:**

- Modify: `packages/cli/src/commands/project/list.ts`
- Modify: `packages/cli/src/commands/project/list.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('oat project list', () => {
  it('hides coordination parents in decomposition+complete state by default', () => {
    /* … */
  });
  it('shows them when --include-coordination is passed', () => {
    /* … */
  });
  it('shows coordination parents still in decomposition+in_progress state by default', () => {
    /* … */
  });
});
```

Expected: RED.

**Step 2: Implement (GREEN)** — Filter the candidate list by `!(oat_kind == "coordination" && oat_phase == "decomposition" && oat_phase_status == "complete")` unless `--include-coordination` is set.

Verification: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/list.test.ts`

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p03-t01): filter coordination parents from default project list`.

---

### Task p03-t02: Dashboard `## Decompositions` section

**Files:**

- Modify: `packages/cli/src/commands/state/generate.ts`
- Modify: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Write test (RED)** — Snapshot-style assertion that a fixture with one coordination parent + three children produces a dashboard with both a `## Active projects` section (children only) and a `## Decompositions` section (parent listed there).

Expected: RED.

**Step 2: Implement (GREEN)** — Add a section grouping pass: coordination + terminal projects go to `## Decompositions`; everything else stays in `## Active projects`.

Verification: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state/generate.test.ts`

**Step 3 / 4 / 5:** Refactor; `pnpm lint && pnpm type-check`; commit as `feat(p03-t02): add Decompositions section to dashboard generator`.

---

### Task p03-t03: List + dashboard end-to-end test

**Files:**

- Create: `packages/cli/src/projects/list/__tests__/integration.test.ts`

**Step 1: Write test (RED)** — Fixture repo with a synthetic coordination parent + children; run `oat project list` and `oat state refresh`; assert (a) default `list` output omits the parent, (b) `--include-coordination` includes it, (c) the regenerated `.oat/state.md` contains a `## Decompositions` section listing the parent.

Expected: RED.

**Step 2: Implement (GREEN)** — Should pass with p03-t01 and p03-t02; this task primarily proves end-to-end wiring.

**Step 3 / 4 / 5:** `pnpm lint && pnpm type-check`; commit as `test(p03-t03): end-to-end list and dashboard filter test`.

---

## Phase 4: Integration hooks (discover + brainstorm)

Sequential after the p02/p03 parallel group merges. **HiLL checkpoint fires after this phase.**

### Task p04-t01: Detection hook in `oat-project-discover`

**Files:**

- Modify: `.agents/skills/oat-project-discover/SKILL.md` (add: mid-stream signal evaluation step inside solution-space exploration; always-visible end-of-discovery scope-check confirmation; non-interactive fail-fast that writes `## Detected Split Recommendation` and exits non-zero)

**Step 1: Write test (RED)** — Skill-simulation/transcript-fixture test:

- Synthetic discover transcript that triggers signals 1 + 2 → assert the offer surfaces with high-confidence wording.
- Transcript that triggers only 3 + 4 → soft wording.
- Transcript that triggers 0 or 1 signals → no offer.
- Non-interactive run (`OAT_NON_INTERACTIVE=1`) that triggers detection → no offer prompt; `## Detected Split Recommendation` appears in the active `discovery.md`; exit code non-zero.

Expected: RED for the SKILL.md prose not yet covering all branches.

**Step 2: Implement (GREEN)** — Add prose + bash invocations into `oat-project-discover/SKILL.md`. The skill calls the signal evaluator via the CLI surface introduced in `p01-t06`:

```bash
pnpm run cli -- project split evaluate-signals --fired "<comma-list>"
```

It parses the JSON output (`{ fired, triggered, confidence }`) and shapes the prompt — high-confidence wording when `confidence == "high"`, soft wording when `confidence == "soft"`, no prompt when `confidence == "below"`. Convergence and non-interactive branches use the same CLI; non-interactive writes a `## Detected Split Recommendation` section and exits non-zero.

**Step 3: Refactor** — Bump the SKILL.md `version:` per `AGENTS.md`.

**Step 4: Verify** — Run `pnpm oat:validate-skills` and the skill-simulation tests.

**Step 5: Commit** — `feat(p04-t01): add multi-project detection hook to oat-project-discover`.

---

### Task p04-t02: Declared-mode + boundary question in `oat-brainstorm`

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (declared-mode activation, umbrella framing from turn 1, boundary question "do you already know the children, or should we decompose together?")

**Step 1: Write test (RED)** — Transcript fixture: brainstorm opens with a declared multi-project intent → skill enters umbrella framing, asks the boundary question, and ultimately invokes `oat-project-split` with `origin: "declared"`.

Expected: RED.

**Step 2: Implement (GREEN)** — Add the declared-mode branch to `oat-brainstorm/SKILL.md`. Confirm the activation contract still routes ambiguous exploratory phrasing through the soft path.

**Step 3:** Bump SKILL.md `version:`.

**Step 4:** `pnpm oat:validate-skills` + transcript tests.

**Step 5:** Commit as `feat(p04-t02): add declared-mode handoff to oat-brainstorm`.

---

### Task p04-t03: Conditional "Promote to N projects" picker option in `oat-brainstorm`

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (handoff Step 9 — add new destination case alongside existing 9a–9j)

**Step 1: Write test (RED)** — Transcript fixture: brainstorm convergence with accumulated scope that triggers signals ≥2 → destination picker includes "Promote to N projects" as an option; selection invokes `oat-project-split` with `origin: "brainstorm-picker"`. A scope-small convergence does _not_ show the option.

Expected: RED.

**Step 2: Implement (GREEN)** — Add the conditional picker case. Reuse the signal evaluator (p01-t03) for the "scope is large" decision.

**Step 3:** Bump SKILL.md `version:`.

**Step 4:** `pnpm oat:validate-skills`.

**Step 5:** Commit as `feat(p04-t03): add conditional N-projects picker option to oat-brainstorm`.

---

### Task p04-t04: Skill-simulation integration tests for the hooks

**Files:**

- Create: `packages/cli/src/__tests__/skills/discover-detection.test.ts`
- Create: `packages/cli/src/__tests__/skills/brainstorm-handoff.test.ts`

**Step 1: Write tests (RED)** — Consolidate the transcript fixtures into a maintained suite. Each test feeds a transcript through the signal evaluator + stubbed AskUserQuestion responses, asserts the resulting `SplitPayload`, and (optionally) the resulting project tree after delegation to the split skill.

Expected: RED for anything not yet covered.

**Step 2: Implement (GREEN)** — Wire the skill-simulation harness if needed.

**Step 3 / 4 / 5:** `pnpm lint && pnpm type-check`; commit as `test(p04-t04): skill-simulation integration suite for detection and brainstorm handoff`.

---

## Phase 5: Reconcile + dogfood + ship

Sequential, final phase. Dogfood scenarios validate the lived experience; `bl-3a4a` is reconciled; versions bumped.

### Task p05-t01: Reconcile `bl-3a4a` backlog item

**Files:**

- Modify: `.oat/repo/reference/backlog/items/sub-project-split-escape-hatch.md`
- Possibly: `.oat/repo/reference/backlog/index.md` (if status changes)
- Possibly: `.oat/repo/reference/backlog/completed.md` (when this project ships)

**Step 1: Decision step** — Choose between (a) updating `bl-3a4a` in place to reflect the settled design (parent never executable, mark-not-move archival, three trigger surfaces) or (b) marking it superseded by this project. Recommended: **update in place**, since the item already documented prior brainstorm decisions and updating preserves traceability.

**Step 2: Implement** — Apply the chosen edit. Either way: remove the Archive Recovery section; rewrite the Settled Product Direction to match `design.md`; update Acceptance Criteria to match `design.md` Testing Strategy.

**Step 3:** Run `pnpm oat:backlog:rebuild` (or equivalent — confirm command) to regenerate index.

**Step 4:** `pnpm lint`.

**Step 5:** Commit as `docs(p05-t01): reconcile bl-3a4a with settled oat-project-split design`.

---

### Task p05-t02: Dogfood — declared path

**Files:**

- Create: `.oat/projects/shared/<dogfood-declared-slug>/...` (a real ephemeral project; expected to be archived or deleted after dogfood)
- Create: `.oat/projects/shared/oat-project-split/dogfood/declared.md` (capture results)

**Step 1:** Pick a real candidate decomposition (e.g., a multi-subsystem backlog item suited for a declared split).

**Step 2:** Run a real brainstorm session declaring multi-project intent at turn 1. Verify: umbrella framing fires; boundary question is asked; `oat-project-split` is invoked with `origin: "declared"`; the resulting project tree matches design (coordination parent + N children, file invariant holds, active child selected by ordering rule).

**Step 3:** Document outcome (any prose/wording rough edges; any UX issues) in `dogfood/declared.md`. File issues for any followups.

**Step 4:** Commit as `test(p05-t02): dogfood declared-path scenario`.

---

### Task p05-t03: Dogfood — detected path

**Files:**

- Create: `.oat/projects/shared/oat-project-split/dogfood/detected.md`

**Step 1 / 2 / 3:** Open a real `oat-project-discover` session on a candidate request that should trigger ≥2 signals during solution-space exploration. Verify: mid-stream offer surfaces; end-of-discovery scope-check confirmation always appears; delegation to `oat-project-split` produces the expected tree.

**Step 4:** Commit as `test(p05-t03): dogfood detected-path scenario`.

---

### Task p05-t04: Dogfood — resume

**Files:**

- Create: `.oat/projects/shared/oat-project-split/dogfood/resume.md`

**Step 1 / 2 / 3:** Deliberately interrupt a split midway (abort during child seeding). Re-invoke `oat-project-split` on the same parent. Verify: partial state detected; reconstructed `ChildPlan` surfaced; user-confirmed resume completes cleanly; parent reaches `decomposition + complete`.

**Step 4:** Commit as `test(p05-t04): dogfood resume scenario`.

---

### Task p05-t05: SKILL versions + lockstep public package bumps

**Files:**

- Modify: `.agents/skills/oat-project-split/SKILL.md` (`version`)
- Modify: `.agents/skills/oat-project-discover/SKILL.md` (`version` — bumped in p04-t01; confirm bump is present in final diff)
- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (`version` — bumped in p04-t02 / p04-t03)
- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (lockstep version bump per AGENTS.md)

**Step 1:** Confirm each shipped SKILL.md carries a `version:` bump for the changes landed on this branch.

**Step 2:** Apply the lockstep public-package version bump to all five packages.

**Step 3:** Run `pnpm release:validate` (Definition of Done per AGENTS.md for publishable-package changes).

**Step 4:** `pnpm lint && pnpm type-check && pnpm test`.

**Step 5:** Commit as `chore(p05-t05): bump skill versions and lockstep public package versions`.

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                            |
| ------ | -------- | --------------- | ---------- | --------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                   |
| p02    | code     | pending         | -          | -                                                   |
| p03    | code     | pending         | -          | -                                                   |
| p04    | code     | pending         | -          | -                                                   |
| p05    | code     | pending         | -          | -                                                   |
| final  | code     | pending         | -          | -                                                   |
| plan   | artifact | fixes_completed | 2026-05-20 | reviews/archived/artifact-plan-review-2026-05-20.md |
| design | artifact | pending         | -          | -                                                   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks — schema additions, pure-logic foundation (signal evaluator, ChildPlan normalization, DAG/collision validation), and CLI exposure via `oat project split`
- Phase 2: 6 tasks — `oat-project-split` skill end-to-end (parent writer, child seeder, completion+activation, resume, integration suite)
- Phase 3: 3 tasks — `oat project list` filter and dashboard `## Decompositions` section
- Phase 4: 4 tasks — detection hook in discover, declared-mode + picker option in brainstorm, skill-simulation tests
- Phase 5: 5 tasks — `bl-3a4a` reconciliation, three dogfood scenarios, SKILL + lockstep version bumps

**Total: 24 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Backlog item being implemented: `.oat/repo/reference/backlog/items/sub-project-split-escape-hatch.md`
- Plan-writing canonical format: `.agents/skills/oat-project-plan-writing/SKILL.md`
