---
oat_status: complete
oat_ready_for: oat-project-pr-final
oat_blockers: []
oat_last_updated: 2026-04-14
oat_current_task_id: null
oat_generated: false
---

# Implementation: tool-install-ux

**Started:** 2026-04-13
**Last Updated:** 2026-04-14

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase and task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status    | Tasks | Completed |
| ------- | --------- | ----- | --------- |
| Phase 1 | completed | 2     | 2/2       |
| Phase 2 | completed | 2     | 2/2       |
| Phase 3 | completed | 3     | 3/3       |

**Total:** 7/7 tasks completed

---

## Phase 1: Detect Pack Location And Enforce Scope Changes

**Status:** completed
**Started:** 2026-04-13

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Added migration cleanup for user-eligible packs so reinstalling a pack at the opposite scope removes stale canonical content from the old scope before the new install runs.
- Propagated the actual affected scope set into `oat tools install` auto-sync, so scope migrations sync both the cleaned-up scope and the destination scope instead of only the CLI-level scope.
- Added focused regressions covering project-to-user migrations, both-to-project normalization, and the `tools install` post-action hook.

**Key files touched:**

- `packages/cli/src/commands/init/tools/index.ts` - installer behavior and prompt flow
- `packages/cli/src/commands/init/tools/index.test.ts` - interactive install regressions
- `packages/cli/src/commands/tools/install/index.test.ts` - install command and auto-sync regressions

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test`
- Result: fails outside this task because unrelated suites cannot resolve `@open-agent-toolkit/control-plane`
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: fails outside this task because `src/commands/project/list.ts` and `src/commands/project/status.ts` cannot resolve `@open-agent-toolkit/control-plane`

**Notes / Decisions:**

- Scope migration cleanup is limited to user-eligible packs; project-only packs remain project-scoped and are never moved.
- Research migration cleanup removes both skills and bundled agents because user-scope agents are not surfaced by the canonical scan.

### Task p01-t01: Derive pack installation state across project and user scopes

**Status:** completed
**Commit:** 6f551c4e

**Outcome (required when completed):**

- Added an install-domain helper that summarizes pack presence across project and user scopes as `project`, `user`, `both`, or `not-installed`.
- Wired the installer to derive shared `tools` config booleans from scanned canonical state rather than assuming every selected pack is installed.
- Added focused tests covering pack-state aggregation and kept the command harness compatible with scan-based state lookup.

**Files changed:**

- `packages/cli/src/commands/init/tools/install-state.ts` - pack install-state aggregation helper
- `packages/cli/src/commands/init/tools/install-state.test.ts` - install-state unit coverage
- `packages/cli/src/commands/init/tools/index.ts` - installer integration for scan-based installed-pack state
- `packages/cli/src/commands/init/tools/index.test.ts` - harness support for scanned tool state

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/install-state.test.ts src/commands/init/tools/index.test.ts`
- Result: pass

**Notes / Decisions:**

- Used package-local `vitest run` paths because the root `pnpm test <path>` form routes through Turbo and does not accept file paths directly.

---

### Task p01-t02: Treat scope changes as migrations for user-eligible packs

**Status:** completed
**Commit:** dfe447a9

**Outcome (required when completed):**

- Added scope-migration cleanup for user-eligible packs so reinstalling a pack at a new scope removes the old canonical copy before the new install runs.
- Recorded affected scopes during installs and passed that metadata into `oat tools install` post-action auto-sync so migrations sync both sides.
- Added regressions for ideas and research migrations plus a command-level test proving the wrapper syncs the removed scope and target scope.

**Files changed:**

- `packages/cli/src/commands/init/tools/index.ts` - scope-migration cleanup, affected-scope tracking, and install metadata handoff
- `packages/cli/src/commands/init/tools/index.test.ts` - migration regressions for user-eligible packs and research agent cleanup
- `packages/cli/src/commands/tools/install/index.ts` - consume install metadata for targeted post-install auto-sync
- `packages/cli/src/commands/tools/install/index.test.ts` - wrapper-level affected-scope sync coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test`
- Result: fails outside this task because unrelated suites cannot resolve `@open-agent-toolkit/control-plane`
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: fails outside this task because `src/commands/project/list.ts` and `src/commands/project/status.ts` cannot resolve `@open-agent-toolkit/control-plane`

**Notes / Decisions:**

- Keep project-only packs (`workflows`, `project-management`) out of migration logic.

---

## Phase 2: Improve Interactive Install UX And Reporting

**Status:** completed
**Started:** 2026-04-14

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- The interactive installer now shows live installed-state labels in both prompts, including current scope for already-installed packs and explicit `project + user` labeling for duplicated installs.
- The success summary now reports final per-pack scope outcomes and the exact sync scopes touched by the install, replacing the old single shared-scope summary.
- Final regression coverage now exercises prompt labels/defaults and the command-path summary output together.

**Key files touched:**

- `packages/cli/src/commands/init/tools/index.ts` - prompt builders and final success reporting
- `packages/cli/src/commands/init/tools/index.test.ts` - prompt-shape and mixed-scope summary regressions
- `packages/cli/src/commands/tools/install/index.test.ts` - command-path summary coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test`
- Result: fails outside this task because unrelated suites cannot resolve `@open-agent-toolkit/control-plane`
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: fails outside this task because `src/commands/project/list.ts` and `src/commands/project/status.ts` cannot resolve `@open-agent-toolkit/control-plane`

