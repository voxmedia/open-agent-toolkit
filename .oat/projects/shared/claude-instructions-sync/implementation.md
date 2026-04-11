---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-11
oat_current_task_id: p01-t02
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
| Phase 1 | in_progress | 2     | 1/2       |
| Phase 2 | pending     | 2     | 0/2       |
| Phase 3 | pending     | 2     | 0/2       |

**Total:** 1/6 tasks completed

---

## Phase 1: Model Discovery And Strategy State

**Status:** in_progress
**Started:** 2026-04-11

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Pending implementation

**Key files touched:**

- To be filled during implementation

**Verification:**

- Run: -
- Result: -

**Notes / Decisions:**

- None yet

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

**Status:** pending
**Commit:** -

**Notes:**

- Wire strategy resolution once the scan/report model is stable.

---

## Phase 2: Implement Sync And Adoption Behavior

**Status:** pending
**Started:** -

### Task p02-t01: Implement strategy-aware `CLAUDE.md` repair and generation

**Status:** pending
**Commit:** -

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
- [ ] p01-t02: Add project-scoped strategy selection to the instructions commands - next

**What changed (high level):**

- Reworked instruction discovery to index directories by both `AGENTS.md` and `CLAUDE.md`
- Added `stray` scan state and summary/report support for Claude-only directories
- Extended scanner tests to cover stray discovery and null `agentsPath` handling

**Decisions:**

- Preserve the existing `missing` state for AGENTS-only directories
- Add `stray` as the forward-compatible Claude-only state instead of overloading `content_mismatch`

**Follow-ups / TODO:**

- Add strategy resolution to validate/sync in `p01-t02`
- Decide whether strategy defaults remain CLI-only or become config-backed during implementation

**Blockers:**

- None

**Session End:** task bookkeeping

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- Planning artifacts only; implementation not started

**Behavioral changes (user-facing):**

- None yet

**Key files / modules:**

- `packages/cli/src/commands/instructions/*` - planned implementation surface
- `apps/oat-docs/docs/provider-sync/*` - planned docs updates

**Verification performed:**

- Quick-start artifact generation only; no implementation verification yet

**Design deltas (if any):**

- No design artifact created; quick workflow went straight from discovery to plan

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
