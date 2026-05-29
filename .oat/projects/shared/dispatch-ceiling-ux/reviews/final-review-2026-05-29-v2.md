---
oat_generated: true
oat_generated_at: 2026-05-29
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/dispatch-ceiling-ux
---

# Code Review: final

**Reviewed:** 2026-05-29
**Scope:** final code review (`f51a3d7496c2b9873bc6cfec56ef2065a106869c..HEAD`)
**Files reviewed:** 34
**Commits:** `97c54a06` through `0e80aa55` on `feat/dispatch-ceiling`

## Summary

The implementation is directionally aligned with the provider-neutral dispatch-ceiling design and has strong test coverage around the happy paths. I found two Important issues in the compiled/resolver surface that would break central UX promises: the recommended preset config key is not compiled into concrete provider values, and the resolver still rejects non-Codex/non-Claude providers before the new advisory/unsupported adapter path can run.

## Findings

### Critical

None.

### Important

1. **Preset config key is provenance-only in practice, so the recommended config path does not resolve a ceiling.**

   The new docs say `workflow.dispatchCeiling.preset` is the recommended config path and "compiles to per-provider values at write time" ([configuration.md](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-zero-helium-1689/apps/oat-docs/docs/cli-utilities/configuration.md:254)). The preset compiler exists and maps `balanced -> { codex: high, claude: sonnet }` ([dispatch-ceiling-preset.ts](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-zero-helium-1689/packages/cli/src/config/dispatch-ceiling-preset.ts:17)), but production config writes do not call it. `applyWorkflowValue()` stores only `dispatchCeiling.preset` and leaves `providers` untouched ([index.ts](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-zero-helium-1689/packages/cli/src/commands/config/index.ts:790)). The resolver then intentionally ignores the preset and reads only `workflow.dispatchCeiling.providers.<provider>` ([index.ts](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-zero-helium-1689/packages/cli/src/commands/project/dispatch-ceiling/index.ts:267)).

   User impact: a user following the documented command `oat config set workflow.dispatchCeiling.preset balanced --user` still has no concrete Codex/Claude ceiling for dispatch. Interactive implementation will prompt again; non-interactive implementation can still block as unresolved. This breaks the main "low-friction preset" goal.

   Fix guidance: make the config setter compile preset values at write time by using `compileDispatchCeilingPreset()` in the `workflow.dispatchCeiling.preset` branch, and add a test that setting `workflow.dispatchCeiling.preset balanced` writes/returns `providers.codex=high` and `providers.claude=sonnet`. If the intended behavior is instead that users must set provider keys separately, remove the preset config key as a recommended command and update docs/describe copy accordingly.

2. **The resolver cannot return advisory/unsupported results for other providers because it rejects them up front.**

   The adapter registry already has a fallback no-op adapter for unknown providers, which is the mechanism that should let Cursor or future providers resolve as advisory/unsupported rather than failing ([registry.ts](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-zero-helium-1689/packages/cli/src/providers/ceiling/registry.ts:121)). However, the dispatch-ceiling command narrows `DispatchCeilingProvider` to only `codex | claude` ([index.ts](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-zero-helium-1689/packages/cli/src/commands/project/dispatch-ceiling/index.ts:33)) and `normalizeProvider()` throws for anything else ([index.ts](/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-zero-helium-1689/packages/cli/src/commands/project/dispatch-ceiling/index.ts:121)).

   Reproduction from this worktree:

   ```bash
   pnpm run cli -- project dispatch-ceiling resolve --provider cursor --json
   ```

   Result:

   ```json
   {
     "status": "error",
     "message": "Invalid provider. Expected one of: codex, claude."
   }
   ```

   User impact: the provider-neutral UX still breaks for Cursor/other hosts. Instead of "no adapter; informational/advisory; do not block," the CLI returns an error before reaching `getCeilingAdapter()`. This directly conflicts with the stated design that providers without a supported mechanism may treat the ceiling as advisory.

   Fix guidance: widen the resolver's provider type to accept arbitrary provider names, keep Codex/Claude validation only when reading typed concrete values, and let unknown providers pass through `getCeilingAdapter(provider)`. The JSON result should be `status: unresolved` or `resolved` with `providers.cursor.mode = "unsupported"`/`"advisory"` as appropriate, not a command error. Add a resolver test for `--provider cursor --json` that exercises the fallback adapter path.

### Medium

None.

### Minor

None.

## Spec/Design Alignment

### Requirements Coverage

| Requirement / decision                                                                      | Status      | Notes                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presets compile immediately to concrete provider values; runtime reads only concrete values | Partial     | The project-state prompt path describes this correctly, but `oat config set workflow.dispatchCeiling.preset` does not compile provider values, so config-based presets do not drive runtime dispatch. |
| Provider adapter registry distinguishes enforced/advisory/unsupported                       | Partial     | Codex and Claude adapters work, but the resolver rejects other provider names before fallback advisory/unsupported behavior can run.                                                                  |
| Codex enforcement via pinned variants                                                       | Implemented | Registry compiles Codex values to `oat-phase-implementer-*` / `oat-reviewer-*` variants.                                                                                                              |
| Claude enforcement via Task `model` arg                                                     | Implemented | Registry compiles Claude values to `{ model }` and flags verify-on-upgrade.                                                                                                                           |
| Reviewer runs at ceiling                                                                    | Implemented | Skill guidance preserves reviewer-at-ceiling semantics.                                                                                                                                               |
| No migration of old shape                                                                   | Implemented | The clean-break behavior is reflected in code/docs.                                                                                                                                                   |

### Extra Work

None requiring action. The backward-compatible superset resolver JSON is a defensible implementation detail even though the design initially sketched a flatter object.

## Verification Commands

Run during this review:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/providers/ceiling/registry.test.ts
pnpm run cli -- project dispatch-ceiling resolve --provider cursor --json
```

Results:

- Focused Vitest suite passed: 105 tests.
- Cursor resolver command failed with `Invalid provider. Expected one of: codex, claude.`, confirming Important finding 2.

## Recommended Next Step

Run `oat-project-review-receive` to convert the two Important findings into review-fix tasks, then re-review the final scope after the fixes land.
