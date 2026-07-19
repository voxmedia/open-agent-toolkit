---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-19
oat_current_task_id: p04-t08
oat_generated: false
---

# Implementation: reviewer-parallelism

**Started:** 2026-07-10
**Last Updated:** 2026-07-18

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

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | complete    | 1     | 1/1       |
| Phase 2 | complete    | 1     | 1/1       |
| Phase 3 | complete    | 3     | 3/3       |
| Phase 4 | in_progress | 8     | 7/8       |

**Total:** 12/13 tasks completed

---

## Phase 1: Canonical Reviewer Orchestration Contract

**Status:** in_progress
**Started:** 2026-07-18

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- The canonical reviewer can delegate only broad, independent reconnaissance lanes while narrow reviews stay inline.
- Reconnaissance uses the generic shared dispatch contract and economical `recon` targets without inheriting the primary reviewer model.
- Workers remain read-only and advisory; source validation, synthesis, severity, validation decisions, and final findings stay with the primary reviewer.
- Contract tests pin the reviewer version, tool allowance, dispatch boundary, evidence schema, and fallback behavior.

**Key files touched:**

- `.agents/agents/oat-reviewer.md` - adds the bounded reconnaissance contract and `Task` capability.
- `packages/cli/src/validation/skills.test.ts` - adds semantic regression coverage.
- `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` - aligns the exact canonical reviewer version assertion.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/agents/canonical/parse.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Result: pass, 124/124 tests.
- Run: scoped `oxfmt --check` and `git diff --check`
- Result: pass.

**Notes / Decisions:**

- The first configured Cursor candidate was unavailable in the native catalog before child start; dispatch re-resolved to the next configured High candidate without starting duplicate work.
- Root-owned review passed with one deferred Medium test-completeness finding for final-review disposition.

### Task p01-t01: Add bounded reconnaissance behavior with semantic regression coverage

**Status:** completed
**Commit:** 2977bb1965ac4e5947dc7db3dbee86278f406cc0

**Outcome (required when completed):**

- Broad reviews can use bounded, read-only reconnaissance while preserving primary-reviewer authority and identical inline fallback coverage.

**Files changed:**

- `.agents/agents/oat-reviewer.md` - reviewer-local orchestration contract.
- `packages/cli/src/validation/skills.test.ts` - semantic contract coverage.
- `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` - exact version coverage.

**Verification:**

- Run: focused reviewer/canonical tests, scoped formatting, and diff hygiene.
- Result: pass.

**Notes / Decisions:**

- Reviewer-local lanes intentionally load `oat-dispatch-subagents`, not the project lifecycle adapter.

**Issues Encountered:**

- Native `gpt-5.6-sol-medium` selection was rejected before start; re-resolved and launched `gpt-5.6-sol-high`.

---

## Phase 2: Review Workflow Documentation

**Status:** complete
**Started:** 2026-07-18

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Review workflow documentation now distinguishes outer primary-reviewer dispatch from optional reviewer-local reconnaissance.
- The page documents eligible broad-review benefits, bounded worker lanes, provider-neutral dispatch ownership, primary-only judgment, and inline fallback.

**Key files touched:**

- `apps/oat-docs/docs/workflows/projects/reviews.md` - documents reviewer reconnaissance behavior and boundaries.

**Verification:**

- Run: docs build, scoped formatting, diff hygiene, and repository link checking.
- Result: build, formatting, and diff checks pass; the link checker reports two independently confirmed pre-existing fragment failures outside the changed page.

**Notes / Decisions:**

- The documentation adds no links or navigation/index changes.
- Root-owned review passed with no findings.

### Task p02-t01: Document broad-review latency benefit and safety boundary

**Status:** completed
**Commit:** 86582f5ebbd02cac16af2a967132f65073322bb4

**Outcome (required when completed):**

- Users can distinguish lifecycle reviewer dispatch from optional local reconnaissance and understand its safety/capability boundaries.

**Files changed:**

- `apps/oat-docs/docs/workflows/projects/reviews.md` - focused authored documentation update.

**Verification:**

- Run: `pnpm build:docs`, scoped formatting, `git diff --check`, and `pnpm docs:check-links`.
- Result: all changed-surface checks pass; the link checker retains two unrelated baseline fragment failures.

**Notes / Decisions:**

- Provider-specific model promises remain outside the reviewer documentation.

