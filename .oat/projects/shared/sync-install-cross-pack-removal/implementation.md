---
oat_status: complete
oat_ready_for: oat-project-review-provide
oat_blockers: []
oat_last_updated: 2026-04-14
oat_current_task_id: null
oat_generated: false
---

# Implementation: sync-install-cross-pack-removal

**Started:** 2026-04-14
**Last Updated:** 2026-04-14

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 3     | 3/3       |

**Total:** 3/3 tasks completed

---

## Phase 1: Reproduce And Patch Sync Removal

**Status:** complete
**Started:** 2026-04-14

### Phase Summary

**Outcome (what changed):**

- `oat tools install <pack>` now carries the canonical entries it just installed into the follow-up sync run.
- The sync command uses that install-time context only to narrow the removal pass, so stale manifest entries outside the installed set are preserved instead of being deleted.
- Direct full `oat sync` deletion behavior remains unchanged.

**Key files touched:**

- `packages/cli/src/commands/tools/install/index.ts` - forwarded install-time canonical filters into auto-sync
- `packages/cli/src/commands/sync/index.ts` - accepted the internal install filter and passed it to planning
- `packages/cli/src/engine/compute-plan.ts` - limited removal planning to the install-scoped canonical set when provided
- `packages/cli/src/commands/tools/shared/install-sync-context.ts` - recorded canonical entries for each installed pack

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts auto-sync.test.ts sync/index.test.ts tools/install/index.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli build`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli exec oxfmt --check ...`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- The fix stayed on the install-triggered path instead of changing global removal semantics, because the engine integration suite already relies on direct sync removing intentionally deleted canonical content.

### Task p01-t01: Reproduce stale-manifest removal behavior

**Status:** completed
**Commit:** -

**Outcome:**

- Confirmed the root bug is the removal pass in `computeSyncPlan`: manifest entries for active providers are scheduled for removal whenever their canonical path is absent from the current scan.

**Files changed:**

- `packages/cli/src/engine/compute-plan.test.ts` - added a regression scenario modeling docs-only canonical content plus stale workflow manifest state

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
- Result: pass after fix; the new case would have failed under the original full-removal behavior

**Notes / Decisions:**

- Existing engine integration coverage for intentional canonical deletion ruled out a global planner behavior change.

**Issues Encountered:**

- Commander repeatable-option parsing needed an explicit default in the hidden sync option; fixed during test-driven wiring.

---

### Task p01-t02: Implement conservative removal guard

**Status:** completed
**Commit:** -

**Outcome:**

- Added an install-scoped canonical-path filter to the sync command and planner removal pass.
- Recorded installed canonical entries from tool-pack commands so the post-install sync has precise scope information.

---

### Task p01-t03: Verify install-path behavior and summarize asymmetry

**Status:** completed
**Commit:** -

**Outcome:**

- Added forwarding tests for the install hook, auto-sync helper, and sync command hidden option.
- Remaining asymmetry: install-triggered sync now preserves stale manifest entries outside the installed canonical set rather than pruning them. Those stale entries remain until the matching canonical content is restored or a full sync/removal path cleans them up intentionally.

---

## Implementation Log

### 2026-04-14

**Session Start:** 19:05 UTC

- [x] p01-t01: Reproduce stale-manifest removal behavior
- [x] p01-t02: Implement conservative removal guard
- [x] p01-t03: Verify install-path behavior and summarize asymmetry

**What changed (high level):**

- Install-triggered sync now filters removals to the canonical entries installed in that invocation.
- Tool-pack installers record canonical install targets for the post-install sync hook.
- Regression coverage now exercises the planner seam and the install-to-sync forwarding path.

**Decisions:**

- Preserved direct `oat sync` deletion semantics and scoped the behavioral change only to install-triggered auto-sync.

**Follow-ups / TODO:**

- Consider a separate stale-manifest pruning workflow if install-triggered preservation leaves too much drift behind.

**Blockers:**

- None

**Session End:** 00:25 UTC

---

## Deviations from Plan

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

| Phase | Tests Run                                     | Passed | Failed | Coverage |
| ----- | --------------------------------------------- | ------ | ------ | -------- |
| 1     | 4 targeted suites + CLI build + release check | yes    | 0      | targeted |

## Final Summary (for PR/docs)

**What shipped:**

- Install-triggered tool-pack sync no longer deletes unrelated provider-view files because of stale manifest entries.
- The sync planner now accepts an internal removal filter passed from the install command.

**Behavioral changes (user-facing):**

- Running `oat tools install docs` in a worktree with stale manifest mappings preserves unrelated provider views instead of planning their removal.

**Key files / modules:**

- `packages/cli/src/commands/tools/shared/install-sync-context.ts` - canonical install target tracking
- `packages/cli/src/commands/tools/install/index.ts` - auto-sync forwarding
- `packages/cli/src/commands/sync/index.ts` - hidden install filter handling
- `packages/cli/src/engine/compute-plan.ts` - removal filter application

**Verification performed:**

- Targeted CLI Vitest run
- CLI package build
- `oxfmt --check` on changed files
- `pnpm release:validate`

**Design deltas (if any):**

- No design artifact was needed; the implementation followed the quick-plan decision to keep the change conservative and local to install-triggered sync.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
