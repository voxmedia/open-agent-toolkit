---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-18
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: implement-final-gate-enforcement

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Make the configured `oat-project-implement` exit gate a durable,
independent closeout boundary that runs after final implementation review and
before automated sequencing, final HiLL approval, completion state, or success
output.

**Architecture:** Extend the skill-owned closeout state machine with
`oat_implement_exit_gate` project state and router priority. Preserve the
existing gate CLI/envelope contracts while adding ordering, freshness, resume,
and fail-closed lifecycle enforcement.

**Tech Stack:** Markdown skill contracts, YAML frontmatter, TypeScript, Vitest,
OAT CLI/provider sync, pnpm/Turborepo.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Captured approved lightweight design
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` from dependency/write-set analysis
- [ ] Confirm implementation-phase HiLL checkpoints when implementation starts

---

## Parallelism

Execution is sequential (`oat_plan_parallel_groups: []`). Phase 1 establishes
the persisted state/router contract consumed by Phase 2. Phase 2 and Phase 1
both modify the post-implementation contract tests, while Phase 3 documents and
ships the final canonical skill/template state. These dependencies and shared
write sets make isolated parallel phases unsafe.

---

RED/GREEN/Refactor is the recommended default where work is testable, not a validator requirement. Other task-body shapes, including non-TDD shapes, are allowed when appropriate, provided the plan preserves stable `pNN-tNN` IDs, per-task verification, and atomic commits.

## Phase 1: Durable State and Resume Routing

### Task p01-t01: Register the implementation exit-gate state contract

**Files:**

- Modify: `.oat/templates/state.md`
- Modify: `packages/cli/src/commands/shared/frontmatter.ts`
- Modify: `packages/cli/src/commands/shared/frontmatter.test.ts`

**Step 1: Write test (RED)**

Add fixtures proving `oat_implement_exit_gate` is recognized and preserved for
pending, allowed, blocked, stale, and legacy-absent state.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/frontmatter.test.ts`
Expected: New recognized-field assertions fail.

**Step 2: Implement (GREEN)**

Register the field and add an optional commented template shape documenting the
state/disposition/provenance contract without changing legacy project behavior.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/frontmatter.test.ts`
Expected: Test passes (GREEN)

**Step 3: Format**

Run:
`pnpm exec oxfmt --write .oat/templates/state.md packages/cli/src/commands/shared/frontmatter.ts packages/cli/src/commands/shared/frontmatter.test.ts`
Expected: Only task files are formatted.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/frontmatter.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Focused tests and CLI type-check pass.

**Step 5: Commit**

```bash
git add .oat/templates/state.md packages/cli/src/commands/shared/frontmatter.ts packages/cli/src/commands/shared/frontmatter.test.ts
git commit -m "feat(p01-t01): register implementation exit gate state"
```

---

### Task p01-t02: Prioritize unresolved exit gates in lifecycle routing

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`

**Step 1: Write test (RED)**

Add structural assertions that pending, blocked, malformed, or stale
`oat_implement_exit_gate` state routes to `oat-project-implement` before
`complete`, `pr_open`, summary, docs, PR, or project completion.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: Router priority assertions fail.

**Step 2: Implement (GREEN)**

Add the read-only router check and exact resume explanation. Keep allowed/fresh
state eligible for the existing sequence and post-implementation routes.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: Router assertions pass.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write .agents/skills/oat-project-next/SKILL.md packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: Only task files are formatted.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: Focused contract tests pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
git commit -m "feat(p01-t02): route unresolved implementation exit gates"
```

---

## Phase 2: Enforced Final Gate Closeout

### Task p02-t01: Move the configured gate into authoritative closeout order

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`

**Step 1: Write test (RED)**

Add implementation to lifecycle exit-gate ordering validation and assert:

- final verification and mandatory lifecycle final review precede gate handling;
- gate handling precedes pre-approval sequencing, final HiLL, post-approval
  sequencing, completion state, and success output;
- phase-gate absence/disablement cannot disable the configured exit gate;
- implementation success criteria and allowed tools include the configured gate
  boundary.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: New ordering and contract assertions fail.

**Step 2: Implement (GREEN)**

