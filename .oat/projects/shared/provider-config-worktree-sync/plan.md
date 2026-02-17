---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-17
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["p06"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/2026-02-17-provider-config-worktree-sync.md
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: provider-config-worktree-sync

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Add explicit provider enablement configuration and worktree-safe sync behavior so project sync works even when provider directories are initially absent.

**Architecture:** Extend sync config persistence and provider activation logic, then wire config-aware behavior into `providers`, `init`, and `sync` command surfaces with tests and docs.

**Tech Stack:** TypeScript, Commander, Vitest, existing CLI config/engine/provider modules.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add sync config writer`

## Planning Checklist

- [x] Confirmed HiL checkpoints with user (`[]` for this imported execution plan)
- [x] Set `oat_plan_hil_phases` in frontmatter

---

## Phase 1: Config Foundation and Provider Resolution

### Task p01-t01: Add sync config write/update utilities

**Files:**
- Modify: `packages/cli/src/config/sync-config.ts`
- Modify: `packages/cli/src/config/index.ts`
- Modify: `packages/cli/src/config/sync-config.test.ts`

**Step 1: Write test (RED)**

Add tests proving provider `enabled` updates are persisted and unrelated fields (`defaultStrategy`, provider `strategy`) are preserved.

Run: `pnpm --filter @oat/cli test packages/cli/src/config/sync-config.test.ts`
Expected: New cases fail before implementation.

**Step 2: Implement (GREEN)**

Add save/update APIs (for example: `saveSyncConfig`, `setProviderEnabled`) with directory creation and stable JSON output.

Run: `pnpm --filter @oat/cli test packages/cli/src/config/sync-config.test.ts`
Expected: New and existing config tests pass.

**Step 3: Refactor**

Keep read/write normalization shared to avoid duplication.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors.

**Step 5: Commit**

```bash
git add packages/cli/src/config
git commit -m "feat(p01-t01): add sync config write utilities"
```

---

### Task p01-t02: Add config-aware provider activation utility

**Files:**
- Modify: `packages/cli/src/providers/shared/adapter.utils.ts`
- Modify: `packages/cli/src/providers/shared/adapter.types.test.ts`
- Modify: `packages/cli/src/providers/shared/index.ts`

**Step 1: Write test (RED)**

Add utility tests for provider states:
- `enabled:true` active,
- `enabled:false` inactive even when detected,
- unset + detected active,
- unset + not detected inactive.

Run: `pnpm --filter @oat/cli test packages/cli/src/providers/shared/adapter.types.test.ts`
Expected: New cases fail initially.

**Step 2: Implement (GREEN)**

Implement config-aware adapter selection helper that returns active adapters plus mismatch metadata for sync/init messaging.

Run: `pnpm --filter @oat/cli test packages/cli/src/providers/shared/adapter.types.test.ts`
Expected: Provider utility tests pass.

**Step 3: Refactor**

Minimize breaking changes by preserving current `getActiveAdapters` behavior where still needed.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/shared
git commit -m "feat(p01-t02): add config-aware provider resolution"
```

---

## Phase 2: Provider Management Command

### Task p02-t01: Implement `oat providers set`

**Files:**
- Create: `packages/cli/src/commands/providers/set/index.ts`
- Create: `packages/cli/src/commands/providers/set/index.test.ts`
- Modify: `packages/cli/src/commands/providers/index.ts`

**Step 1: Write test (RED)**

Add command tests for:
- valid enable/disable update,
- unknown provider rejection,
- overlap rejection,
- missing flags rejection,
- `--scope user|all` rejection.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/providers/set/index.test.ts`
Expected: New tests fail before command exists.

**Step 2: Implement (GREEN)**

Add `providers set --enabled <csv> --disabled <csv>` and wire config writes under project scope.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/providers/set/index.test.ts`
Expected: Command tests pass.

**Step 3: Refactor**

Extract provider-name parsing/validation helpers for reuse across init/sync messages.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/providers
git commit -m "feat(p02-t01): add providers set command"
```

---

### Task p02-t02: Register command and update help snapshots

**Files:**
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/commands/index.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Write test (RED)**

Add/adjust snapshots and command registration expectations for `providers set`.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/help-snapshots.test.ts`
Expected: Snapshot/integration failures.

**Step 2: Implement (GREEN)**

Wire `providers set` into command tree and update expected help output.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/index.test.ts packages/cli/src/commands/commands.integration.test.ts`
Expected: Tests pass.

**Step 3: Refactor**

Keep provider command index clean and grouped by subcommand intent.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/providers`
Expected: All provider command tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands
git commit -m "test(p02-t02): register providers set in command surfaces"
```

---

## Phase 3: Init Provider Selection and Persistence

### Task p03-t01: Add interactive provider prompt in init

**Files:**
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Write test (RED)**

Add init tests for interactive multiselect with defaults from detected+enabled providers.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/init/index.test.ts`
Expected: New prompt/persistence cases fail.

**Step 2: Implement (GREEN)**

In project init scope, prompt for known providers and persist explicit `true/false` for all known providers in `.oat/sync/config.json`.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/init/index.test.ts`
Expected: Init tests pass.

**Step 3: Refactor**

Share provider list and default-selection logic with sync where practical.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init
git commit -m "feat(p03-t01): persist provider selection during init"
```

---

### Task p03-t02: Add non-interactive + scope-all safeguards

**Files:**
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Write test (RED)**

Cover:
- non-interactive init emits guidance and avoids config mutation,
- `--scope all` only applies provider prompt/write to project scope.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/init/index.test.ts`
Expected: New safeguards fail initially.

**Step 2: Implement (GREEN)**

Gate provider writes to interactive + project scope behavior and add explicit guidance output.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/init/index.test.ts`
Expected: Tests pass.

**Step 3: Refactor**

Keep init flow readable by extracting provider-config branch into helper.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/init/index.test.ts`
Expected: Stable green test run.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init
git commit -m "fix(p03-t02): guard provider config writes in init"
```

---

## Phase 4: Sync Mismatch Detection and Remediation

### Task p04-t01: Add interactive sync mismatch prompt and persistence

**Files:**
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Write test (RED)**

Add sync tests for detected providers that are unset/disabled in interactive mode:
- prompts to enable,
- accepted providers are persisted before planning,
- declined unset providers can be persisted `enabled:false`.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/sync/index.test.ts`
Expected: New interaction tests fail before implementation.

**Step 2: Implement (GREEN)**

Add mismatch analysis and interactive remediation flow before computing sync plans.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/sync/index.test.ts`
Expected: Sync command tests pass.

**Step 3: Refactor**

Move mismatch prompt/persistence logic into isolated helper for maintainability.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/sync
git commit -m "feat(p04-t01): add interactive sync provider remediation"
```

---

### Task p04-t02: Add non-interactive mismatch warnings and summary output

**Files:**
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Write test (RED)**

Add tests for non-interactive behavior:
- warns and continues,
- does not mutate config,
- reports configured-vs-detected provider context in output/json.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/sync/index.test.ts`
Expected: New warning/output cases fail.

**Step 2: Implement (GREEN)**

Emit remediation guidance and keep planning limited to active providers without config mutation.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/sync/index.test.ts`
Expected: Tests pass.

**Step 3: Refactor**

Standardize warning text so docs and tests reference one stable message pattern.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/sync/index.test.ts`
Expected: Stable green test run.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/sync
git commit -m "feat(p04-t02): add non-interactive sync mismatch warnings"
```

---

## Phase 5: Docs, AGENTS Guidance, and Worktree Script

### Task p05-t01: Add `worktree:init` script and update docs

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/oat/cli/provider-interop/overview.md`
- Modify: `docs/oat/reference/troubleshooting.md`

**Step 1: Write test (RED)**

If docs snapshot checks exist, add/adjust expected command references.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/help-snapshots.test.ts`
Expected: Fails if help text changed and snapshot not updated.

**Step 2: Implement (GREEN)**

Add root script:
`"worktree:init": "pnpm install && pnpm run build && pnpm run cli sync --scope project --apply"`

Document provider config workflow and worktree bootstrap usage.

Run: `pnpm --filter @oat/cli test packages/cli/src/commands/help-snapshots.test.ts`
Expected: Snapshot tests pass.

**Step 3: Refactor**

Keep docs wording consistent with actual command names and flags.

**Step 4: Verify**

Run: `pnpm run cli -- help providers`
Expected: Command docs align with implemented command surface.

**Step 5: Commit**

```bash
git add package.json README.md docs/oat
git commit -m "docs(p05-t01): add worktree init bootstrap guidance"
```

---

### Task p05-t02: Add AGENTS worktree-switch instruction

**Files:**
- Modify: `AGENTS.md`

**Step 1: Write test (RED)**

N/A (documentation-only task).

**Step 2: Implement (GREEN)**

Add explicit instruction in AGENTS workflow section: after switching/creating a worktree, run `pnpm run worktree:init`.

**Step 3: Refactor**

Place instruction near development workflow/agent workflow guidance for discoverability.

**Step 4: Verify**

Run: `rg -n "worktree:init" AGENTS.md README.md docs/oat`
Expected: AGENTS and docs consistently reference `worktree:init`.

**Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs(p05-t02): add worktree switch init instruction"
```

---

## Phase 6: End-to-End Verification and Finalization

### Task p06-t01: Run full verification suite and finalize import artifacts

**Files:**
- Modify: `plan.md` (reviews rows when needed)
- Modify: `implementation.md` (execution log pointer checks if needed)

**Step 1: Write test (RED)**

N/A (verification and artifact consistency task).

**Step 2: Implement (GREEN)**

Run verification suite:
- `pnpm --filter @oat/cli test`
- `pnpm --filter @oat/cli build`
- `pnpm --filter @oat/cli type-check`

Confirm `implementation.md` frontmatter keeps `oat_current_task_id: p01-t01` as next task pointer.

**Step 3: Refactor**

Adjust plan wording only if tests reveal mismatched command/help expectations.

**Step 4: Verify**

Re-run any failed subset until all checks pass.

**Step 5: Commit**

```bash
git add .
git commit -m "chore(p06-t01): verify provider config and sync workflow changes"
```

---

## Reviews

Track review artifacts here after running `oat-project-review-provide` and `oat-project-review-receive`.

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| p05 | code | pending | - | - |
| p06 | code | pending | - | - |
| final | code | pending | - | - |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: 2 tasks - config persistence and provider resolution foundation
- Phase 2: 2 tasks - provider command and registration/help coverage
- Phase 3: 2 tasks - init provider prompt and persistence safeguards
- Phase 4: 2 tasks - sync mismatch prompting and non-interactive warnings
- Phase 5: 2 tasks - docs, AGENTS guidance, and `worktree:init` script
- Phase 6: 1 task - end-to-end verification and finalization

**Total: 11 tasks**

Ready for implementation with `oat-project-implement`.

---

## References

- Imported Source: `references/imported-plan.md`
- External Plan Source: `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/2026-02-17-provider-config-worktree-sync.md`
- Discovery: `discovery.md`
