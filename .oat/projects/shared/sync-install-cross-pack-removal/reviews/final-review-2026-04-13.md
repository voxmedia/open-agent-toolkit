---
oat_generated: true
oat_generated_at: 2026-04-13
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/sync-install-cross-pack-removal
---

# Code Review: final

**Reviewed:** 2026-04-13
**Scope:** final (Phase 1: p01-t01, p01-t02, p01-t03)
**Workflow mode:** quick
**Files reviewed:** 26 (24 tracked modifications + 2 untracked additions)
**Commits:** 0 feature commits since base `270c1d80` (all changes live in the working tree)

## Summary

The conservative engine-side fix in `computeSyncPlan` correctly narrows install-triggered removals via a new optional `allowedRemovalCanonicalPaths` filter, with end-to-end plumbing from each tool-pack install command through `autoSync` → the hidden `--install-canonical` sync option → the planner. Tests cover the planner guard, sync option forwarding, auto-sync forwarding, and install-to-auto-sync forwarding; the wider CLI suite (154 files / 1279 tests), lint, and type-check all pass. The most notable gaps are commit hygiene (no per-task commits) and a behavioral asymmetry across the eight install call-sites: the four "pack-granularity" subcommands (`core`, `ideas`, `workflows`, `project-management`) set the install filter on success even on cancel-of-force-confirm paths, while the three "skill-granularity" subcommands (`docs`, `utility`, `research`) set it only after a real install call.

## Findings

### Critical

None.

### Important

- **Regression test does not explicitly pin the pre-fix bug shape** (`packages/cli/src/engine/compute-plan.test.ts:185-215`)
  - Issue: The new test `skips removals for stale manifest entries outside install-triggered canonical filters` only asserts the _new_ filtered behavior. It passes `allowedRemovalCanonicalPaths` and checks that unrelated manifest entries are preserved. Without a paired assertion confirming that the _same inputs without the filter_ still produce a removal (i.e. the original bug shape), future refactors could silently break the fix without surfacing a failure, because the guard test would continue to pass against any filtering logic, not specifically the one that fixes the bug. Discovery.md success criteria explicitly requires "A regression test fails before the fix and passes after it."
  - Fix: Either (a) add a second `it(...)` next to the new test that omits `allowedRemovalCanonicalPaths`, uses the same docs-only canonical + stale-workflow-manifest fixture, and asserts `plan.removals.length === 1` to pin the unfiltered semantics, or (b) rewrite the new test as a `it.each([{filter: undefined, expect: 1}, {filter: ['.agents/skills/oat-docs-analyze'], expect: 0}])` parametric form so both branches are explicit.
  - Requirement: `discovery.md` Success Criteria #3 (regression test fails before fix and passes after)

- **Install-filter semantics diverge across the 8 init-tools call sites when the user cancels after selecting a pack** (`packages/cli/src/commands/init/tools/ideas/index.ts:155-158`, `packages/cli/src/commands/init/tools/workflows/index.ts:149-151`, `packages/cli/src/commands/init/tools/project-management/index.ts:100-104`, `packages/cli/src/commands/init/tools/core/index.ts:120-122`, contrasted with `packages/cli/src/commands/init/tools/docs/index.ts:159`, `packages/cli/src/commands/init/tools/utility/index.ts:158`, `packages/cli/src/commands/init/tools/research/index.ts:163-166`)
  - Issue: The "pack-granularity" subcommands (`core`, `ideas`, `workflows`, `project-management`) call `setInstalledCanonicalPaths(command, canonicalPathsForPack(<pack>))` after the inner handler guarded only by `process.exitCode === 0 || process.exitCode === undefined`. When the user answers "no" to the `--force` overwrite confirmation in `ideas` or `workflows`, the handler sets `exitCode = 0` and returns without installing anything, yet the outer guard still stamps the pack's full canonical list onto the command. The subsequent auto-sync then runs with a filter claiming all those canonicals were just installed. In contrast, `docs`, `utility`, and `research` set the filter _inside_ the try-block, after `installX(...)` has actually returned (and with `canonicalSkillPaths(selectedSkills)` reflecting the real selection). The asymmetry is not load-bearing for the bug the project fixes (the filter only narrows removal scope, so a too-broad-for-the-actual-install filter is still strictly better than no filter), but it can leak "claimed installed" paths into the sync filter that were never touched, which is the mirror image of the stale-manifest symptom the project set out to fix.
  - Fix: Thread the "did we actually install" signal out of the inner handler. Two small options:
    1. Have `runInitToolsIdeas` / `runInitToolsWorkflows` / `runInitToolsProjectManagement` / `runInitToolsCore` return `true` on the real success path and `false` on cancel-of-force-confirm, and only call `setInstalledCanonicalPaths` when the return is `true`.
    2. Move the `setInstalledCanonicalPaths` call _inside_ the try block next to the successful `installX(...)` call (mirroring the docs/utility/research pattern), so the cancel-return branch naturally skips the stamp.
  - Requirement: Plan task p01-t02 "while preserving legitimate removals" / discovery.md "Over-suppressing removals" risk.

