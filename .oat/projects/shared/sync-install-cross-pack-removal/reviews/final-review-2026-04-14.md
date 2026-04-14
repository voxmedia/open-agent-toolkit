---
oat_generated: true
oat_generated_at: 2026-04-14
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/sync-install-cross-pack-removal
---

# Code Review: final (re-review)

**Reviewed:** 2026-04-14
**Scope:** final (Phase 1: p01-t01, p01-t02, p01-t03) — re-review following working-tree commit `85d1e47e`
**Workflow mode:** quick
**Files reviewed:** 24 code/config + 5 OAT artifacts (context only)
**Commits in range (9e77fc6f..HEAD):**

- `270c1d80` chore(oat): capture quick plan for sync-install-cross-pack-removal
- `5197b1d0` chore(oat): record final review artifact
- `85d1e47e` fix(cli): scope install auto-sync removals
- `53697dbc` docs(sync-install-cross-pack-removal): clarify install auto-sync scope
- `e1b94a3f` chore(sync-install-cross-pack-removal): mark docs updated

## Summary

This is a re-review after the prior final review (2026-04-13) recorded `received` status and a follow-up commit `85d1e47e` landed the implementation that was previously in the working tree. The engine/sync/install chain and test coverage are intact and the full CLI test suite (154 files / 1279 tests) passes. Of the six prior findings, none have been materially addressed in code: the regression test still only pins post-fix semantics, four of eight install call-sites still stamp the canonical filter even when the inner handler short-circuits on force-confirm cancel, and the three minor findings (internal-option validation, cross-tree import, test-adapter coupling) are unchanged. The commit-hygiene finding is partially resolved: `85d1e47e` is a single conventional-commit fix rather than per-task commits, which is acceptable for a small three-task fix but still diverges from the `plan.md` directive.

## Findings

### Critical

None.

### Important

