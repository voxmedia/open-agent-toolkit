---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-11
oat_current_task_id: p02-t02
oat_generated: false
oat_template: false
oat_template_name: implementation
---

# Implementation: claude-instructions-sync

**Started:** 2026-04-10
**Last Updated:** 2026-04-11

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

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | completed   | 2     | 2/2       |
| Phase 2 | in_progress | 2     | 1/2       |
| Phase 3 | pending     | 2     | 0/2       |

**Total:** 3/6 tasks completed

---

## Phase 1: Model Discovery And Strategy State

**Status:** completed
**Started:** 2026-04-11

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Strategy selection is now surfaced consistently on `oat instructions validate` and `oat instructions sync`.
- Both commands resolve the same default strategy and pass the selected mode through the shared scan path.
- Help output and command tests now cover the new project-scoped strategy flag shape.

**Key files touched:**

- `packages/cli/src/commands/instructions/instructions.types.ts`
- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/validate/validate.ts`
- `packages/cli/src/commands/instructions/validate/validate.test.ts`
- `packages/cli/src/commands/instructions/sync/sync.ts`
- `packages/cli/src/commands/instructions/sync/sync.test.ts`
- `packages/cli/src/commands/help-snapshots.test.ts`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/validate/validate.test.ts packages/cli/src/commands/help-snapshots.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Kept strategy resolution in shared instruction utilities so upcoming sync/adoption work can reuse one defaulting path.
- Limited scope to project commands only; user-level provider scanning remains out of scope for this project.

### Task p01-t01: Expand instruction scan state for paired and stray files

**Status:** completed
**Commit:** 231da372

**Outcome (required when completed):**

- Instruction scan entries now represent both canonical AGENTS/CLAUDE pairs and Claude-only stray directories.
- Summary and report formatting handle stray instruction state instead of assuming every entry has an AGENTS path.
- Utility coverage now exercises missing Claude, content mismatch, and Claude-only stray cases from the same scanner.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.types.ts` - widened the instruction entry/status model for stray support
- `packages/cli/src/commands/instructions/instructions.utils.ts` - switched scan discovery to per-directory instruction pairing
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - added scanner/summary/report coverage for Claude-only strays

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Kept the new scan state additive by preserving existing `missing` / `content_mismatch` semantics and introducing `stray` for Claude-only directories.
- Left sync/apply behavior unchanged for stray entries so the next task can add strategy selection without reworking scan shape again.

---

### Task p01-t02: Add project-scoped strategy selection to the instructions commands

**Status:** completed
**Commit:** e1b792bd

**Outcome (required when completed):**

- Added `pointer`, `symlink`, and `copy` as explicit instruction sync strategies for project-scoped instruction commands.
- Wired `validate` and `sync` to parse the same strategy flag and forward the resolved value to the shared scan path.
- Updated command/help coverage to lock in the new option surface and invocation shape.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.types.ts` - declared the shared strategy union and scan dependency option
- `packages/cli/src/commands/instructions/instructions.utils.ts` - added the shared default/resolver used by command entrypoints
- `packages/cli/src/commands/instructions/validate/validate.ts` - added `--strategy` parsing and scan forwarding
- `packages/cli/src/commands/instructions/validate/validate.test.ts` - fixed command-arg harnessing and asserted strategy forwarding
- `packages/cli/src/commands/instructions/sync/sync.ts` - added `--strategy` parsing and scan forwarding
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - asserted strategy forwarding for sync
- `packages/cli/src/commands/help-snapshots.test.ts` - updated help output snapshots for the new option formatting

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/validate/validate.test.ts packages/cli/src/commands/help-snapshots.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Used Commander `Option` instead of chained `.option().choices()` so the CLI surface stays aligned with the version in this repo.
- Left strategy behavior implementation for filesystem writes/adoption to Phase 2; this task only establishes the command contract.

---

## Phase 2: Implement Sync And Adoption Behavior

**Status:** in_progress
**Started:** 2026-04-11

### Task p02-t01: Implement strategy-aware `CLAUDE.md` repair and generation

**Status:** completed
**Commit:** 479f2ba0

**Outcome (required when completed):**

- `oat instructions sync` now creates or repairs `CLAUDE.md` using the selected `pointer`, `symlink`, or `copy` strategy instead of always writing pointer content.
- Strategy-aware validation now distinguishes pointer files, hard copies, and file symlinks, so the scan result matches the chosen sync mode.
- Sync test coverage now locks in update behavior that replaces mismatched files only under `--force`, including symlink replacement and hard-copy generation.

**Files changed:**

- `packages/cli/src/commands/instructions/instructions.types.ts` - extended scan and sync dependency contracts for file-kind checks and strategy-aware repair helpers
- `packages/cli/src/commands/instructions/instructions.utils.ts` - validated pointer, symlink, and copy modes against actual file type/content
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` - added strategy-aware validation coverage for symlink and copy expectations
- `packages/cli/src/commands/instructions/sync/sync.ts` - implemented strategy-aware create/update planning and application
- `packages/cli/src/commands/instructions/sync/sync.test.ts` - added pointer, symlink, and hard-copy repair coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.utils.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

