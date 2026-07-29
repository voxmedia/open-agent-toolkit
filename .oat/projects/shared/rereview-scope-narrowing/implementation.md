---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-29
oat_current_task_id: null
oat_generated: false
oat_template: false
oat_template_name: implementation
---

# Implementation: rereview-scope-narrowing

**Started:** 2026-07-28
**Last Updated:** 2026-07-29

> This document is used to resume interrupted implementation sessions.
>
> `oat_current_task_id` points to the next plan task to execute. Reviews are
> tracked in `plan.md`, not as plan tasks.

## Progress Overview

| Phase | Status    | Tasks | Completed |
| ----- | --------- | ----- | --------- |
| p01   | completed | 3     | 3/3       |
| p02   | completed | 3     | 3/3       |
| p03   | completed | 2     | 2/2       |
| p04   | completed | 1     | 1/1       |
| p05   | completed | 1     | 1/1       |
| p06   | completed | 3     | 3/3       |
| p07   | completed | 5     | 5/5       |
| p08   | completed | 1     | 1/1       |

**Total:** 19/19 tasks completed

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

**Status:** completed
**Started:** 2026-07-28
**Completed:** 2026-07-28

### Phase Summary

- Aligned project and ad-hoc remote rails on prompt-free default narrowing,
  explicit flag precedence, guarded fail-open behavior, and reporting-only
  range classification.
- Preserved rail-specific GitHub marker provenance without adding local
  lifecycle-ledger fallbacks.
- Extended canonical marker helpers to retain lifecycle and exact-target gate
  lineage while rejecting ambiguous legacy provenance.
- Added explicit automatic fallback and forced-error behavior for remote review
  discovery failures, including bounded temporary diagnostics.
- Phase review passed after two bounded Important-finding fix rounds.

### Task p04-t01: Align both remote provide skills

**Status:** completed
**Commit:** `8df5b27cf506a2ad76f7b9eeab2307979dcf0d6d`

**Outcome:** Both remote rails now share preference, lineage, guard, fallback,
and classification semantics while preserving their own marker sources.

**Review fix 1:** `942458eb27065c3208774be2e7fe57b0b0fe0c34`
made gate/legacy marker lineage round-trip through the parser, builder, and
narrowing helper and defined candidate-enumeration failure policy.

**Review fix 2:** `6fed0cf0bc8e225dcb137795b3aed4fdb871014b`
initialized, bounded, and cleaned remote discovery diagnostics on every path.

**Verification:** 241 focused parser, builder, narrowing, integration, contract,
and version tests passed; CLI lint, type-check, formatting, direct shell probes,
diff hygiene, and final narrowed re-review passed.

---

## Phase 5: Config default flip

**Status:** completed
**Started:** 2026-07-28
**Completed:** 2026-07-28

### Phase Summary

- Changed the resolved default for `workflow.autoNarrowReReviewScope` to
  enabled while preserving explicit false and true at every config layer.
- Updated config metadata to describe enabled-by-default behavior and the false
  opt-out without unset-prompt language.
- Restored the required generated autonomy prompt inventory after full-suite
  verification exposed stale mappings from Phase 3 prompt removal.
- Standard review and the configured independent cross-family gate passed.

### Task p05-t01: Default the preference to narrow

**Status:** completed
**Commit:** `7ca0c75bf83ad4764fb236ce0a044d35e3a9ec10`

**Outcome:** Unconfigured resolution now returns true from the default source;
explicit layered values and unrelated defaults retain their prior behavior.

**Consistency correction:** `e9b6ffe0afc37c99959431c59f1031edf0b0c3a8`
removed five stale prompt-site mappings from the generated autonomy inventory,
as required by the Phase 3 prompt removal.

**Verification:** 191 focused config/inventory tests and all 3,429 CLI tests
passed; lint, type-check, formatting, diff hygiene, standard review, and the
independent phase gate passed.

### Passing Gate Judgment Sweep

**Date:** 2026-07-28
**Review artifact:**
`reviews/archived/p05-review-2026-07-28T230930Z.md`

**Findings:** 0 Critical, 0 Important, 0 Medium, 1 Minor.

