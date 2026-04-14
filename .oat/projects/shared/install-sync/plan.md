---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-14
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p02']
oat_auto_review_at_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
oat_template_name: plan
---

# Implementation Plan: install-sync

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with review gates after implementation.

**Goal:** Ensure `oat tools install <pack>` auto-sync only mutates provider views and Codex project config for the canonical content that was just installed.

**Architecture:** Keep the fix centered in sync orchestration. The install command already passes installed canonical paths into `oat sync`; the remaining work is to apply that scope consistently during sync planning and extension generation.

**Tech Stack:** TypeScript CLI, Commander commands, sync engine planning, Vitest regression tests

**Commit Convention:** `{type}({scope}): {description}` - e.g. `fix(p01-t01): scope sync entries to install canonical set`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Scope Install-Triggered Sync

### Task p01-t01: Reproduce and lock down the planning gap

**Files:**

- Modify: `packages/cli/src/engine/compute-plan.test.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Write test (RED)**

Add focused regression coverage proving that when install-triggered canonical paths are supplied, sync planning does not generate entries or removals for unrelated canonical content.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts packages/cli/src/commands/sync/index.test.ts`
Expected: New assertions fail before implementation.

**Step 2: Implement (GREEN)**

Update sync planning inputs or plan construction so the install canonical filter is available to the full sync plan, not just stale-manifest removals.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts packages/cli/src/commands/sync/index.test.ts`
Expected: Scoped planning tests pass.

**Step 3: Refactor**

Keep the filter logic centralized and named consistently so install-triggered scoping is obvious at the sync boundary.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts packages/cli/src/commands/sync/index.test.ts`
Expected: No failures.

**Step 5: Commit**

```bash
git add packages/cli/src/engine/compute-plan.ts packages/cli/src/engine/compute-plan.test.ts packages/cli/src/commands/sync/index.ts packages/cli/src/commands/sync/index.test.ts
git commit -m "fix(p01-t01): scope install sync planning"
```

---

### Task p01-t02: Scope provider entry generation and removals to installed canonical paths

**Files:**

- Modify: `packages/cli/src/engine/compute-plan.ts`
- Modify: `packages/cli/src/engine/index.ts` (if needed for type flow)

**Step 1: Write test (RED)**

Expand coverage to assert that unrelated provider-view additions are excluded when sync is invoked with install canonical paths.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts`
Expected: Additions remain unscoped before the fix.

**Step 2: Implement (GREEN)**

Apply the canonical filter during entry generation as well as removals so install-triggered sync only touches the installed pack.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts`
Expected: Unrelated additions are gone.

**Step 3: Refactor**

Avoid duplicating canonical-path normalization between the addition and removal paths.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts`
Expected: No failures.

**Step 5: Commit**

```bash
git add packages/cli/src/engine/compute-plan.ts packages/cli/src/engine/compute-plan.test.ts
git commit -m "fix(p01-t02): scope install sync entries"
```

---

## Phase 2: Scope Command-Level Side Effects

### Task p02-t01: Prevent unrelated Codex config and provider writes during docs install

**Files:**

- Modify: `packages/cli/src/commands/tools/install/index.test.ts`
- Modify: `packages/cli/src/commands/tools/install/index.ts` (if needed)
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts` or its call site

**Step 1: Write test (RED)**

Add a command-level regression proving `oat tools install docs` does not add unrelated provider-view entries or Codex agent config when unrelated canonical content already exists.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/commands/tools/install/index.test.ts`
Expected: Test fails before the extension/config path is fully scoped.

**Step 2: Implement (GREEN)**

Thread the canonical scope through Codex extension planning so `.codex/config.toml` only changes for the installed canonical set.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/commands/tools/install/index.test.ts`
Expected: Command-level install regression passes.

**Step 3: Refactor**

