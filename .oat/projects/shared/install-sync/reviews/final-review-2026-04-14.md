---
oat_generated: true
oat_generated_at: 2026-04-14
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: /Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/.oat/projects/shared/install-sync
---

## Summary

One actionable finding remains.

Provider-view scoping is implemented correctly: install-triggered canonical scope now flows through sync planning, entry generation, and stale-manifest removals, and the focused regression suite passes. The remaining gap is in Codex partial-sync planning: a docs-only install can still create a fresh `.codex/config.toml` even when the scoped install contains no agent content. That is a real scope-boundary regression against this project's stated goal.

## Findings

### Critical

None.

### Important

1. Partial install sync still creates `.codex/config.toml` when the scoped install contains no agents.

   In [sync-extension.ts](/Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/packages/cli/src/providers/codex/codec/sync-extension.ts#L196), partial sync correctly filters `desiredRoles` by `allowedCanonicalPaths`. But when that filtered set is empty, [sync-extension.ts](/Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/packages/cli/src/providers/codex/codec/sync-extension.ts#L281) still emits a `create` operation for `.codex/config.toml` whenever no config file exists. I verified this directly by calling `computeCodexProjectExtensionPlan(root, [], ['.agents/skills/oat-docs-analyze'])`, which returned a plan containing only:
   - `action: "create"`
   - `target: "config"`
   - `path: ".codex/config.toml"`
   - `managedRoles: []`

   That means `oat tools install docs` can still write new Codex config into a fresh project even though no Codex-managed agent belongs to the installed pack. The project goal was to keep install-triggered sync limited to the installed canonical set, so this is still out of bounds.

### Medium

None.

### Minor

None.

## Spec/Design Alignment

This quick-workflow implementation is mostly aligned with [discovery.md](/Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/.oat/projects/shared/install-sync/discovery.md) and [plan.md](/Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/.oat/projects/shared/install-sync/plan.md):

- The scoped planner work matches the discovery direction and Phase 1 plan: `allowedCanonicalPaths` now gates both entry generation and stale-manifest removals in [compute-plan.ts](/Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/packages/cli/src/engine/compute-plan.ts#L283), with focused coverage in [compute-plan.test.ts](/Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/packages/cli/src/engine/compute-plan.test.ts#L186).
- The sync command now threads the same scope into Codex extension planning as planned in [index.ts](/Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/packages/cli/src/commands/sync/index.ts#L255).
- The remaining misalignment is that the Codex path still performs a config write when the scoped install yields zero desired roles, which falls short of the discovery success criteria that install-triggered sync should only mutate artifacts for the installed canonical content.

## Verification Commands

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/providers/codex/codec/sync-extension.test.ts`
  - Passed: 4 test files, 36 tests.
- `pnpm release:validate`
  - Passed for all 5 public packages.
- Direct function reproduction of the Codex edge case:
  - `computeCodexProjectExtensionPlan(root, [], ['.agents/skills/oat-docs-analyze'])`
  - Returned a `create` op for `.codex/config.toml` with `managedRoles: []`.

## Recommended Next Step

Make `computeCodexProjectExtensionPlan` a true no-op for partial sync when the allowed canonical scope yields zero desired Codex roles, and add a regression test for the "no existing `.codex/config.toml` + skills-only install scope" case in [sync-extension.test.ts](/Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/packages/cli/src/providers/codex/codec/sync-extension.test.ts).
