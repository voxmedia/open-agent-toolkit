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
- [x] Restacked onto merged PR #156 via current `origin/main`; confirmed the
      branch diff contains only this project's lifecycle artifacts before
      implementation
- [x] Defer HiLL checkpoint confirmation to oat-project-implement

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
resume, and unchanged valid resume without duplicate execution. Cover
receive-eligible `ok` and `blocked` handoffs, receive failure, already-completed
receive resume without duplicate receive/gate execution, and ineligible, null,
or contradictory handoffs. Verify that recognized closeout-only descendants
(gate artifact/receipt, project tracking, PR #156 project log, summary/docs/PR
sequence outputs, HiLL bookkeeping, and completion bookkeeping) preserve
validity; unknown changed paths fail closed; substantive implementation changes
become stale; and manual-review provenance is rejected.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/skills.test.ts`
Expected: Outcome/resume assertions fail.

**Step 2: Implement (GREEN)**

Define the complete `oat_implement_exit_gate` transition contract, persistence
boundaries, configuration fingerprint, attempts, reviewed HEAD/run provenance,
receive disposition, closeout-only descendant policy, and fail-closed stale
handling. Ensure PR #156 project-log mutations are classified as gate-owned
closeout work. After the final `oat-project-next` edit, bump that canonical
skill's frontmatter version exactly once and update any pinned-version assertion
that exists on the merged baseline.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/skills.test.ts`
Expected: All focused outcome/resume contracts pass.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-next/SKILL.md packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts packages/cli/src/validation/skills.test.ts`
Expected: Only task files are formatted.

**Step 4: Verify**

Run:
`pnpm oat:validate-skills && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/skills.test.ts && pnpm run cli:source -- internal validate-skill-version-bumps --base-ref origin/main`
Expected: Skill validation, focused contracts, and base-relative version-bump
validation pass for both changed canonical skills.

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
- Modify: `apps/oat-docs/docs/workflows/projects/autonomy.md`
- Modify (generated): `apps/oat-docs/index.md`

**Step 1: Analyze and approve the documentation delta**

Compare the approved discovery/design and shipped implementation evidence
against all four authored pages. Present the exact substantive content delta to
the user and obtain approval before editing. Keep changes limited to final gate
ordering/state behavior; do not restructure unrelated docs.

**Step 2: Implement**

Document the three independent mechanisms, configured gate ordering before
automated sequencing/final HiLL, persisted state/dispositions, resume and stale
basis behavior, null resolution, failure policy, and manual-review provenance
rule.

**Step 3: Format and regenerate navigation/index**

Run:
`pnpm exec oxfmt --write apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/autonomy.md && oat docs nav sync && pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`
Expected: Authored pages are formatted, navigation is synchronized, and the
generated index reflects the approved pages.

**Step 4: Verify**

Run:
`oat docs nav sync && pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md && pnpm build:docs`
Expected: Regeneration is deterministic and the documentation site builds.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/autonomy.md apps/oat-docs/index.md
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
- Modify: `.oat/sync/manifest.json`
- Modify: `.claude/skills/oat-project-implement/SKILL.md`
- Modify: `.claude/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `.claude/skills/oat-project-next/SKILL.md`
- Modify: `.cursor/skills/oat-project-implement/SKILL.md`
- Modify: `.cursor/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `.cursor/skills/oat-project-next/SKILL.md`
- Modify: `packages/cli/assets/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/assets/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `packages/cli/assets/skills/oat-project-next/SKILL.md`
- Modify: `packages/cli/assets/templates/state.md`
- Modify: `packages/cli/assets/docs/cli-utilities/workflow-gates.md`
- Modify: `packages/cli/assets/docs/workflows/projects/lifecycle.md`
- Modify: `packages/cli/assets/docs/workflows/projects/implementation-execution.md`
- Modify: `packages/cli/assets/docs/workflows/projects/autonomy.md`

**Step 1: Implement**

Bump all five public packages to the same base-relative next patch version.
Run `oat sync --scope all`, then regenerate bundled assets once after canonical
sources are final.

Run:
`oat sync --scope all && bash packages/cli/scripts/bundle-assets.sh`
Expected: Provider views, manifest, and bundled assets match canonical sources.

**Step 2: Format**

Run:
`pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json .oat/sync/manifest.json`
Expected: Only the task's authored/generated JSON files are formatted.

**Step 3: Verify targeted and full quality gates**

Run:
`pnpm oat:validate-skills && pnpm run cli:source -- internal validate-skill-version-bumps --base-ref origin/main && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/frontmatter.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/skills.test.ts && pnpm format && pnpm lint && pnpm type-check && pnpm test && pnpm build && pnpm build:docs && pnpm release:validate`
Expected: Skill validation, targeted tests, formatting, lint, type-check, full
tests, builds, docs build, and release validation all pass.

**Step 4: Stage expected generated outputs and verify reproducibility**

Stage only the expected version, provider-sync, manifest, and bundled-asset
outputs. Then rerun both generators before checking for unstaged drift.

```bash
git add \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json \
  .oat/sync/manifest.json \
  .claude/skills/oat-project-implement/SKILL.md \
  .claude/skills/oat-project-implement/references/completion-and-closeout.md \
  .claude/skills/oat-project-next/SKILL.md \
  .cursor/skills/oat-project-implement/SKILL.md \
  .cursor/skills/oat-project-implement/references/completion-and-closeout.md \
  .cursor/skills/oat-project-next/SKILL.md \
  packages/cli/assets/skills/oat-project-implement/SKILL.md \
  packages/cli/assets/skills/oat-project-implement/references/completion-and-closeout.md \
  packages/cli/assets/skills/oat-project-next/SKILL.md \
  packages/cli/assets/templates/state.md \
  packages/cli/assets/docs/cli-utilities/workflow-gates.md \
  packages/cli/assets/docs/workflows/projects/lifecycle.md \
  packages/cli/assets/docs/workflows/projects/implementation-execution.md \
  packages/cli/assets/docs/workflows/projects/autonomy.md
```

Run:
`oat sync --scope all && bash packages/cli/scripts/bundle-assets.sh && git diff --quiet -- .oat/sync/manifest.json .claude/skills/oat-project-implement .claude/skills/oat-project-next .cursor/skills/oat-project-implement .cursor/skills/oat-project-next packages/cli/assets/skills/oat-project-implement packages/cli/assets/skills/oat-project-next packages/cli/assets/templates/state.md packages/cli/assets/docs/cli-utilities/workflow-gates.md packages/cli/assets/docs/workflows/projects/lifecycle.md packages/cli/assets/docs/workflows/projects/implementation-execution.md packages/cli/assets/docs/workflows/projects/autonomy.md packages/cli/assets/public-package-versions.json`
Expected: Regeneration after staging produces no unstaged drift in any
allowlisted synchronized or bundled output.

**Step 5: Commit**

```bash
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
- Baseline: PR #156 merged as `ce1c2b13`; this branch was restacked onto current
  `origin/main` before implementation planning completed
