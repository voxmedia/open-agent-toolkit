---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-06
oat_current_task_id: p03-t01
oat_generated: false
---

# Implementation: model-dispatch-improvements

**Started:** 2026-07-05
**Last Updated:** 2026-07-06

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 4     | 4/4       |
| Phase 2 | complete | 4     | 4/4       |
| Phase 3 | pending  | 5     | 0/5       |
| Phase 4 | pending  | 3     | 0/3       |

**Total:** 8/16 tasks completed

---

## Phase 1: Dispatch Policy Model and Presets

**Status:** complete
**Started:** 2026-07-06
**Completed:** 2026-07-06

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Added a dispatch policy config model alongside legacy dispatch ceiling compatibility.
- Added managed policy preset compilation for economy, balanced, high, frontier, and uncapped.
- Exposed dispatch policy config keys and validation through the config command surface.
- Added Claude `fable` as the Frontier model tier and fixed resolver support for `fable`.

**Key files touched:**

- `packages/cli/src/config/oat-config.ts` - dispatch policy config types, defaults, and validation.
- `packages/cli/src/config/resolve.ts` - config resolution support for dispatch policy keys.
- `packages/cli/src/config/dispatch-ceiling-preset.ts` - managed policy preset compilation.
- `packages/cli/src/commands/config/index.ts` - config command catalog and validation updates.
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` - canonical provider value handling for Claude `fable`.
- `packages/cli/src/providers/ceiling/registry.ts` - Claude `fable` tier registration and ordering.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/config/oat-config.test.ts src/config/dispatch-ceiling-preset.test.ts src/commands/config/index.test.ts src/commands/help-snapshots.test.ts src/providers/ceiling/registry.test.ts`
- Result: pass (implementer reported all targeted p01 tests passing)
- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`
- Result: pass after p01 review fix (224 files / 2113 tests reported by fix agent)

**Notes / Decisions:**

- Review found that Claude `fable` had been added to config/provider surfaces but not the dispatch resolver's local valid-value list. The resolver was updated to use canonical provider values and p01 re-review passed.

### Task p01-t01: Add Dispatch Policy Config Types

**Status:** completed
**Commit:** ecb21f98

**Outcome (required when completed):**

- Added dispatch policy config types, defaults, and tests while preserving legacy dispatch ceiling compatibility.

**Files changed:**

- `packages/cli/src/config/oat-config.ts`
- `packages/cli/src/config/oat-config.test.ts`
- `packages/cli/src/config/resolve.ts`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/config/oat-config.test.ts`
- Result: pass

**Notes / Decisions:**

- Implemented by p01 phase agent.

**Issues Encountered:**

- None.

---

### Task p01-t02: Add Policy Preset Compilation

**Status:** completed
**Commit:** 1cb59cee

**Outcome:**

- Added managed policy preset compilation and explicit uncapped output.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/config/dispatch-ceiling-preset.test.ts`
- Result: pass

---

### Task p01-t03: Expose Dispatch Policy Config Commands

**Status:** completed
**Commit:** 8fe1cff4
**Fix Commit:** 0aab04b9

**Outcome:**

- Exposed dispatch policy config get/set/describe/list behavior.
- Fixed legacy Claude dispatch ceiling config values to include `fable`.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/config/index.test.ts src/commands/help-snapshots.test.ts`
- Result: pass

---

### Task p01-t04: Update Provider Value Registries

**Status:** completed
**Commit:** ab542f32
**Fix Commit:** 0c796edc

**Outcome:**

- Added Claude `fable` registry tier and resolver support.
- Added regression coverage for Claude `fable` dispatch resolution from repo config and project state.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/providers/ceiling/registry.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`
- Result: pass

---

## Phase 2: Resolver Semantics

**Status:** complete
**Started:** 2026-07-06
**Completed:** 2026-07-06

### Phase Summary

**Outcome (what changed):**

- Added explicit project `oat_dispatch_policy` parsing while preserving legacy `oat_dispatch_ceiling` fallback.
- Implemented capped, uncapped, and inherit/default resolver semantics.
- Expanded resolver selection metadata and human-facing output for policy-aware outcomes.
- Added provider-specific regression coverage for Codex, Claude, unsupported providers, and config-source precedence.

**Key files touched:**

- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` - resolver parsing, selection, output, and precedence semantics.
- `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts` - dispatch policy resolver regression coverage.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`
- Result: pass (implementer and fix-loop agents reported full CLI package test pass for the targeted command)
- Run: `git diff --check`
- Result: pass

**Notes / Decisions:**

- Review found a blocking migration-safety issue where lower-precedence new dispatch policy config could override a higher-precedence legacy cap. Commit `91e917e8` fixed config candidate source-precedence handling.
- p02 re-review passed with one Medium note about uncapped reviewer no-target metadata still using `review-target`, and one Minor note about remaining help text using legacy ceiling wording. These are recorded as non-blocking follow-up context for later lifecycle/docs work.

### Task p02-t01: Read Project Dispatch Policy State

**Status:** completed
**Commit:** ca153954

**Outcome:**

- Added explicit `oat_dispatch_policy` project-state parsing with legacy ceiling fallback.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`
- Result: pass

