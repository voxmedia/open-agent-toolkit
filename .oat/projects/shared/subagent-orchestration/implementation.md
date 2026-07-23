---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-23
oat_current_task_id: null
oat_generated: false
---

# Implementation: subagent-orchestration

**Started:** 2026-07-22
**Last Updated:** 2026-07-23

> This document is used to resume interrupted implementation sessions.
> `oat_current_task_id` always points at the next plan task to do.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 4     | 4/4       |
| Phase 2 | complete | 1     | 1/1       |
| Phase 3 | complete | 2     | 2/2       |
| Phase 4 | complete | 2     | 2/2       |
| Phase 5 | complete | 1     | 1/1       |

**Total:** 10/10 tasks completed

## Planning Gate Override

The configured quick-start exit gate used `onFailure: block`. Its first Fable
attempt timed out; its second attempt produced a receive-eligible review whose
findings were dispositioned and fixed. The operator explicitly approved
proceeding on 2026-07-23 without the clean re-review required by the configured
policy.

This records an intentional lifecycle exception. The plan review remains
`fixes_completed`, not `passed`, and later code reviews must independently
verify the implemented result.

---

## Phase 1: Establish the canonical split

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Added the portable `subagent-orchestration` guidance layer.
- Reduced `oat-dispatch-subagents` to selection/launch mechanics and additive
  dispatch evidence.
- Migrated all declared active consumers and restored repository contracts.

**Verification:**

- Focused contracts: 139/139 passed.
- Full repository suite: 3,539/3,539 passed.
- Type-check and formatting passed.
- Root-owned re-review passed after one bounded fix iteration.

**Notes / Decisions:**

- The review fix added one canonical autonomy mapping update and one test
  version assertion outside the original task file list. The passing
  implementation is the source of truth; no product/design behavior changed.

### Task p01-t01: Add portable model-selection guidance

**Status:** completed
**Commit:** `6d1470423350e6962185cf2433bd0d3342bfab72`

### Task p01-t02: Reduce dispatch references to mechanics

**Status:** completed
**Commit:** `9c2bcb3c5de13e688b32cd9c8aa05fd85b5b2ca7`

### Task p01-t03: Migrate canonical dispatch consumers

**Status:** completed
**Commit:** `b6dbf91a2c55ff2109569ee9bc78ae6d604a8f93`

### Task p01-t04: Restore the existing skill suite to green

**Status:** completed
**Commit:** `1af572393bfbf82907278a546a3f21500330e483`

**Phase review:** passed in
`reviews/archived/p01-review-2026-07-23T050810Z.md` after fix iteration 1.

---

## Phase 2: Enforce guidance and mechanics contracts

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Added durable structural coverage for orchestration guidance, mechanics,
  provider loading, task classes, compatibility, and service-tier boundaries.

**Verification:**

- Focused contract suite passed 111/111 after one fix iteration.
- Root-owned re-review passed with 0 Critical and 0 Important findings.

**Notes / Decisions:**

- One non-blocking Medium remains: the compatibility test uses a canonical
  request fixture rather than an explicit legacy record fixture.

### Task p02-t01: Harden skill boundary validation

**Status:** completed
**Commit:** `22ae2325dbb8f0c9763c0004e023a93efa49ad2e`

**Phase review:** passed in
`reviews/archived/p02-review-2026-07-23T115055Z.md` after fix iteration 1.

---

## Phase 3: Distribute and document the split

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Added the directional utility dependency and explicit pack lifecycle
  coverage.
- Updated active orchestration documentation for the guidance/mechanics split.

**Verification:**

- Seven focused files passed 95/95 tests.
- Documentation production build passed after fan-in.
- Root-owned review passed with no findings.

**Notes / Decisions:**

- The original dispatch used stale boundaries and was terminal without edits;
  the operator authorized one fresh same-target recovery.
- Two pre-existing broken docs fragments remain outside this phase.
- The normal `--no-ff` merge was aborted on the duplicate bootstrap-sync
  manifest conflict; the two reviewed task commits were cherry-picked.

### Task p03-t01: Add directional utility dependency

**Status:** completed
**Commit:** `7c519bad` (reviewed source `bc3c81d6`)

### Task p03-t02: Update active orchestration documentation

**Status:** completed
**Commit:** `6c818608` (reviewed source `f15b713c`)

**Phase review:** passed in
`reviews/archived/p03-review-2026-07-23T112224Z.md`.

---