- **m1 — Catalog env-precedence wording:** Deferred to final disposition. The
  edited entry repeats a pre-existing inaccurate `env >` prefix shared by five
  sibling catalog entries, while this key has no environment override. Fixing
  only this entry would increase inconsistency; a catalog-wide sweep is the
  correct follow-up and runtime resolution is unaffected.

---

## Phase 6: Documentation and release

**Status:** completed
**Started:** 2026-07-28
**Completed:** 2026-07-28

### Phase Summary

- Updated user documentation for default narrowing, lineage-owned provenance,
  guards, fail-open behavior, explicit overrides, and reporting classification.
- Verified semantic parity across the helper and all three provide rails
  without requiring canonical-source edits.
- Synced scoped reviewer provider variants and bumped all five public packages
  in lockstep from 0.2.19 to 0.2.20.
- Regenerated the bundled public-package version snapshot and passed the full
  release definition of done from a clean committed state.
- Phase review passed after one bounded release-consistency fix.

### Task p06-t01: Update documentation

**Status:** completed
**Commit:** `ef56fdb6a8a7bdab6a49ff15e9ff4785159256ac`

**Outcome:** Three targeted docs pages now describe the final prompt-free,
enabled-by-default narrowing behavior and its conservative guard semantics.

### Task p06-t02: Verify cross-surface semantic parity

**Status:** completed
**Commit:** no-op

**Outcome:** The helper, local lifecycle rail, project remote rail, and ad-hoc
remote rail agree on shared semantics while retaining rail-owned provenance.

### Task p06-t03: Refresh provider views, bump versions, validate release

**Status:** completed
**Commit:** `f95864d2ee8cbbf94eec311abeeb83547851ff37`

**Outcome:** Scoped generated reviewer variants are refreshed and all five
public packages are lockstep 0.2.20.

**Review fix:** `87455b33c5b338ac717d10ebe5862924c538aeef`
regenerated `packages/cli/assets/public-package-versions.json` so clean builds
preserve the committed release surface.

**Verification:** Docs build generated 66 static pages; workspace build, 3,675
tests, lint, type-check, formatting, sync dry-run, and release validation for
all five packages passed without tracked mutations.

---

## Phase 7: Final review fixes

**Status:** completed
**Started:** 2026-07-28
**Completed:** 2026-07-28

### Phase Summary

The final automatic review found no new defects and revalidated the three
deferred Medium findings plus one Minor wording finding. At the HiLL checkpoint,
the user selected fix-now for all four. The Minor is included in this repair
phase but does not receive an independent review cycle; one combined narrowed
final verification review covers the Medium fix set and its accompanying
wording correction.

- Added header-relative, widening-safe provenance preservation to every
  implementation-owned and remote-receive Reviews ledger mutation path.
- Made the control-plane review parser resolve all known columns by header name
  while retaining legacy rows, row order, full-SHA validation, and unknown
  column tolerance.
- Corrected seven workflow catalog descriptions to match actual layered config
  precedence while preserving the legacy checkpoint fallback.
- Synced all scopes, discarded unrelated Cursor live-catalog and manifest
  drift, confirmed the provider views were already current, and passed the full
  release definition of done with all public packages at `0.2.20`.

### Task p07-t01: Preserve provenance in implementation-ledger writes

**Status:** completed
**Commit:** `29d119c62ed7950a0229d837bef80c0a0ee8cb52`

**Outcome:** Every implementation-owned review disposition and archive
re-point now widens and pads legacy rows, mutates by header name, preserves
known and unknown cells, and populates only validated artifact provenance.

**Verification:** File-scoped formatting and 143 focused implementation,
autonomy, version, and review-skill contract tests passed.

### Task p07-t02: Parse review provenance by header name

**Status:** completed
**Commit:** `bf13da3785bfb0f9a364cebb4e85a13c49e9948c`

**Outcome:** Known Reviews columns are resolved from normalized header names,
including reordered columns with unknown cells interleaved; legacy five-column
rows and append order remain compatible.

**Verification:** 13 focused parser tests, control-plane lint, type-check, and
file-scoped formatting passed.

### Task p07-t03: Preserve clean remote-receive ledger migrations

**Status:** completed
**Commit:** `beb17c01e1018ee36858d30c8074fbd67f7d7aa8`

**Outcome:** The clean and findings-bearing remote receive branches now share
one explicit widen, pad, mutate-by-header, preserve, and never-truncate
contract. The skill remains at version `1.5.0`.

