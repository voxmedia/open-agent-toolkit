---
oat_generated: true
oat_generated_at: 2026-02-21
oat_review_type: code
oat_review_scope: artifact /Users/thomas.stang/.claude/plans/sunny-tumbling-creek.md
oat_review_scope_mode: files
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: artifact /Users/thomas.stang/.claude/plans/sunny-tumbling-creek.md

**Reviewed:** 2026-02-21
**Range:** explicit file review
**Files reviewed:** 1

## Summary

The plan is well structured by phase, but several implementation-critical details are either underspecified or currently inconsistent with the CLI’s existing behavior and APIs. The highest risks are destructive behavior changes in non-interactive installs, scope ambiguity for removal commands under default `--scope all`, and provider path resolution that references an API not present in the adapter contract. Tightening those points in the plan should prevent churn and reduce regression risk during implementation.

## Findings

### Critical

None.

### Important

1. **Scope semantics for `oat remove` are ambiguous under default `--scope all`**  
   Reference: `/Users/thomas.stang/.claude/plans/sunny-tumbling-creek.md:131`  
   The flow is written around a single `<scopeRoot>`, but command context defaults to `scope: 'all'` (`packages/cli/src/app/command-context.ts:31`). The plan does not define whether `oat remove skill <name>` should remove from project only, user only, or both when no `--scope` is supplied. This can produce either silent partial removal or surprising multi-scope deletion.  
   **Fix guidance:** Add explicit scope rules in the plan (recommended: resolve concrete scopes and report per-scope outcomes, with an extra confirmation in interactive mode when both scopes are affected).

2. **Non-interactive auto-update of outdated skills changes current non-destructive behavior**  
   Reference: `/Users/thomas.stang/.claude/plans/sunny-tumbling-creek.md:97`  
   The plan says non-interactive mode should auto-update all outdated skills. Current copy behavior only overwrites existing content when `force` is set (`packages/cli/src/commands/init/tools/shared/copy-helpers.ts:17`). Auto-updating in CI/scripted runs can unexpectedly mutate existing installs and clobber local customizations.  
   **Fix guidance:** Keep non-interactive default as report-only (or skipped), and require explicit opt-in (`--force` or a dedicated `--update-outdated`) before overwriting existing skills.

3. **Provider view resolution relies on an API that does not exist in adapter interfaces**  
   Reference: `/Users/thomas.stang/.claude/plans/sunny-tumbling-creek.md:168`  
   The plan references `adapter.resolveViewPath(...)` as likely behavior, but `ProviderAdapter` has no such method (`packages/cli/src/providers/shared/adapter.types.ts:10`). Path resolution today is mapping-based via `getSyncMappings(...)` (`packages/cli/src/providers/shared/adapter.utils.ts:70`). Without locking this down, removal logic may target wrong paths or include native-read mappings.  
   **Fix guidance:** Specify exact resolution using existing mapping helpers, and explicitly filter to sync-managed skill mappings (nativeRead = false) before computing/deleting provider paths.

4. **Test plan misses command registration/help snapshot impact for new top-level command group**  
   References: `/Users/thomas.stang/.claude/plans/sunny-tumbling-creek.md:119`, `/Users/thomas.stang/.claude/plans/sunny-tumbling-creek.md:211`  
   The plan includes unit tests for removal logic, but adding `remove` to command registration also affects help snapshots that are asserted inline (`packages/cli/src/commands/help-snapshots.test.ts:25`). Without explicit snapshot and registration tests in scope, CI failure risk is high and CLI wiring regressions can slip.  
   **Fix guidance:** Add explicit test tasks for `packages/cli/src/commands/index.test.ts` and `packages/cli/src/commands/help-snapshots.test.ts` updates.

### Minor

1. **Bundled skill count in plan appears stale**  
   Reference: `/Users/thomas.stang/.claude/plans/sunny-tumbling-creek.md:44`  
   The plan says “all 29 bundled OAT skills,” but the current bundle manifest lists 27 (`packages/cli/scripts/bundle-assets.sh:11`). This can create checklist drift during rollout.  
   **Fix guidance:** Replace hardcoded count with either the current count (27) or “all bundled oat-\* skills from bundle-assets.sh list.”

## Verification Commands

```bash
pnpm test -- packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/index.test.ts
pnpm test -- packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/doctor/index.test.ts
```

## Next Step

- Update the plan with the four Important findings above, then run `oat-review-provide --files /Users/thomas.stang/.claude/plans/sunny-tumbling-creek.md` for a follow-up pass.
