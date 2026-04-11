---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-10
oat_current_task_id: p01-t01
oat_generated: false
oat_template: false
oat_template_name: implementation
---

# Implementation: claude-instructions-sync

**Started:** 2026-04-10
**Last Updated:** 2026-04-10

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

| Phase   | Status  | Tasks | Completed |
| ------- | ------- | ----- | --------- |
| Phase 1 | pending | 2     | 0/2       |
| Phase 2 | pending | 2     | 0/2       |
| Phase 3 | pending | 2     | 0/2       |

**Total:** 0/6 tasks completed

---

## Phase 1: Model Discovery And Strategy State

**Status:** pending
**Started:** -

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

**Status:** pending
**Commit:** -

**Notes:**

- Establish the shared instruction entry model before changing sync/apply semantics.

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

### Next Session

Append future implementation notes here chronologically.

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