**Verification:** File-scoped formatting and 144 focused review-skill and
version tests passed.

### Task p07-t04: Correct workflow catalog precedence wording

**Status:** completed
**Commit:** `25ca7a2d554e1a29b305a841b58ed94edd6879da`

**Outcome:** Seven workflow catalog entries no longer claim a nonexistent
environment override; `workflow.autoReviewAtHillCheckpoints` retains its
`legacy autoReviewAtCheckpoints` fallback.

**Verification:** 140 focused config tests, CLI lint, type-check, and
file-scoped formatting passed.

### Task p07-t05: Resync and revalidate final release assets

**Status:** completed
**Commit:** no-op

**Outcome:** `oat sync --scope all` found the project-owned implementation and
remote-receive provider views already current. Unrelated generated Cursor Opus
roles and the sync-manifest version-only drift were removed, so no generated
asset commit was required. All five public package manifests and
`packages/cli/assets/public-package-versions.json` remain at `0.2.20`.

**Verification:** Workspace build, 3,556 tests across tested public packages,
lint, type-check, formatting, and release validation for all five public
packages passed. The tracked worktree was clean afterward.

### Final narrowed verification review

**Status:** passed
**Artifact:** `reviews/archived/final-review-2026-07-29T012157Z.md`
**Reviewed head:** `66ff93add752f5eee2dd912395bc9ae48a9d5846`
**Range:** `b9f6f5a6098a5f9e7d0b55a7e454a9d309ef0663..66ff93add752f5eee2dd912395bc9ae48a9d5846`

**Outcome:** The combined narrowed review independently verified all four
repairs as resolved and found no Critical, Important, Medium, or Minor defects.
Full-project coverage remains inherited from the prior final artifact.

**Verification:** 297 focused tests and 3,556 full-suite tests passed, along
with build, lint, type-check, formatting, five-package release validation, and
provider-view sync checks.

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

### Run 4 — Phase p04

**Date:** 2026-07-28
**Outcome:** passed
**Phase base:** `ad6dcd0fa3ea399ed957ac96f7b40ea706b28b4e`
**Implementation head:** `8df5b27cf506a2ad76f7b9eeab2307979dcf0d6d`
**Final fix head:** `6fed0cf0bc8e225dcb137795b3aed4fdb871014b`
**Fix iterations:** 2

| Task    | Commit                                     | Result |
| ------- | ------------------------------------------ | ------ |
| p04-t01 | `8df5b27cf506a2ad76f7b9eeab2307979dcf0d6d` | passed |

**Root review:**
`reviews/archived/p04-review-2026-07-28T222436Z.md`
(blocked: 2 Important)

**First narrowed re-review:**
`reviews/archived/p04-review-2026-07-28T223723Z.md`
(blocked: 1 Important)

**Passing re-review:**
`reviews/archived/p04-review-2026-07-28T225031Z.md`

**Outstanding items:** none.

### Run 5 — Phase p05

**Date:** 2026-07-28
**Outcome:** passed
**Phase base:** `e517d3b35681034da905ced73e12a7408c110d61`
**Implementation head:** `e9b6ffe0afc37c99959431c59f1031edf0b0c3a8`
**Final reviewed head:** `d1e3cd6fef90227c9e1ddaf2c7d5cdd938e548ff`
**Fix iterations:** 0

| Task    | Commit                                     | Result |
| ------- | ------------------------------------------ | ------ |
| p05-t01 | `7ca0c75bf83ad4764fb236ce0a044d35e3a9ec10` | passed |

**Root review:**
`reviews/archived/p05-review-2026-07-28T230108Z.md`

**Passing phase gate:**
`reviews/archived/p05-review-2026-07-28T230930Z.md`
(1 Minor deferred to final)

**Gate diversity:** producer family OpenAI; reviewer family Claude via
`cursor-fable-5-xhigh`.

**Outstanding items:** m1 is registered under Deferred Findings for final
disposition.

### Run 6 — Phase p06

**Date:** 2026-07-28
**Outcome:** passed
**Phase base:** `1c7623a0e1b47b093fece58320d99426567c4ec3`
**Implementation head:** `f95864d2ee8cbbf94eec311abeeb83547851ff37`
**Final fix head:** `87455b33c5b338ac717d10ebe5862924c538aeef`
**Fix iterations:** 1

