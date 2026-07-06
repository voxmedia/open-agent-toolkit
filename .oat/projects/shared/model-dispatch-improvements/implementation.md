---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-06
oat_current_task_id: p04-t01
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
| Phase 3 | complete | 5     | 5/5       |
| Phase 4 | pending  | 3     | 0/3       |

**Total:** 13/16 tasks completed

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

## Phase 3: Lifecycle Skills, Templates, and Docs

**Status:** complete
**Started:** 2026-07-06
**Completed:** 2026-07-06

### Phase Summary

**Outcome (what changed):**

- Updated planning and quick-start prompts from ceiling-only language to the dispatch policy model.
- Updated implementation dispatch instructions for capped managed, managed `Uncapped`, and `Inherit Host Defaults` behavior.
- Aligned templates, plan-writing guidance, and agent contracts with policy terminology and Claude `fable`.
- Documented the dispatch policy model across workflow, implementation, configuration, and directory-reference docs.
- Regenerated bundled assets and provider views, then fixed p03 review findings around no-target reviewer metadata, lifecycle docs, and Codex role descriptions.

**Key files touched:**

- `.agents/skills/oat-project-plan/SKILL.md` - planning dispatch policy prompt.
- `.agents/skills/oat-project-quick-start/SKILL.md` - quick-start dispatch policy prompt and version bump.
- `.agents/skills/oat-project-implement/SKILL.md` - runtime dispatch rules and no-target reviewer wording.
- `.agents/skills/oat-project-plan-writing/SKILL.md` - template and Dispatch Profile guidance.
- `.oat/templates/plan.md` and `.oat/templates/state.md` - dispatch policy frontmatter/template comments.
- `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md` - policy model documentation.
- `apps/oat-docs/docs/workflows/projects/implementation-execution.md` - implementation dispatch behavior.
- `apps/oat-docs/docs/workflows/projects/lifecycle.md` - plan-boundary policy capture.
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` and tests - no-target reviewer selection metadata.
- `packages/cli/src/validation/skills.test.ts` - quick-start skill version expectation.

**Verification:**

- Run: `pnpm run oat:validate-skills`
- Result: pass
- Run: `pnpm run cli -- docs generate-index`
- Result: pass
- Run: `pnpm build:docs`
- Result: pass
- Run: `pnpm run cli -- sync --scope all`
- Result: pass
- Run: `pnpm run cli -- --help >/dev/null`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`
- Result: pass (224 files / 2128 tests)
- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
- Result: pass (38 tests)
- Run: `pnpm run cli -- status --scope project --json`
- Result: pass (`total=142`, `inSync=142`, `drifted=0`, `missing=0`, `stray=0`)
- Run: `git diff --check`
- Result: pass

**Notes / Decisions:**

- p03 review found stale `review-target` metadata for managed `Uncapped` reviewer dispatch, stale lifecycle docs, and stale Codex role wording. Commit `3f47d036` addressed the contract and docs; commit `2c358e55` aligned the quick-start skill version expectation with the p03 skill bump.
- p03 re-review passed with no findings.

### Task p03-t01: Update Planning Policy Prompts

**Status:** completed
**Commit:** 555cdaea
**Follow-up Commit:** 2c358e55

**Outcome:**

- Updated planning and quick-start prompts to present `Economy`, `Balanced`, `High`, `Frontier`, `Uncapped`, and `Inherit Host Defaults`.
- Persisted explicit dispatch policy state for managed uncapped and inherit/default selections.
- Bumped changed skill versions and aligned the quick-start version expectation test.

**Verification:**

- Run: `pnpm run oat:validate-skills`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
- Result: pass

---

### Task p03-t02: Update Implementation Dispatch Instructions

**Status:** completed
**Commit:** 55f4e4dd
**Fix Commit:** 3f47d036

**Outcome:**

- Updated implementation dispatch rules for capped managed, managed `Uncapped`, and `Inherit Host Defaults`.
- Clarified Codex pinned variant behavior, Claude model-axis behavior, and no-target reviewer fallback behavior.
- Fixed managed `Uncapped` reviewer selection metadata so no-target reviewer paths do not masquerade as configured review targets.

**Verification:**

