---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-23
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: pjm-refresh

**Started:** 2026-06-23
**Last Updated:** 2026-06-23

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | 5     | 0/5       |
| Phase 2 | pending     | 3     | 0/3       |
| Phase 3 | pending     | 3     | 0/3       |
| Phase 4 | pending     | 3     | 0/3       |

**Total:** 0/14 tasks completed

## Phase 1: Additive Core

**Status:** in_progress
**Started:** 2026-06-23

### Phase Summary

Pending.

### Task p01-t01: Add Shared ID and Template Helpers

**Status:** pending
**Commit:** -

**Outcome:**

- Pending.

**Files changed:**

- Pending.

**Verification:**

- Pending.

**Notes / Decisions:**

- This task starts from the live-source validation that PJM init currently owns
  a private `stripTemplateFrontmatter` helper and backlog ID generation has no
  shared slug/date primitive.

---

### Task p01-t02: Rewrite Backlog IDs and Harden Index Determinism

**Status:** pending
**Commit:** -

---

### Task p01-t03: Add Decision Command Init/New/Regenerate

**Status:** pending
**Commit:** -

---

### Task p01-t04: Add Decision Migration

**Status:** pending
**Commit:** -

---

### Task p01-t05: Add Templates, AGENTS Docs, PJM Init, and Doctor Core

**Status:** pending
**Commit:** -

## Phase 2: Path Move and Migration

**Status:** pending
**Started:** -

### Task p02-t01: Move Live Backlog Defaults and Cleanup Guards to `pjm/`

**Status:** pending
**Commit:** -

---

### Task p02-t02: Add `oat pjm migrate` and Migration Prompt Asset

**Status:** pending
**Commit:** -

---

### Task p02-t03: Register Assets and Update Pack Manifests

**Status:** pending
**Commit:** -

## Phase 3: Skills and Lifecycle Destinations

**Status:** pending
**Started:** -

### Task p03-t01: Rewrite PJM Skills and Add Decision Skill

**Status:** pending
**Commit:** -

---

### Task p03-t02: Repoint Lifecycle Decision and Reference Paths

**Status:** pending
**Commit:** -

---

### Task p03-t03: Encode Content-Skill Destinations

**Status:** pending
**Commit:** -

## Phase 4: Polish, Docs, Release, and Cleanup

**Status:** pending
**Started:** -

### Task p04-t01: Update Docs, Templates, and Legacy Guidance

**Status:** pending
**Commit:** -

---

### Task p04-t02: Bump Public Packages and Run Full Verification

**Status:** pending
**Commit:** -

---

### Task p04-t03: Final Sweep and Local Audit Cleanup

**Status:** pending
**Commit:** -

**Notes:**

- Remove `/Users/tstang/code/oat-audit`.
- Remove `/tmp/oat-audit`.

## Orchestration Runs

<!-- orchestration-runs-start -->

No implementation orchestration runs yet.

<!-- orchestration-runs-end -->

## Implementation Log

### 2026-06-23

**Session Start:** project scaffolding and artifact authoring.

- Scaffolded spec-driven OAT project `pjm-refresh`.
- Copied audit bundle from `laptop` to `/Users/tstang/code/oat-audit` and
  `/tmp/oat-audit` for local validation.
- Validated live source claims before design:
  - no `oat decision` command group exists;
  - backlog IDs use hash plus local scan;
  - backlog and PJM init still default to `.oat/repo/reference`;
  - PM pack still ships `decision-record.md`;
  - `oat-project-summary` and `oat-project-pr-final` do not create decision
    records today.
- Added cleanup requirement to remove local audit copies when done.

**Session End:** ongoing.

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

Pending implementation.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