- **Regression test still does not explicitly pin the pre-fix bug shape** (`packages/cli/src/engine/compute-plan.test.ts:185-216`)
  - Status vs. 2026-04-13: **unchanged; still present**.
  - Issue: The new case still only asserts the post-fix behavior with `allowedRemovalCanonicalPaths` supplied. There is no paired assertion showing that the _same inputs without the filter_ produce a removal. Today that absent-filter behavior is covered at `compute-plan.test.ts:157-183` but with a different fixture (empty `canonical`, only a stale manifest entry), so a reader cannot confirm from the tests that the new filter is what changes removal behavior for the exact fixture at lines 185-216. Discovery.md Success Criteria #3 explicitly requires "A regression test fails before the fix and passes after it."
  - Fix: Add a parametric variant using the same `manifest` + `canonical` fixture, e.g.
    ```ts
    it.each([
      { allowed: undefined, expected: 1 },
      {
        allowed: ['.agents/skills/oat-docs-analyze'],
        expected: 0,
      },
    ])(
      'removal filter honors install-scoped canonicals (allowed=$allowed)',
      async ({ allowed, expected }) => {
        // same fixture setup as lines 185-212
        const plan = await computeSyncPlan({
          /* ... */ allowedRemovalCanonicalPaths: allowed,
        });
        expect(plan.removals).toHaveLength(expected);
      },
    );
    ```
    Or simply duplicate the test body with a `without install filter` variant that asserts `plan.removals.length === 1`.
  - Requirement: `discovery.md` Success Criteria #3.
  - Verification: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`.

- **Install-filter semantics still diverge across the 8 init-tools call sites on cancel-of-force-confirm** (pack-granularity: `packages/cli/src/commands/init/tools/core/index.ts:115-123`, `packages/cli/src/commands/init/tools/ideas/index.ts:150-158`, `packages/cli/src/commands/init/tools/workflows/index.ts:144-152`, `packages/cli/src/commands/init/tools/project-management/index.ts:52-106`; skill-granularity: `packages/cli/src/commands/init/tools/docs/index.ts:159`, `packages/cli/src/commands/init/tools/utility/index.ts:158`, `packages/cli/src/commands/init/tools/research/index.ts:163-166`; composite: `packages/cli/src/commands/init/tools/index.ts:673-682`)
  - Status vs. 2026-04-13: **unchanged; still present**.
  - Issue: The four pack-granularity handlers still set `exitCode = 0` and `return` from the inner `runInitTools<Pack>` when the user declines the `--force` overwrite confirmation (explicit "Cancelled: no files were overwritten" branches at `ideas/index.ts:111-116`, `workflows/index.ts:105-110`), while the outer `.action` handler then unconditionally stamps the full pack canonical list because `process.exitCode === 0 || process.exitCode === undefined` is still true. The auto-sync post-hook then runs with a filter claiming all those canonical paths were freshly installed — the mirror image of the stale-manifest symptom the project set out to fix. `docs` / `utility` / `research` still correctly scope the stamp inside the try-block after `installX(...)` returns, so the skill-level cancel branches naturally skip the stamp.
  - Impact: Not a bug in the direct "install docs" repro the project targeted, because a too-broad filter only narrows removals further (still strictly safer than no filter). But it defeats the filter's purpose when a user cancels `--force` in one pack: they will still trigger removals for the _other_ packs' canonicals that were never part of the aborted install.
  - Fix: Mirror the docs/utility/research pattern. Either (a) move `setInstalledCanonicalPaths(command, ...)` into each pack-granularity handler's try-block just before `process.exitCode = 0` on the real success path, or (b) have `runInitTools<Pack>` return a boolean `didInstall` and only stamp when true. Option (a) is smaller and keeps the outer `.action` a one-liner.
  - Requirement: discovery.md "Over-suppressing removals" risk + discovery.md Assumption "The install command itself is not copying unrelated provider assets" (symmetrical: it should not _claim_ it installed unrelated assets either).
  - Verification: Add a focused test in `packages/cli/src/commands/init/tools/ideas/index.test.ts` (or equivalent) that stubs `confirmAction` to return `false` and asserts `getInstalledCanonicalPaths(command)` is `[]` after the action resolves.

### Minor

- **Plan commit convention partially honored — one consolidated fix commit instead of per-task commits** (`git log 270c1d80..HEAD`)
  - Status vs. 2026-04-13: **partially addressed** by `85d1e47e fix(cli): scope install auto-sync removals` (plus `53697dbc docs(...)` and `e1b94a3f chore(...)` follow-ups). `plan.md` Step 5 directives specified three separate commits (`chore(oat): capture quick plan ...` [done as `270c1d80`], `fix(p01-t02): guard stale manifest removals`, `test(p01-t03): cover install-triggered sync guard`). The current branch collapses p01-t02 and p01-t03 into one commit.
  - Impact: Acceptable for a three-task bugfix where all tasks touch interdependent plumbing and the single commit still uses a Conventional Commits `fix(cli):` prefix. No blocker.
  - Suggestion: Accept as-is for this project. Update `implementation.md`'s `**Commit:** -` placeholders under p01-t01/p01-t02/p01-t03 to reference `85d1e47e` so the bookkeeping matches the git history. Alternatively, consider relaxing the plan template's per-task commit directive for bug-fix projects with ≤ 3 tightly-coupled tasks.

- **`--install-canonical` option is still user-invocable and unvalidated** (`packages/cli/src/commands/sync/index.ts:345-353`)
  - Status vs. 2026-04-13: **unchanged; still present**.
  - Issue: `addOption(new Option('--install-canonical <path>', 'Internal install sync filter').hideHelp().default([]).argParser(...))` still accepts any string without validation. A user who discovers the flag and runs `oat sync --install-canonical ../../etc/passwd` will silently suppress all removals except for the paths they pass. The planner normalizes via `normalize(...)` and filters by string equality against manifest entries, so the worst case is "fewer removals than expected" (footgun, not security hole). But the project contract is "install-triggered" only.
  - Suggestion: (a) Prefix the value list with a regex validation (e.g. `/^\.agents\/(skills|agents|rules)\/[^/\\]+/`) and throw `CliError` on mismatch, or (b) add an inline `// Internal: populated by tools install post-action; values originate from canonicalPathsForPack() so no additional validation here.` comment next to the `addOption` call. Neither exists today. Option (a) is preferable because the internal contract is easy to state.

