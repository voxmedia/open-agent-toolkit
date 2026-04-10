---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-10
oat_current_task_id: p03-t02
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
| Phase 1: Config System Extension                   | complete    | 4     | 4/4       |
| Phase 2: Skill Integration — oat-project-implement | complete    | 5     | 5/5       |
| Phase 3: Skill Integration — oat-project-complete  | in_progress | 2     | 1/2       |
| Phase 4: Skill Integration — Review Skills         | pending     | 3     | 0/3       |
| Phase 5: Documentation and Bundled Docs Update     | pending     | 2     | 0/2       |

**Total:** 10/16 tasks completed

---

## Phase 1: Config System Extension

**Status:** complete
**Started:** 2026-04-10
**Completed:** 2026-04-10

### Phase Summary

**Outcome:**

- `OatWorkflowConfig` interface defined with 6 preference keys (`hillCheckpointDefault`, `archiveOnComplete`, `createPrOnComplete`, `postImplementSequence`, `reviewExecutionModel`, `autoNarrowReReviewScope`)
- All 3 config surfaces (`OatConfig`, `OatLocalConfig`, `UserConfig`) now carry optional `workflow` field with shared normalization
- `getConfigValue()` refactored to delegate to `resolveEffectiveConfig()` — ~150 lines of per-key if-else deleted; all keys now resolve through a single code path with per-key source attribution
- Source labels updated to `shared` / `local` / `user` / `env` / `default` (previously `config.json` / `config.local.json` / …)
- `oat config set` gained `--shared`, `--local`, `--user` mutually exclusive flags with per-key surface restrictions
- Workflow keys can now be set at any of the three surfaces (default is local); power users can set personal defaults at user scope once and have them apply across all repos

**Key files touched:**

- `packages/cli/src/config/oat-config.ts` — OatWorkflowConfig type, normalizer, three-surface wiring
- `packages/cli/src/config/resolve.ts` — DEFAULT_WORKFLOW_CONFIG, DEFAULT_SHARED_CONFIG tools defaults (regression fix)
- `packages/cli/src/commands/config/index.ts` — ConfigKey union, KEY_ORDER, CONFIG_CATALOG entries, getConfigValue refactor, setConfigValue workflow branches, surface validation, `--shared`/`--local`/`--user` flags
- `packages/cli/src/commands/config/index.test.ts` — 24 new tests covering normalization, catalog, surface flags, validation, enum/boolean parsing, and full 3-layer precedence
- `packages/cli/src/config/oat-config.test.ts` — 7 new normalization tests
- `packages/cli/src/config/resolve.test.ts` — 4 new resolution precedence tests
- `packages/cli/src/commands/help-snapshots.test.ts` — updated config --help snapshot

**Verification:**

- Full test suite: 1225 passed (started at 1208 — net +17 new tests for workflow keys and surface flags)
- Lint: 0 warnings, 0 errors
- Type-check: clean
- Manual smoke tests validated:
  - `oat config get projects.root` → `.oat/projects/shared` (source: default)
  - `oat config get autoReviewAtCheckpoints` → `true` (source: shared)
  - `oat config get activeProject` → `.oat/projects/shared/workflow-friction` (source: local)
  - `OAT_PROJECTS_ROOT=/tmp/test oat config get projects.root --json` → value `/tmp/test`, source `env`
  - `oat config set workflow.archiveOnComplete true --user` → writes to `~/.oat/config.json`
  - `oat config get workflow.archiveOnComplete --json` after user set → value `true`, source `user`

**Notes / Decisions:**

- Dropped `workflow.autoFixBookkeepingDrift` from the original plan during discussion — the root cause (missing commits in review-receive skills) is being fixed in Phase 4, so the config escape hatch is no longer needed
- `autoReviewAtCheckpoints` stays shared-only for now. Extending behavioral keys to all surfaces is out of scope for this task (power users can still set it via `oat config set autoReviewAtCheckpoints true` default behavior)
- Source label update is a minor user-facing change (visible in `oat config get --json` and `oat config list`). Justification: consistency with `oat config dump` output from PR #38 and clearer vocabulary (`local` > `config.local.json`)

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

**Status:** completed
**Commit:** 9f6895b

**Outcome:**

- Added `ConfigSurface` type (`'auto' | 'shared' | 'local' | 'user'`) and extended `setConfigValue()` to accept a surface parameter
- Added `--shared`, `--local`, `--user` mutually exclusive flags to the `oat config set` command
- Surface validation enforces per-key restrictions:
  - Structural keys → shared only (`projects.root`, `worktrees.root`, `git.*`, `documentation.*`, `archive.*`, `tools.*`)
  - State keys → local only (`activeProject`, `lastPausedProject`, `activeIdea`)
  - `autoReviewAtCheckpoints` → shared only (deferred multi-surface expansion to follow-up)
  - Workflow keys → any non-auto surface; default is local
- Added workflow value parsing with enum and boolean validation
- Added workflow write branches for all three surfaces (shared, local, user) using read-merge-write pattern
- Added `readUserConfig` / `writeUserConfig` to `ConfigCommandDependencies` for dependency injection
- Updated config `--help` snapshot to reflect new `set [options]` signature