**Issues Encountered:**

- Repository-wide link checking is not fully green due to two pre-existing fragment failures in unchanged source/target pages.

---

## Phase 3: Provider Sync and Shipped Release Validation

**Status:** complete
**Started:** 2026-07-18

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- The canonical reviewer contract is synchronized across all 14 tracked Codex roles while Claude and Cursor symlink views remain canonical.
- All five public packages are lockstep at unpublished version `0.2.1`, with bundled/version metadata aligned and release tarballs validated.
- The completed reviewer-orchestration backlog item is archived and PJM surfaces describe the capability as shipped.

**Key files touched:**

- Five public package manifests and `packages/cli/assets/public-package-versions.json` - lockstep release metadata.
- `.codex/agents/oat-reviewer*.toml` and `.oat/sync/manifest.json` - synchronized provider outputs.
- `.oat/repo/pjm/` backlog and current-state surfaces - completed capability history.

**Verification:**

- Run: focused contracts, full lint/type/test/build/docs suite, provider dry-run, npm uniqueness checks, PJM integrity checks, and `pnpm release:validate`.
- Result: pass; Phase 3 focused re-review found no remaining findings.

**Notes / Decisions:**

- Initial `0.1.74` selection reused a published version; one bounded review-fix iteration corrected the release to upstream-derived unused version `0.2.1`.

### Task p03-t01: Regenerate provider views and finalize lockstep release metadata

**Status:** completed
**Commit:** 8a8d0b2f5dd34744f92580a0f8fae480d463b72f

**Outcome (required when completed):**

- Provider views and release surfaces were regenerated, but phase review found the selected `0.1.74` version was already published.

**Files changed:**

- Five public package manifests, bundled public versions, sync manifest, and all 14 tracked Codex reviewer roles.

**Verification:**

- Run: full repository, provider sync, and release validation suite.
- Result: local checks pass; registry uniqueness fails for `0.1.74`.

**Issues Encountered:**

- The branch-local baseline was stale relative to npm and `origin/main`; correction is tracked as `p03-t03`.

---

### Task p03-t02: Close the shipped backlog item

**Status:** completed
**Commit:** 9772f01b48272078f2bd75fcd5e2154f78236f17

**Outcome (required when completed):**

- The shipped backlog item is archived and removed from active PJM surfaces.

**Files changed:**

- Backlog archive, completed ledger, active index, roadmap, and current state.

**Verification:**

- Run: archival postconditions, formatting, diff hygiene, and PJM doctor.
- Result: postconditions pass; doctor retains only unrelated pre-existing diagnostics.

---

### Task p03-t03: Correct the release to the next unpublished lockstep version

**Status:** completed
**Commit:** cde08669c3ddc51fdf80166ad99a3a4ed3984a9f

**Outcome (required when completed):**

- Release surfaces now use unpublished lockstep version `0.2.1`, derived from upstream `0.2.0` and verified absent for every public package immediately before commit.

**Files changed:**

- Five public package manifests, bundled public versions, sync manifest, and PJM current-state release attribution.

**Verification:**

- Run: complete lint, type, test, build, docs, sync, registry-uniqueness, formatting, and release-validation suite.
- Result: pass; all five `0.2.1` tarballs validate and provider dry-run reports no drift.

**Notes / Decisions:**

- Upstream history was not merged or rewritten; the bounded correction integrated the authoritative release baseline through the next unused patch.

---

## Phase 4: Task-Class-Aware Reviewer Orchestration Revision

**Status:** complete
**Started:** 2026-07-18

### Phase Summary

**Outcome (what changed):**

- Reviewer-local orchestration now separates read-only worker authority from
  task/model-class floors, uses floor-safe fallback, and records compact
  orchestration evidence for root-owned project-log handoff.
- Cursor delegates suitable mechanical work to an advertised nested target and
  retains stronger unavailable lanes in the primary reviewer without reducing
  coverage.
- Provider views, documentation, semantic contracts, and lockstep `0.2.2`
  release surfaces are synchronized against merged upstream.

**Key files touched:**

- `.agents/agents/oat-reviewer.md`
- `.agents/skills/oat-dispatch-subagents/**`
- `.agents/skills/oat-project-implement/**`
- `.agents/skills/oat-project-review-provide/SKILL.md`
- `apps/oat-docs/docs/workflows/projects/reviews.md`
- Cursor and Codex materialized reviewer roles

