---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-10
oat_current_task_id: p01-t04
oat_generated: false
oat_template: false
---

# Implementation: Workflow Friction — User Preference Config

**Started:** 2026-04-10
**Last Updated:** 2026-04-10

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews`.
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase                                              | Status      | Tasks | Completed |
| -------------------------------------------------- | ----------- | ----- | --------- |
| Phase 1: Config System Extension                   | in_progress | 4     | 3/4       |
| Phase 2: Skill Integration — oat-project-implement | pending     | 5     | 0/5       |
| Phase 3: Skill Integration — oat-project-complete  | pending     | 2     | 0/2       |
| Phase 4: Skill Integration — Review Skills         | pending     | 3     | 0/3       |
| Phase 5: Documentation and Bundled Docs Update     | pending     | 2     | 0/2       |

**Total:** 3/16 tasks completed

---

## Phase 1: Config System Extension

**Status:** in_progress
**Started:** 2026-04-10

### Phase Summary (fill when phase is complete)

_To be filled when Phase 1 completes._

### Task p01-t01: Add OatWorkflowConfig interface to all three config surfaces

**Status:** completed
**Commit:** c7524d5

**Outcome:**

- `OatWorkflowConfig` interface added to `oat-config.ts` with 6 preference keys
- `workflow?: OatWorkflowConfig` added to `OatConfig`, `OatLocalConfig`, and `UserConfig` interfaces
- `normalizeWorkflowConfig()` validates enum values and coerces booleans, drops empty objects
- All three normalize functions (`normalizeOatConfig`, `normalizeOatLocalConfig`, `normalizeUserConfig`) wired to call workflow normalizer
- `DEFAULT_WORKFLOW_CONFIG` added to `resolve.ts` so unset workflow keys appear in resolved output with `source: 'default'`

**Files changed:**

- `packages/cli/src/config/oat-config.ts` — types, normalizer, three-surface wiring
- `packages/cli/src/config/oat-config.test.ts` — 7 new tests for workflow normalization across all three surfaces
- `packages/cli/src/config/resolve.ts` — DEFAULT_WORKFLOW_CONFIG and merge into defaultValues
- `packages/cli/src/config/resolve.test.ts` — 4 new tests for workflow precedence chain (default, user-only, shared-overrides-user, local-overrides-all)

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test` — 1208 passed (7 new workflow tests)
- Run: `pnpm --filter @open-agent-toolkit/cli lint` — 0 warnings, 0 errors
- Run: `pnpm --filter @open-agent-toolkit/cli type-check` — clean

**Notes:**

- Used `as readonly string[]` cast for the enum validation `.includes()` checks since TypeScript narrows the readonly tuple too tightly
- Decided to drop empty workflow objects in normalization (`Object.keys(next).length > 0` check) so a config with `workflow: {}` doesn't pollute the resolved view

---

### Task p01-t02: Register workflow keys in config command catalog

**Status:** completed
**Commit:** 269c9ec

**Outcome:**

- Added all 6 `workflow.*` keys to `ConfigKey` union type
- Added all 6 keys to `KEY_ORDER` array (grouped together after `tools.*` keys)
- Added 6 catalog entries to `CONFIG_CATALOG` with full metadata under group "Workflow Preferences (3-layer: local > shared > user)"
- Each entry uses `scope: 'workflow'` (new scope value)
- File field describes the 3-layer file resolution chain
- Default value for all workflow keys is `null` (unset = prompt)
- No resolution logic added — that's reserved for p01-t03

**Files changed:**

