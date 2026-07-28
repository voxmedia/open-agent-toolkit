---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-28
oat_current_task_id: p04-t01
oat_generated: false
oat_template: false
oat_template_name: implementation
---

# Implementation: rereview-scope-narrowing

**Started:** 2026-07-28
**Last Updated:** 2026-07-28

> This document is used to resume interrupted implementation sessions.
>
> `oat_current_task_id` points to the next plan task to execute. Reviews are
> tracked in `plan.md`, not as plan tasks.

## Progress Overview

| Phase | Status      | Tasks | Completed |
| ----- | ----------- | ----- | --------- |
| p01   | completed   | 3     | 3/3       |
| p02   | completed   | 3     | 3/3       |
| p03   | completed   | 2     | 2/2       |
| p04   | in_progress | 1     | 0/1       |
| p05   | pending     | 1     | 0/1       |
| p06   | pending     | 3     | 0/3       |

**Total:** 8/13 tasks completed

---

## Phase 1: Range resolution core

**Status:** completed
**Started:** 2026-07-28
**Completed:** 2026-07-28

### Phase Summary

- Added lineage-qualified prior-review matching for lifecycle and gate reviews.
- Made narrowing automatic for unset/true preferences while preserving explicit
  opt-out and force-narrow precedence.
- Added reporting-only empty/bookkeeping/substantive range classification with
  conservative fail-open behavior when file enumeration is unavailable.
- Phase review passed after one bounded fix round.

### Task p01-t01: Match prior reviews by lineage

**Status:** completed
**Commit:** `b04e2f59c0aa14635898f1bc16d7e710873e328d`

**Outcome:** Prior reviews now require matching invocation lineage and gate
target; legacy lineage-less records fail open.

### Task p01-t02: Narrow by default and remove the prompt

**Status:** completed
**Commit:** `d64633114fdb78130bb97e3a86055059fad0fcfa`

**Outcome:** Unset and true preferences narrow without prompting, false opts
out, and explicit force-narrow remains authoritative.

### Task p01-t03: Classify the resolved range

**Status:** completed
**Commit:** `ea1aa64e293edde2f64e0c04c7f28b5c36906a1b`

**Outcome:** Resolved ranges report empty, project-bookkeeping-only, or
substantive classifications without changing dispatch eligibility.

**Review fix:** `0832ac7cab028ae7ef79181af80e15ce4227be7e` —
preserved force-narrow precedence and classifier fail-open behavior.

**Verification:** 48 focused tests passed; the full CLI suite passed 3,395
tests; lint, type-check, formatting, and root-owned re-review passed.

---

## Phase 2: Provenance contract

**Status:** completed
**Started:** 2026-07-28
**Completed:** 2026-07-28

### Phase Summary

- Added required reviewed-head and narrowed-range provenance to reviewer
  artifacts.
- Migrated the review ledger parser, public types, template, and enumerated
  lifecycle writers to lineage-qualified provenance while preserving legacy
  rows; the gate-identified implementation-writer gap is deferred below.
- Made row- and artifact-sourced narrowing candidates share the same strict
  lineage and full-SHA validation, with conservative full-scope fallback.
- Phase review and the configured independent gate passed after one bounded
  Important-finding fix round.

### Task p02-t01: Record the reviewed head on the review artifact

**Status:** completed
**Commit:** `8e5d7043245cf5258a7326ef352b1366564a7536`

**Outcome:** Reviewer artifacts now carry the authoritative full reviewed head
and disclose narrowed ranges without overstating inherited coverage.

### Task p02-t02: Migrate the review ledger to carry lineage-qualified provenance

**Status:** completed
**Commit:** `d56cff7d0b5205a5aa849a300499a1657c5b0ddc`

**Outcome:** The control-plane parser, public review status, plan template, and
review lifecycle writers now support reviewed head, invocation, and gate target
columns while accepting legacy rows.

### Task p02-t03: Fail open when durable lineage cannot be established