### Minor

- **Plan commit convention not followed — no per-task commits** (working tree vs `270c1d80`)
  - Issue: `plan.md` specifies three commits (`chore(oat): capture quick plan ...` for p01-t01, `fix(p01-t02): guard stale manifest removals`, `test(p01-t03): cover install-triggered sync guard`). Only the first exists (as the base commit). All subsequent code and test changes for p01-t02 and p01-t03 are uncommitted in the working tree. `implementation.md` reflects this with `**Commit:** -` on every task.
  - Fix: Before opening the PR, split the working tree into the two planned commits:

    ```bash
    git add packages/cli/src/engine/compute-plan.ts packages/cli/src/engine/compute-plan.test.ts
    git commit -m "fix(p01-t02): guard stale manifest removals"

    git add packages/cli/src/commands/tools/shared/auto-sync.ts \
            packages/cli/src/commands/tools/shared/auto-sync.test.ts \
            packages/cli/src/commands/tools/shared/install-sync-context.ts \
            packages/cli/src/commands/tools/install/index.ts \
            packages/cli/src/commands/tools/install/index.test.ts \
            packages/cli/src/commands/sync/index.ts \
            packages/cli/src/commands/sync/index.test.ts \
            packages/cli/src/commands/sync/sync.types.ts \
            packages/cli/src/commands/init/tools/
    git commit -m "test(p01-t03): cover install-triggered sync guard"
    ```

    Also record the commit SHAs into `implementation.md` in the `**Commit:** -` slots.

  - Requirement: `plan.md` Commit Convention and per-task `Step 5: Commit` directives.

- **`--install-canonical` option is user-invocable and unvalidated despite being marked as internal** (`packages/cli/src/commands/sync/index.ts:345-353`)
  - Issue: The hidden option parser accepts any `<path>` string with no validation and appends it into `allowedRemovalCanonicalPaths`. It is documented as "Internal install sync filter" and hidden via `.hideHelp()`, but a user who runs `oat sync --install-canonical foo/bar --install-canonical ../../etc` directly will silently suppress all removals except for the paths they pass. This is mostly a footgun rather than a security issue (the planner still normalizes and filters by string equality against manifest entries, and the worst-case outcome is "fewer removals than expected"). But the contract in the plan is "install-triggered" only.
  - Suggestion: Either (a) add a lightweight validation that each value matches `/^\.agents\/(skills|agents|rules)\/[^/\\]+/` and throw `CliError` otherwise, or (b) accept the current surface but add a short `// Internal: populated by tools install post-action; validation intentionally elided because values originate from canonicalPathsForPack.` comment next to the `addOption` call to document why validation is skipped. The current code has neither.

- **`install-sync-context.ts` lives under `tools/shared/` but imports from `init/tools/shared/skill-manifest`** (`packages/cli/src/commands/tools/shared/install-sync-context.ts:1-11`)
  - Issue: The helper is placed in `commands/tools/shared/` (the "post-install tool operations" tree), but it pulls pack → canonical-path mappings from `commands/init/tools/shared/skill-manifest` (the "install-time manifest" tree). Since the install subcommands in `init/tools/*` also import `setInstalledCanonicalPaths` from this new shared module, we now have a cross-tree import where `init/tools/*` → `tools/shared/install-sync-context` → `init/tools/shared/skill-manifest`. This is not a cycle, but it makes the dependency direction noisy.
  - Suggestion: Consider relocating `install-sync-context.ts` to `commands/init/tools/shared/install-sync-context.ts` next to `skill-manifest.ts`, and have `commands/tools/install/index.ts` import from there via the `@commands/init/tools/shared/install-sync-context` alias. That also matches the `init/tools/*` call-sites which import it today.

- **Regression test uses `createTestAdapter()` but doesn't assert the manifest entry's provider is in `activeProviderNames`** (`packages/cli/src/engine/compute-plan.test.ts:185-215`)
  - Issue: The test's manifest entry has `provider: 'claude'` and the test adapter is the default `claude`-like adapter (see test helpers). Because the planner skips manifest entries whose provider is not `activeProviderNames`, if the test adapter's name ever drifts away from `claude`, the assertion `plan.removals === []` will become a trivial pass (always-empty due to filtering on line 374-377 of `compute-plan.ts`, not the new guard). Today it is correct.
  - Suggestion: Add a comment in the test noting the adapter-provider alignment requirement, or extract a `createTestAdapter('claude')` explicit factory to make the coupling obvious.

