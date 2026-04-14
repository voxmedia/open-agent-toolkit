---
oat_status: complete
oat_ready_for: null
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
| Phase 2 | complete | 4     | 4/4       |

**Total:** 7/7 tasks completed

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

## Phase 2: Review Fixes

**Status:** complete
**Started:** 2026-04-14

### Phase Summary

**Outcome (what changed):**

- The planner regression now proves both the unfiltered removal behavior and the install-filtered preservation behavior on the same stale-manifest fixture.
- Pack-level init handlers only stamp install-scoped canonical paths after a real install succeeds, so cancelled overwrite confirmations do not affect follow-up sync behavior.
- The hidden `--install-canonical` option now validates its inputs, and the regression test makes the provider alignment explicit instead of relying on a helper default.

**Key files touched:**

- `packages/cli/src/engine/compute-plan.test.ts` - strengthened the install-sync regression and made the provider name explicit
- `packages/cli/src/commands/init/tools/core/index.ts` - gated canonical stamping on successful install completion
- `packages/cli/src/commands/init/tools/ideas/index.ts` - gated canonical stamping on successful install completion
- `packages/cli/src/commands/init/tools/workflows/index.ts` - gated canonical stamping on successful install completion
- `packages/cli/src/commands/init/tools/project-management/index.ts` - gated canonical stamping on successful install completion
- `packages/cli/src/commands/init/tools/ideas/index.test.ts` - covered the cancelled overwrite path
- `packages/cli/src/commands/sync/index.ts` - validated hidden install-scoped canonical paths
- `packages/cli/src/commands/sync/index.test.ts` - covered invalid hidden-path rejection

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test -- ideas/index.test.ts workflows/index.test.ts core/index.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test -- sync/index.test.ts`
- Result: pass
- Run: `pnpm test`
- Result: pass
- Run: `pnpm lint`
- Result: pass
- Run: `pnpm type-check`
- Result: pass
- Run: `pnpm build`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- I kept the cancel-path fix local to the pack handlers instead of changing shared install-sync state shape.
- Hidden install-path validation lives in the command action so malformed values fail as an explicit CLI error.

### Task p02-t01: (review) Add paired regression coverage for install-scoped removal filtering

**Status:** completed
**Commit:** 1b16516e

**Outcome:**

- Added a paired regression on the exact stale-manifest fixture the review called out.
- The test now proves the same inputs schedule a removal without the install filter and skip removal when the installed canonical path is supplied.

**Files changed:**

- `packages/cli/src/engine/compute-plan.test.ts` - converted the install-scoped regression into a paired fixture with filtered and unfiltered expectations

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
- Result: pass

**Notes / Decisions:**

- The stricter regression fit the existing planner behavior, so no production code changes were needed for this task.
- Tightening the expectation exposed a missing `relative(...)` import in the test, which was fixed as part of the same task.

### Task p02-t02: (review) Fix cancel-path install filter stamping for pack-level init handlers

**Status:** completed
**Commit:** bc74b077

**Outcome:**

- Pack-level init handlers now record install-scoped canonical paths only when a real install completes.
- Cancelled overwrite confirmations no longer stamp a pack as installed for the follow-up sync.

**Files changed:**

- `packages/cli/src/commands/init/tools/core/index.ts` - gated core pack canonical stamping on successful install completion
- `packages/cli/src/commands/init/tools/ideas/index.ts` - returned install success state so cancelled force confirmations skip canonical stamping
- `packages/cli/src/commands/init/tools/workflows/index.ts` - returned install success state so cancelled force confirmations skip canonical stamping
- `packages/cli/src/commands/init/tools/project-management/index.ts` - tracked successful install completion before stamping canonical paths
- `packages/cli/src/commands/init/tools/ideas/index.test.ts` - asserted cancelled overwrite confirmation leaves installed canonical paths empty

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- ideas/index.test.ts workflows/index.test.ts core/index.test.ts`
- Result: pass

**Notes / Decisions:**

- I kept the change local to the pack handlers instead of changing the shared install-sync context API.
- The focused negative-path test lives in `ideas/index.test.ts`, matching the review recommendation, while the touched workflow and core command tests remained green.

### Task p02-t03: (review) Validate hidden install-scoped canonical paths

**Status:** completed
**Commit:** be8b904f

**Outcome:**

- Added validation for the hidden `--install-canonical` sync option so only canonical `.agents/...` paths are accepted.
- Invalid values now fail before sync planning runs, which prevents unsupported manual narrowing of removals.

**Files changed:**

