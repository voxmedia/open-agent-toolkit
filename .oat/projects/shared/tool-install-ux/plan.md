---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-13
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p02']
oat_auto_review_at_checkpoints: true
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

**Tech Stack:** TypeScript CLI commands, Commander, existing OAT tool install and sync utilities, Vitest command tests, and `packages/cli/AGENTS.md` conventions for domain-local tests and imports

**Commit Convention:** `fix(cli): {description} ({task_id})` - e.g., `fix(cli): derive installed pack scopes (p01-t01)` for repo-style scopes with OAT task traceability

## Planning Checklist

- [x] Quick-mode scope and out-of-scope captured in discovery
- [x] No lightweight design artifact needed before planning

---

## Phase 1: Detect Pack Location And Enforce Scope Changes

### Task p01-t01: Derive pack installation state across project and user scopes

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Create: `packages/cli/src/commands/init/tools/install-state.ts`
- Create: `packages/cli/src/commands/init/tools/install-state.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add or update command tests that model packs installed in project scope, user scope, both scopes, and not installed.

Run: `pnpm test packages/cli/src/commands/init/tools/install-state.test.ts packages/cli/src/commands/init/tools/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Implement runtime pack-state resolution so the installer can answer, per pack, whether it is currently installed at project scope, user scope, both, or neither.

Run: `pnpm test packages/cli/src/commands/init/tools/install-state.test.ts packages/cli/src/commands/init/tools/index.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep the pack-state logic in one install-domain helper, reuse existing tool-scan outputs where possible, and follow `packages/cli/AGENTS.md` file-local import conventions.

**Step 4: Verify**

Run: `pnpm test packages/cli/src/commands/init/tools/install-state.test.ts packages/cli/src/commands/init/tools/index.test.ts`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/install-state.ts packages/cli/src/commands/init/tools/install-state.test.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "fix(cli): derive installed pack scopes (p01-t01)"
```

---

### Task p01-t02: Treat scope changes as migrations for user-eligible packs

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Create: `packages/cli/src/commands/tools/install/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add regressions showing that:

- when a user reselects a user-eligible pack into the opposite scope, the installer cleans up the old canonical copy and triggers sync for every affected scope
- when a pack is already installed in both scopes and the user explicitly selects one side, the installer normalizes to the selected scope and reports cleanup of the opposite-scope canonical content

Run: `pnpm test packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Implement migration behavior so the pack ends in the selected scope instead of remaining installed in both scopes by accident. When a pack already exists in both scopes, normalize to the user-selected scope and make the cleanup explicit in reporting and tests.

**Step 3: Refactor**

Reuse existing removal and install helpers where practical and keep project-only packs untouched.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Relevant install and auto-sync regressions pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts
git commit -m "fix(cli): migrate pack installs between scopes (p01-t02)"
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
git commit -m "fix(cli): prepopulate pack install scope prompts (p02-t01)"
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

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: All new behavior remains covered

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts
git commit -m "fix(cli): clarify install scope summaries (p02-t02)"
```

---

## Phase rev1: Review Fixes

### Task prev1-t01: (review) Preserve both-scope installs unless the user explicitly changes them

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/tools/install/index.test.ts`

**Step 1: Understand the issue**

Review finding: packs already installed in both scopes still fall back to the unchecked project-side checkbox state, so default submit can remove the user copy without an explicit choice.
Location: `packages/cli/src/commands/init/tools/index.ts:351-364`

**Step 2: Implement fix**

Update the follow-up scope prompt so a `both`-installed pack does not silently normalize to project on default submit. Preserve both unless the user makes an explicit scope change, or introduce an explicit both-state follow-up that forces a deliberate choice.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`
Expected: both-scope prompt behavior is covered and default submit no longer removes the user copy implicitly

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts
git commit -m "fix(cli): preserve both-scope installs on default submit (prev1-t01)"
```

---

### Task prev1-t02: (review) Reduce duplicate install-state scans in the installer

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`

**Step 1: Understand the issue**

Review finding: the installer scans both project and user scopes once to drive prompt state and again after writes to refresh config booleans.
Location: `packages/cli/src/commands/init/tools/index.ts`

**Step 2: Implement fix**

Reduce duplicate install-state scanning without changing install semantics. Reuse prompt-time state where safe or collapse the config refresh into a single equivalent post-write pass.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/install-state.test.ts src/commands/init/tools/index.test.ts`
Expected: install-state behavior remains correct and no prompt/config regressions are introduced

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/install-state.test.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "fix(cli): reduce duplicate install-state scans (prev1-t02)"
```

---

### Task prev1-t03: (review) Add direct agent-only install-state coverage

**Files:**

- Modify: `packages/cli/src/commands/init/tools/install-state.test.ts`

**Step 1: Understand the issue**

Review finding: `buildPackInstallStateMap()` does not have a direct unit test covering a pack seen only through an agent entry.
Location: `packages/cli/src/commands/init/tools/install-state.test.ts:41-82`

**Step 2: Implement fix**

Add a focused test case that covers a bundled pack detected only via an agent entry so pack-state aggregation remains locked for non-skill assets.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/install-state.test.ts`
Expected: agent-only aggregation behavior is covered directly

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/install-state.test.ts
git commit -m "test(cli): cover agent-only install-state aggregation (prev1-t03)"
```

---

## Reviews

Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.

Keep both code and artifact rows below. For quick-mode projects, retain `spec` and `design` rows for table stability and mark them not applicable through the Artifact column.

| Scope  | Type     | Status          | Date       | Artifact                                            |
| ------ | -------- | --------------- | ---------- | --------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                   |
| p02    | code     | fixes_completed | 2026-04-14 | reviews/archived/p02-review-2026-04-13.md           |
| final  | code     | passed          | 2026-04-14 | reviews/archived/final-review-2026-04-14-rerun.md   |
| spec   | artifact | passed          | 2026-04-13 | n/a (quick mode)                                    |
| design | artifact | passed          | 2026-04-13 | n/a (quick mode)                                    |
| plan   | artifact | fixes_completed | 2026-04-13 | reviews/archived/artifact-plan-review-2026-04-13.md |

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
- Phase rev1: 3 tasks - address final review follow-up fixes and coverage gaps

**Total planned tasks: 7**

Ready for execution via `oat-project-implement`.

---

## References

- Discovery: `discovery.md`
- Design: `design.md` (not used in this quick-mode project)
- Spec: `spec.md` (not used in this quick-mode project)