**Files changed:**

- `packages/cli/src/commands/config/index.ts` — ConfigSurface type, validation, workflow parsing, workflow write branches, --shared/--local/--user Commander flags, mutual-exclusivity check
- `packages/cli/src/commands/config/index.test.ts` — 11 new tests covering all surface combinations, enum/boolean validation, invalid surface errors, mutually exclusive flag rejection, and full 3-layer precedence chain
- `packages/cli/src/commands/help-snapshots.test.ts` — updated config --help inline snapshot

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test` — 1225 passed
- Run: `pnpm --filter @open-agent-toolkit/cli lint` — 0 warnings, 0 errors
- Run: `pnpm --filter @open-agent-toolkit/cli type-check` — clean
- Manual smoke: `HOME=$(mktemp -d) pnpm run cli -- config set workflow.archiveOnComplete true --user` → writes to fake home/.oat/config.json, source confirmed `user`
- Manual smoke: Set user → shared → local in sequence, confirmed precedence chain resolves correctly

**Notes:**

- Discovered a minor cleanup need: the smoke test wrote `workflow.archiveOnComplete: false` to the real repo `.oat/config.json` (because `--shared` targets the repo regardless of HOME). Reverted with `git checkout .oat/config.json`
- The `mapSurfaceToSource` helper I initially added was unused and removed before commit
- autoReviewAtCheckpoints at `--local` / `--user` is explicitly rejected with a clear error message — this is the one place surface validation blocks a behavioral key

---

## Phase 2: Skill Integration — oat-project-implement

**Status:** complete
**Started:** 2026-04-10
**Completed:** 2026-04-10

### Phase Summary

**Outcome:**

- `oat-project-implement` (v1.2.2 → v1.3.0) now respects 3 workflow preferences and has stronger bookkeeping enforcement
- Step 2.5: reads `workflow.hillCheckpointDefault` before checkpoint prompt (`every` / `final`)
- Step 15: reads `workflow.postImplementSequence` before next-steps prompt (`wait` / `summary` / `pr` / `docs-pr`)
- Step 14: reads `workflow.reviewExecutionModel` with fresh-session soft-preference escape hatch (`subagent` / `inline` / `fresh-session`)
- Step 3: removed interactive resume/fresh-start prompt — always resume by default, fresh start is an explicit argument-only override
- Mode Assertion: added CRITICAL rule that bookkeeping commits are mandatory, not optional, with prose explaining that "not related to the implementation" is not an excuse to skip
- All 4 existing `Bookkeeping commit (required)` sections now carry a `DO NOT SKIP` callout

**Key files touched:**

- `.agents/skills/oat-project-implement/SKILL.md` — 5 distinct edits across Mode Assertion, Step 2.5, Step 3, Step 14, Step 15, and 4 bookkeeping commit sections

**Verification:**

- `pnpm lint` → clean on every task
- `pnpm format` → clean on every task
- Step numbering preserved (Steps 0, 0.5, 1, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16) — no drift from the 5 edits
- `grep -c "DO NOT SKIP"` → 4 (all four bookkeeping sections hardened)
- Skill version bumped once per PR rule: 1.2.2 → 1.3.0

**Notes / Decisions:**

- Used "Workflow preference check (before prompting)" subsections to match the existing "Auto-Review at Checkpoints (Touchpoint A)" pattern in Step 2.5 — consistent mental model for where preferences apply
- `fresh-session` review preference is the only value that isn't a hands-free execution — it prints guidance but still offers escape hatches, per the plan's "soft preference" design
- The resume-by-default change is a deliberate UX simplification, not a config preference — in practice fresh start is a rare edge case and doesn't deserve a prompt every session

### Task p02-t01: HiLL checkpoint default preference

**Status:** completed
**Commit:** e2fd906

**Outcome:**

- Added "Workflow preference check (before prompting)" subsection to Step 2.5
- Skill now reads `workflow.hillCheckpointDefault` via `oat config get` before presenting the 3-option prompt
- `every` → writes `oat_plan_hill_phases: []`, skips prompt, continues to Touchpoint A
- `final` → writes `oat_plan_hill_phases: ["<final-phase-id>"]`, skips prompt, continues to Touchpoint A
- Unset/invalid → falls through to existing prompt behavior (backward compatible)
- Preference check only applies on first runs; resuming implementations trust existing plan.md state
- Bumped skill version 1.2.2 → 1.3.0 (first change in this PR for oat-project-implement)

**Files changed:**

- `.agents/skills/oat-project-implement/SKILL.md` — frontmatter version bump, new workflow preference check subsection in Step 2.5

**Verification:**

- `pnpm lint` → clean
- `pnpm format` → clean
- Step heading grep confirmed numbering (Steps 0, 0.5, 1, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16)
- Subsection placement: inserted between "Determine whether this is a first implementation run" paragraph and "Prompt behavior" list so the preference check happens before the prompt

**Notes:**

- Used a subsection heading (`#### Workflow preference check (before prompting)`) to match the existing `#### Auto-Review at Checkpoints (Touchpoint A)` pattern in the same step
- Deliberately kept prose concise; the pattern is simple enough that verbose docs would reduce signal

