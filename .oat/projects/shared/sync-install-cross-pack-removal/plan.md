---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-14
oat_phase: plan
oat_phase_status: complete
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

## Phase 2: Review Fixes

### Task p02-t01: (review) Add paired regression coverage for install-scoped removal filtering

**Files:**

- Modify: `packages/cli/src/engine/compute-plan.test.ts`

**Step 1: Understand the issue**

Review finding: The new regression test only proves the post-fix filtered behavior. It does not show that the exact same fixture would schedule a removal when the install-scoped filter is absent.
Location: `packages/cli/src/engine/compute-plan.test.ts:185`

**Step 2: Implement fix**

Add a paired assertion or parameterized test that exercises the same `manifest` + `canonical` fixture with and without `allowedRemovalCanonicalPaths`, and assert removal length `1` vs `0`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
Expected: The paired regression proves the pre-fix bug shape and the filtered post-fix behavior.

**Step 4: Commit**

```bash
git add packages/cli/src/engine/compute-plan.test.ts
git commit -m "test(p02-t01): strengthen install-sync regression coverage"
```

---

### Task p02-t02: (review) Fix cancel-path install filter stamping for pack-level init handlers

**Files:**

- Modify: `packages/cli/src/commands/init/tools/core/index.ts`
- Modify: `packages/cli/src/commands/init/tools/ideas/index.ts`
- Modify: `packages/cli/src/commands/init/tools/workflows/index.ts`
- Modify: `packages/cli/src/commands/init/tools/project-management/index.ts`
- Modify: `packages/cli/src/commands/init/tools/ideas/index.test.ts`

**Step 1: Understand the issue**

Review finding: Several pack-level init handlers still stamp installed canonical paths after a `--force` overwrite confirmation is declined, so auto-sync can claim a pack was installed when nothing was written.
Location: `packages/cli/src/commands/init/tools/core/index.ts:115`, `packages/cli/src/commands/init/tools/ideas/index.ts:150`, `packages/cli/src/commands/init/tools/workflows/index.ts:144`, `packages/cli/src/commands/init/tools/project-management/index.ts:52`

**Step 2: Implement fix**

Mirror the docs/utility/research success-path behavior so `setInstalledCanonicalPaths(...)` only runs after a real install completes, or gate it on a returned `didInstall` boolean from the inner handler.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- ideas/index.test.ts`
Expected: Cancelling overwrite confirmation leaves installed canonical paths empty and does not stamp a pack as installed.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/core/index.ts packages/cli/src/commands/init/tools/ideas/index.ts packages/cli/src/commands/init/tools/workflows/index.ts packages/cli/src/commands/init/tools/project-management/index.ts packages/cli/src/commands/init/tools/ideas/index.test.ts
git commit -m "fix(p02-t02): gate install filters on successful pack init"
```

---

### Task p02-t03: (review) Validate hidden install-scoped canonical paths

**Files:**

- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Understand the issue**

Review finding: The hidden `--install-canonical` option accepts arbitrary strings, allowing unsupported values to silently narrow removals.
Location: `packages/cli/src/commands/sync/index.ts:345`

**Step 2: Implement fix**

Validate `--install-canonical` entries against the canonical install path shape used by tool packs, and reject invalid values with a CLI error.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- sync/index.test.ts`
Expected: Valid install-scoped values still pass through, and invalid values fail fast.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/sync/index.ts packages/cli/src/commands/sync/index.test.ts
git commit -m "fix(p02-t03): validate install canonical filters"
```

---

### Task p02-t04: (review) Make provider coupling explicit in compute-plan regression tests

**Files:**

- Modify: `packages/cli/src/engine/compute-plan.test.ts`

**Step 1: Understand the issue**

Review finding: The regression test relies on `createTestAdapter()` defaulting to the same provider name as the manifest entry, so it could pass for the wrong reason if that default drifts.
Location: `packages/cli/src/engine/compute-plan.test.ts:185`

**Step 2: Implement fix**

Use an explicit provider name in the test adapter or add an inline assertion/comment that makes the provider alignment intentional and visible in the test.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
Expected: The regression test still passes with explicit provider alignment.

**Step 4: Commit**

```bash
git add packages/cli/src/engine/compute-plan.test.ts
git commit -m "test(p02-t04): make provider alignment explicit"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                    |
| ------ | -------- | --------------- | ---------- | ------------------------------------------- |
| p01    | code     | pending         | -          | -                                           |
| p02    | code     | pending         | -          | -                                           |
| final  | code     | fixes_completed | 2026-04-14 | reviews/archived/final-review-2026-04-14.md |
| spec   | artifact | pending         | -          | -                                           |
| design | artifact | pending         | -          | -                                           |

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
- Phase 2: 4 tasks - address final review gaps in regression coverage, cancel-path filter stamping, hidden option validation, and test provider coupling

**Total: 7 tasks**

All plan tasks are complete. Awaiting final re-review.

---

## References

- Design: `design.md` (required in spec-driven mode; optional in quick/import mode)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
