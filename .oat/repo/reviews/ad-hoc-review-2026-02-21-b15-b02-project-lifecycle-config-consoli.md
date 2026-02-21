---
oat_generated: true
oat_generated_at: 2026-02-21
oat_review_type: code
oat_review_scope: /Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md
oat_review_scope_mode: files
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: /Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md

**Reviewed:** 2026-02-21
**Range:** files:/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md
**Files reviewed:** 1

## Summary

The prior high-risk issues from the earlier review (absolute active project paths and unconditional pointer clearing on pause) are now addressed. The new `oat config` addition is directionally good, but the migration sequence still has one compatibility hole that can misroute project resolution in existing repos. There is also one key null-handling ambiguity and one dashboard test case that no longer matches the updated pause model.

## Findings

### Critical

1. **`projects.root` compatibility gap can silently route skills to the wrong project root during migration.**  
   Reference: `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:81`, `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:104`, `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:326`, `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:353`  
   Phase 2 preserves legacy `.oat/projects-root` fallback in `resolveProjectsRoot`, but Phase 7 migrates skills to `oat config get projects.root`, and the config command spec does not explicitly include the same legacy fallback or a mandatory backfill migration. In repos that only have `.oat/projects-root` customized, migrated skills may resolve `.oat/projects/shared` and operate on the wrong project tree.  
   **Fix:** Either (a) define `oat config get projects.root` to include `.oat/projects-root` fallback until Phase 9, or (b) add an explicit one-time migration step that writes `config.json.projects.root` from `.oat/projects-root` before skill migration begins.

### Important

1. **`activeProject` clear semantics are ambiguous between `null` and empty string.**  
   Reference: `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:108`, `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:111`, `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:316`  
   The plan says unset/null values are returned as empty output, and migration examples use `oat config set activeProject ""` to clear. Without an explicit coercion rule, implementations can persist `""` instead of `null`, making state semantics inconsistent with `clearActiveProject()` and list/source reporting.  
   **Fix:** Define canonical behavior for nullable keys: `set ... ""` coerces to `null` (or add `oat config unset <key>`). Add tests for storage and `get/list --json` output.

### Minor

1. **One dashboard test scenario conflicts with the updated pause model.**  
   Reference: `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:205`, `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:227`, `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md:240`  
   The plan correctly clears the active pointer when pausing the active project, but the test note "paused project (active pointer still set — pausing a non-active project)" conflates two different projects and no longer represents a coherent active-dashboard state.  
   **Fix:** Split into explicit cases: (1) no active project + `lastPausedProject` guidance, and (2) active project remains active when a different project is paused.

## Verification Commands

```bash
rg -n "projects\.root|projects-root|config get projects\.root|Phase 9" /Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md
rg -n "activeProject|lastPausedProject|config set activeProject \"\"|unset" /Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md
pnpm --filter @oat/cli test
```

## Next Step

- Amend the plan to close the `projects.root` compatibility gap before Phase 7 migration starts, then lock `activeProject` null/clear semantics in the config command contract.
- After those edits, run a follow-up ad-hoc review pass focused on Phases 2.5, 5, and 7 testability.