Promote Gate Execution into a numbered closeout step after final review and
before the approval-aware sequence. Renumber downstream steps, remove the
trailing appendix, add gate CLI permission, strengthen top-level success
criteria, and bump `oat-project-implement` frontmatter version exactly once.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: Ordering and skill-contract tests pass.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-implement/references/completion-and-closeout.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: Only task files are formatted.

**Step 4: Verify**

Run:
`pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: Skill validation and focused tests pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-implement/references/completion-and-closeout.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
git commit -m "fix(p02-t01): enforce implementation exit gate ordering"
```

---

### Task p02-t02: Add resumable outcome and freshness enforcement

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `.agents/skills/oat-project-next/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Add contract scenarios for configured success, null resolution, `block`,
`prompt`, `warn`, invalid/ineligible envelopes, pending interruption, blocked
resume, unchanged valid resume without duplicate execution, stale
implementation-basis invalidation, and manual-review provenance rejection.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/skills.test.ts`
Expected: Outcome/resume assertions fail.

**Step 2: Implement (GREEN)**

Define the complete `oat_implement_exit_gate` transition contract, persistence
boundaries, configuration fingerprint, attempts, reviewed HEAD/run provenance,
receive disposition, closeout-only descendant policy, and fail-closed stale
handling. Ensure PR #156 project-log mutations are classified as gate-owned
closeout work.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/skills.test.ts`
Expected: All focused outcome/resume contracts pass.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-next/SKILL.md packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts packages/cli/src/validation/skills.test.ts`
Expected: Only task files are formatted.

**Step 4: Verify**

Run:
`pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/skills.test.ts`
Expected: Skill validation and focused contracts pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-next/SKILL.md packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p02-t02): persist implementation exit gate outcomes"
```

---

## Phase 3: Documentation and Release Surfaces

### Task p03-t01: Document implementation exit-gate ordering and state

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/workflows/projects/autonomy.md` when its closeout
  ordering description requires alignment

**Step 1: Implement**

Document the three independent mechanisms, configured gate ordering before
automated sequencing/final HiLL, persisted state/dispositions, resume and stale
basis behavior, null resolution, failure policy, and manual-review provenance
rule.

**Step 2: Format**

Run:
`pnpm exec oxfmt --write apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/autonomy.md`
Expected: Only listed docs are formatted.

**Step 3: Verify**

Run: `pnpm build:docs`
Expected: Documentation site and dependencies build successfully.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/autonomy.md
git commit -m "docs(p03-t01): explain implementation exit gate closeout"
```

---

### Task p03-t02: Synchronize shipped assets and validate the release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: provider-synchronized skill views and `.oat/sync/manifest.json`
- Modify: bundled CLI assets generated from final canonical skills, templates,
  and docs

**Step 1: Implement**

Bump all five public packages to the same base-relative next patch version.
Run `oat sync --scope all`, then regenerate bundled assets once after canonical
sources are final.

Run:
`oat sync --scope all && bash packages/cli/scripts/bundle-assets.sh`
Expected: Provider views, manifest, and bundled assets match canonical sources.

**Step 2: Format**

Run: `pnpm format:fix`
Expected: Repository-supported formatting fixes are applied.

**Step 3: Verify targeted and full quality gates**

Run:
`pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/frontmatter.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/skills.test.ts && pnpm format && pnpm lint && pnpm type-check && pnpm test && pnpm build && pnpm build:docs && pnpm release:validate`
Expected: Skill validation, targeted tests, formatting, lint, type-check, full
tests, builds, docs build, and release validation all pass.

**Step 4: Verify generated cleanliness**

Run:
`oat sync --scope all --dry-run && git diff --quiet -- packages/cli/assets`
Expected: Sync preview reports no required changes and bundled assets have no
unstaged drift.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets .oat/sync/manifest.json .claude .cursor .codex
git commit -m "chore(p03-t02): sync final gate assets and release versions"
```

---

## Reviews

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |
| plan   | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - Durable gate state and lifecycle resume routing
- Phase 2: 2 tasks - Authoritative closeout ordering and outcome/freshness
  enforcement
- Phase 3: 2 tasks - Bundled documentation, provider sync, release versions,
  and complete validation

**Total: 6 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Coordination base: PR #156 (`orchestration-run-log`) until merged