**Status:** completed
**Commit:** `33e4506ef7211d75faa30402ea6b1a11e278e475`

**Outcome:** Durable ledger candidates must satisfy the same lineage predicate
as artifacts; missing or ambiguous provenance falls back to full scope.

**Review fix:** `0908e1cf87a50f6fd81f10ab30735ac88e5e9813` —
rejected abbreviated, symbolic, and non-hex durable reviewed heads before Git
guards can authorize narrowing.

**Verification:** 76 control-plane tests and 3,404 CLI tests passed; lint,
type-check, formatting, focused reviewer verification, and the independent
phase gate passed.

### Passing Gate Judgment Sweep

**Date:** 2026-07-28
**Review artifact:**
`reviews/archived/p02-review-2026-07-28T214026Z.md`

**Findings:** 0 Critical, 0 Important, 3 Medium, 0 Minor.

All three Medium findings were deferred to the mandatory final-review
resurfacing gate:

- **M1 — `oat-project-implement` ledger writer contract:** Agree. The
  implementation skill can disposition or archive review rows without the
  provenance migration/preservation rules. Defer because correcting a
  canonical skill requires a dedicated version bump, pinned assertion update,
  and focused verification; absent provenance safely fails open to full scope.
- **M2 — Header-relative provenance parsing:** Agree. Custom widened tables can
  misassign lineage cells because the parser uses fixed positions. Defer because
  canonical generated tables remain ordered and malformed provenance safely
  fails open.
- **M3 — Clean remote-receive migration rule:** Agree. The clean branch lacks
  the explicit widen/pad/preserve contract present in the findings branch.
  Defer because this is a bounded skill-contract gap with safe fail-open
  behavior and should be resolved with its assertion coverage at final review.

---

## Phase 3: Local rail rewrite

**Status:** completed
**Started:** 2026-07-28
**Completed:** 2026-07-28

### Phase Summary

- Replaced commit-message and fixed-lookback narrowing with guarded
  prior-reviewed-head ranges sourced from matching review lineage.
- Removed the re-review narrowing prompt while preserving explicit base/range
  precedence and the `false` opt-out.
- Added exactly-one resolution reporting with range classification and honest
  narrowed-review provenance for reviewers and Tier 3 inline execution.
- Phase review passed after one bounded Medium-finding fix round.

### Task p03-t01: Replace Step 3a narrowing with guarded prior-head ranges

**Status:** completed
**Commit:** `38c553cdd60d6becc3e10daa344bed325f8ea6b9`

**Outcome:** The local lifecycle rail now resolves matching artifact and ledger
heads, requires agreement and full-SHA/existence/ancestry guards, and fails open
to normal full scope.

### Task p03-t02: Drop the prompt and print a classified resolution line

**Status:** completed
**Commit:** `1c478918f7489ec11664531eb0f511e08fc34f0c`

**Outcome:** Re-reviews resolve without an interactive narrowing decision and
report the final range, classification, and reason while preserving explicit
override semantics.

**Boundary cleanup:** `f914b9ea1e8c24de7cf81dab6aec0f01e3e37d0f`
removed an incidental generated autonomy-contract update, leaving the net phase
change within the declared skill boundary.

**Review fix:** `28afd27b4959f4ef535f961b7348e5d0dfeb438b`
made opt-out precedence explicit, preserved re-review classification for
explicit ranges, and aligned manual/auto lifecycle equivalence.

**Verification:** 63 focused semantic and skill-contract tests passed;
formatting, diff hygiene, and narrowed root re-review passed.

---

## Phase 4: Remote rail alignment

**Status:** pending
**Started:** -

### Task p04-t01: Align both remote provide skills

**Status:** pending
**Commit:** -

---

## Phase 5: Config default flip

**Status:** pending
**Started:** -

### Task p05-t01: Default the preference to narrow

**Status:** pending
**Commit:** -

---

## Phase 6: Documentation and release

**Status:** pending
**Started:** -

### Task p06-t01: Update documentation

**Status:** pending
**Commit:** -