**Notes / Decisions:**

- Summary output reports final pack scopes plus affected sync scopes instead of trying to describe all user-eligible packs with one aggregate label.
- Both-scope installs remain visible in the prompt label; changing that to a true three-state selection remains outside this fix.

### Task p02-t01: Show existing install location and prepopulate prompt defaults

**Status:** completed
**Commit:** d88e12d6

**Outcome (required when completed):**

- Replaced the static pack picker labels with live install-state labels so already-installed packs show their current scope in the main selection prompt.
- Prepopulated the user-scope follow-up with existing user installs checked by default and labeled each choice with its current location.
- Labeled both-scope installs explicitly in the follow-up prompt so the normalization behavior is visible before submit.

**Files changed:**

- `packages/cli/src/commands/init/tools/index.ts` - dynamic pack-choice and user-scope-choice builders driven by installed pack state
- `packages/cli/src/commands/init/tools/index.test.ts` - prompt-shape regressions for installed-state labels and defaults

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`
- Result: pass

**Notes / Decisions:**

- Packs installed in both scopes remain explicit in the prompt label (`current: project + user`) and default to the project-side checkbox state until the user chooses otherwise.

---

### Task p02-t02: Improve post-install summary and final regression coverage

**Status:** completed
**Commit:** 99dc97ff

**Outcome (required when completed):**

- Replaced the coarse post-install summary with per-pack final scope reporting and exact sync-scope instructions.
- Added a mixed-scope summary regression in the init command harness and updated the `oat tools install` command-path test to assert the new output shape.
- Re-ran the package-level verification sweep and recorded the unchanged unrelated `@open-agent-toolkit/control-plane` failures separately from the new focused regressions.

**Files changed:**

- `packages/cli/src/commands/init/tools/index.ts` - pack-aware success reporting and sync-scope output
- `packages/cli/src/commands/init/tools/index.test.ts` - mixed-scope summary regression
- `packages/cli/src/commands/tools/install/index.test.ts` - install command summary assertion

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test`
- Result: fails outside this task because unrelated suites cannot resolve `@open-agent-toolkit/control-plane`
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: fails outside this task because `src/commands/project/list.ts` and `src/commands/project/status.ts` cannot resolve `@open-agent-toolkit/control-plane`

**Notes / Decisions:**

- Keep the summary aligned with actual final pack scopes rather than reporting transition arrows or migration history.

---

## Phase 3: Review Fixes

**Status:** completed
**Started:** 2026-04-14

### Task prev1-t01: (review) Preserve both-scope installs unless the user explicitly changes them

**Status:** completed
**Commit:** b554221d

**Outcome (required when completed):**

- Changed the user-scope follow-up so packs already installed in both scopes stay checked by default and immediately branch into an explicit keep-both vs. user-only follow-up instead of silently normalizing to project.
- When a user keeps a pack in both scopes, the installer now refreshes both canonical roots in the same run and reports the final pack location as `project + user`.
- Tightened outdated-skill selection keys and reporting so dual-scope installs still produce unambiguous interactive update choices.

**Files changed:**

- `packages/cli/src/commands/init/tools/index.ts` - both-scope follow-up prompt, dual-root install handling, and final scope reporting
- `packages/cli/src/commands/init/tools/index.test.ts` - both-scope default-submit regression, prompt expectations, and AGENTS summary coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`
- Result: pass

**Notes / Decisions:**

- The explicit follow-up only appears when a pack is already installed in both scopes and remains checked for user scope; unchecking still means normalize to project.
- Outdated-skill prompts now key selections by `skill + targetRoot` so dual-root installs do not collide.

---

### Task prev1-t02: (review) Reduce duplicate install-state scans in the installer

**Status:** completed
**Commit:** 7eeb0b00

**Outcome (required when completed):**

- Removed the second project/user scan after installation and now derive the persisted `tools` config from the original install-state scan plus the selected pack set.
- Added a regression that proves the installer only scans each scope once while still preserving already-installed unselected packs in config output.

**Files changed:**

- `packages/cli/src/commands/init/tools/index.ts` - single-pass installed-tool config derivation
- `packages/cli/src/commands/init/tools/index.test.ts` - scan-count and config-persistence regression

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/install-state.test.ts src/commands/init/tools/index.test.ts`
- Result: pass

**Notes / Decisions:**

- The config write now treats any selected pack as installed on success and preserves previously installed but unselected packs from the initial scan.

---

### Task prev1-t03: (review) Add direct agent-only install-state coverage

**Status:** completed
**Commit:** a7648401

**Outcome (required when completed):**

- Added a direct unit test proving pack-state aggregation treats a research pack seen only through an agent entry as installed content.
- Closed the last review-fix gap without broadening the install-state helper beyond its existing pack scan inputs.

**Files changed:**

