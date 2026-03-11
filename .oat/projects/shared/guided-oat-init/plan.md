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

### Task p01-t06: (review) Fix provider sync to use installed CLI binary

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`

**Step 1: Understand the issue**

Review finding: `runProviderSync` executes `pnpm run cli -- sync --scope project` which only works inside the OAT monorepo workspace. In normal repos there is no `cli` script, so it fails.
Location: `packages/cli/src/commands/init/index.ts:331`

**Step 2: Implement fix**

Change the default `runProviderSync` implementation from:

```typescript
execSync('pnpm run cli -- sync --scope project', {
  cwd: projectRoot,
  stdio: 'inherit',
});
```

to:

```typescript
execSync('oat sync --scope project', { cwd: projectRoot, stdio: 'inherit' });
```

This uses the installed `oat` binary which is the intended v1 approach per discovery.md.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test && pnpm lint && pnpm type-check`
Expected: All pass (tests mock `runProviderSync` so the change is safe)

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/index.ts
git commit -m "fix(p01-t06): use installed oat binary for provider sync"
```

---

### Task p01-t07: (review) Enrich guided setup summary with provider list and local path counts

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`
- Modify: `packages/cli/src/commands/init/guided-setup.test.ts`

**Step 1: Understand the issue**

Review finding: Plan requires summary to show `Providers: {list or "skipped"}` and `Local paths: {count added, count existing}`. Current implementation only shows `Tool packs: installed/skipped`, `Local paths: N configured/skipped`, `Provider sync: done/skipped`.
Location: `packages/cli/src/commands/init/index.ts:492`

**Step 2: Implement fix**

In `runGuidedSetupImpl`:

- Track the count of newly added paths vs already-existing paths through the local paths step
- Add a `Providers` line to the summary using the adapters from the init context (detected providers)
- Change local paths line from `N configured` to `N added, M existing`

Update summary output to match plan:

```
  Providers:      Claude Code (or "skipped" if none detected)
  Tool packs:     installed / skipped
  Local paths:    N added, M existing (or "skipped")
  Provider sync:  done / skipped
```

**Step 3: Update tests**

- Update summary assertions in `index.test.ts` to check for the enriched output fields
- Update summary assertions in `guided-setup.test.ts` to check for provider and local path detail

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test && pnpm lint && pnpm type-check`
Expected: All pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "fix(p01-t07): enrich guided setup summary with provider and path detail"
```

### Task p01-t08: (review) Use configured providers and scoped local-path counts in summary

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`
- Modify: `packages/cli/src/commands/init/guided-setup.test.ts`

**Step 1: Understand the issue**

Review finding: The guided summary populates `Providers` from `adapter.detect()` (all detectable providers) instead of from the sync config (user-enabled providers). The `Local paths` existing-count uses `resolveLocalPaths(config)` which includes all stored local paths (including custom ones), not just the guided choice set that was already present.
Location: `packages/cli/src/commands/init/index.ts:505`

**Step 2: Fix provider line**

In `runGuidedSetupImpl`, replace the `adapter.detect()` loop with config-aware detection:

- Load sync config via `dependencies.loadSyncConfig(join(projectRoot, '.oat', 'sync', 'config.json'))`
- Call `dependencies.getConfigAwareAdapters(adapters, projectRoot, syncConfig)`
- Use `resolution.activeAdapters` display names for the summary

**Step 3: Fix local paths existing count**

Change `existingCount` from `existingPaths.size` (all config local paths) to the count of existing paths that are in the guided choice set:

```typescript
const guidedPathValues = new Set(LOCAL_PATH_CHOICES.map((c) => c.value));
const existingGuidedCount = [...existingPaths].filter((p) =>
  guidedPathValues.has(p),
).length;
```

**Step 4: Add test coverage**

In `index.test.ts`:

- Add test: detectable provider that user disabled → should NOT appear in summary Providers line
- Add test: config has custom local paths beyond the guided set → existing count should only reflect guided paths

In `guided-setup.test.ts`:

- Verify provider summary uses config-aware adapters, not raw detection

**Step 5: Verify**

Run: `pnpm --filter @oat/cli test && pnpm lint && pnpm type-check`
Expected: All pass

**Step 6: Commit**

```bash
git add packages/cli/src/commands/init/
git commit -m "fix(p01-t08): use configured providers and scoped path counts in summary"
```

---

## Reviews

| Scope | Type     | Status  | Date       | Artifact                                   |
| ----- | -------- | ------- | ---------- | ------------------------------------------ |
| plan  | artifact | passed  | 2026-03-10 | reviews/artifact-plan-review-2026-03-10.md |
| p01   | code     | pending | -          | -                                          |
| final | code     | passed  | 2026-03-11 | reviews/final-review-2026-03-11.md         |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 8 tasks — 5 feature + 3 review fixes

**Total: 8 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Init command: `packages/cli/src/commands/init/index.ts`
- Init tools: `packages/cli/src/commands/init/tools/index.ts`
- Local paths: `packages/cli/src/commands/local/`
- Shared prompts: `packages/cli/src/commands/shared/shared.prompts.ts`