### Task p06-t02: Verify cross-surface semantic parity

**Status:** pending
**Commit:** -

### Task p06-t03: Refresh provider views, bump versions, validate release

**Status:** pending
**Commit:** -

---

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — Phase p01

**Date:** 2026-07-28
**Outcome:** passed
**Phase base:** `df74270e590c52a21ef545c45655dee19e30e46f`
**Implementation head:** `ea1aa64e293edde2f64e0c04c7f28b5c36906a1b`
**Final fix head:** `0832ac7cab028ae7ef79181af80e15ce4227be7e`
**Fix iterations:** 1

| Task    | Commit                                     | Result |
| ------- | ------------------------------------------ | ------ |
| p01-t01 | `b04e2f59c0aa14635898f1bc16d7e710873e328d` | passed |
| p01-t02 | `d64633114fdb78130bb97e3a86055059fad0fcfa` | passed |
| p01-t03 | `ea1aa64e293edde2f64e0c04c7f28b5c36906a1b` | passed |

**Root review:** `reviews/archived/p01-review-2026-07-28T204348Z.md`
(blocked: 2 Important)

**Passing re-review:**
`reviews/archived/p01-review-2026-07-28T205203Z.md`

**Implementation dispatch:** `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-medium`

**Fix dispatch:** `Dispatch: scope=p01-fix1 action=fix role=fix producer=gpt-5.6-sol-medium provenance=declared model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-medium`

**Review dispatch:** `Dispatch: scope=p01-fix1 action=review role=reviewer producer=gpt-5.6-sol-medium provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high`

**Selection:** Native Cursor materialized roles; implementer candidate
`gpt-5.6-sol-medium` under the `high` ceiling, reviewer at
`gpt-5.6-sol-high`.

**Outstanding items:** none.

### Run 2 — Phase p02

**Date:** 2026-07-28
**Outcome:** passed
**Phase base:** `91ec5c933895edfaf2d15691d83afb7b3a9fadab`
**Implementation head:** `33e4506ef7211d75faa30402ea6b1a11e278e475`
**Final fix head:** `0908e1cf87a50f6fd81f10ab30735ac88e5e9813`
**Fix iterations:** 1

| Task    | Commit                                     | Result |
| ------- | ------------------------------------------ | ------ |
| p02-t01 | `8e5d7043245cf5258a7326ef352b1366564a7536` | passed |
| p02-t02 | `d56cff7d0b5205a5aa849a300499a1657c5b0ddc` | passed |
| p02-t03 | `33e4506ef7211d75faa30402ea6b1a11e278e475` | passed |

**Root review:**
`reviews/archived/p02-review-2026-07-28T211745Z.md`
(blocked: 1 Important, 2 Medium)

**Passing re-review:**
`reviews/archived/p02-review-2026-07-28T212511Z.md`

**Passing phase gate:**
`reviews/archived/p02-review-2026-07-28T214026Z.md`
(3 Medium deferred to final)

**Gate diversity:** producer family OpenAI; reviewer family Claude via
`cursor-fable-5-xhigh`.

**Outstanding items:** M1, M2, and M3 are registered under Deferred Findings
(Medium) for mandatory final disposition.

### Run 3 — Phase p03

**Date:** 2026-07-28
**Outcome:** passed
**Phase base:** `6e6aff962f22b743baea3ba556936a63e4b83fc4`
**Implementation head:** `f914b9ea1e8c24de7cf81dab6aec0f01e3e37d0f`
**Final fix head:** `28afd27b4959f4ef535f961b7348e5d0dfeb438b`
**Fix iterations:** 1

| Task    | Commit                                     | Result |
| ------- | ------------------------------------------ | ------ |
| p03-t01 | `38c553cdd60d6becc3e10daa344bed325f8ea6b9` | passed |
| p03-t02 | `1c478918f7489ec11664531eb0f511e08fc34f0c` | passed |

**Root review:**
`reviews/archived/p03-review-2026-07-28T220431Z.md`
(blocked: 3 Medium)

