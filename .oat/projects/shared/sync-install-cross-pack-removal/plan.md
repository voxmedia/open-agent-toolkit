---
oat_status: in_progress
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-14
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: sync-install-cross-pack-removal

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Stop install-triggered auto-sync from deleting unrelated provider-view files when stale manifest entries exist for packs whose canonical content is absent in the current worktree.

**Architecture:** Reproduce the failure through the sync planning path, tighten removal planning in the engine or install-triggered sync boundary, and lock the behavior with a regression test in the CLI package.

**Tech Stack:** TypeScript, Vitest, OAT CLI sync engine

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Reproduce And Patch Sync Removal

### Task p01-t01: Reproduce stale-manifest removal behavior

**Files:**

- Modify: `packages/cli/src/engine/compute-plan.test.ts`
- Inspect: `packages/cli/src/commands/tools/install/index.ts`
- Inspect: `packages/cli/src/commands/tools/shared/auto-sync.ts`
- Inspect: `packages/cli/src/commands/sync/index.ts`

**Step 1: Write test (RED)**

Add a regression scenario that models:

- canonical entries for the installed pack only
- stale manifest entries for unrelated packs
- provider-view files still present for those stale entries

Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
Expected: Test fails (RED)

**Step 2: Investigate root cause**

Trace how `computeSyncPlan` derives `seenCanonicalKeys`, iterates manifest entries, and schedules removals when the canonical scan omits stale entries.

**Step 3: Refactor**

Minimize the repro so it isolates stale manifest state from install-copy behavior.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
Expected: Targeted regression reproduces the bad removal planning

**Step 5: Commit**

```bash
git add .oat/projects/shared/sync-install-cross-pack-removal
git commit -m "chore(oat): capture quick plan for sync-install-cross-pack-removal"
```

---

### Task p01-t02: Implement conservative removal guard

**Files:**

- Modify: `packages/cli/src/engine/compute-plan.ts`
- Modify: `packages/cli/src/engine/compute-plan.test.ts`

**Step 1: Write test (RED)**

Use the regression from `p01-t01` to pin the intended behavior before changing planner logic.

**Step 2: Implement (GREEN)**

Change the removal logic so stale manifest-only entries do not trigger unrelated provider deletions in the install-triggered missing-canonical scenario, while preserving legitimate removals.

**Step 3: Refactor**

Keep the patch local to sync planning unless reproduction proves command-level scoping is required.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
Expected: Regression passes and existing compute-plan expectations remain green

**Step 5: Commit**

```bash
git add packages/cli/src/engine/compute-plan.ts packages/cli/src/engine/compute-plan.test.ts
git commit -m "fix(p01-t02): guard stale manifest removals"
```

---

### Task p01-t03: Verify install-path behavior and summarize asymmetry

**Files:**

- Inspect: `packages/cli/src/commands/tools/install/index.ts`
- Inspect: `packages/cli/src/commands/tools/shared/auto-sync.ts`

**Step 1: Write test (RED)**

Extend coverage if command-level behavior still differs from engine-level reproduction.

**Step 2: Implement (GREEN)**

Only add command-path changes if the engine fix alone does not cover install-triggered auto-sync.

**Step 3: Refactor**

Leave install/sync architecture intact if no additional plumbing is needed.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
Expected: Final targeted suite passes

Run: `pnpm --filter @open-agent-toolkit/cli test -- auto-sync.test.ts`
Expected: No regression in auto-sync helper behavior

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/shared/auto-sync.ts packages/cli/src/commands/tools/shared/auto-sync.test.ts
git commit -m "test(p01-t03): cover install-triggered sync guard"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status   | Date       | Artifact                           |
| ------ | -------- | -------- | ---------- | ---------------------------------- |
| p01    | code     | pending  | -          | -                                  |
| p02    | code     | pending  | -          | -                                  |
| final  | code     | received | 2026-04-14 | reviews/final-review-2026-04-14.md |
| spec   | artifact | pending  | -          | -                                  |
| design | artifact | pending  | -          | -                                  |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - reproduce the stale-manifest removal, patch the planner conservatively, and verify install-path behavior

**Total: 3 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (required in spec-driven mode; optional in quick/import mode)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