### Task p02-t02: Post-implementation sequence preference

**Status:** completed
**Commit:** ec5b998

**Outcome:**

- Step 15 now reads `workflow.postImplementSequence` before presenting the next-steps prompt
- All 4 values handled: `wait`, `summary`, `pr`, `docs-pr`
- Added explanatory note that `pr` and `docs-pr` don't list summary separately because `oat-project-pr-final` auto-generates summary.md
- Standard prompt preserved as fallback when preference is unset
- Backward compatible — unset preference = existing prompt behavior

**Files changed:**

- `.agents/skills/oat-project-implement/SKILL.md` — Step 15 workflow preference check, prompt reorganization with "Standard prompt" subheading

**Verification:**

- `pnpm lint` / `pnpm format` → clean

**Notes:**

- Chose to use inline subsections rather than a separate "Touchpoint" heading since Step 15 is more linear than Step 2.5. The "Workflow preference check (before prompting)" + "Standard prompt (when preference is unset)" split keeps both paths readable

### Task p02-t03: Review execution model preference

**Status:** completed
**Commit:** d4beb33

**Outcome:**

- Step 14 reads `workflow.reviewExecutionModel` before presenting the 3-tier review prompt
- `subagent` → dispatches subagent directly, no prompt
- `inline` → runs review inline, no prompt
- `fresh-session` → implemented as a **soft preference with escape hatch**: prints the "run in a separate session" guidance, but also offers `1) subagent` or `2) inline` as escape options, or press Enter to wait. The agent can't actually run the review in a fresh session on the user's behalf, so this is the honest behavior.
- Unset/invalid → falls through to the standard 3-tier prompt (backward compatible)

**Files changed:**

- `.agents/skills/oat-project-implement/SKILL.md` — Step 14 workflow preference check + standard prompt restructure

**Verification:**

- `pnpm lint` → clean

**Notes:**

- The `fresh-session` escape hatch design was validated in the plan discussion — the agent is stepping aside but still offers the user a way to bail into an actionable mode if they change their mind. The soft-preference behavior is what makes this key differently-shaped from the other two values

### Task p02-t04: Change resume to default behavior (no prompt)

**Status:** completed
**Commit:** d9c1cf3

**Outcome:**

- Removed the interactive "Resume from {task_id}, or start fresh (overwrite implementation.md)?" prompt
- New behavior: always resume from the resolved task pointer with a simple `Resuming from {task_id}.` print
- Fresh start is now an explicit argument-only override: `oat-project-implement fresh=true`, with a warning about overwriting implementation.md
- Rationale: in practice, fresh start is a rare edge case (corrupt state, deliberate plan rewrites), not something that should be prompted every resume

**Files changed:**

- `.agents/skills/oat-project-implement/SKILL.md` — Step 3 "If exists and has progress" bullet list updated

**Verification:**

- `pnpm lint` → clean

**Notes:**

- This is a behavioral change (not a preference), so no new config key. The plan decision was that fresh-start is too rare to warrant a config toggle

### Task p02-t05: Strengthen bookkeeping commit enforcement

**Status:** completed
**Commit:** f6ffbfe

**Outcome:**

- Added CRITICAL block after Mode Assertion explaining that bookkeeping commits are mandatory and calling out the specific agent-reasoning failure mode ("not related to the implementation")
- Added `**DO NOT SKIP.** This commit prevents state drift across sessions.` callout to each of the 4 existing `**Bookkeeping commit (required):**` sections:
  - Step 7: after each task code commit
  - Step 7 review-fix branch: after review-fix completion
  - Step 8: at phase boundaries
  - Step 12: at implementation completion

**Files changed:**

- `.agents/skills/oat-project-implement/SKILL.md` — Mode Assertion block, 4 bookkeeping commit section callouts

**Verification:**

- `pnpm lint` → clean
- `grep -c "DO NOT SKIP"` → 4 (all four sections hardened)

---

## Phase 3: Skill Integration — oat-project-complete

**Status:** pending
**Started:** -

### Task p03-t01: Archive on complete preference

**Status:** completed
**Commit:** 7be5f4e

**Outcome:**

- `oat-project-complete` Step 2 now reads `workflow.archiveOnComplete` before presenting the batched questions
- `true` → sets `SHOULD_ARCHIVE=true`, skips the archive question, prints `Archive on complete: enabled (from workflow.archiveOnComplete).`
- `false` → sets `SHOULD_ARCHIVE=false`, skips the archive question, prints `Archive on complete: disabled (from workflow.archiveOnComplete).`
- Unset → includes the archive question in the batched prompt as before (backward compatible)
- Added an explicit note: the "Ready to mark complete?" confirmation is always asked regardless of preferences — it's a meaningful confirmation, not a preference
- Bumped skill version 1.3.7 → 1.4.0

**Files changed:**

- `.agents/skills/oat-project-complete/SKILL.md` — frontmatter version bump, new "Workflow preference checks" subsection before Step 2 batched questions

**Verification:**

- `pnpm lint` → clean

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