**Passing re-review:**
`reviews/archived/p03-review-2026-07-28T221100Z.md`

**Outstanding items:** none.

<!-- orchestration-runs-end -->

---

## Implementation Log

### 2026-07-28

**Session Start:** 20:24 UTC

- [x] p01-t01: Match prior reviews by lineage — `b04e2f59c`
- [x] p01-t02: Narrow by default and remove the prompt — `d64633114`
- [x] p01-t03: Classify the resolved range — `ea1aa64e2`
- [x] p01 review fixes — `0832ac7ca`
- [x] p02-t01: Record the reviewed head on the review artifact — `8e5d70432`
- [x] p02-t02: Migrate the review ledger — `d56cff7d0`
- [x] p02-t03: Fail open without durable lineage — `33e4506ef`
- [x] p02 review fix — `0908e1cf8`
- [x] p02 lifecycle review and independent phase gate passed
- [x] p03-t01: Replace Step 3a narrowing with guarded prior-head ranges — `38c553cdd`
- [x] p03-t02: Drop the prompt and report the resolved range — `1c478918f`
- [x] p03 boundary cleanup — `f914b9ea1`
- [x] p03 review fix — `28afd27b4`
- [ ] p04-t01: Align both remote provide skills

**Decisions:**

- HiLL checkpoint: final phase only (`p06`).
- Auto-review at the final HiLL checkpoint: enabled.
- Dispatch policy: managed `high` from project state.
- Phase 1 required one bounded review-fix round and then passed re-review.
- Phase 2 required one bounded Important-finding fix round; its independent gate
  passed with three Medium findings deferred for mandatory final disposition.
- Phase 3 required one bounded Medium-finding fix round and then passed narrowed
  re-review.

---

## Deferred Findings (Medium)

| ID     | Source                                              | Finding                                                                                   | Deferral rationale                                                                                                                | Final trigger         |
| ------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| p02-M1 | `reviews/archived/p02-review-2026-07-28T214026Z.md` | Add provenance migration/preservation rules to the `oat-project-implement` ledger writer. | Requires a canonical skill version bump, assertion update, and focused verification; missing provenance fails open to full scope. | Final review Step 8.5 |
| p02-M2 | `reviews/archived/p02-review-2026-07-28T214026Z.md` | Parse known provenance columns by header name rather than fixed position.                 | Canonical tables retain the expected order; ambiguous provenance fails open.                                                      | Final review Step 8.5 |
| p02-M3 | `reviews/archived/p02-review-2026-07-28T214026Z.md` | Apply the ledger widening/preservation contract to the clean remote-receive path.         | Bounded contract gap with safe fail-open behavior; resolve with assertion coverage.                                               | Final review Step 8.5 |

## Deviations from Plan / Design

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

| Phase | Tests Run                                                              | Passed | Failed | Coverage                                                              |
| ----- | ---------------------------------------------------------------------- | ------ | ------ | --------------------------------------------------------------------- |
| p01   | Focused + full CLI suite, lint, type-check, format, review             | 3,395  | 0      | Lineage, preference, guard, classification, integration               |
| p02   | Focused + full package suites, lint, type-check, format, reviews, gate | 3,480  | 0      | Provenance artifacts, ledger compatibility, durable-lineage fail-open |
| p03   | Focused semantic + skill-contract tests, format, diff, reviews         | 63     | 0      | Local precedence, lineage, guards, classification, Tier 3             |
| p04   | -                                                                      | -      | -      | -                                                                     |
| p05   | -                                                                      | -      | -      | -                                                                     |
| p06   | -                                                                      | -      | -      | -                                                                     |

## Final Summary (for PR/docs)

**What shipped:**

- Pending implementation.

**Behavioral changes (user-facing):**

- Pending implementation.

**Key files / modules:**

- Pending implementation.

**Verification performed:**

- Plan artifact review passed before implementation.

**Design deltas (if any):**

- None recorded.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