**Verification:**

- Focused contracts: 162/162 during release synchronization and 138/138 after
  final Cursor mirror cleanup.
- Full workspace plus smoke tests: 3409/3409.
- Lint, type-check, build, docs, formatting, package-version checks, release
  tarballs, provider status, and sync dry-run all pass.

**Notes / Decisions:**

- Class-aware dogfood passed with Composer 2.5 Fast handling mechanical work
  and the primary reviewer completing the unavailable intelligent lane inline.
- Full pinned reviewer variants are not recursively reused as recon workers;
  `BL-260719-add-pinned-recon-agents` tracks a reusable dedicated contract.

### Task p04-t01: Separate reviewer lane authority from model-class floors

**Status:** completed
**Commit:** 7b90e8028fbbc76a758ead832a75cef3c1197ffe

**Outcome (required when completed):**

- Reviewer-local lanes now separate read-only `recon` authority from
  artifact-informed model-class floors and fail closed instead of silently
  downgrading.

---

### Task p04-t02: Document model-class-aware review lanes

**Status:** completed
**Commit:** b741820bddfd23417425def760532a45bfb73ad5

**Outcome (required when completed):**

- Review documentation explains class-aware orchestration without promising
  provider-specific model names.

---

### Task p04-t03: Regenerate provider views and finalize the revised release

**Status:** completed
**Commit:** 56eeecc43fb0930ac97427cc4656fffc8f1b377e

**Outcome (required when completed):**

- Provider views and lockstep public-package surfaces were synchronized at the
  unpublished `0.2.2` version and passed release validation.

---

### Task p04-t04: Correct recon baselines and nested model-choice terminology

**Status:** completed
**Commit:** ede972ce71461fc3d36366c044763b253a58c241

**Outcome (required when completed):**

- Generic recon now honors declared model-class floors, limits economical
  selection to unconstrained/mechanical work, and uses plain-language
  advertised-model-choice terminology.

---

### Task p04-t05: Add root-owned review orchestration logging

**Status:** completed
**Commit:** e9f49294dd294e08ffbfda5c522d1d89b862c682

**Outcome (required when completed):**

- Reviewers report compact orchestration evidence in the review artifact while
  root project workflows own the single structural project-log append.

---

### Task p04-t06: Regenerate fix views and revalidate the release

**Status:** completed
**Commit:** 67db4f8c45b460384ed0763a55caaf26f5f49b60

**Outcome (required when completed):**

- All 14 Codex and 12 Cursor reviewer variants were regenerated against the
  merged baseline; full workspace, docs, sync, and `0.2.2` release validation
  pass.

---

### Task p04-t07: Remove obsolete Cursor wave-skill mirrors

**Status:** completed
**Commit:** 839de7d56f74c9551e522ab29244caa75b4c0862

**Outcome (required when completed):**

- Removed only the two obsolete Cursor wave-skill mirrors; provider status now
  reports 82 in sync with zero strays while canonical and Claude surfaces
  remain intact.

---

### Task p04-t08: (review) Add an explicit reconnaissance-attempt signal

**Status:** pending
**Commit:** pending

**Outcome (required when completed):**

- Pending implementation of remote-review finding `M1`.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1

**Timestamp:** 2026-07-18T22:49:03Z
**Branch:** `reviewer-parallelism`
**Tier:** 1 — subagents
**Dispatch policy:** High (Cursor managed capped)
**Schedule:** sequential

| Phase | Outcome | Task commits | Root review | Fix iterations |
| ----- | ------- | ------------ | ----------- | -------------- |
| p01   | passed  | `2977bb19`   | passed      | 0              |

**Dispatch notes:**