| Task    | Commit                                     | Result |
| ------- | ------------------------------------------ | ------ |
| p06-t01 | `ef56fdb6a8a7bdab6a49ff15e9ff4785159256ac` | passed |
| p06-t02 | no-op                                      | passed |
| p06-t03 | `f95864d2ee8cbbf94eec311abeeb83547851ff37` | passed |

**Root review:**
`reviews/archived/p06-review-2026-07-28T232956Z.md`
(blocked: 1 Important)

**Passing re-review:**
`reviews/archived/p06-review-2026-07-28T233714Z.md`

**Outstanding items:** none for p06; project-level deferred findings remain for
the final checkpoint.

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
- [x] p04-t01: Align both remote provide skills — `8df5b27cf`
- [x] p04 marker-lineage/discovery fix — `942458eb2`
- [x] p04 diagnostic initialization fix — `6fed0cf0b`
- [x] p05-t01: Default the preference to narrow — `7ca0c75bf`
- [x] p05 autonomy inventory correction — `e9b6ffe0a`
- [x] p05 lifecycle review and independent phase gate passed
- [x] p06-t01: Update documentation — `ef56fdb6a`
- [x] p06-t02: Verify cross-surface semantic parity — no-op
- [x] p06-t03: Sync provider views and bump public packages — `f95864d2e`
- [x] p06 bundled public-package version fix — `87455b33c`
- [x] final automatic review — no new defects; deferred ledger revalidated
- [x] final HiLL deferred-finding disposition — all four selected for fix-now
- [x] p07-t01: Preserve provenance in implementation-ledger writes — `29d119c62`
- [x] p07-t02: Parse review provenance by header name — `bf13da378`
- [x] p07-t03: Preserve clean remote-receive ledger migrations — `beb17c01e`
- [x] p07-t04: Correct workflow catalog precedence wording — `25ca7a2d5`
- [x] p07-t05: Resync and revalidate final release assets — no-op
- [x] combined narrowed final fix verification review — passed, 0 findings

**Decisions:**

- HiLL checkpoint: final phase only (`p06`).
- Auto-review at the final HiLL checkpoint: enabled.
- Dispatch policy: managed `high` from project state.
- Phase 1 required one bounded review-fix round and then passed re-review.
- Phase 2 required one bounded Important-finding fix round; its independent gate
  passed with three Medium findings deferred for mandatory final disposition.
- Phase 3 required one bounded Medium-finding fix round and then passed narrowed
  re-review.
- Phase 4 required two bounded Important-finding fix rounds and then passed
  final narrowed re-review.
- Phase 5 passed standard review and its independent gate; its catalog wording
  Minor was converted to `p07-t04`.
- Phase 6 required one bounded release-consistency fix and then passed narrowed
  re-review with the full release gate set clean.
- The final automatic review found no new defects and revalidated all four
  deferred findings. The user selected fix-now for each one; they became Phase
  7 tasks. The Minor does not require a separate re-review.
- One combined narrowed final review verified all four repairs as resolved with
  zero findings. The `p06` final HiLL checkpoint is complete.

---

## Phase 8: Completion handoff compatibility repair

**Status:** completed

### Task p08-t01: Parse widened review ledgers in `oat review latest`

**Status:** completed

**Outcome:** The completion handoff audit found that this project widened the
Reviews ledger to eight columns while `oat review latest` still discarded every
row whose cell count was not exactly five. This caused active passed artifacts
to retain default actionability instead of honoring artifact-correlated ledger
status. The parser now resolves `Scope`, `Type`, `Status`, and `Artifact` by
header name, preserving the legacy five-column shape and accepting the widened
provenance ledger.

**Verification:** A new canonical eight-column regression fixture failed before
the parser change and passed afterward. All 12 focused `review latest` tests,
CLI lint, and CLI type-check pass.

---

## Final Review Findings Resolved

All four fix-now dispositions were implemented in Phase 7 and independently
verified by the passing narrowed final review.

