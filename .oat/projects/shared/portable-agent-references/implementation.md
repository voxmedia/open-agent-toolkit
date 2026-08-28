---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-28
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: portable-agent-references

**Started:** 2026-08-28
**Last Updated:** 2026-08-28

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
| Phase 1 | pending | 6     | 0/6       |
| Phase 2 | pending | 2     | 0/2       |

**Total:** 0/8 tasks completed

---

## Phase 1: Global Ratchet and Portable Callers

**Status:** pending
**Started:** -

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- {2-5 bullets describing user-visible / behavior-level changes delivered in this phase}

**Key files touched:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {trade-offs or deviations discovered during implementation}

### Task p01-t01: Generalize the user-default portability ratchet

**Status:** pending
**Commit:** -

---

### Task p01-t02: Port utility-pack cross-skill reads

**Status:** pending
**Commit:** -

### Task p01-t03: Port research-pack cross-skill reads

**Status:** pending
**Commit:** -

### Task p01-t04: Port workflow review-provider references

**Status:** pending
**Commit:** -

### Task p01-t05: Port user-default agent references and remove the exemption

**Status:** pending
**Commit:** -

### Task p01-t06: Finalize the zero-debt portability invariant

**Status:** pending
**Commit:** -

---

## Phase 2: Documentation, Packaging, and Release Validation

**Status:** pending
**Started:** -

### Task p02-t01: Document the global skill-and-agent portability contract

**Status:** pending
**Commit:** -

### Task p02-t02: Refresh shipped assets and validate the lockstep release

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

### 2026-08-28

- Quick-workflow discovery, lightweight design, and eight-task plan prepared.
- High managed dispatch policy selected.
- Additional implementation phase-gate review explicitly disabled.
- No implementation tasks executed yet; `p01-t01` remains the next task.

### Artifact Review Received: plan

**Date:** 2026-08-28
**Review artifact:**
`reviews/archived/artifact-plan-review-2026-08-28T223052Z.md`

**Findings:** 0 Critical, 1 Important, 1 Medium, 5 Minor

**Disposition:** All seven findings were resolved directly in lifecycle
artifacts with user confirmation. No implementation tasks were added.

- I1: provider verification now materializes canonical agents into a temporary
  sync-harness root before inspecting generated roles.
- M1: the ratchet now includes file-form and directory-form `references/`
  targets.
- m1-m5: root-bound short forms, ledger provenance, state metadata, the
  disabled phase-gate choice, and conditional version-pin creation are now
  explicit.

**Next:** Run the single authorized Claude Fable artifact re-review.

### Artifact Re-review Received: plan

**Date:** 2026-08-28
**Review artifact:**
`reviews/archived/artifact-plan-review-2026-08-28T224908Z.md`

**Gate result:** Passed at the Important threshold with 0 Critical,
0 Important, 1 Medium, and 2 Minor findings.

**Disposition:** With user confirmation, all three non-blocking findings were
resolved in the design and plan without another review cycle.

- M1: temporary materialization now copies canonical agent sources into the
  temporary project/assets root and forbids direct reads from the gitignored
  bundled-agent directory.
- m1: artifact-review ledger cells use `-` for code-only invocation fields.
- m2: the artifacts now state that caller-contract assertions, not the scanner,
  enforce short-form anchoring.

**Next:** Execute `p01-t01` through `oat-project-implement`.

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
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

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