- `packages/cli/src/commands/sync/index.ts` - validated hidden install-scoped canonical paths and raised a CLI error for malformed values
- `packages/cli/src/commands/sync/index.test.ts` - covered both valid forwarding and invalid-path rejection

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- sync/index.test.ts`
- Result: pass

**Notes / Decisions:**

- I validated in the command action instead of the Commander arg parser so the failure stays an explicit CLI error path.
- The accepted path shape covers `.agents/skills/*`, `.agents/agents/*`, and `.agents/rules/*`, matching the internal canonical namespaces used by sync.

### Task p02-t04: (review) Make provider coupling explicit in compute-plan regression tests

**Status:** completed
**Commit:** 10475e45

**Outcome:**

- The stale-manifest regression now declares its provider alignment explicitly instead of depending on `createTestAdapter()` default behavior.

**Files changed:**

- `packages/cli/src/engine/compute-plan.test.ts` - bound the regression fixture to an explicit `claude` adapter instance

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- compute-plan.test.ts`
- Result: pass

**Notes / Decisions:**

- I kept the hardening local to the reviewed regression instead of changing the shared test helper default.

---

### Review Received: final

**Date:** 2026-04-14
**Review artifact:** reviews/archived/final-review-2026-04-14.md

**Findings:**

- Critical: 0
- Important: 2
- Medium: 0
- Minor: 4

**New tasks added:** p02-t01, p02-t02, p02-t03, p02-t04

**Deferred Findings:**

- `m1` Plan commit convention drift: deferred as acceptable bookkeeping history because the combined `fix(cli):` commit is still readable and conventional.
- `m3` `install-sync-context.ts` location/import direction: deferred because it is a non-behavioral cleanup and would add churn without changing the review target.

**Explicit Final Minor Disposition:**

- User chose to convert `m2` and `m4` into fix tasks and defer `m1` and `m3`.

**Re-review result:** passed
**Passing artifact:** reviews/archived/final-review-2026-04-14-20260414T154441Z.md

**Next:** Final review passed. Proceed to PR creation.

## Implementation Log

### 2026-04-14

**Session Start:** 19:05 UTC

- [x] p01-t01: Reproduce stale-manifest removal behavior
- [x] p01-t02: Implement conservative removal guard
- [x] p01-t03: Verify install-path behavior and summarize asymmetry
- [x] p02-t01: Add paired regression coverage for install-scoped removal filtering
- [x] p02-t02: Fix cancel-path install filter stamping for pack-level init handlers
- [x] p02-t03: Validate hidden install-scoped canonical paths
- [x] p02-t04: Make provider coupling explicit in compute-plan regression tests

**What changed (high level):**

- Install-triggered sync now filters removals to the canonical entries installed in that invocation.
- Tool-pack installers record canonical install targets for the post-install sync hook.
- Regression coverage now exercises the planner seam and the install-to-sync forwarding path.
- Review-fix follow-up tightened the regression baseline, gated canceled pack installs from stamping canonical filters, and validated the hidden install filter option.

**Decisions:**

- Preserved direct `oat sync` deletion semantics and scoped the behavioral change only to install-triggered auto-sync.

**Follow-ups / TODO:**

- Consider a separate stale-manifest pruning workflow if install-triggered preservation leaves too much drift behind.
- Request a final re-review now that p02-t01 through p02-t04 are complete.

**Blockers:**

- None

**Session End:** 00:25 UTC

---

## Deviations from Plan

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

| Phase | Tests Run                                              | Passed | Failed | Coverage             |
| ----- | ------------------------------------------------------ | ------ | ------ | -------------------- |
| 1     | 4 targeted suites + CLI build + release check          | yes    | 0      | targeted             |
| 2     | targeted suites + repo verification + release validate | yes    | 0      | targeted + full repo |

## Final Summary (for PR/docs)

**What shipped:**

- Install-triggered tool-pack sync no longer deletes unrelated provider-view files because of stale manifest entries.
- The sync planner now accepts an internal removal filter passed from the install command.
- Review-fix follow-up added the missing regression baseline, prevented canceled pack installs from stamping install filters, and validated hidden install-filter inputs.

**Behavioral changes (user-facing):**

- Running `oat tools install docs` in a worktree with stale manifest mappings preserves unrelated provider views instead of planning their removal.

**Key files / modules:**

- `packages/cli/src/commands/tools/shared/install-sync-context.ts` - canonical install target tracking
- `packages/cli/src/commands/tools/install/index.ts` - auto-sync forwarding
- `packages/cli/src/commands/sync/index.ts` - hidden install filter handling
- `packages/cli/src/engine/compute-plan.ts` - removal filter application

**Verification performed:**

- Targeted CLI Vitest run
- Full workspace test run
- `pnpm lint`
- `pnpm type-check`
- `pnpm build`
- `pnpm release:validate`

**Design deltas (if any):**

- No design artifact was needed; the implementation followed the quick-plan decision to keep the change conservative and local to install-triggered sync.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
