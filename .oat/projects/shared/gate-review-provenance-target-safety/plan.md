---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-10
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: gate-review-provenance-target-safety

> Execute this plan using `oat-project-implement`.

**Goal:** Make workflow gate reviews explicit and corroborated about the configured invocation and review subject before expanding opt-in phase review gates.

**Architecture:** Extend the existing gate path with minimal exec-target invocation metadata, immutable gate-owned project/invocation records, run-correlated artifact corroboration, explicit aggregated producer provenance, and one shared phase-review setup contract used by every plan-producing workflow.

**Tech Stack:** TypeScript ESM, Commander, Vitest, YAML frontmatter, Markdown-based OAT skills, Fumadocs, pnpm/Turborepo.

**Commit Convention:** `{type}({scope}): {description}`

## Planning Checklist

- [x] Quick workflow and lightweight design confirmed
- [x] Evaluated phases for parallelism
- [x] Set `oat_plan_parallel_groups: []`
- [x] Dispatch policy resolved from user config: managed `high`

## Parallelism

The plan is sequential. Phases 1-3 all modify `packages/cli/src/commands/gate/index.ts` and its tests, while Phase 2 consumes the invocation/run metadata established in Phase 1. Phase 4 depends on the target-inspection API from Phase 1 and is deliberately last because phase-gate adoption must follow the safety work. Isolated worktrees would overlap fragile gate behavior, generated skill assets, and release metadata.

---

## Phase 1: Configured Invocation Provenance

### Task p01-t01: Add minimal exec-target invocation metadata

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Steps:**

1. Add `ExecTargetInvocation` with model/reasoning-effort values and the reserved `provider-default` sentinel.
2. Normalize, clone, and layer-merge nested invocation fields while preserving target tombstones and unrelated partial overrides.
3. Cover explicit values, provider defaults, omission/unknown semantics, malformed values, and cross-layer overrides.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

**Commit:** `feat(gate): add configured invocation metadata`

---

### Task p01-t02: Add target mutation and inspection APIs

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`

**Steps:**

1. Extend `oat gate target set` with optional invocation model and reasoning-effort flags.
2. Add `oat gate target list --json` over effective target config, reporting origin, explicit configuration, enabled/available state, and normalized invocation metadata.
3. Ensure built-in-only definitions are distinguishable and availability checks do not select or execute a reviewer.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm run cli -- --json gate target list
```

**Commit:** `feat(gate): inspect configured review targets`

---

### Task p01-t03: Assemble and emit gate invocation provenance

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Steps:**

1. Generate the run ID before prompt assembly and derive an immutable configured invocation record after target selection.
2. Inject exact run ID, target ID, runtime, model, effort, and source values into the review prompt without parsing opaque base commands.
3. Add `gateInvocation` to success and post-selection failure JSON while preserving existing `target`, `project`, and review `invocation` fields.
4. Cover explicit Codex model/effort, explicit Claude model with provider-default effort, and unknown/default Cursor-style targets.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

**Commit:** `feat(gate): emit invocation provenance`

---

### Task p01-t04: Stamp, parse, and validate invocation metadata

**Files:**

- Modify: `packages/cli/src/commands/gate/review-verdict.ts`
- Modify: `packages/cli/src/commands/gate/review-verdict.test.ts`
- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Steps:**

1. Add gate-only artifact fields for run ID, target, runtime, invocation model/effort, and source to reviewer guidance and templates.
2. Extend the YAML-aware verdict parser without breaking existing manual/auto artifacts.
3. Validate artifact invocation fields against the gate-owned record before applying severity thresholds; keep optional self-report identity separate and non-authoritative.
4. Bump changed canonical agent/skill versions once and add contract coverage.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts src/commands/gate/index.test.ts src/validation/skills.test.ts
pnpm run oat:validate-skills
```

**Commit:** `feat(review): corroborate gate invocation metadata`

---

## Phase 2: Declared Review Target Safety

### Task p02-t01: Expose review-project resolution provenance

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Steps:**

1. Return `{ path, source }` from project resolution with `declared`, `active-project`, and `single-candidate` sources.
2. Preserve current explicit-name/path precedence and legacy ambient resolution.
3. Include project source in prompt context and every applicable JSON outcome.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
```

**Commit:** `feat(gate): expose review project provenance`

---

### Task p02-t02: Correlate artifacts and reject project mismatches

**Files:**

- Modify: `packages/cli/src/commands/gate/review-verdict.ts`
- Modify: `packages/cli/src/commands/gate/review-verdict.test.ts`
- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Steps:**

