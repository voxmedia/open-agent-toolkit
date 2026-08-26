---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-26
oat_generated: true
oat_summary_last_task: p01-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-2-execution

## Overview

Wave 2 ("Sync provenance warning") of the 2026-08-19 defect program executed a
single S-sized defect as a thin wrapper OAT project: `oat sync` silently
restamped a stale manifest `oatVersion` during apply, hiding producer/invoker
CLI version skew — the first suspect in earlier stale-tooling incidents. The
lane's contract was its immutable external plan
`2026-08-19-warn-sync-version-skew.md`.

## What Was Implemented

- **Version-skew advisory in `oat sync`** (`packages/cli/src/commands/sync/*`,
  commits `b257e908` + fix `023c2229`): each scope plan carries a
  `versionSkew` diagnostic (`scope`, `producingVersion`, `invokingVersion`)
  derived when the loaded manifest's `oatVersion` differs from `OAT_VERSION`; one
  human warning per skewed scope is logged before the dry-run/apply branch (so
  before any manifest restamp), suppressed in JSON mode where both envelopes
  (apply and dry-run, including no-op) expose the structured array (`[]` when
  none). Exit codes, planned-operation counts, apply eligibility, manifest
  schema, and absent/invalid-manifest semantics are unchanged.
- **Restamp coupled to the diagnostic:** apply's `shouldRefreshManifestVersion`
  now derives from the same diagnostic, so the advisory and the restamp cannot
  drift apart (a reviewer-named desync mutation is caught only by the new
  coupling test).
- **Tests:** ordering-before-`executeSyncPlan`, JSON-only, equal/older/newer,
  absent, invalid `oatVersion`, multi-scope attribution, coupling; +14 cases (41 → 55 in the two focused suites).
- **Lockstep bump 0.2.33 → 0.2.34** across the five public packages plus the
  regenerated `packages/cli/assets/public-package-versions.json`.

Reviews: plan artifact gate passed on round 3 (rounds 1–2 blocked on wrapper-
contract items, fixed); p01 `passed` after two rounds (mutation battery: reorder,
delete, JSON-field delete, desync all red); final review round 1: 0C/0I with
bookkeeping findings resolved in-artifact; full definition of done green at
`4c04963c`.

## Key Decisions

1. **Derive the apply restamp from the skew diagnostic rather than keep a
   duplicated predicate:** the review's preferred option; removing two
   unreachable empty-string guards made the coupling bit-exact with the previous
   restamp condition while preserving the existing manifest validation error.
2. **Pre-plan the lockstep bump as part of the lane:** W1's lesson (any
   `packages/cli/src/**` change is publishable) was applied at planning time;
   the drift refresh intersected the write surface with the release roots and
   the plan gate extended the in-worktree recheck to the release surfaces the
   plan writes, with a fetch-first `release:check-versions`.

## Design Deltas

- The source plan's step-1 wording ("only when the two non-empty strings
  differ") is superseded by exact inequality (p01-r2-m2); recorded in
  `implementation.md`, plan immutable.
- Closeout ordering: backlog archival landed one step before this summary's
  roll-up (see `implementation.md` Deviations); W3–W4 generate the summary
  before archiving.

## Notable Challenges

- The configured plan gate blocked twice on wrapper-contract precision
  (parallel-execution flag; a restated source-plan step; release-surface drift
  coverage; checklist order) before passing clean — all artifact-level.
- `worktree:init` after scaffolding reset `activeProject`; the manifest restamp
  it produced (workspace CLI 0.2.33 vs global 0.2.32) is exactly the skew this
  wave now surfaces.

## Integration Notes

- JSON consumers of `oat sync --json` get an additive `versionSkew` array in
  both apply and dry-run envelopes; human mode gains one stderr warning per
  skewed scope. Skew remains advisory.
- Sibling commands (`init`, `remove skill`, `status`) still restamp
  `oatVersion` silently — tracked as a follow-up.

## Follow-up Items

- Backlog candidate: extend the advisory to the three sibling `saveManifest`
  call sites (`init/index.ts:1187`, `remove/skill/remove-skill.ts:347`,
  `status/index.ts:887`) and reconsider the "No changes required." message on a
  restamp-only apply (`apply.ts:187`, the `summary.plannedOperations === 0` guard).
- Deferred minor p01-r2-m1: make `ScopeSyncPlan.versionSkew` non-optional on the
  next `sync.types.ts` touch.
- Docs: `apps/oat-docs/docs/provider-sync/commands.md` — advisory + JSON field
  (document step).

## Associated Issues

- `BL-260718-warn-when-oat-sync-uses` — closed (archived `a4a7804d`).

## Workflow Observations

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/wave-2-execution/reviews/artifact-plan-review-2026-08-26T192011Z.md

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/wave-2-execution/reviews/artifact-plan-review-2026-08-26T193112Z.md

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-2-execution/reviews/artifact-plan-review-2026-08-26T194327Z.md

### 2026-08-26 · general · feedback · closeout ordering

Observation: wave-2 archived its backlog item before summary.md existed, contradicting the wrapper plan's strictly ordered Implementation Complete checklist (synthesis + summary roll-up before archival). Impact: a final-review Medium and a recorded deviation; no data loss. Recommendation: generate summary.md immediately after the orchestration-log synthesis and before oat backlog archive; add this to the wave skill's closeout sequence wording.
