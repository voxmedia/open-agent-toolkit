---
oat_generated: true
oat_generated_at: 2026-04-14
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: /Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/.oat/projects/shared/install-sync
---

# Code Review: final

**Reviewed:** 2026-04-14
**Scope:** Final code review for `c1bee6e98d1b9c2ca2d3be8714c245044e6aff83..HEAD`, with emphasis on completed review-fix task `p03-t01` and the overall install-sync scoping work.
**Files reviewed:** 18
**Commits:** 14 commits in range

## Summary

The original final-review finding is fixed for the fresh-project case: a skills-only partial sync with no existing `.codex/config.toml` now returns no Codex extension operations, and the targeted regression suite passes. One important gap remains in the same scope boundary: if a user already has a `.codex/config.toml` but the partial install scope contains zero Codex-managed agents, the planner still updates that config to add Codex managed-state scaffolding.

Provider-view scoping and release guardrails look aligned with the quick-mode discovery and plan. No deferred Medium or Minor findings were carried forward from the prior review-receive run.

## Findings

### Critical

None.

### Important

- **Skills-only partial sync still mutates an existing user Codex config** (`packages/cli/src/providers/codex/codec/sync-extension.ts:215`)
  - Issue: `p03-t01` added a no-op guard only when `existingConfigContent === null`. If a project already has `.codex/config.toml` and the install-triggered canonical scope yields zero desired Codex roles, execution falls through to `mergeCodexConfig` at `packages/cli/src/providers/codex/codec/sync-extension.ts:287`. `mergeCodexConfig` then adds `agents = { }` and `[features].multi_agent = true` even though no scoped canonical agent exists. I reproduced this directly by calling `computeCodexProjectExtensionPlan(root, [], ['.agents/skills/oat-docs-analyze'])` after creating a user config containing only `model = "gpt-5"`; the returned plan contained one `update` operation for `.codex/config.toml` with `managedRoles: []`.
  - Fix: Treat partial sync with zero desired roles as a no-op unless there is scoped Codex work to apply. At minimum, avoid calling `mergeCodexConfig` for partial zero-role scopes when there is no existing OAT-managed Codex state to reconcile. Add a regression in `sync-extension.test.ts` for `existing .codex/config.toml + skills-only allowedCanonicalPaths + no canonical agent entries`, asserting `operations` is empty or all skips and that no config update is planned.
  - Requirement: Discovery success criteria and Key Decision 2 require install-triggered Codex extension updates to respect the installed canonical scope only.

### Medium

None.

### Minor

None.

## Spec/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, archived `reviews/final-review-2026-04-14.md`, and the changed files in `c1bee6e98d1b9c2ca2d3be8714c245044e6aff83..HEAD`. This is a quick-mode project; `spec.md` and `design.md` are not present and are optional for this mode.

### Requirements Coverage

| Requirement                                                                                             | Status                                                        | Notes                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install-triggered sync only mutates provider artifacts for canonical paths explicitly passed by install | partial                                                       | `computeSyncPlan` now filters additions and removals by `allowedCanonicalPaths`, but Codex extension planning can still update an existing config when the scoped set contains no agents.                       |
| Running `oat tools install docs` only syncs docs-pack canonical content                                 | partial                                                       | Provider-view planning is scoped. Codex config planning still has the existing-config zero-role gap above.                                                                                                      |
| Unrelated provider views are not added during install-triggered auto-sync                               | implemented                                                   | `computeSyncPlan` filters entries before provider operations are generated.                                                                                                                                     |
| `.codex/config.toml` does not gain unrelated agents during docs-pack install                            | implemented for unrelated agents, partial for config mutation | The branch prevents unrelated role additions/removals and fixes fresh config creation for zero-role partial sync. It can still add managed-state scaffolding to an existing user config with zero scoped roles. |
| Regression tests fail before the fix and pass after                                                     | partial                                                       | Covered for planner entries, Codex forwarding, stale managed role preservation, and the fresh zero-role Codex config case. Missing coverage for the existing-config zero-role case.                             |
| Release validation for shipped CLI behavior                                                             | implemented                                                   | `pnpm release:validate` passed for all five lockstep public packages at `0.0.37`.                                                                                                                               |

### Extra Work (not in declared requirements)

None.

## Verification Commands

Run these to verify the implementation and the remaining gap:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/engine/compute-plan.test.ts
pnpm release:validate
```

Additional reproduction used during review:

```bash
pnpm --filter @open-agent-toolkit/cli exec tsx -e '<call computeCodexProjectExtensionPlan with an existing .codex/config.toml, no canonical entries, and [".agents/skills/oat-docs-analyze"]>'
```

Observed verification results:

- Targeted Vitest suite passed: 4 files, 37 tests.
- `pnpm release:validate` passed for all 5 public packages.
- Direct reproduction returned an `update` operation for `.codex/config.toml` with `managedRoles: []`.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the remaining Important finding into a review-fix task.
