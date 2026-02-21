---
oat_generated: true
oat_generated_at: 2026-02-21
oat_review_type: code
oat_review_scope: /Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md
oat_review_scope_mode: files
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: /Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md

**Reviewed:** 2026-02-21
**Range:** files:/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md
**Files reviewed:** 1

## Summary

The plan is well-structured and phased, but several sequencing and state-model gaps would cause real behavioral regressions during migration. The largest risks are around active project pointer semantics across worktrees and inconsistent pause/dashboard behavior. Fixing those design points before implementation will prevent cross-worktree corruption and confusing CLI UX.

## Findings

### Critical

1. **Absolute `activeProject` paths conflict with worktree propagation and can mutate the wrong workspace state.**  
   Reference: `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:54`, `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:293`  
   The plan defines `activeProject` as a full path, then copies `.oat/config.local.json` into new worktrees. That copy will preserve source-worktree absolute paths, so commands in the target worktree may read/write `state.md` in the source worktree.  
   **Fix:** store `activeProject` as a repo-relative path (or `{name, relativePath}`), and normalize on read. If absolute-path compatibility is needed, treat absolute as legacy input only.

### Important

1. **`pause [name]` clears active pointer unconditionally, even when pausing a different project.**  
   Reference: `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:133`, `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:149`, `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:140`  
   The plan explicitly supports pausing a named project that is not currently active, but step 6 still clears `activeProject`. This will unexpectedly drop the user’s current active context.  
   **Fix:** clear `activeProject` only when the paused project matches the current active project.

2. **Paused-state dashboard design is internally inconsistent with `pause` semantics.**  
   Reference: `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:15`, `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:140`, `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:165`, `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:173`, `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:340`  
   The plan says `pause` clears the active pointer, but Phase 5 expects active-project dashboard and next-step logic to operate on a paused active project. With no active project pointer, those branches will not execute.  
   **Fix:** choose one model: either keep paused project as active (status=paused) or clear active pointer and add a separate “last paused project” pointer surfaced by dashboard/next-step logic.

3. **`jq` fallback snippet for projects root can return empty string and skip default.**  
   Reference: `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:264`  
   `jq -r '.projects.root // empty' ... || echo '.oat/projects/shared'` only falls back on command failure, not empty output. If key is missing, `PROJECTS_ROOT` becomes empty.  
   **Fix:** use `jq -r '.projects.root // ".oat/projects/shared"'` (or post-check empty and fallback explicitly).

4. **Active-idea migration example drops documented user-level fallback behavior.**  
   Reference: `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:267`, `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:275`  
   Existing idea skills distinguish project-level `.oat/active-idea` and user-level `~/.oat/active-idea`; the new pattern only references repo-local config. That narrows behavior and may break non-repo ideation flows.  
   **Fix:** codify whether user-level active idea remains supported. If yes, add `.oat/config.local.json` + `~/.oat/config.local.json` precedence rules and migration notes.

### Minor

1. **`--reason` says “logged” but no persistence target is defined.**  
   Reference: `/Users/thomas.stang/.claude/plans/fuzzy-launching-charm.md:93`  
   Without defining where reason is recorded, implementations may diverge (stdout-only vs state frontmatter vs audit file).  
   **Fix:** specify exact sink(s) for reason fields and test assertions.

## Verification Commands

```bash
rg -n "activeProject|oat_pause|config.local.json|projects.root" packages/cli/src -S
rg -n "active-idea|config.local.json|~/.oat" .agents/skills -S
pnpm --filter @oat/cli test
```

## Next Step

- Update the plan decisions for pointer representation and pause/dashboard semantics first, then re-run this ad-hoc review before implementation starts.
- After plan updates, run a small spike for `open/pause + dashboard` to validate state transitions end-to-end before batch skill migration.
