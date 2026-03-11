---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-10
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: guided-oat-init

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Enhance `oat init` with an interactive guided setup flow that configures tool packs, local paths, and provider sync in a single session.

**Architecture:** Extend the existing `oat init` command handler (`packages/cli/src/commands/init/index.ts`) with a post-init guided setup phase. Reuse existing programmatic functions (`runInitTools`, `addLocalPaths`, `applyGitignore`) where exported. For provider sync, shell out via `child_process.execSync` in v1 since the sync command doesn't expose a reusable entry point (follow-up: extract `runSyncCommand` helper).

**Tech Stack:** TypeScript, Commander.js, @inquirer/prompts (via `shared.prompts.ts`)

**Commit Convention:** `feat(p01-tNN): {description}` - e.g., `feat(p01-t01): add --setup flag to oat init`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Guided Setup Flow

### Task p01-t01: Add `--setup` flag and guided entry point

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`

**Step 1: Write test (RED)**

Add test cases to the init command test file:

- `--setup` flag is accepted and triggers guided flow
- Fresh init (no `.oat/` existed) prompts for guided setup
- Existing `.oat/` without `--setup` skips guided setup
- Non-interactive mode never enters guided setup

Run: `pnpm --filter @oat/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

- Add `--setup` option to `InitOptions` interface and Commander option registration
- Add `setup?: boolean` to `InitOptions`
- In `runInitCommand`, after existing init logic completes:
  - Detect `freshInit` (`.oat/` was just created in this run, or canonical dirs didn't exist before)
  - If `context.interactive && (options.setup || freshInit)`:
    - If `freshInit`: prompt "Would you like to run guided setup? [yes/no]"
    - If `--setup`: skip the prompt, go directly into guided flow
    - Call `runGuidedSetup(context, dependencies)` if confirmed

Run: `pnpm --filter @oat/cli test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "feat(p01-t01): add --setup flag and guided entry point to oat init"
```

---

### Task p01-t02: Implement guided setup — tool packs step

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.ts` (export `runInitTools`)

**Step 1: Write test (RED)**

- Test that guided setup calls tool packs installation when user confirms
- Test that guided setup skips tool packs when user declines

Run: `pnpm --filter @oat/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

- Export `runInitTools` from `tools/index.ts` so the parent init can call it programmatically
- In `runGuidedSetup`:
  - Step 1 banner: `[1/4] Tool packs…`
  - Ask: "Install tool packs (skills for workflows, ideas, utilities)? [yes/no]"
  - If yes: call `runInitTools(guidedContext, toolsDependencies)` where `guidedContext` is a copy of `context` with `scope` forced to `'project'` — this ensures `resolveUserEligibleScope` returns `'project'` without prompting for user vs project scope
  - If no: skip

Run: `pnpm --filter @oat/cli test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "feat(p01-t02): add tool packs step to guided setup"
```

---

### Task p01-t03: Implement guided setup — local paths step

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`

**Step 1: Write test (RED)**

- Test that local paths multi-select is presented with default choices
- Test that selected paths are added via `addLocalPaths` and gitignore is updated via `applyGitignore`
- Test that pre-existing local paths are shown as already checked
- Test that user can skip without adding any paths

Run: `pnpm --filter @oat/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

- In `runGuidedSetup`:
  - Step 2 banner: `[2/4] Local paths (gitignored artifacts)…`
  - Read current config with `readOatConfig` to get existing `localPaths`
  - Present multi-select with choices:
    - `.oat/**/analysis` — "Analysis artifacts" (checked by default)
    - `.oat/**/pr` — "PR description files" (checked by default)
    - `.oat/**/reviews` — "Review artifacts" (checked by default)
    - `.oat/ideas` — "Ideas and brainstorms" (checked by default)
  - Pre-check any choices that already exist in config
  - Compute the delta (new paths not already in config)
  - If delta is non-empty: call `addLocalPaths(repoRoot, delta)` then `applyGitignore(repoRoot, allPaths)`
  - Report what was added
  - Note in output: "Add custom local paths anytime with `oat local add <path>`"

Run: `pnpm --filter @oat/cli test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "feat(p01-t03): add local paths multi-select to guided setup"
```

---

### Task p01-t04: Implement guided setup — provider sync step and summary

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`

**Step 1: Write test (RED)**

- Test that provider sync is offered and runs when confirmed
- Test that summary output includes all configured items
- Test that skipped steps are reflected in summary

Run: `pnpm --filter @oat/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

- In `runGuidedSetup`:
  - Step 3 banner: `[3/4] Provider sync…`
  - Ask: "Sync provider project views now? [yes/no]"
  - If yes: shell out via `child_process.execSync('pnpm run cli -- sync --scope project', { stdio: 'inherit' })` (v1 approach — the sync command doesn't export a reusable entry point; extracting one is a follow-up)
  - Step 4 banner: `[4/4] Setup complete`
  - Print summary:

    ```
    Guided setup complete.

      Providers:    {list or "skipped"}
      Tool packs:   {list or "skipped"}
      Local paths:  {count added, count existing}
      Provider sync: {done or "skipped"}

    Next steps:
      - Run `oat init tools` to customize tool pack selection
      - Run `oat local add <path>` to add custom local paths
      - Run `oat local status` to verify gitignore state
      - Start a project: `oat-project-quick-start` or `oat-project-new`
    ```

Run: `pnpm --filter @oat/cli test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "feat(p01-t04): add provider sync step and summary to guided setup"
```

---

### Task p01-t05: Integration test — full guided flow

**Files:**

- Create: `packages/cli/src/commands/init/guided-setup.test.ts`

**Step 1: Write test**

Write integration-level tests using mocked dependencies:

- Full happy path: fresh init → guided setup → tools → local paths → sync → summary
- `--setup` on existing repo: skips fresh-init prompt, enters guided directly
- Partial flow: user skips tools but configures local paths
- Non-interactive: guided setup is never triggered

Run: `pnpm --filter @oat/cli test`
Expected: Tests pass

**Step 2: Verify**

Run: `pnpm lint && pnpm type-check && pnpm --filter @oat/cli test`
Expected: All pass

**Step 3: Commit**

```bash
git add packages/cli/src/commands/init/guided-setup.test.ts
git commit -m "test(p01-t05): add integration tests for guided setup flow"
```

---

## Reviews

| Scope | Type     | Status  | Date       | Artifact                                   |
| ----- | -------- | ------- | ---------- | ------------------------------------------ |
| plan  | artifact | passed  | 2026-03-10 | reviews/artifact-plan-review-2026-03-10.md |
| p01   | code     | pending | -          | -                                          |
| final | code     | pending | -          | -                                          |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks — Add `--setup` flag, tool packs step, local paths multi-select, provider sync + summary, integration tests

**Total: 5 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Init command: `packages/cli/src/commands/init/index.ts`
- Init tools: `packages/cli/src/commands/init/tools/index.ts`
- Local paths: `packages/cli/src/commands/local/`
- Shared prompts: `packages/cli/src/commands/shared/shared.prompts.ts`