1. Locate the produced artifact by gate run ID across active project review directories, retaining before/after snapshots only as compatibility diagnostics.
2. Compare containing project and parsed `oat_project` with an explicitly declared normalized project.
3. Fail closed for missing/mismatched run or project identity with structured expected/actual output, a non-remediable targeting class, and no receive-eligible handoff.
4. Cover sibling-project writes, wrong frontmatter, missing run correlation, matching declarations, and ambient legacy behavior.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

**Commit:** `fix(gate): reject mismatched review projects`

---

### Task p02-t03: Declare lifecycle review subjects in guidance

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/contributing/skills.md`

**Steps:**

1. Update lifecycle gate configuration/examples to declare the active project path while preserving exact configured-command execution.
2. Keep provider/model `--target` absent from reusable lifecycle commands and examples.
3. Explain declared versus ambient project resolution, mismatch failures, invalid-artifact handoff behavior, and manual/debug exceptions.
4. Bump each changed canonical skill version once and add cross-skill contract tests.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm run oat:validate-skills
pnpm docs:check-links
```

**Commit:** `docs(gate): declare lifecycle review subjects`

---

## Phase 3: Aggregated Producer Provenance

### Task p03-t01: Make final and range aggregation explicit

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`

**Steps:**

1. Distinguish exact `stamp` from `aggregated-stamps` producer sources.
2. Report contributing scopes/count and keep `avoidFamilies` as the authoritative deduplicated union rather than implying the latest producer represents the aggregate.
3. Add contiguous-range coverage and preserve exact single-phase and explicit-flag precedence.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm docs:check-links
```

**Commit:** `fix(gate): report aggregated producer provenance`

---

## Phase 4: Opt-In Phase Review Setup

### Task p04-t01: Define the shared phase-review setup contract

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Steps:**

1. Add a shared post-phase-ID setup procedure that preserves explicit existing settings, probes `oat gate target list --json`, and prompts only for explicitly configured, enabled, available targets.
2. Define all-phases, selected-phases, and disabled choices using the existing `oat_phase_review_gate` shape.
3. Validate selected phase IDs, specify non-interactive/probe-failure behavior, and keep the setting independent from HiLL checkpoints.
4. Bump the plan-writing skill version once and add contract tests.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm run oat:validate-skills
```

**Commit:** `feat(plan): add phase review setup contract`

---

### Task p04-t02: Wire phase-review setup into every plan path

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `apps/oat-docs/docs/workflows/projects/artifacts.md`
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`

**Steps:**

1. Invoke the shared setup after stable phase IDs and before plan artifact review in spec-driven, quick, and import workflows; document provider-plan mode as inheriting import behavior.
2. Preserve resumed/imported explicit values without re-prompting and leave disabled behavior unchanged when no target qualifies or the user declines.
3. Bump each changed canonical skill version once per final PR diff and add all-path/no-prompt/preservation contract tests.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm run oat:validate-skills
pnpm docs:check-links
```

**Commit:** `feat(plan): enable phase review setup across workflows`

---

### Task p04-t03: Sync, package, and validate the shipped surface

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`
- Regenerate: provider-linked skill/agent views managed by `oat sync`
- Regenerate: `packages/cli/assets/public-package-versions.json`

**Steps:**

1. Run `pnpm run cli -- sync --scope all` and review generated provider-view changes for canonical parity.
2. Bump the five public packages together to the next patch version and refresh the lockfile/bundled public-package metadata.
3. Run focused and full workspace validation, docs build/link checks, skill validation, and the publishable-package release guardrail.

**Verify:**

```bash
pnpm run cli -- sync --scope all
pnpm run oat:validate-skills
pnpm lint
pnpm format
pnpm type-check
pnpm test
pnpm build
pnpm build:docs
pnpm docs:check-links
pnpm release:validate
git status --short
```

**Commit:** `chore(release): validate gate provenance and phase review setup`

---

## Reviews

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| p04    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |
| plan   | artifact | pending | -    | -        |

**Status values:** `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks - configured invocation metadata, inspection, prompt/JSON provenance, and artifact validation
- Phase 2: 3 tasks - project resolution provenance, fail-closed target corroboration, and lifecycle guidance
- Phase 3: 1 task - explicit final/range producer aggregation provenance
- Phase 4: 3 tasks - shared opt-in setup, all plan paths, and release validation

**Total: 11 tasks**

Ready for implementation after the plan artifact review passes.

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Backlog: `BL-260707-record-gate-review-model`
- Backlog: `BL-260707-declare-gate-review-target`
- Backlog: `BL-260707-support-producer-identity`
- Backlog: `BL-260707-ask-to-enable-phase-review`
