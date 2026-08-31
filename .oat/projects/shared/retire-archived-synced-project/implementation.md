---
oat_status: in_progress
oat_ready_for: null
oat_blockers:
  - 'p01-t02: Git omits an already-equal completed-ref update and its lease from the atomic receive-pack transaction, so active deletion is not a true two-ref compare-and-swap; two fix iterations and three reviews are exhausted.'
oat_last_updated: 2026-08-31
oat_current_task_id: p01-t02
oat_generated: false
---

# Implementation: retire-archived-synced-project

**Started:** 2026-08-31
**Last Updated:** 2026-08-31

> This document is used to resume interrupted implementation sessions.
>
> `oat_current_task_id` points at the next plan task to do. Reviews are tracked
> in `plan.md`, not as implementation tasks.

## Progress Overview

| Phase | Status  | Tasks | Completed |
| ----- | ------- | ----- | --------- |
| p01   | blocked | 2     | 2/2       |
| p02   | pending | 3     | 0/3       |
| p03   | pending | 3     | 0/3       |
| p04   | pending | 2     | 0/2       |

**Total:** 2/10 tasks completed

---

## Phase 1: Terminal Ref and Transition Foundation

**Status:** blocked — review governance exhausted
**Started:** 2026-08-31

### Task p01-t01: Define completed synced-ref identity

**Status:** completed
**Commit:** c2fdaf291c43128ad0b3fbc7f8374bc681b78b8b

### Task p01-t02: Implement idempotent active-to-completed ref transition

**Status:** blocked
**Commit:** ce631f78b9ebdce4746ec2f1614ffb30362c3ddf
**Blocker:** The completed-ref lease is omitted from an atomic push when the
completed ref is already at `sourceSha`, leaving active deletion without a
true two-ref compare-and-swap. The configured two fix iterations and three
review rounds are exhausted.

---

## Phase 2: Archive Transaction and Completion Integration

**Status:** pending
**Started:** -

### Task p02-t01: Gate terminal cleanup on archive durability

**Status:** pending
**Commit:** -

### Task p02-t02: Seal synced archives without an active record

**Status:** pending
**Commit:** -

### Task p02-t03: Integrate archive reporting and completion workflow

**Status:** pending
**Commit:** -

---

## Phase 3: Terminal Discovery and Action Semantics

**Status:** pending
**Started:** -

### Task p03-t01: Classify legacy completed synced records precisely

**Status:** pending
**Commit:** -

### Task p03-t02: Prevent archived project resurrection through pull and open

**Status:** pending
**Commit:** -

### Task p03-t03: Align terminal links and destructive pruning

**Status:** pending
**Commit:** -

---

## Phase 4: Integration, Documentation, and Release Validation

**Status:** pending
**Started:** -

### Task p04-t01: Prove the terminal lifecycle end to end

**Status:** pending
**Commit:** -

### Task p04-t02: Document, version, and validate the shipped contract

**Status:** pending
**Commit:** -

---

## Orchestration Runs

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here._

### Run 1 — p01 implementation and review

- Phase base: `5eebcd7e2fa02311a3d0efb91b3162b890ec96bf`
- Implementation request: `e487529f-de41-4e91-9a35-005eca4af1c0`
- Implementation target: `oat-phase-implementer-gpt-5-6-sol-high`
- Implementation outcome: `DONE_WITH_CONCERNS` accepted as phase success; the
  only concern is the planned p04 lockstep version bump.
- Task commits: `c2fdaf291c43128ad0b3fbc7f8374bc681b78b8b`,
  `ce631f78b9ebdce4746ec2f1614ffb30362c3ddf`
- Verification: 123/123 phase tests, `pnpm check`, `pnpm type-check`,
  `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, and
  `pnpm build:docs` passed. Release version gates remain intentionally pending
  p04-t02.
- Implementation dispatch: `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Review request: `0972b10d-cd3e-4af9-b680-82e5e008eb08`
- Review target: `oat-reviewer-gpt-5-6-sol-high`
- Review artifact: `reviews/p01-review-2026-08-31T052034Z.md`
- Review result: blocked — 1 Critical, 1 Important, 0 Medium, 0 Minor.
- Review dispatch: `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Review reconnaissance: not attempted.
- Fix round 1: `2ccde026814c4c3f09d21d2267fe0d394c58490d`
  closed the missing-object Important finding and partially closed the
  concurrent-ref Critical finding.
- Re-review request: `1578e833-870e-419a-a304-0af2a6ae1b0b`
- Re-review artifact: `reviews/p01-review-2026-08-31T053841Z.md`
- Re-review result: blocked — 1 remaining Critical, 0 Important, 0 Medium,
  0 Minor.
- Fix round 2: `26264a2c8ed2fc0289473a81d0f296ceb764cb76`
  removed every non-atomic active-deletion fallback and preserved both refs on
  unsupported remotes.
- Final review request: `ac612268-cf40-41c6-882b-d8cd5a3915ae`
- Final p01 review artifact: `reviews/p01-review-2026-08-31T055541Z.md`
- Final p01 review result: blocked — 1 Critical, 0 Important, 0 Medium,
  0 Minor.
- Fix iterations: 2 of 2 used; review rounds: 3 of 3 used.
- Optional nested dispatches: none.
- Outstanding item: standard Git omits a no-op completed-ref update and lease
  from the receive-pack transaction. A revised transition must either use a
  genuine remote two-ref CAS primitive or preserve the active ref whenever the
  completed ref already exists.

<!-- orchestration-runs-end -->

## Implementation Log

Phase p01 implementation and two bounded fix commits are complete, but the
third independent review reproduced one remaining Critical atomic no-op race.
The configured fix and review governance budgets are exhausted, so p01 is
blocked pending an explicit transition-contract decision and new authorization.

## Deviations from Plan / Design

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

| Phase | Tests Run         | Passed | Failed | Coverage                                  |
| ----- | ----------------- | ------ | ------ | ----------------------------------------- |
| p01   | 128 focused tests | 128    | 0      | Ref identity, transition, races, recovery |
| p02   | -                 | -      | -      | -                                         |
| p03   | -                 | -      | -      | -                                         |
| p04   | -                 | -      | -      | -                                         |

## Final Summary (for PR/docs)

To be completed after implementation.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