**Notes / Decisions:**

- Treated file kind as part of validity, so `copy` rejects a symlink even when the target content matches and `pointer` rejects non-pointer copies.
- Used relative file symlinks (`AGENTS.md`) for same-directory repairs so nested project moves keep links stable.

---

### Task p02-t02: Implement Claude-only stray adoption into canonical `AGENTS.md`

**Status:** pending
**Commit:** -

---

## Phase 3: Finish Coverage And Documentation

**Status:** pending
**Started:** -

### Task p03-t01: Add end-to-end coverage for nested project directories

**Status:** pending
**Commit:** -

---

### Task p03-t02: Update docs and help text for strategy-aware project sync

**Status:** pending
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

### 2026-04-10

**Session Start:** quick-start planning

- [ ] p01-t01: Expand instruction scan state for paired and stray files - pending
- [ ] p01-t02: Add project-scoped strategy selection to the instructions commands - pending
- [ ] p02-t01: Implement strategy-aware `CLAUDE.md` repair and generation - pending
- [ ] p02-t02: Implement Claude-only stray adoption into canonical `AGENTS.md` - pending
- [ ] p03-t01: Add end-to-end coverage for nested project directories - pending
- [ ] p03-t02: Update docs and help text for strategy-aware project sync - pending

**What changed (high level):**

- Captured quick-start discovery for project-scoped instruction sync and adoption
- Generated an execution-ready plan with six tasks across modeling, sync, adoption, and docs/test coverage
- Initialized resumable implementation tracking with `p01-t01` as the next task

**Decisions:**

- Keep V1 project-only
- Extend `oat instructions` instead of refactoring provider sync
- Support pointer, symlink, and copy strategies in the command layer

**Follow-ups / TODO:**

- Decide during implementation whether strategy defaults live only on flags or also in project config
- Decide whether adoption remains part of `sync` or is gated by a dedicated flag

**Blockers:**

- None - pending implementation

**Session End:** quick-start handoff

---

### 2026-04-11

**Session Start:** task execution

- [x] p01-t01: Expand instruction scan state for paired and stray files - 231da372
- [x] p01-t02: Add project-scoped strategy selection to the instructions commands - e1b792bd
- [x] p02-t01: Implement strategy-aware `CLAUDE.md` repair and generation - 479f2ba0
- [ ] p02-t02: Implement Claude-only stray adoption into canonical `AGENTS.md` - next

**What changed (high level):**

- Reworked instruction discovery to index directories by both `AGENTS.md` and `CLAUDE.md`
- Added `stray` scan state and summary/report support for Claude-only directories
- Implemented strategy-aware pointer, symlink, and copy repair behavior for `CLAUDE.md`

**Decisions:**

- Preserve the existing `missing` state for AGENTS-only directories
- Add `stray` as the forward-compatible Claude-only state instead of overloading `content_mismatch`
- Treat the selected file strategy as part of validation semantics, not just write behavior

**Follow-ups / TODO:**

- Implement Claude-only stray adoption into canonical `AGENTS.md` generation in `p02-t02`
- Extend integration coverage for nested mixed-strategy repos in `p03`

**Blockers:**

- None

**Session End:** phase 1 complete

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                                                                                                                                                                                                                                                                                    | Passed | Failed | Coverage |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/validate/validate.test.ts packages/cli/src/commands/help-snapshots.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli type-check` | yes    | 0      | n/a      |
| 2     | `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts packages/cli/src/commands/instructions/instructions.utils.test.ts`; `pnpm --filter @open-agent-toolkit/cli lint`; `pnpm --filter @open-agent-toolkit/cli type-check`                                                 | yes    | 0      | n/a      |

## Final Summary (for PR/docs)

**What shipped:**

- Instruction scan state, command contract work, and strategy-aware `CLAUDE.md` repair behavior

**Behavioral changes (user-facing):**

- `oat instructions validate` and `oat instructions sync` now expose a `--strategy` flag with `pointer`, `symlink`, and `copy`
- `oat instructions sync` now creates or repairs `CLAUDE.md` as a pointer file, file symlink, or hard copy based on the selected strategy

**Key files / modules:**

- `packages/cli/src/commands/instructions/*` - planned implementation surface
- `apps/oat-docs/docs/provider-sync/*` - planned docs updates

**Verification performed:**

- Phase 1 and current Phase 2 strategy tests, lint, and type-check passed

**Design deltas (if any):**

- No design artifact created; quick workflow went straight from discovery to plan

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
