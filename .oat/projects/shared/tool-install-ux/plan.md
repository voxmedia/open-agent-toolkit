---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-13
oat_phase: plan
oat_phase_status: complete
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: tool-install-ux

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Fix `oat tools install` scope-selection behavior for user-eligible packs and improve the interactive installer so it shows real install location, already-installed state, and sensible defaults.

**Architecture:** Extend the existing interactive installer to derive pack install state from project and user canonical content, use that state to drive prompt defaults and summaries, and reconcile opposite-scope installs when the user changes a pack’s location.

**Tech Stack:** TypeScript CLI commands, Commander, existing OAT tool install and sync utilities, Vitest command tests

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Quick-mode scope and out-of-scope captured in discovery
- [x] No lightweight design artifact needed before planning

---

## Phase 1: Detect Pack Location And Enforce Scope Changes

### Task p01-t01: Derive pack installation state across project and user scopes

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.ts` (only if pack-state aggregation belongs there)
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add or update command tests that model packs installed in project scope, user scope, both scopes, and not installed.

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Implement runtime pack-state resolution so the installer can answer, per pack, whether it is currently installed at project scope, user scope, both, or neither.

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep the pack-state logic in one place and avoid duplicating pack membership rules already present in tool scanning.

**Step 4: Verify**

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/tools/shared/scan-tools.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "fix(p01-t01): derive installed pack scopes"
```

---

### Task p01-t02: Treat scope changes as migrations for user-eligible packs

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Create or modify: `packages/cli/src/commands/tools/install/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add regressions showing that when a user reselects a user-eligible pack into the opposite scope, the installer cleans up the old canonical copy and triggers sync for every affected scope.

**Step 2: Implement (GREEN)**

Implement migration behavior so the pack ends in the selected scope instead of remaining installed in both scopes by accident. Ensure reporting and config writes stay coherent after the move.

**Step 3: Refactor**

Reuse existing removal and install helpers where practical and keep project-only packs untouched.

**Step 4: Verify**

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts`
Expected: Relevant install and auto-sync regressions pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts
git commit -m "fix(p01-t02): migrate pack installs between scopes"
```

---

## Phase 2: Improve Interactive Install UX And Reporting

### Task p02-t01: Show existing install location and prepopulate prompt defaults

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add prompt-shape tests for:

- pack labels that indicate already-installed state
- user-scope follow-up choices prechecked when a pack is already installed at user scope
- clear handling of packs installed in both scopes

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Update the interactive prompts to surface current install location and reflect it in the default selections.

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep labels concise enough for terminal UI while still showing scope and installed-state meaningfully.

**Step 4: Verify**

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts`
Expected: Prompt regression coverage passes

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p02-t01): prepopulate pack install scope prompts"
```

---

### Task p02-t02: Improve post-install summary and final regression coverage

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/tools/install/index.test.ts`

**Step 1: Write test (RED)**

Add assertions for summary output that reports the final per-pack outcome accurately instead of collapsing mixed choices into a single `user` or `project` label.

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Replace the current coarse success output with pack-aware reporting and close the remaining regression gaps around mixed-scope installs.

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Make prompt and report formatting reusable enough to keep future pack additions straightforward.

**Step 4: Verify**

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts`
Expected: All new behavior remains covered

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts
git commit -m "feat(p02-t02): clarify install scope summaries"
```

---

## Reviews

Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.

Keep both code and artifact rows below. Add additional code rows as needed, but do not delete `spec` or `design`.

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists but findings have not yet been converted into fix tasks
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical or Important findings)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - derive current pack location and enforce scope migration behavior
- Phase 2: 2 tasks - improve interactive prompt state and reporting regressions

**Total: 4 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Design: `design.md` (not used in this quick-mode project)
- Spec: `spec.md` (not used in this quick-mode project)