- `packages/cli/src/commands/init/tools/install-state.test.ts` - agent-only regression coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/install-state.test.ts src/commands/init/tools/index.test.ts`
- Result: pass

**Notes / Decisions:**

- Research remains the clearest regression target here because it is the pack that contributes bundled agent content today.

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-04-13

**Session Start:** 23:54 UTC

- [x] p01-t01: Derive pack installation state across project and user scopes - `6f551c4e`
- [x] p01-t02: Treat scope changes as migrations for user-eligible packs - `dfe447a9`
- [x] p02-t01: Show existing install location and prepopulate prompt defaults - `d88e12d6`
- [x] p02-t02: Improve post-install summary and final regression coverage - `99dc97ff`
- [ ] prev1-t01: (review) Preserve both-scope installs unless the user explicitly changes them - pending
- [ ] prev1-t02: (review) Reduce duplicate install-state scans in the installer - pending
- [ ] prev1-t03: (review) Add direct agent-only install-state coverage - pending

**What changed (high level):**

- Quick-start project scaffolded for the install-scope and install-location UX issue
- Discovery and implementation plan captured without entering spec-driven workflow
- Added install-state aggregation utilities and integrated scan-based installed-pack detection into the installer

**Decisions:**

- Treat scope changes as migrations unless implementation exposes a blocker
- Keep the separate provider-view deletion bug out of scope for this project
- Use package-local Vitest invocation for file-scoped checks because the repo root test command is Turbo-backed

**Follow-ups / TODO:**

- Validate behavior for packs currently installed in both project and user scopes
- Decide whether final summary output should list all pack scopes or only changed ones
- Update interactive pack labels and checked defaults to reflect current install location
- Run final checkpoint review after Phase 2 is complete
- Record final review artifact and update checkpoint status
- Execute the final review follow-up tasks after receiving the final review artifact

**Blockers:**

- None - planning complete

**Session End:** 23:54 UTC

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                                                                                                                                                                                                                                              | Passed  | Failed | Coverage                                                                                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli test`; `pnpm --filter @open-agent-toolkit/cli type-check` | partial | 2      | Full-package `test` / `type-check` blocked by unrelated `@open-agent-toolkit/control-plane` resolution failures                                  |
| 2     | `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli test`; `pnpm --filter @open-agent-toolkit/cli type-check` | partial | 2      | Focused regressions pass; full-package `test` / `type-check` remain blocked by unrelated `@open-agent-toolkit/control-plane` resolution failures |
| 3     | `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/install-state.test.ts src/commands/init/tools/index.test.ts`                                                                                                                                            | yes     | 0      | Review-fix coverage passes, including agent-only aggregation and the single-pass scan regression                                                 |

## Final Summary (for PR/docs)

**What shipped:**

- Pack install state aggregation across project and user scopes
- Canonical scope-migration cleanup for user-eligible packs
- Affected-scope-aware auto-sync for `oat tools install`
- Installed-state labels and defaults in the interactive pack prompts
- Per-pack final scope summaries and exact sync-scope reporting
- Explicit keep-both handling for packs already installed in project and user scope
- Single-pass installed-tool config persistence plus direct agent-only aggregation coverage

**Behavioral changes (user-facing):**

- Reinstalling a user-eligible pack at a new scope now cleans up the old canonical copy before auto-sync runs
- `oat tools install` now auto-syncs both scopes touched by a migration instead of only the CLI-level scope
- The main pack picker now shows where each pack is already installed
- The user-scope follow-up now defaults existing user installs on and labels both-scope installs explicitly
- Packs already installed in both scopes now require an explicit keep-both vs. user-only decision instead of defaulting to project cleanup
- Post-install output now reports final scopes pack-by-pack instead of one shared scope label
- The installer no longer rescans both scopes after writing files just to refresh config booleans

**Key files / modules:**

- `packages/cli/src/commands/init/tools/index.ts` - interactive install flow and migration cleanup
- `packages/cli/src/commands/init/tools/index.test.ts` - interactive install regressions and config-write coverage
- `packages/cli/src/commands/tools/install/index.ts` - post-install auto-sync scope selection
- `packages/cli/src/commands/init/tools/install-state.ts` - pack install-state derivation
- `packages/cli/src/commands/init/tools/install-state.test.ts` - direct aggregation coverage
- `packages/cli/src/commands/tools/install/index.test.ts` - install wrapper regression coverage

**Verification performed:**

- Focused Vitest coverage for install flow and wrapper hook
- Package lint pass
- Package `test` / `type-check` attempted and blocked by unrelated `@open-agent-toolkit/control-plane` resolution errors

**Design deltas (if any):**

- No design artifact was used in this quick-mode project

## Review Received: final

**Date:** 2026-04-14
**Review artifact:** `reviews/archived/final-review-2026-04-14.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 1
- Minor: 3

**New tasks added:** `prev1-t01`, `prev1-t02`, `prev1-t03`

**Deferred Findings (Minor):**

- `m2` - Core-scope defense-in-depth cleanup remains deferred because `oat tools install` hard-pins core to user scope today, so the review concern is theoretical for this command path and does not justify reopening the shipped fix.

**Next:** Final code re-review passed with no findings. The project is ready for final PR/completion flow.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