- **`implementation.md` still has the `in_progress` state for `oat_phase` / `oat_phase_status` but the project is complete** — wait, re-reading: `implementation.md` says `oat_status: complete` and `oat_phase_status: complete`; state.md says `oat_phase: implement`, `oat_phase_status: complete`. Withdrawing — no issue.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md` (spec/design N/A in quick mode).

### Requirements Coverage

| Requirement (from discovery.md)                                                                                   | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reproduction confirms unrelated-pack removals are caused by stale manifest entries plus missing canonical content | implemented | `compute-plan.test.ts:185-215` exercises the planner-level repro (docs-only canonical + stale workflow manifest entry). The test asserts only the post-fix behavior — see Important finding above.                                                                                                                                                                                                                                                                                    |
| `oat tools install docs` no longer plans or applies removals for unrelated packs in that scenario                 | implemented | Install → auto-sync → `--install-canonical` → `computeSyncPlan({allowedRemovalCanonicalPaths})` chain is complete. The `removalFilter` in `compute-plan.ts:286-292, 387-392` excludes unrelated manifest entries.                                                                                                                                                                                                                                                                     |
| Regression test fails before the fix and passes after it                                                          | partial     | Test exists and passes; it would have failed to compile before the fix (because the param didn't exist), which is a weak form of the guarantee. Strengthen per Important finding.                                                                                                                                                                                                                                                                                                     |
| Do not change tool-pack manifests such as `DOCS_SKILLS` or `WORKFLOW_SKILLS`                                      | satisfied   | No changes to `skill-manifest.ts` lists (only an added `RESEARCH_AGENTS` export reference in `research/index.ts`, which was already exported).                                                                                                                                                                                                                                                                                                                                        |
| Keep the fix limited to the smallest viable engine/install boundary                                               | partial     | The engine change is minimal (~10 lines). The boundary surface grew larger than "engine only" to include: new `install-sync-context.ts` helper, sync-command hidden option, 8 init/tools call sites, auto-sync dep signature. Per discovery Option B vs A, this drift toward Option A plumbing happened; implementation.md notes this ("No design deltas"). Acceptable, but worth flagging that Option B's spirit ("small engine-side guard") became Option A's plumbing in practice. |
| Direct full `oat sync` deletion behavior remains unchanged                                                        | satisfied   | When no `--install-canonical` is passed, `options.installCanonical?.length` is 0 → `undefined` passed to `runSyncCommand` → `allowedRemovalCanonicalPaths` is `undefined` → `removalFilter` is `null` → old removal logic runs unchanged. Existing test at `compute-plan.test.ts:157-183` still pins this.                                                                                                                                                                            |
| Version lockstep bump across public packages                                                                      | satisfied   | `cli` / `control-plane` / `docs-config` / `docs-theme` / `docs-transforms` all bumped `0.0.32 → 0.0.33` in `package.json`. `assets/public-package-versions.json` (intentionally excludes `control-plane` per `bundle-assets.sh:88`) also moves to 0.0.33 for the other four. Matches `public-package-contract.ts` lockstep list.                                                                                                                                                      |

### Extra Work (not in declared requirements)

- **New shared helper `install-sync-context.ts`** — necessary glue for the chosen architecture; not strictly "engine-only" per Option B but justified.
- **Renamed `createToolsInstallCommand` to accept `createBaseCommand` override** (`packages/cli/src/commands/tools/install/index.ts:39-42`) — added to make the install command testable without dragging in the real `createInitToolsCommand` tree. Reasonable seam; used only in `install/index.test.ts:21-30`.

## Verification Commands

Run these to verify the implementation:

```bash
pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts auto-sync.test.ts sync/index.test.ts tools/install/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm lint
pnpm release:validate
```

Manual reproduction of the bug scenario (optional, to validate the fix by hand):

```bash
# In a scratch worktree:
#  1. Install docs + workflows packs.
#  2. Run oat sync --scope project to populate manifest.
#  3. Delete .agents/skills/oat-project-* (workflow skill canonicals).
#  4. Run: oat tools install docs
#  5. Verify: .claude/skills/oat-project-* are NOT removed.
#  6. Compare with: oat sync --scope project (without --install-canonical)
#     → legitimate broad removal semantics still prune the orphans.
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