| ID     | Severity | Source                                              | Finding                                                                                   | User decision | Repair task |
| ------ | -------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------- | ----------- |
| p02-M1 | Medium   | `reviews/archived/p02-review-2026-07-28T214026Z.md` | Add provenance migration/preservation rules to the `oat-project-implement` ledger writer. | fix now       | `p07-t01`   |
| p02-M2 | Medium   | `reviews/archived/p02-review-2026-07-28T214026Z.md` | Parse known provenance columns by header name rather than fixed position.                 | fix now       | `p07-t02`   |
| p02-M3 | Medium   | `reviews/archived/p02-review-2026-07-28T214026Z.md` | Apply the ledger widening/preservation contract to the clean remote-receive path.         | fix now       | `p07-t03`   |
| p05-m1 | Minor    | `reviews/archived/p05-review-2026-07-28T230930Z.md` | Correct nonexistent environment precedence wording across workflow catalog entries.       | fix now       | `p07-t04`   |

## Deviations from Plan / Design

| Task / Review                   | Source Artifact                                               | Planned / Documented                                | Actual / Accepted                                                    | Reason                                                                                          | Source of Truth                             | Follow-up              |
| ------------------------------- | ------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------- |
| p03 boundary cleanup correction | `packages/cli/src/validation/autonomy-gate-inventory.test.ts` | Net Phase 3 diff limited to the declared skill file | Generated autonomy inventory also removes five stale prompt mappings | Full CLI verification proved the generated evidence is a required consequence of prompt removal | Canonical skill plus passing inventory test | Restored in `e9b6ffe0` |

## Test Results

| Phase | Tests Run                                                              | Passed | Failed | Coverage                                                               |
| ----- | ---------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------------------------------- |
| p01   | Focused + full CLI suite, lint, type-check, format, review             | 3,395  | 0      | Lineage, preference, guard, classification, integration                |
| p02   | Focused + full package suites, lint, type-check, format, reviews, gate | 3,480  | 0      | Provenance artifacts, ledger compatibility, durable-lineage fail-open  |
| p03   | Focused semantic + skill-contract tests, format, diff, reviews         | 63     | 0      | Local precedence, lineage, guards, classification, Tier 3              |
| p04   | Focused parser/builder/narrowing/integration/contract suites + checks  | 241    | 0      | Remote provenance, gates, discovery fallback, diagnostics              |
| p05   | Focused config/inventory + full CLI suite, lint, type-check, reviews   | 3,429  | 0      | Defaults, source attribution, metadata, generated prompt inventory     |
| p06   | Docs build + workspace build/test/lint/type-check/format/release       | 3,675  | 0      | Docs, parity, provider sync, lockstep versions, bundled release assets |
| p07   | Focused contracts/parsing/config + full workspace release gate         | 3,556  | 0      | Ledger migration, header parsing, precedence metadata, provider sync   |
| p08   | Focused review-latest suite + CLI lint/type-check                      | 12     | 0      | Legacy and widened ledger actionability correlation                    |

## Final Summary (for PR/docs)

**What shipped:**

- Re-reviews narrow from lineage-qualified prior reviewed heads by default,
  guarded by durable provenance, full-SHA validation, existence, and ancestry.
- Local lifecycle, configured gate, project remote, and ad-hoc remote rails keep
  independent provenance and fail open safely.
- Review-latest actionability correlation accepts both legacy and widened
  Reviews ledger schemas.
- Public packages and bundled provider assets are released in lockstep at
  0.2.25.

**Behavioral changes (user-facing):**

- Unset and true enable narrowing; false is the explicit opt-out.
- The narrowing prompt is removed. Explicit base/SHA ranges override automatic
  narrowing; nominal scope tokens remain eligible.
- Resolution output reports the selected range, reason, and reporting-only
  classification.

**Key files / modules:**

- `packages/cli/src/review-remote/`
- `.agents/skills/oat-project-review-provide*/`
- `.agents/skills/oat-review-provide-remote/`
- `packages/cli/src/commands/review/latest.ts`
- `packages/control-plane/src/state/reviews.ts`

**Verification performed:**

- Plan artifact review, six original phase reviews, two configured cross-family
  gates, Phase 7 focused verification, full workspace validation, and
  publishable-package release validation passed. The Phase 8 compatibility
  regression test and focused CLI checks also pass. The combined narrowed final
  fix review resolved all four carried findings and passed with zero findings.

**Design deltas (if any):**

- Generated autonomy prompt inventory maintenance was required by Phase 3 even
  though the initial task boundary listed only the canonical skill.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
