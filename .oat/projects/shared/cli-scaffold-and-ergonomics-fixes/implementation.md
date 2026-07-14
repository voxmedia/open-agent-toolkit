---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: cli-scaffold-and-ergonomics-fixes

**Started:** 2026-07-13
**Last Updated:** 2026-07-13

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

| Phase | Status  | Tasks | Completed |
| ----- | ------- | ----- | --------- |
| p01   | pending | 1     | 0/1       |
| p02   | pending | 1     | 0/1       |
| p03   | pending | 1     | 0/1       |
| p04   | pending | 1     | 0/1       |
| p05   | pending | 2     | 0/2       |
| p06   | pending | 2     | 0/2       |
| p07   | pending | 1     | 0/1       |

**Total:** 0/9 tasks completed

---

## Phase 1: Repair project scaffolding

**Status:** pending
**Started:** -

### Task p01-t01: Render and validate real scaffold templates

**Status:** pending
**Commit:** -

---

## Phase 2: Clarify plan task-shape guidance

**Status:** pending
**Started:** -

### Task p02-t01: Document TDD as the default, not a validator requirement

**Status:** pending
**Commit:** -

---

## Phase 3: Improve tools update no-args feedback

**Status:** pending
**Started:** -

### Task p03-t01: Suggest the exact all-tools update command

**Status:** pending
**Commit:** -

---

## Phase 4: Prevent placeholder backlog summaries

**Status:** pending
**Started:** -

### Task p04-t01: Require a summary before closing backlog items

**Status:** pending
**Commit:** -

---

## Phase 5: Create complete PJM records atomically

**Status:** pending
**Started:** -

### Task p05-t01: Add decision and consequences inputs to decision creation

**Status:** pending
**Commit:** -

### Task p05-t02: Scaffold backlog items with a single command

**Status:** pending
**Commit:** -

---

## Phase 6: Strengthen CLI upgrade and gate hygiene

**Status:** pending
**Started:** -

### Task p06-t01: Add a minimal stale-invocation doctor check and release callout

**Status:** pending
**Commit:** -

### Task p06-t02: Close stdin for noninteractive gate targets

**Status:** pending
**Commit:** -

---

## Phase 7: Prepare and validate the release

**Status:** pending
**Started:** -

### Task p07-t01: Bump lockstep packages and run completion gates

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-13

**Planning handoff:**

- [ ] p01-t01: Render and validate real scaffold templates
- [ ] p02-t01: Document TDD as the default, not a validator requirement
- [ ] p03-t01: Suggest the exact all-tools update command
- [ ] p04-t01: Require a summary before closing backlog items
- [ ] p05-t01: Add decision and consequences inputs to decision creation
- [ ] p05-t02: Scaffold backlog items with a single command
- [ ] p06-t01: Add a minimal stale-invocation doctor check and release callout
- [ ] p06-t02: Close stdin for noninteractive gate targets
- [ ] p07-t01: Bump lockstep packages and run completion gates

### Plan Artifact Review Received

**Review artifact:** `reviews/archived/artifact-plan-review-2026-07-13T223614Z.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 2
- Minor: 0

**Artifact edits:**

- I1: Added the generated public-package version manifest to p07 ownership, verification, and staging.
- M1: Added semantic skill-contract coverage for all three decision-promotion fields to p05.
- M2: Corrected the `passed` review-status contract.
- Operator-approved scope addition: Added p06-t02 to close stdin for noninteractive gate targets.

**Next:** Re-run the plan artifact gate; implementation still starts at p01-t01.

### Plan Artifact Re-review Received

**Review artifact:** `reviews/archived/artifact-plan-review-2026-07-13T231038Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 2
- Minor: 2

**Artifact resolutions:**

- M1: Added the operator-approved noninteractive gate requirement and success criterion to discovery.
- M2: Added semantic release-guidance contract coverage to p06-t01.
- m1: Narrowed the discovery skill-prose exclusion to preserve the required `oat-project-summary` exception.
- m2: Corrected scaffold acceptance language to distinguish array/scalar field types.

**Disposition:** All findings resolved in the reviewed artifacts; no new plan tasks created.

**Next:** Begin implementation at p01-t01.

### Scope Revision: Wave-2 Operator Feedback Item 4

**Origin:** Third-run operator feedback against OAT CLI 0.1.59, received 2026-07-13.

**Change:**

- Added p05-t02 for `oat backlog new <title>` real-template scaffolding, collision safety, canonical defaults/flags, managed-index regeneration, and the `oat-pjm-add-backlog-item` canonical-skill migration/version bump.
- Preserved all existing task IDs and review rows; task totals increased from 8 to 9.
- Marked the prior plan review as awaiting re-review because the approved scope changed after its pass.

**Next:** Revalidate and re-review the revised plan; implementation still starts at p01-t01.

### Wave-2 Plan Artifact Review Received

**Review artifact:** `reviews/archived/artifact-plan-review-2026-07-13T233754Z.md`

**Findings:**

- Critical: 0
- Important: 3
- Medium: 2
- Minor: 0

**Artifact resolutions:**

- I1: Added optional `--scope-estimate` so the canonical skill passes the confirmed estimate before the command’s atomic index regeneration.
- I2: Expanded p05-t02 tests for real-template precedence/bundled fallback, metadata stripping, invalid enums, no-overwrite collision safety, and rollback.
- I3: Downgraded plan readiness to in-progress/null while re-review is unresolved.
- M1: Required structured YAML serialization and exact round-trip coverage for user-controlled frontmatter.
- M2: Added base-relative canonical-skill version-bump validation to both p05 tasks.

**Disposition:** All findings resolved in discovery/plan/state artifacts; no new task IDs created.

**Next:** Re-run the plan artifact gate; implementation remains blocked until a passing review restores readiness.

### Wave-2 Plan Artifact Re-review Received

**Review artifact:** `reviews/archived/artifact-plan-review-2026-07-13T235756Z.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 0
- Minor: 0

**Artifact resolution:**

- I1: Reordered p05-t02 so all user-controlled input normalization/validation completes before backlog initialization or any write, with absent- and existing-scaffold no-mutation regression cases.

**Disposition:** Finding resolved in the plan; readiness remains withheld pending another gate pass.

**Next:** Re-run the plan artifact gate.

### Wave-2 Plan Artifact Final Re-review Received

**Review artifact:** `reviews/archived/artifact-plan-review-2026-07-14T002324Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Disposition:** Clean pass. The revised nine-task plan is implementation-ready.

**Next:** Begin implementation at p01-t01.

**Execution shape:**

- Run p01 first.
- Run p02-p06 concurrently in isolated worktrees and merge in plan order.
- Run both p05 tasks sequentially in the same isolated worktree.
- Run p07 after all fixes merge.
- Independent phase gate review is enabled for p01 and p06.

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| p01   | -         | -      | -      | -        |
| p02   | -         | -      | -      | -        |
| p03   | -         | -      | -      | -        |
| p04   | -         | -      | -      | -        |
| p05   | -         | -      | -      | -        |
| p06   | -         | -      | -      | -        |
| p07   | -         | -      | -      | -        |

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
- Discovery: `discovery.md`
- State: `state.md`