- **`install-sync-context.ts` cross-tree import is unchanged** (`packages/cli/src/commands/tools/shared/install-sync-context.ts:1-11`)
  - Status vs. 2026-04-13: **unchanged; still present**.
  - Issue: The helper lives at `commands/tools/shared/` but imports `CORE_SKILLS`, `DOCS_SKILLS`, `IDEA_SKILLS`, `PROJECT_MANAGEMENT_SKILLS`, `RESEARCH_AGENTS`, `RESEARCH_SKILLS`, `UTILITY_SKILLS`, `WORKFLOW_AGENTS`, `WORKFLOW_SKILLS` from `@commands/init/tools/shared/skill-manifest`. The install subcommands under `init/tools/*` then import back from this helper, producing the dependency direction `init/tools/* → tools/shared/install-sync-context → init/tools/shared/skill-manifest`. This is not a cycle but reads backwards.
  - Suggestion: Relocate `install-sync-context.ts` to `commands/init/tools/shared/install-sync-context.ts` (next to `skill-manifest.ts`) and update the single external caller at `commands/tools/install/index.ts:13` to import via `@commands/init/tools/shared/install-sync-context`. Acceptable to defer if the team prefers the current location.

- **Regression test coupling to `createTestAdapter()` provider name is unchanged** (`packages/cli/src/engine/compute-plan.test.ts:185-216`)
  - Status vs. 2026-04-13: **unchanged; still present**.
  - Issue: Manifest entry uses `provider: 'claude'` but the test adapter is created with the default `createTestAdapter()` (claude-like). If the default name ever drifts, the assertion `plan.removals === []` becomes a trivial pass (the planner's `activeProviderNames.has(manifestEntry.provider)` filter at `compute-plan.ts:374-377` would short-circuit, not the new removal filter at `compute-plan.ts:386-392`).
  - Suggestion: Either add an inline comment noting the adapter-provider alignment requirement, or call `createTestAdapter({ name: 'claude' })` explicitly so the coupling is visible.

- **`state.md` docs-status field updated to `complete` but `oat_pr_status` remains `null`** (`.oat/projects/shared/sync-install-cross-pack-removal/state.md:13-14`)
  - Status vs. 2026-04-13: new observation, not in prior review.
  - Issue: `e1b94a3f` set `oat_docs_updated: complete` but `oat_pr_status` is still `null`. That is consistent with "docs updated but PR not yet opened." No action required; flagging because a re-reviewer may expect the PR status to move to `ready` before the final review re-run.
  - Suggestion: If this re-review is being run as part of the PR-prep handoff, flip `oat_pr_status: ready` once the finding dispositions above are triaged.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, prior review `reviews/final-review-2026-04-13.md` (spec/design N/A in quick mode).

### Requirements Coverage

| Requirement (from discovery.md)                                                                                   | Status      | Notes                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reproduction confirms unrelated-pack removals are caused by stale manifest entries plus missing canonical content | implemented | `compute-plan.test.ts:185-216` exercises the planner-level repro. Still lacks an explicit unfiltered baseline assertion on the same fixture — see Important #1.                                                                                                                                                                             |
| `oat tools install docs` no longer plans or applies removals for unrelated packs in that scenario                 | implemented | Install → auto-sync → `--install-canonical` → `computeSyncPlan({allowedRemovalCanonicalPaths})` chain is present and tested end-to-end (`sync/index.test.ts:624-641`, `auto-sync.test.ts:92-112`, `tools/install/index.test.ts:19-50`). `compute-plan.ts:286-292, 386-392` correctly narrows removals to the supplied set.                  |
| Regression test fails before the fix and passes after it                                                          | partial     | Still partial — see Important #1. The new test would have failed to compile pre-fix (because the `allowedRemovalCanonicalPaths` param did not exist), which is a weak form of the guarantee.                                                                                                                                                |
| Do not change tool-pack manifests such as `DOCS_SKILLS` or `WORKFLOW_SKILLS`                                      | satisfied   | No changes to `skill-manifest.ts` list members. `install-sync-context.ts` only reads the existing exports.                                                                                                                                                                                                                                  |
| Keep the fix limited to the smallest viable engine/install boundary                                               | partial     | Engine delta is ~15 lines; surrounding plumbing (new `install-sync-context.ts`, hidden sync option, 8 init-tools call sites, `AutoSyncDependencies` signature change) is broader than Option B's "engine only" spirit. Documented in prior review and `implementation.md` notes ("No design deltas"). Acceptable trade-off for correctness. |
| Direct full `oat sync` deletion behavior remains unchanged                                                        | satisfied   | When `--install-canonical` is not passed, `options.installCanonical?.length` is 0 → `runSyncCommand` receives `undefined` → `computeSyncPlan` sees `allowedRemovalCanonicalPaths === undefined` → `removalFilter` is `null` → legacy removal path runs unchanged. Pinned by `compute-plan.test.ts:157-183`.                                 |
| Version lockstep bump across public packages                                                                      | satisfied   | `cli` / `control-plane` / `docs-config` / `docs-theme` / `docs-transforms` are all at `0.0.33`. `packages/cli/assets/public-package-versions.json` records `0.0.33` for the four bundle-tracked packages. Matches the lockstep rule.                                                                                                        |

### Extra Work (not in declared requirements)

- **`install-sync-context.ts` helper module** — necessary glue for the chosen architecture; reasonable.
- **`createToolsInstallCommand(syncDependencies, createBaseCommand = createInitToolsCommand)`** (`packages/cli/src/commands/tools/install/index.ts:38-42`) — added second parameter to make the install command testable without instantiating the full init/tools tree. Used by `install/index.test.ts:21-30`. Small, well-scoped seam.
- **Docs pages under `packages/cli/assets/docs/...`** added by `53697dbc` — in scope for user-facing release notes and documented in the docs app; not a deviation.

## Deferred Findings Disposition (from 2026-04-13 review)

| #   | Finding                                                                 | Disposition                                                   |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Important — regression test does not pin the pre-fix bug shape          | (b) still present — recommend fixing (see Important #1 above) |
| 2   | Important — install-filter semantics diverge across 8 call sites        | (b) still present — recommend fixing (see Important #2 above) |
| 3   | Minor — plan commit convention not followed (no per-task commits)       | (a) partially resolved by `85d1e47e` — acceptable to defer    |
| 4   | Minor — `--install-canonical` is user-invocable and unvalidated         | (c) still present — acceptable to defer                       |
| 5   | Minor — `install-sync-context.ts` cross-tree import                     | (c) still present — acceptable to defer                       |
| 6   | Minor — regression test coupling to `createTestAdapter()` provider name | (c) still present — acceptable to defer                       |

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

Suggested focused test for Important #2 (cancel-of-force-confirm):

```ts
// packages/cli/src/commands/init/tools/ideas/index.test.ts (new)
it('does not stamp installed canonical paths when user declines force overwrite', async () => {
  // stub confirmAction to return false
  // invoke ideas subcommand with --force in interactive mode
  // assert getInstalledCanonicalPaths(command).length === 0
});
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the two Important findings (regression-test shape + cancel-path filter leak) into plan tasks. The four Minor findings are acceptable to defer.