- Run: `pnpm run oat:validate-skills`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`
- Result: pass

---

### Task p03-t03: Update Templates and Plan-Writing Guidance

**Status:** completed
**Commit:** 8fbab426

**Outcome:**

- Updated plan-writing guidance, templates, and agent contracts for dispatch policy terminology.
- Added Claude `fable` to Dispatch Profile allowed values where appropriate.
- Clarified provider defaults as inherit/default or base/unpinned fallback behavior.

**Verification:**

- Run: `pnpm run oat:validate-skills`
- Result: pass

---

### Task p03-t04: Update Docs Site Content

**Status:** completed
**Commit:** b253fb01
**Fix Commit:** 3f47d036

**Outcome:**

- Documented dispatch policy terminology, legacy dispatch-ceiling compatibility, managed capped choices, managed `Uncapped`, and `Inherit Host Defaults`.
- Explained cap-vs-target behavior and provider-specific enforcement for Codex and Claude.
- Updated lifecycle docs to describe `oat_dispatch_policy` capture and legacy compatibility at the plan boundary.

**Verification:**

- Run: `pnpm run cli -- docs generate-index`
- Result: pass
- Run: `pnpm build:docs`
- Result: pass

---

### Task p03-t05: Regenerate Bundled Assets and Provider Views

**Status:** completed
**Commit:** e9918d2f
**Fix Commit:** 3f47d036

**Outcome:**

- Regenerated bundled CLI assets and provider views after canonical skill, template, agent, and docs updates.
- Updated Codex role descriptions to dispatch policy cap wording.
- Verified managed provider views are in sync.

**Verification:**

- Run: `pnpm run cli -- sync --scope all`
- Result: pass
- Run: `pnpm run cli -- --help >/dev/null`
- Result: pass
- Run: `pnpm run cli -- status --scope project --json`
- Result: pass (`total=142`, `inSync=142`, `drifted=0`, `missing=0`, `stray=0`)
- Run: `git diff --check`
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

### Run 3 — 2026-07-06 12:16

**Branch:** dispatch-fixes-round-2
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p03   | DONE        | pass   | 1/2            | passed      |

#### Parallel Groups

- p03: sequential

#### Dispatch Notes

- Dispatch: p03 implementation used model_axis=inherited, effort_axis=selected:high, dispatch_ceiling=xhigh; high was selected because p03 changed shipped lifecycle skills, templates, docs, and generated provider assets.
- Dispatch: p03 review used effort_axis=selected:xhigh at the configured ceiling for deterministic quality gate behavior.
- Dispatch: p03 review fix used effort_axis=selected:high to resolve lifecycle docs and no-target reviewer selection metadata findings.
- Dispatch: p03 re-review used effort_axis=selected:xhigh and passed with no findings.

#### Outstanding Items

- None.

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
- [x] p03-t01: Update Planning Policy Prompts - 555cdaea, follow-up 2c358e55
- [x] p03-t02: Update Implementation Dispatch Instructions - 55f4e4dd, fix 3f47d036
- [x] p03-t03: Update Templates and Plan-Writing Guidance - 8fbab426
- [x] p03-t04: Update Docs Site Content - b253fb01, fix 3f47d036
- [x] p03-t05: Regenerate Bundled Assets and Provider Views - e9918d2f, fix 3f47d036

**What changed (high level):**

- Phase 1 completed and passed re-review.
- Claude `fable` is now accepted across config, provider registry, and dispatch resolver paths.
- Phase 2 completed and passed re-review after fixing config-source precedence.
- Phase 3 completed and passed re-review after aligning shipped skills, docs, templates, generated assets, and no-target reviewer metadata.

**Decisions:**

- HiLL checkpoints: final phase only (`p04`) from `workflow.hillCheckpointDefault`.
- Auto-review at HiLL checkpoints: enabled from `workflow.autoReviewAtHillCheckpoints`.
- Execution tier: Tier 1 subagents authorized by user request.
- Resolver valid-value checks should use canonical provider/config values instead of local stale lists.
- New dispatch policy config and legacy dispatch ceiling config must be compared by resolved source precedence.
- Managed `Uncapped` review dispatch has no review target; logs and resolver metadata use no-target wording rather than `review-target`.

**Follow-ups / TODO:**

- Continue with p04-t01.

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

| Phase | Tests Run                                                                                                                                                                                                                                                                                                                                                                                                                          | Passed | Failed | Coverage |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | `pnpm --filter @open-agent-toolkit/cli test -- src/config/oat-config.test.ts src/config/dispatch-ceiling-preset.test.ts src/commands/config/index.test.ts src/commands/help-snapshots.test.ts src/providers/ceiling/registry.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`                                                                                         | yes    | 0      | targeted |
| 2     | `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`; `git diff --check`                                                                                                                                                                                                                                                                                                            | yes    | 0      | targeted |
| 3     | `pnpm run oat:validate-skills`; `pnpm run cli -- docs generate-index`; `pnpm build:docs`; `pnpm run cli -- sync --scope all`; `pnpm run cli -- --help >/dev/null`; `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts`; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`; `pnpm run cli -- status --scope project --json`; `git diff --check` | yes    | 0      | targeted |

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