---

### Task p02-t02: Implement Capped, Uncapped, and Inherit Selection

**Status:** completed
**Commit:** 76ee79a4
**Fix Commit:** 91e917e8

**Outcome:**

- Implemented capped managed, uncapped managed, and inherit/default resolver semantics.
- Fixed source-precedence handling between new policy config and legacy dispatch ceiling provider caps.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`
- Result: pass

---

### Task p02-t03: Update Resolver Output and Errors

**Status:** completed
**Commit:** fb7e29bc

**Outcome:**

- Added explicit selection metadata, policy-aware output, and invalid policy guidance.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`
- Result: pass

---

### Task p02-t04: Cover Provider-Specific Resolver Cases

**Status:** completed
**Commit:** c34e7c05

**Outcome:**

- Added provider-specific regression coverage, including Codex uncapped behavior, Claude `fable`, inherit/default cases, unsupported providers, and config-source precedence.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`
- Result: pass

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 — 2026-07-06 11:03

**Branch:** dispatch-fixes-round-2
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p01   | DONE_WITH_CONCERNS | pass   | 1/2            | passed      |

#### Parallel Groups

- p01: sequential

#### Dispatch Notes

- Dispatch: p01 implementation used model_axis=inherited, effort_axis=selected:high, dispatch_ceiling=xhigh; high was selected because p01 changed shared config and provider tier semantics.
- Dispatch: p01 targeted pre-review fix used effort_axis=selected:medium to add Claude `fable` to config command validation.
- Dispatch: p01 review used effort_axis=selected:xhigh at the configured ceiling for deterministic quality gate behavior.
- Dispatch: p01 review fix used effort_axis=selected:high to fix resolver support for Claude `fable`.

#### Outstanding Items

- None.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

### Run 2 — 2026-07-06 11:33

**Branch:** dispatch-fixes-round-2
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p02   | DONE        | pass   | 1/2            | passed      |

#### Parallel Groups

- p02: sequential

#### Dispatch Notes

- Dispatch: p02 implementation used model_axis=inherited, effort_axis=selected:high, dispatch_ceiling=xhigh; high was selected because p02 changed shared resolver semantics.
- Dispatch: p02 review used effort_axis=selected:xhigh at the configured ceiling for deterministic quality gate behavior.
- Dispatch: p02 review fix used effort_axis=selected:high to fix config-source precedence between new dispatch policy and legacy dispatch ceiling.
- Dispatch: p02 re-review used effort_axis=selected:xhigh and passed with non-blocking Medium/Minor notes recorded below.

#### Outstanding Items

- Medium review note: uncapped reviewer no-target metadata still uses `review-target`.
- Minor review note: remaining help text still uses legacy ceiling wording.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-06

**Session Start:** n/a

- [x] p01-t01: Add Dispatch Policy Config Types - ecb21f98
- [x] p01-t02: Add Policy Preset Compilation - 1cb59cee
- [x] p01-t03: Expose Dispatch Policy Config Commands - 8fe1cff4, fix 0aab04b9
- [x] p01-t04: Update Provider Value Registries - ab542f32, fix 0c796edc
- [x] p02-t01: Read Project Dispatch Policy State - ca153954
- [x] p02-t02: Implement Capped, Uncapped, and Inherit Selection - 76ee79a4, fix 91e917e8
- [x] p02-t03: Update Resolver Output and Errors - fb7e29bc
- [x] p02-t04: Cover Provider-Specific Resolver Cases - c34e7c05

**What changed (high level):**

- Phase 1 completed and passed re-review.
- Claude `fable` is now accepted across config, provider registry, and dispatch resolver paths.
- Phase 2 completed and passed re-review after fixing config-source precedence.

**Decisions:**

- HiLL checkpoints: final phase only (`p04`) from `workflow.hillCheckpointDefault`.
- Auto-review at HiLL checkpoints: enabled from `workflow.autoReviewAtHillCheckpoints`.
- Execution tier: Tier 1 subagents authorized by user request.
- Resolver valid-value checks should use canonical provider/config values instead of local stale lists.
- New dispatch policy config and legacy dispatch ceiling config must be compared by resolved source precedence.

**Follow-ups / TODO:**

- Continue with p03-t01.

**Blockers:**

- None.

**Session End:** n/a

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                                                                                                                                                                                                                                                                                                  | Passed | Failed | Coverage |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | -------- |
| 1     | `pnpm --filter @open-agent-toolkit/cli test -- src/config/oat-config.test.ts src/config/dispatch-ceiling-preset.test.ts src/commands/config/index.test.ts src/commands/help-snapshots.test.ts src/providers/ceiling/registry.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts` | yes    | 0      | targeted |
| 2     | `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`; `git diff --check`                                                                                                                                                                                                                    | yes    | 0      | targeted |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