Keep install command behavior thin; prefer to scope downstream planning rather than add pack-specific branching.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/commands/tools/install/index.test.ts`
Expected: No failures.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/install/index.ts packages/cli/src/commands/tools/install/index.test.ts packages/cli/src/providers/codex/codec/sync-extension.ts
git commit -m "fix(p02-t01): scope install sync codex updates"
```

---

### Task p02-t02: Run focused validation and release guardrails

**Files:**

- Modify: project artifacts only if verification reveals needed updates

**Step 1: Write test (RED)**

N/A - verification task

**Step 2: Implement (GREEN)**

Run the focused CLI test set, formatting if needed, and the publishable-package release validation required for CLI changes.

Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts packages/cli/src/commands/sync/index.test.ts packages/cli/src/commands/tools/install/index.test.ts`
Expected: All targeted tests pass.

**Step 3: Refactor**

Address any formatting or low-risk cleanup that falls out of the test run.

**Step 4: Verify**

Run: `pnpm release:validate`
Expected: Validation passes for publishable packages.

**Step 5: Commit**

```bash
git add packages/cli
git commit -m "test(p02-t02): verify install sync scoping"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                       |
| ------ | -------- | ----------- | ---------- | ---------------------------------------------- |
| p01    | code     | pending     | -          | -                                              |
| p02    | code     | pending     | -          | -                                              |
| final  | code     | fixes_added | 2026-04-14 | reviews/archived/final-review-2026-04-14-v3.md |
| spec   | artifact | pending     | -          | -                                              |
| design | artifact | pending     | -          | -                                              |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - scope install-triggered sync planning to the canonical paths passed by install
- Phase 2: 2 tasks - scope Codex side effects and verify the CLI package changes end to end
- Phase 3: 2 tasks - close the final review gaps in partial Codex config creation and existing-config mutation

**Total: 6 tasks**

Ready for implementation, review, and a follow-up PR.

---

## Phase 3: Review Fixes

### Task p03-t01: (review) Prevent empty-role partial sync from creating codex config

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`

**Step 1: Understand the issue**

Review finding: partial install-triggered sync still creates `.codex/config.toml` when the allowed canonical scope contains no agent content.
Location: `packages/cli/src/providers/codex/codec/sync-extension.ts`

**Step 2: Implement fix**

Make `computeCodexProjectExtensionPlan` a true no-op for partial sync when the allowed canonical scope yields zero desired Codex roles and there is no existing managed Codex state to reconcile. Preserve the existing partial-sync rule that unrelated managed roles must not be treated as stale.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts`
Expected: Partial-sync Codex planning no longer creates `.codex/config.toml` for skills-only install scopes, and targeted regressions pass.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/codex/codec/sync-extension.ts packages/cli/src/providers/codex/codec/sync-extension.test.ts packages/cli/src/commands/sync/index.test.ts packages/cli/src/commands/tools/install/index.test.ts
git commit -m "fix(p03-t01): keep codex config scoped to install content"
```

---

### Task p03-t02: (review) Avoid mutating existing user Codex config on zero-role partial sync

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`

**Step 1: Understand the issue**

Review finding: skills-only partial sync still updates an existing user `.codex/config.toml` even when the allowed canonical scope contains zero Codex-managed agents.
Location: `packages/cli/src/providers/codex/codec/sync-extension.ts`

**Step 2: Implement fix**

Treat partial sync with zero desired Codex roles as a no-op when there is no existing OAT-managed Codex state to reconcile. Preserve the existing partial-sync rule that unrelated managed roles stay untouched, and avoid adding `agents = { }` or `features.multi_agent = true` to user config for skills-only install scopes.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/engine/compute-plan.test.ts`
Expected: Partial-sync Codex planning no longer updates existing user config for skills-only install scopes, and the targeted regressions pass.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/codex/codec/sync-extension.ts packages/cli/src/providers/codex/codec/sync-extension.test.ts
git commit -m "fix(p03-t02): avoid codex config updates on zero-role partial sync"
```

---

## References

- Discovery: `discovery.md`
- Previous merged fix context: `20260414-tool-install-ux.md`