## Phase 4: Synchronize and release the integrated result

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Advanced the five public packages to the common unpublished version
  `0.2.13`.
- Refreshed bundled public-version metadata and provider-sync release metadata.

**Verification:**

- Five npm histories parsed successfully and did not contain `0.2.13`.
- Focused integration tests passed 249/249.
- Full tests, lint, type-check, formatting, builds, release validation, and
  final sync dry-run passed.
- Root-owned release review passed with no findings.

**Notes / Decisions:**

- Previously generated provider views were already current; p04-t02 changed
  only `.oat/sync/manifest.json` release metadata.

### Task p04-t01: Advance lockstep package versions

**Status:** completed
**Commit:** `8856fa4e5019ad12fd4394d5941181e4f644430b`

### Task p04-t02: Regenerate providers and pass release gates

**Status:** completed
**Commit:** `7d3aaab73126638f6d1b7691a3623c0988ed3f3b`

**Phase review:** passed in
`reviews/archived/p04-review-2026-07-23T120818Z.md`.

---

## Phase 5: Final review fixes

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Added an explicit canonical legacy dispatch Record without optional guidance
  evidence.
- Updated compatibility coverage to compare the legacy and enriched Record
  fixtures directly.
- Bumped `oat-dispatch-subagents` from `1.2.0` to `1.2.1`.

**Verification:**

- Focused contract suites passed 136/136.
- Formatting, release validation, provider sync dry-run, and diff checks passed.
- Final verification exposed one directly caused autonomy inventory mapping;
  fix `ab60498b` updated the canonical NG mapping and the full test suite passed.

### Task p05-t01: (review) Add explicit legacy dispatch-record fixture

**Status:** completed
**Commit:** `e92a50bd9b38a9f57698f58e9b33d351bf24048b`

**Final review fix:** completed; final re-review pending for
`reviews/archived/final-review-2026-07-23T121234Z.md`.