- Implementation selected `gpt-5.6-sol-high` after the lower configured candidate received a pre-start native catalog rejection.
- `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Optional nested dispatches: none.

**Outstanding items:**

- Medium `p01-M1` is deferred to final review: add targeted semantic assertions for no hard-coded models, one-time capability checking, and worker prohibition on writing either final output sink.

### Run 2

**Timestamp:** 2026-07-18T23:02:18Z
**Branch:** `reviewer-parallelism`
**Tier:** 1 — subagents
**Dispatch policy:** High (Cursor managed capped)
**Schedule:** sequential

| Phase | Outcome | Task commits | Root review | Fix iterations |
| ----- | ------- | ------------ | ----------- | -------------- |
| p02   | passed  | `86582f5e`   | passed      | 0              |

**Dispatch notes:**

- `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- `Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Optional nested dispatches: none.

**Outstanding items:**

- Repository link checking retains two unrelated, pre-existing fragment failures; Phase p02 introduced no link regression.

### Run 3

**Timestamp:** 2026-07-18T23:31:41Z
**Branch:** `reviewer-parallelism`
**Tier:** 1 — subagents
**Dispatch policy:** High (Cursor managed capped)
**Schedule:** sequential

| Phase | Outcome | Task commits                       | Root review | Fix iterations |
| ----- | ------- | ---------------------------------- | ----------- | -------------- |
| p03   | passed  | `8a8d0b2f`, `9772f01b`, `cde08669` | passed      | 1              |

**Dispatch notes:**

- `Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- `Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- `Dispatch: scope=p03-fix1 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- `Dispatch: scope=p03-fix1 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- The initial broad p03 review used two bounded reviewer-local reconnaissance lanes; primary review independently validated their claims.

**Outstanding items:**

- None for Phase 3.

### Run 4

**Timestamp:** 2026-07-19T00:58:27Z
**Branch:** `reviewer-parallelism`
**Tier:** 1 — subagents
**Dispatch policy:** High (Cursor managed capped)
**Schedule:** sequential

| Phase | Outcome | Task commits                                                                       | Root review | Fix iterations |
| ----- | ------- | ---------------------------------------------------------------------------------- | ----------- | -------------- |
| p04   | passed  | `7b90e802`, `b741820b`, `56eeecc4`, `ede972ce`, `e9f49294`, `67db4f8c`, `839de7d5` | passed      | 2              |

**Dispatch notes:**

- The primary reviewer classified separate mechanical and intelligent lanes.
- The mechanical lane ran on an explicit Composer 2.5 Fast target.
- The nested Cursor catalog exposed no demonstrably intelligent-floor target,
  so the primary reviewer completed that lane inline without downgrading.
- This is the accepted Cursor behavior. Full pinned `oat-reviewer` variants
  added by merged upstream are not recursively reused as recon workers;
  dedicated pinned recon roles are deferred unless observed value justifies
  their maintenance cost.
- Detailed orchestration evidence is in
  `reviews/archived/p04-review-2026-07-19T005827Z.md`.

**Outstanding items:**

- None for Phase 4.

<!-- orchestration-runs-end -->

---

## Remote Review Received

### 2026-07-19 — PR #163

- **Artifact:** `reviews/archived/remote-pr-163-review-2026-07-19T132506Z.md`
- **Severity counts:** 0 critical, 0 important, 1 medium, 0 minor
- **Converted:** `M1` → `p04-t08`
- **Deferred:** None
- **Dismissed:** None
- **Informational:** The Bugbot PR-summary issue comment was not treated as a
  finding.

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-10

**Session Start:** quick-start initialization

- [x] p01-t01: Add bounded reconnaissance behavior with semantic regression coverage - `2977bb19`
- [x] p02-t01: Document broad-review latency benefit and safety boundary - `86582f5e`
- [x] p03-t01: Regenerate provider views and finalize lockstep release metadata - `8a8d0b2f`
- [x] p03-t02: Close the shipped backlog item - `9772f01b`
- [x] p03-t03: Correct the release to the next unpublished lockstep version - `cde08669`
- [x] p04-t01: Separate reviewer lane authority from model-class floors - `7b90e802`
- [x] p04-t02: Document model-class-aware review lanes - `b741820b`
- [x] p04-t03: Regenerate provider views and finalize the revised release - `56eeecc4`
- [x] p04-t04: Correct recon baselines and nested model-choice terminology - `ede972ce`
- [x] p04-t05: Add root-owned review orchestration logging - `e9f49294`
- [x] p04-t06: Regenerate fix views and revalidate the release - `67db4f8c`
- [x] p04-t07: Remove obsolete Cursor wave-skill mirrors - `839de7d5`

**What changed (high level):**

- Quick-mode discovery and the reviewed execution plan were completed.
- All twelve tasks were completed across four sequential phases. Class-aware
  dogfood acceptance passed, the merge-reconciliation cleanup is complete, and
  Phase 4 passed with zero residual findings.

**Decisions:**

- Keep execution sequential because documentation depends on the finalized contract and provider/release output depends on both canonical and docs changes.
- Keep primary-reviewer judgment in the root reviewer; delegate only bounded, advisory reconnaissance.
- Preserve Cursor parent-inline coverage for stronger lanes unavailable through
  the nested model catalog; do not recursively dispatch full pinned reviewers
  as reconnaissance workers.
- Merge `origin/main` before review fixes so Cursor native skill reads and
  pinned lifecycle reviewer materialization remain the current distribution
  baseline.

**Follow-ups / TODO:**

- Optional: generate the project summary, run documentation synchronization,
  and open the final PR when requested.

**Blockers:**

- None.

**Session End:** 2026-07-18

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review        | Source Artifact | Planned / Documented                                   | Actual / Accepted                                                                    | Reason                                                                                  | Source of Truth               | Follow-up                                                            |
| -------------------- | --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| p04-t03 / p04 review | `plan.md`       | Release task limited to generated and release surfaces | Commit also corrected canonical Claude, Codex, and Cursor provider-reference wording | Release validation exposed an autonomy-prompt regression after canonical implementation | Committed provider references | Keep history; include future canonical corrections in contract tasks |

## Deferred Findings (Medium)

- **p01-M1 — Semantic regression coverage does not pin every declared safety boundary**
  - Source: `reviews/archived/p01-review-2026-07-18T224716Z.md`
  - Final disposition: resolved in `p04-t01`.
  - Rationale: targeted assertions now pin the no-hard-coded-model policy,
    one-time capability check, and prohibition on worker writes to either final
    output sink.

- **Final-M2 — Implementation completion status was internally inconsistent**
  - Source: `reviews/archived/final-review-2026-07-18T234708Z.md`
  - Final disposition: resolved during original completion bookkeeping,
    temporarily regressed when Phase 4 reopened implementation, and restored
    to `complete` during superseding final-review receipt.

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage                             |
| ----- | --------- | ------ | ------ | ------------------------------------ |
| 1     | 124       | 124    | 0      | Focused reviewer/canonical contracts |
| 2     | 5         | 4      | 1\*    | \*Unrelated baseline link-check gate |
| 3     | 153       | 153    | 0      | Focused contracts plus full release  |
| 4     | 3409      | 3409   | 0      | Workspace, smoke, and full release   |

## Final Summary (for PR/docs)

**What shipped:**

- Provider-neutral, bounded, task-class-aware reviewer reconnaissance for
  eligible broad reviews.
- Root-owned orchestration logging, synchronized Cursor/Codex reviewer roles,
  user-facing workflow documentation, and lockstep public package release
  metadata at `0.2.2`.

**Behavioral changes (user-facing):**

- Broad reviews may parallelize disjoint read-only evidence gathering with
  model capability matched to each lane's complexity.
- Mechanical work uses fast economical targets when advertised. Stronger lanes
  use a floor-satisfying target or stay with the primary reviewer; they never
  silently downgrade.
- Primary reviewers retain source validation, synthesis, severity, validation,
  final-output ownership, and root-owned project-log handoff.

**Key files / modules:**

- `.agents/agents/oat-reviewer.md` - canonical reviewer orchestration contract.
- `.agents/skills/oat-dispatch-subagents/` - provider-neutral task-class and
  dispatch evidence contract.
- `.agents/skills/oat-project-implement/` and
  `.agents/skills/oat-project-review-provide/` - root-owned orchestration-log
  handoff.
- `packages/cli/src/validation/skills.test.ts` - semantic contract coverage.
- `apps/oat-docs/docs/workflows/projects/reviews.md` - workflow documentation.
- `.cursor/agents/oat-reviewer*.md` and `.codex/agents/oat-reviewer*.toml` -
  synchronized materialized reviewer variants.

**Verification performed:**

- Focused reviewer/provider tests, complete workspace lint/type/test/build/docs checks, provider drift checks, npm version uniqueness checks, PJM integrity checks, and public-package release validation.

**Design deltas (if any):**

- Dogfood findings added the supplemental `design.md` and Phase 4 to separate
  authority from model-class floors.
- A published-version collision added `p03-t03`; merged upstream then
  established `0.2.1` as the baseline and this project retained verified-unused
  `0.2.2`.
- The accepted `p04-t03` commit-scope deviation remains recorded above; no
  history was rewritten.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
