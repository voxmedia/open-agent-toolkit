---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-14
oat_current_task_id: p02-t02
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

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | completed   | 2     | 2/2       |
| Phase 2 | in_progress | 2     | 1/2       |

**Total:** 3/4 tasks completed

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

**Status:** in_progress
**Started:** 2026-04-14

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

**Status:** in_progress
**Commit:** -

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
- [ ] p02-t02: Improve post-install summary and final regression coverage - in progress

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
- Improve install summary output once Phase 2 reporting work starts
- Run final checkpoint review after Phase 2 is complete

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

| Phase | Tests Run                                                                                                                                                                                                                                                                              | Passed  | Failed | Coverage                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| 1     | `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli test`; `pnpm --filter @open-agent-toolkit/cli type-check` | partial | 2      | Full-package `test` / `type-check` blocked by unrelated `@open-agent-toolkit/control-plane` resolution failures |
| 2     | -                                                                                                                                                                                                                                                                                      | -       | -      | -                                                                                                               |

## Final Summary (for PR/docs)

**What shipped:**

- Pack install state aggregation across project and user scopes
- Canonical scope-migration cleanup for user-eligible packs
- Affected-scope-aware auto-sync for `oat tools install`

**Behavioral changes (user-facing):**

- Reinstalling a user-eligible pack at a new scope now cleans up the old canonical copy before auto-sync runs
- `oat tools install` now auto-syncs both scopes touched by a migration instead of only the CLI-level scope

**Key files / modules:**

- `packages/cli/src/commands/init/tools/index.ts` - interactive install flow and migration cleanup
- `packages/cli/src/commands/tools/install/index.ts` - post-install auto-sync scope selection
- `packages/cli/src/commands/init/tools/install-state.ts` - pack install-state derivation

**Verification performed:**

- Focused Vitest coverage for install flow and wrapper hook
- Package lint pass
- Package `test` / `type-check` attempted and blocked by unrelated `@open-agent-toolkit/control-plane` resolution errors

**Design deltas (if any):**

- No design artifact was used in this quick-mode project

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