---

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-07-23T05:08:10Z {#run-1}

**Branch:** `subagent-orchestration`
**Tier:** Tier 1 Cursor subagents
**Policy:** managed `high`

#### Phase Outcomes

| Phase | Verdict | Task Commits                                   | Review                                              | Fixes                   |
| ----- | ------- | ---------------------------------------------- | --------------------------------------------------- | ----------------------- |
| p01   | passed  | `6d147042`, `9c2bcb3c`, `b6dbf91a`, `1af57239` | `reviews/archived/p01-review-2026-07-23T050810Z.md` | 1 iteration, `0dda1cf3` |

#### Dispatch Notes

- Implementation: `oat-phase-implementer-gpt-5-6-sol-high`,
  `model_axis=selected:gpt-5.6-sol-high`, `effort_axis=not-applicable`,
  selection reason `native-catalog`.
- Review rounds: `oat-reviewer-gpt-5-6-sol-high` at the managed high ceiling;
  no reviewer-local reconnaissance was attempted.
- Fix continuation resumed the original implementation handle and preserved
  request linkage.
- Dispatch stamps:
  - `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
  - `Dispatch: scope=p01-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`

#### Parallel Groups

None in this run entry.

#### Outstanding Items

None for Phase 1.

### Run 2 — 2026-07-23T11:54:23Z {#run-2}

**Branch:** `subagent-orchestration`
**Tier:** Tier 1 Cursor subagents
**Policy:** managed `high`

#### Phase Outcomes

| Phase | Verdict | Task Commits                                                     | Review                                              | Fixes / Recovery                                 |
| ----- | ------- | ---------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| p02   | passed  | `22ae2325`                                                       | `reviews/archived/p02-review-2026-07-23T115055Z.md` | 1 fix iteration, `0692243e`                      |
| p03   | passed  | source `bc3c81d6`, `f15b713c`; integrated `7c519bad`, `6c818608` | `reviews/archived/p03-review-2026-07-23T112224Z.md` | 0 fix iterations; 1 operator-authorized recovery |

#### Dispatch Notes

- All implementation and review routes selected the native
  `gpt-5.6-sol-high` materialized variant at the managed `high` ceiling;
  ordered candidates were `gpt-5.6-sol-medium`, then `gpt-5.6-sol-high`.
- Neither root-owned reviewer attempted reviewer-local reconnaissance.
- Phase 2 resumed its original implementation handle for the bounded fix.
- Phase 3's original accepted attempt stopped without edits because the root
  supplied stale boundaries. Its fresh same-target recovery was explicitly
  operator-authorized and linked to the original request.
- Dispatch stamps:
  - `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
  - `Dispatch: scope=p02-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p03-recovery1 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

#### Parallel Groups

- Group: `[p02, p03]`
- Expected base: `f1e48897be5b4417f62ffd132b80ba87728f97e3`
- Worktrees:
  - `p02`: `.worktrees/subagent-orchestration-p02`, bootstrap sync
    `1668d004`, merged through `51aed2d`, then removed.
  - `p03`: `.worktrees/subagent-orchestration-p03`, bootstrap sync
    `199bc797`, reviewed task commits cherry-picked, then removed.
- The Phase 3 `--no-ff` merge conflicted only because both worktrees carried an
  equivalent bootstrap-generated `.oat/sync/manifest.json` commit. The merge
  was aborted before the task commits were cherry-picked in plan order.

#### Outstanding Items

- Non-blocking Medium: add a canonical legacy dispatch-record fixture without
  optional guidance fields.
- Pre-existing docs fragments:
  `implementation-execution.md#plan-declared-parallelism` and
  `orchestration-model.md#route-tiers-and-terminality`.

### Run 3 — 2026-07-23T12:10:29Z {#run-3}

**Branch:** `subagent-orchestration`
**Tier:** Tier 1 Cursor subagents
**Policy:** managed `high`

#### Phase Outcomes

| Phase | Verdict | Task Commits           | Review                                              | Fixes |
| ----- | ------- | ---------------------- | --------------------------------------------------- | ----- |
| p04   | passed  | `8856fa4e`, `7d3aaab7` | `reviews/archived/p04-review-2026-07-23T120818Z.md` | 0     |

#### Dispatch Notes

- Implementation and review selected the native
  `gpt-5.6-sol-high` materialized variant at the managed `high` ceiling from
  ordered candidates `gpt-5.6-sol-medium`, then `gpt-5.6-sol-high`.
- The root-owned reviewer did not attempt reviewer-local reconnaissance.
- Dispatch stamps:
  - `Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

#### Parallel Groups

None in this run entry.

#### Outstanding Items

- Non-blocking legacy dispatch-record fixture improvement from Phase 2.
- Two pre-existing docs fragment-link failures recorded in Run 2.

### Run 4 — 2026-07-23T12:26:31Z {#run-4}

**Branch:** `subagent-orchestration`
**Tier:** Tier 1 Cursor subagents
**Policy:** managed `high`

#### Phase Outcomes

| Phase | Verdict | Task Commits | Review                                                | Fixes                               |
| ----- | ------- | ------------ | ----------------------------------------------------- | ----------------------------------- |
| p05   | passed  | `e92a50bd`   | `reviews/archived/final-review-2026-07-23T123440Z.md` | M1 plus verification fix `ab60498b` |

#### Dispatch Notes

- Implementation selected native `gpt-5.6-sol-high` at the managed `high`
  ceiling from ordered candidates `gpt-5.6-sol-medium`, then
  `gpt-5.6-sol-high`.
- Dispatch stamp:
  - `Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`

#### Parallel Groups

None in this run entry.

#### Outstanding Items

- None. The two known docs fragments predate the branch and remain outside this
  project's findings.

<!-- orchestration-runs-end -->

---

## Review Received: final

**Date:** 2026-07-23
**Review artifact:**
`reviews/archived/final-review-2026-07-23T121234Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 1
- Minor: 0

**New tasks added:** `p05-t01`

**Finding disposition:**

- M1: `code_fix_required` — add a canonical legacy dispatch Record fixture and
  assert baseline fields plus absence of optional guidance evidence. Task scope:
  Minor.

**Fix status:** completed in `e92a50bd`; final re-review passed.

---

## Final Re-review Received: final

**Date:** 2026-07-23
**Review artifact:**
`reviews/archived/final-review-2026-07-23T123440Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Deferred ledger:**

- M1 resolved by `e92a50bd`.
- Directly caused autonomy inventory drift resolved by `ab60498b`.
- No deferred Medium or Minor remains.

**Disposition:** final lifecycle review passed.

---

## Gate Review Received: final

**Date:** 2026-07-23
**Gate run:** `48a1a4df-a811-417c-be38-cc975466b1ec`
**Review artifact:**
`reviews/archived/final-review-2026-07-23T124954Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Deferred ledger:** clear. M1 and its directly caused inventory drift were
resolved before this gate; no deferred Medium or Minor remains.

**Disposition:** configured implementation exit gate passed. No fix tasks were
added.

---

## Post-Documentation Final Review Received: final

**Date:** 2026-07-23
**Review artifact:**
`reviews/archived/final-review-2026-07-23T162104Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Deferred ledger:** clear. The review independently verified the approved
documentation and PJM delta, preserved implementation contracts, repaired
fragments, and the existing lockstep `0.2.13` release.

**Disposition:** final lifecycle review passed after documentation sync.

---

## Refreshed Gate Review Received: final

**Date:** 2026-07-23
**Gate run:** `cf1b9992-38b0-4d3a-be67-10435ba5a406`
**Review artifact:**
`reviews/archived/final-review-2026-07-23T163522Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Deferred ledger:** clear. The gate independently re-verified the full project
and confirmed the post-review delta was lifecycle bookkeeping only.

**Disposition:** refreshed configured implementation exit gate passed. No fix
tasks were added.

---

## Implementation Log

### 2026-07-23

- Planning handoff completed.
- Gate findings were fixed and the operator waived the clean Fable re-review.
- Implementation preflight selected Tier 1 Cursor subagents under the managed
  `high` policy.
- HiLL is configured for final Phase 5, with automatic checkpoint review
  enabled.
- Phase 1 produced four verified task commits; focused tests, formatting, and
  type-check passed.
- Root-owned review found two Important full-suite contract drifts. Fix
  iteration 1 is bounded to the canonical autonomy mapping and reviewer-version
  assertion.
- Fix iteration 1 completed both findings in `0dda1cf3`; targeted tests passed
  139/139 and the full suite passed 3,539/3,539.
- Phase 1 re-review passed with no findings.
- Phase 2 implementation completed in `22ae2325`; root review found 2
  Important contract-coverage gaps. Fix iteration 1 completed all 5 findings
  in `0692243e`; re-review passed with one non-blocking Medium.
- Phase 3 passed root review in `reviews/archived/p03-review-2026-07-23T112224Z.md`
  after one operator-authorized recovery.
- Phase 2 merged through `51aed2d`; its focused suite passed 111/111.
- Phase 3's duplicate bootstrap-sync manifest conflicted during `--no-ff`
  merge. The merge was aborted and reviewed task commits were cherry-picked as
  `7c519bad` and `6c818608`; 95/95 focused tests and the docs build passed.
- Phase 4 selected unpublished version `0.2.13`, completed two bounded commits,
  passed all repository and release gates, and passed root review with no
  findings.
- Initial final lifecycle review converted one Medium compatibility gap to
  `p05-t01`; the fix added the explicit legacy Record fixture and passed all
  focused, release, and sync checks.
- Final verification found the fixture's new autonomy-inventory prompt-site
  hash; bounded fix `ab60498b` mapped it to NG and restored the full suite.
- Final lifecycle re-review passed with no findings.
- Configured implementation exit-gate generation persisted at reviewed HEAD
  `e3e0f024` with launch attempt
  `implement-exit-20260723T124207Z-cbd8ecb7-7e28-4201-b6b9-7aca32900a8c`.
- Exit-gate run `48a1a4df-a811-417c-be38-cc975466b1ec` was accepted by
  the gate runtime.
- Exit-gate result envelope persisted with status `ok`, a correlated gate
  artifact, and an eligible receive handoff.
- Gate-review receive intent persisted for run
  `48a1a4df-a811-417c-be38-cc975466b1ec` and event
  `final|code|final-review-2026-07-23T124954Z.md`.
- Configured exit-gate review received with no findings and a clear deferred
  ledger.
- Receive correlation reconciled to bookkeeping commit `835ad76c`; exit-gate
  disposition persisted as `allowed/passed`.
- Freshness delta from reviewed HEAD `e3e0f024` classified closeout-only:
  review ledger, lifecycle notes, structural log, gate receipt, and gate state.
- Project documentation sync added public-skill discoverability and repaired
  the two previously known fragment links; PJM current-state and curated
  backlog context were refreshed.
- Because those documentation commits followed the passing configured gate,
  its freshness state was marked stale before approval.
- Post-documentation final verification passed: `pnpm test`, `pnpm lint`,
  `pnpm type-check`, and `pnpm build`.
- Post-documentation final lifecycle review passed with no findings and a clear
  deferred ledger.
- Prior configured gate receipt and archived artifact remain preserved as
  history; refreshed generation
  `implement-exit-refresh-20260723T162824Z-b9d97a14-342d-49f2-afd3-a9de4c64b511`
  was persisted at reviewed HEAD `3e4cc2b3`.
- Refreshed exit-gate run `cf1b9992-38b0-4d3a-be67-10435ba5a406` was accepted
  by the gate runtime.
- Refreshed exit-gate result envelope persisted with status `ok`, a correlated
  gate artifact, and an eligible receive handoff.
- Refreshed gate-review receive intent persisted for run
  `cf1b9992-38b0-4d3a-be67-10435ba5a406` and event
  `final|code|final-review-2026-07-23T163522Z.md`.
- Refreshed configured exit-gate review received with no findings and a clear
  deferred ledger.
- Refreshed receive correlation reconciled to bookkeeping commit `a0815ea7`;
  exit-gate disposition persisted as `allowed/passed`.
- Freshness delta from refreshed reviewed HEAD `3e4cc2b3` classified
  closeout-only: review ledger, lifecycle notes, structural log, gate receipt,
  and gate state.
- Next action: final implementation approval.

---

## Deviations from Plan / Design

| Task / Review    | Source Artifact                                     | Planned / Documented                | Actual / Accepted                        | Reason                                                                   | Source of Truth                              | Follow-up                                 |
| ---------------- | --------------------------------------------------- | ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------- |
| quick-start gate | `plan.md`                                           | Clean re-review after applied fixes | Proceed under explicit operator override | Operator waived another timed gate review                                | `plan.md`                                    | Independently verify through code reviews |
| p01 review fixes | `reviews/archived/p01-review-2026-07-23T045715Z.md` | Original p01 task file lists        | Added two bounded contract-only files    | Full-suite drift was directly caused by p01                              | passing code and tests                       | Reflected in Phase 1 summary              |
| p03 fan-in       | `plan.md`                                           | Merge passing phase with `--no-ff`  | Cherry-picked two reviewed task commits  | Duplicate bootstrap sync commits conflicted in `.oat/sync/manifest.json` | reviewed task commits and integration checks | Reflected in Phase 3 summary              |

## Test Results

| Phase | Tests Run                                | Passed                                           | Failed | Coverage                                   |
| ----- | ---------------------------------------- | ------------------------------------------------ | ------ | ------------------------------------------ |
| 1     | focused skills + full suite + type-check | 139/139 focused; 3539/3539 full; type-check pass | 0      | Phase passed after fix iteration 1         |
| 2     | focused skill contracts                  | 111/111                                          | 0      | Phase passed after fix iteration 1         |
| 3     | focused utility lifecycle + docs build   | 95/95; docs build pass                           | 0      | Phase passed; 2 pre-existing link failures |
| 4     | focused + full repository/release gates  | 249/249 focused; all repository gates passed     | 0      | Phase and release review passed            |
| 5     | focused contracts + full tests           | 136/136 focused; full tests + 129/129 smoke pass | 0      | Final review fix and inventory fix pass    |

## Final Summary (for PR/docs)

- Shipped a portable `subagent-orchestration` guidance skill that owns durable
  task classes and model-selection principles while `oat-dispatch-subagents`
  remains responsible for provider-specific launch mechanics.
- Migrated active lifecycle and repository-improvement consumers to load
  principles, exactly one active-provider selection reference, and matching
  mechanics in order.
- Added directional utility installation: selecting
  `oat-dispatch-subagents` includes `subagent-orchestration`, while the guidance
  skill remains independently installable.
- Added contract tests for guidance/mechanics ownership, task-class semantics,
  consumer loading, provider recommendations, and additive dispatch evidence.
- Updated active docs and generated provider assets, then advanced all five
  public packages and bundled metadata to unpublished version `0.2.13`.
- Key surfaces: `.agents/skills/subagent-orchestration`,
  `.agents/skills/oat-dispatch-subagents`, active consumer skills,
  `packages/cli/src/validation/skills.test.ts`, CLI utility manifests/tests,
  project docs, package manifests, and provider-sync metadata.
- Verification: focused suites through 249/249, full workspace tests and smoke
  tests, lint, type-check, format, package build, docs build, release
  validation, registry checks, and final provider-sync dry-run all passed.
- Review fixes restored autonomy inventory/version contracts in Phase 1,
  strengthened semantic contract coverage in Phase 2, and added explicit
  legacy Record coverage in Phase 5.
- Design deltas: Phase 3 used reviewed-task cherry-picks after duplicate
  bootstrap-sync manifest conflict; the quick-start planning gate proceeded
  under an explicit operator-approved override after all received findings were
  fixed.

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
