---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-11
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03'] # phases to pause AFTER completing (empty = every phase)
oat_auto_review_at_checkpoints: true
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: false
oat_template_name: plan
---

# Implementation Plan: claude-instructions-sync

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Add project-scoped `AGENTS.md` / `CLAUDE.md` sync and Claude-only adoption to the `oat instructions` workflow, with nested directory support and pointer, symlink, and copy strategies.

**Architecture:** Extend the existing instructions scan/report/apply flow so it can discover both file types, classify per-directory states, and execute strategy-aware repairs or adoptions without moving the feature into the provider-sync manifest engine.

**Tech Stack:** TypeScript, Commander, Vitest, OAT CLI command layer

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Confirmed quick workflow and project-only first-release scope
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Model Discovery And Strategy State

### Task p01-t01: Expand instruction scan state for paired and stray files

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.types.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.test.ts`

**Step 1: Write test (RED)**

Add failing unit tests that cover:

- directories with `AGENTS.md` only
- directories with `CLAUDE.md` only
- directories with both files but non-matching strategy/content
- nested project scanning with existing exclusions preserved

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Update instruction scan types and utility functions so the command layer can report strategy-aware pair state and adoptable Claude-only stray state for project scope.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Simplify state normalization and report formatting so later sync/apply changes consume a stable instruction entry model.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.types.ts \
  packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/instructions.utils.test.ts
git commit -m "feat(p01-t01): model instruction pair states"
```

---

### Task p01-t02: Add project-scoped strategy selection to the instructions commands

**Files:**

- Modify: `packages/cli/src/commands/instructions/validate/validate.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.types.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Add failing command tests for project-only strategy selection and reporting behavior in validate/sync flows.

**Step 2: Implement (GREEN)**

Add command options or config plumbing for `pointer`, `symlink`, and `copy`, and ensure validate/sync consume the same strategy resolution path for repo-scoped instruction files.

**Step 3: Refactor**

Consolidate shared option parsing and keep JSON/plain-text output stable where possible.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions`
Expected: Updated command tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions \
  packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t02): add instruction sync strategy selection"
```

---

## Phase 2: Implement Sync And Adoption Behavior

### Task p02-t01: Implement strategy-aware `CLAUDE.md` repair and generation

**Files:**

- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.types.ts`
- Modify: `packages/cli/src/fs/io.ts` (only if helper coverage is required)
- Modify: `packages/cli/src/commands/instructions/sync/sync.test.ts`

**Step 1: Write test (RED)**

Add failing sync tests for:

- pointer file creation/update
- file symlink creation/update
- hard-copy creation/update
- force-required overwrite behavior where destructive repair is needed

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Update sync planning and apply logic so `CLAUDE.md` can be created or repaired using the selected strategy instead of the current pointer-only write path.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Extract shared file-write/link-repair helpers as needed so strategy-specific behavior is explicit and reusable.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions/sync/sync.ts \
  packages/cli/src/commands/instructions/instructions.types.ts \
  packages/cli/src/fs/io.ts \
  packages/cli/src/commands/instructions/sync/sync.test.ts
git commit -m "feat(p02-t01): implement instruction sync strategies"
```

---

### Task p02-t02: Implement Claude-only stray adoption into canonical `AGENTS.md`

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.integration.test.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.test.ts`

**Step 1: Write test (RED)**

Add failing tests for directories containing only `CLAUDE.md`, including safe adoption, overwrite/conflict handling, and post-adoption regeneration of `CLAUDE.md`.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Implement project-scoped adoption so Claude-only stray files can be converted into canonical `AGENTS.md` content and then re-synced to `CLAUDE.md` with the requested strategy.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Align adoption terminology, JSON payloads, and plain-text summaries so adoptable states and applied actions are easy to interpret.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions`
Expected: All instruction command tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/sync/sync.ts \
  packages/cli/src/commands/instructions/instructions.integration.test.ts \
  packages/cli/src/commands/instructions/sync/sync.test.ts
git commit -m "feat(p02-t02): adopt claude instruction strays"
```

---

## Phase 3: Finish Coverage And Documentation

### Task p03-t01: Add end-to-end coverage for nested project directories

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.integration.test.ts`
- Modify: `packages/cli/src/commands/instructions/validate/validate.test.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.test.ts`

**Step 1: Write test (RED)**

Add failing integration cases for nested directories using mixed valid pairs, drifted pairs, excluded directories, and adoptable strays in the same repo tree.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Fix remaining scan/report gaps and ensure project-only recursion behaves consistently across validate and sync.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions`
Expected: All targeted tests pass

**Step 3: Refactor**

Remove duplicate fixture setup and keep integration scenarios concise.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: CLI package test suite passes

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions
git commit -m "test(p03-t01): cover nested instruction sync flows"
```

---

### Task p03-t02: Update docs and help text for strategy-aware project sync

**Files:**

- Modify: `apps/oat-docs/docs/provider-sync/commands.md`
- Modify: `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Update or add failing help snapshot expectations for the revised `oat instructions` command surface.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/help-snapshots.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Document the new project-only behavior, supported strategies, and Claude-only adoption semantics, then refresh help snapshots.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/help-snapshots.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep docs language aligned with the actual command behavior and avoid describing deferred user-scope support as implemented.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/provider-sync/commands.md \
  apps/oat-docs/docs/provider-sync/scope-and-surface.md \
  packages/cli/src/commands/help-snapshots.test.ts
git commit -m "docs(p03-t02): document instruction sync strategies"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - model instruction scan state and strategy selection
- Phase 2: 2 tasks - implement sync strategies and Claude-only adoption
- Phase 3: 2 tasks - finish nested-flow coverage and user-facing docs

**Total: 6 tasks**

Ready for code review and merge.

---

## References

- Design: not required for this quick-mode project
- Spec: not required for this quick-mode project
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
