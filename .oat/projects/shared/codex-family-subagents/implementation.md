---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-08
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: codex-family-subagents

**Started:** 2026-07-08
**Last Updated:** 2026-07-08

> This document is used to resume interrupted implementation sessions.
>
> `oat_current_task_id` points at the next plan task to do.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | 3     | 0/3       |
| Phase 2 | pending     | 5     | 0/5       |
| Phase 3 | pending     | 4     | 0/4       |
| Phase 4 | pending     | 2     | 0/2       |

**Total:** 0/14 tasks completed

---

## Phase 1: Generic Codex Role Materialization

**Status:** in_progress
**Started:** 2026-07-08

### Task p01-t01: Add Codex Materialization Codec

**Status:** pending
**Commit:** -

### Task p01-t02: Add Codex Materialize CLI Command

**Status:** pending
**Commit:** -

### Task p01-t03: Write Materialized Roles and Merge Codex Config

**Status:** pending
**Commit:** -

---

## Phase 2: Replace Hard-Coded Codex Effort Pins

**Status:** pending
**Started:** -

### Task p02-t01: Model Codex Materialization Targets from Dispatch Matrix

**Status:** pending
**Commit:** -

### Task p02-t02: Sync Materialized Codex Roles from Matrix Targets

**Status:** pending
**Commit:** -

### Task p02-t03: Dispatch to Materialized Codex Role Names

**Status:** pending
**Commit:** -

### Task p02-t04: Update Doctor and Stray Detection for Materialized Roles

**Status:** pending
**Commit:** -

### Task p02-t05: Rewrite Bundled Codex Dispatch Contracts

**Status:** pending
**Commit:** -

---

## Phase 3: Model Validation and Canonical Prompts

**Status:** pending
**Started:** -

### Task p03-t01: Validate Cursor Subagent-Eligible Models

**Status:** pending
**Commit:** -

### Task p03-t02: Generate Dispatch Policy Choice Text from Canonical Data

**Status:** pending
**Commit:** -

### Task p03-t03: Harden Workflow Skills Against Hand-Typed Option Lists

**Status:** pending
**Commit:** -

### Task p03-t04: Validate Codex Matrix Model Availability

**Status:** pending
**Commit:** -

---

## Phase 4: Documentation, Versions, and Release Validation

**Status:** pending
**Started:** -

### Task p04-t01: Document Materialized Codex and Cursor Dispatch Behavior

**Status:** pending
**Commit:** -

### Task p04-t02: Update Public Package Versions and Validate Release

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with run metadata,
phase outcomes, parallel groups, and outstanding items._

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-08

**Session Start:** pending

- [ ] p01-t01: Add Codex Materialization Codec
- [ ] p01-t02: Add Codex Materialize CLI Command
- [ ] p01-t03: Write Materialized Roles and Merge Codex Config

**What changed (high level):**

- Pending implementation.

**Decisions:**

- Managed implementation dispatch policy is `high`.
- Existing hard-coded Codex effort pins should be replaced by generic
  materialization of canonical agents with explicit model and effort.
- Cursor remains generic-agent plus Task-level model dispatch, with
  subagent-eligible model validation.

**Follow-ups / TODO:**

- Verify Cursor GPT-5.6 subagent model slugs after availability:
  `BL-260708-verify-cursor-gpt-5-6-subagent`.

**Blockers:**

- None.

---

## Deviations from Plan / Design

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |
| 3     | -         | -      | -      | -        |
| 4     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- Pending implementation.

**Behavioral changes (user-facing):**

- Pending implementation.

**Key files / modules:**

- Pending implementation.

**Verification performed:**

- Pending implementation.

**Design deltas (if any):**

- None yet.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