- `packages/cli/src/commands/config/index.ts` — type union, KEY_ORDER, CONFIG_CATALOG entries
- `packages/cli/src/commands/config/index.test.ts` — 6 new tests covering describe (group, individual keys, enum types, JSON mode)

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test` — 1214 passed (6 new catalog tests)
- Run: `pnpm --filter @open-agent-toolkit/cli lint` — 0 warnings, 0 errors
- Run: `pnpm --filter @open-agent-toolkit/cli type-check` — clean

**Notes:**

- Catalog descriptions explicitly call out the 3-layer resolution and what each enum value means, since these will be the user-facing source of truth via `oat config describe`
- Sorted KEY_ORDER puts workflow keys after tools.\* and before worktrees.root

---

### Task p01-t03: Refactor getConfigValue() to use resolveEffectiveConfig()

**Status:** completed
**Commit:** 967ee68

**Outcome:**

- `getConfigValue()` is now a thin wrapper around `resolveEffectiveConfig()` from PR #38
- Deleted ~150 lines of per-key if-else resolution logic and the `resolveProjectsRootWithSource()` helper
- Added `formatResolvedValue()` helper that converts `unknown` from the resolved entry into `string | null` (handles booleans, strings, arrays, null)
- Added `userConfigDir` parameter to `getConfigValue()`; runners (`runGet`, `runList`) compute it from `context.home` via `join(context.home, '.oat')`
- Added `resolveEffectiveConfig` to `ConfigCommandDependencies` for test injection
- Added `tools.*` defaults block to `DEFAULT_SHARED_CONFIG` in `resolve.ts` so unset tools keys still resolve to `'false'` (regression fix discovered during refactor)
- Updated source labels in `setConfigValue()` from `'config.json'` / `'config.local.json'` → `'shared'` / `'local'` to match the resolveEffectiveConfig vocabulary
- Updated `ConfigValue.source` to use the typed `ResolvedConfigSource` union from `resolve.ts`
- Workflow keys (registered in catalog by p01-t02 with types from p01-t01) now resolve through this same code path automatically — no per-key special-casing needed

**User-facing change:**

`oat config get --json` and `oat config list` now show source labels as `shared` / `local` / `user` / `env` / `default` instead of `config.json` / `config.local.json` / `env` / `default`. This matches `oat config dump` output for consistency.

**Files changed:**

- `packages/cli/src/commands/config/index.ts` — refactor getConfigValue, update setConfigValue source labels, add userConfigDir to runners
- `packages/cli/src/commands/config/index.test.ts` — update existing tests to use new source labels
- `packages/cli/src/config/resolve.ts` — add tools.\* defaults block

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test` — 1214 passed (no test count change; all existing behavior preserved)
- Run: `pnpm --filter @open-agent-toolkit/cli lint` — 0 warnings, 0 errors
- Run: `pnpm --filter @open-agent-toolkit/cli type-check` — clean
- Manual smoke: `pnpm run cli -- config get projects.root` → `.oat/projects/shared` ✓
- Manual smoke: `pnpm run cli -- config get autoReviewAtCheckpoints` → `true` ✓
- Manual smoke: `pnpm run cli -- config get activeProject` → `.oat/projects/shared/workflow-friction` ✓
- Manual smoke: `OAT_PROJECTS_ROOT=/tmp/test pnpm run cli -- config get projects.root --json` → value `/tmp/test`, source `env` ✓

**Notes:**

- Discovered one regression: `tools.*` keys returned empty string instead of `'false'` when unset, because `tools` wasn't in `DEFAULT_SHARED_CONFIG`. Fixed by adding the defaults block. This actually surfaces a benefit of the refactor — defaults are now centralized in one place
- The `formatResolvedValue()` helper handles arrays via `.join(',')` for keys like `localPaths`. Existing list output still passes since the test only checks substring presence
- Did not touch `setConfigValue()` write logic in this task — that's reserved for p01-t04 along with `--user`/`--shared` flags

---

### Task p01-t04: Add --user / --shared surface flags to oat config set

**Status:** pending
**Commit:** -

---

## Phase 2: Skill Integration — oat-project-implement

**Status:** pending
**Started:** -

### Task p02-t01: HiLL checkpoint default preference

**Status:** pending
**Commit:** -

### Task p02-t02: Post-implementation sequence preference

**Status:** pending
**Commit:** -

### Task p02-t03: Review execution model preference

**Status:** pending
**Commit:** -

### Task p02-t04: Change resume to default behavior (no prompt)

**Status:** pending
**Commit:** -

### Task p02-t05: Strengthen bookkeeping commit enforcement

**Status:** pending
**Commit:** -

---

## Phase 3: Skill Integration — oat-project-complete

**Status:** pending
**Started:** -

### Task p03-t01: Archive on complete preference

**Status:** pending
**Commit:** -

### Task p03-t02: Create-PR-on-complete preference

**Status:** pending
**Commit:** -

---

## Phase 4: Skill Integration — Review Skills

**Status:** pending
**Started:** -

### Task p04-t01: Auto-narrow re-review scope preference

**Status:** pending
**Commit:** -

### Task p04-t02: Add bookkeeping commit step to oat-project-review-receive

**Status:** pending
**Commit:** -

### Task p04-t03: Add bookkeeping commit step to oat-project-review-receive-remote

**Status:** pending
**Commit:** -

---

## Phase 5: Documentation and Bundled Docs Update

**Status:** pending
**Started:** -

### Task p05-t01: Update OAT bundled docs with workflow preferences

**Status:** pending
**Commit:** -

### Task p05-t02: Add oat config describe metadata for all workflow keys

**Status:** pending
**Commit:** -

---

## Orchestration Runs

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

### 2026-04-10

**Session Start:** initial implementation kickoff

**Plan checkpoint configuration:**

- `oat_plan_hill_phases: ['p05']` (stop only after final phase)
- `oat_auto_review_at_checkpoints: true` (from `.oat/config.json`)

**Approach:**

Phase 1 builds on top of `resolveEffectiveConfig()` from PR #38 (control-plane). The refactor to `getConfigValue()` in p01-t03 deletes ~150 lines of duplicated resolution logic and centralizes everything through the existing utility.

---

## Deviations from Plan

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |
| 3     | -         | -      | -      | -        |
| 4     | -         | -      | -      | -        |
| 5     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

_To be filled when implementation is complete._

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
