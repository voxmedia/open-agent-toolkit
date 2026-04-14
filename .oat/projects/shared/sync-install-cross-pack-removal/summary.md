---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-14
oat_generated: true
oat_summary_last_task: p02-t04
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: sync-install-cross-pack-removal

## Overview

This project fixed a sync-planning bug where `oat tools install <pack>` could delete provider-view files for unrelated packs. The failure mode depended on stale manifest entries still existing for other packs while their canonical `.agents/...` content was missing in the current worktree.

## What Was Implemented

The shipped fix scopes install-triggered auto-sync removals to the canonical entries that were actually installed in that invocation. `oat tools install` now forwards install-scoped canonical paths into the follow-up sync run, and `computeSyncPlan` uses that context only for the removal pass. Direct full `oat sync` behavior remains unchanged, so intentional canonical deletions still remove managed provider views.

The implementation also added the plumbing needed to carry install-pack context from tool-pack commands into sync planning. Tool-pack install handlers record the canonical paths they actually installed, auto-sync forwards those paths to the hidden sync filter, and the sync command validates that hidden input before using it.

The follow-up review cycle tightened the work in three ways. First, the planner regression now proves both the unfiltered removal behavior and the filtered preservation behavior on the same stale-manifest fixture. Second, pack-level init handlers no longer stamp install-scoped canonical paths when the user cancels a `--force` overwrite confirmation. Third, the regression test now binds provider alignment explicitly instead of relying on helper defaults.

Documentation was updated on the docs site to explain the install-specific auto-sync behavior in both the tool-packs and provider-sync manifest/drift pages.

## Key Decisions

- Keep the behavioral change limited to install-triggered auto-sync rather than changing global sync-removal semantics.
- Preserve direct `oat sync` deletion behavior so legitimate canonical deletions still remove managed provider views.
- Fix the cancel-path asymmetry locally in the pack handlers instead of redesigning the shared install-sync context.
- Validate the hidden `--install-canonical` option at the command boundary so malformed values fail as explicit CLI errors.

## Design Deltas

Discovery initially leaned toward an engine-side stale-manifest guard with minimal install plumbing. The implemented solution still keeps the planner change narrow, but it threads install-scoped canonical paths through tool-install and sync command plumbing so the removal pass can distinguish install-triggered sync from a full sync run.

## Tradeoffs Made

The fix intentionally leaves stale manifest entries outside the installed canonical set in place during install-triggered auto-sync. That is safer than deleting unrelated provider views, but it means stale manifest cleanup remains a separate concern for a future workflow.

The command-level validation for `--install-canonical` documents and enforces an internal contract, but the option remains hidden and install-only in practice rather than becoming part of the public sync interface.

## Integration Notes

This project touched the CLI sync engine, tool-pack install flow, and docs site:

- `packages/cli/src/commands/tools/install/index.ts`
- `packages/cli/src/commands/tools/shared/auto-sync.ts`
- `packages/cli/src/commands/tools/shared/install-sync-context.ts`
- `packages/cli/src/commands/sync/index.ts`
- `packages/cli/src/engine/compute-plan.ts`
- `packages/cli/src/engine/compute-plan.test.ts`
- `packages/cli/src/commands/init/tools/{core,ideas,workflows,project-management}/index.ts`
- `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`

Future work on install-triggered sync behavior should preserve the distinction between install-scoped auto-sync and direct full sync. Future docs changes should keep the install-specific removal-scope explanation in both the CLI utilities and provider-sync sections so operators understand why unrelated provider views are preserved.

## Follow-up Items

- Consider a separate stale-manifest pruning workflow if preserving unrelated mappings during install-triggered sync leaves too much drift behind.
