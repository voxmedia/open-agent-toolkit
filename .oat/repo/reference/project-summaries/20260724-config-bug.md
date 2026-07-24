---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-24
oat_generated: true
oat_summary_last_task: p03-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: config-bug

## Overview

This project corrected two repository-safety defects in OAT's tool lifecycle. User-scoped tool packs were being represented as project installations in shared config, and provider sync could mutate canonical or external content through a symlinked provider parent. It also corrected stale delta-mode references in the bundled instructions-analysis skill.

## What Was Implemented

- Centralized install, update, and remove reconciliation so `.oat/config.json#tools` is derived only from project-scoped canonical assets. The reconciler preserves unrelated config, clears stale flags deterministically, omits an empty `tools` map, and avoids creating default-only shared config.
- Added `oat tools has <pack>` as a machine-readable effective capability query across project and user scopes. Valid negative queries remain successful, while invalid input and runtime failures have distinct exit behavior.
- Migrated pack-gated canonical workflows to the runtime capability query so user-installed packs remain usable without becoming repository-owned state.
- Added a generic provider mutation guard that rejects lexical escapes, symlinked ancestors, and non-directory ancestors during planning, whole-plan preflight, and immediately before each mutating entry.
- Updated the approved six-page documentation surface, corrected the instructions-analysis delta-mode step references, bumped the changed canonical skills, and released all five public packages at `0.2.15`.
- Added focused and integrated regression coverage. Final verification passed 3,343 CLI tests, lint, type-check, skill validation, repository formatting, workspace and docs builds, and release validation.

## Key Decisions

- **Project state and runtime availability separation.** Shared `tools.*` records project-owned installation state only, while `oat tools has` computes current project-plus-user availability. This keeps tracked config truthful without hiding user-scoped capabilities from workflows.
- **Canonical project asset reconciliation.** Install, update, and remove share one deterministic reconciler instead of persisting command intent or a project-plus-user union. This makes filesystem state authoritative and clears stale flags consistently across entry points.
- **Provider path safety boundary.** Planning diagnostics are supplemented by whole-plan preflight and per-entry apply-time validation using `lstat`. Central enforcement protects every provider strategy and closes both partial-application and plan/apply race windows.

## Design Deltas

- Review expanded p01 to cover direct brainstorm persistence and require parent-command regressions to execute the real child action; stubbed child handlers could not detect restored child-level config writes.
- HiLL readiness added the lifecycle guide to the approved documentation boundary after finding another stale shared-config capability claim.
- p03 validation added a pinned bundle-contract test and generated public-version asset to the task boundary. Fumadocs source-index generation replaced the planned MkDocs-only navigation command.

## Notable Challenges

- Two p01 review rounds exposed a legacy child write and then a regression test that bypassed the real action. Both were resolved within the task boundary before a clean third review.
- Repository formatting and the full CLI suite initially overlapped while bundled assets were being regenerated, causing a transient scaffold-test failure. Serializing asset-generating checks produced a clean integrated run.
- Release validation surfaced undeclared generated and contract files during p03. The phase stopped before commit, corrected its boundary, reran the complete gate set, and passed review.

## Tradeoffs Made

- The implementation adds a dedicated capability API and consumer migration rather than using shared config as a combined availability cache. The extra surface preserves clear ownership and avoids stale machine-specific repository state.
- Shared `tools` remains deterministic when non-empty by writing every known pack boolean, but the entire map is omitted when no project packs remain. This balances stale-flag cleanup with minimal empty-repository pollution.
- Apply-time provider checks add repeated filesystem validation, but fail-closed behavior was prioritized because ancestry can change after planning and mutations may be destructive.

## Integration Notes

- `oat config get tools.<pack>` now means project-installed state; use `oat tools has <pack>` when effective project-plus-user availability is required.
- Verification jobs that rewrite bundled assets must not overlap tests that read those assets.

## Workflow Observations

### 2026-07-24 · structural · oat-project-implement · p02

Accepted phase implementer dispatch 5c793b40-a342-4e43-96fb-a8adad3e213d for config-bug-p02 at eea4313d.

### 2026-07-24 · structural · oat-project-implement · p01

Accepted phase implementer dispatch 4b0cca9a-0090-470f-99f6-bc295de05820 for config-bug-p01 at eea4313d.

### 2026-07-24 · structural · oat-project-implement · p02-review

Accepted root-owned reviewer dispatch b301a857-5c16-4d68-90dc-48105c27761f for eea4313d..cc7e2f39.

### 2026-07-24 · structural · oat-project-implement · p02-outcome

Phase p02 verdict passed; fix-loop count 0; review artifact reviews/2026-07-24-p02-code-review.md.

### 2026-07-24 · structural · oat-project-implement · p01-fix1

Resumed original p01 implementer for bounded verification repair; original request config-bug-p01-20260724T1152Z.

### 2026-07-24 · structural · oat-project-implement · p01-review

Accepted root-owned reviewer dispatch bb6fa687-3a3f-4340-a551-08d0b947bfef for eea4313d..22ae71c5 after one bounded verification repair.

### 2026-07-24 · structural · oat-project-implement · p01-review1

Review found one Important direct-brainstorm config-persistence defect; bounded fix loop 1 added from reviews/2026-07-24-p01-code-review.md.

### 2026-07-24 · structural · oat-project-implement · p01-review1-fix

Resumed original p01 implementer for the single Important direct-brainstorm persistence finding; review fix loop 1.

### 2026-07-24 · structural · oat-project-implement · p01-review1-fix-outcome

Review fix loop 1 completed in fc1a974c; focused and full verification passed; re-review required.

### 2026-07-24 · general · friction · Concurrent asset generation during verification

Running repository formatting concurrently with the full CLI suite caused a transient scaffold-test failure while the asset bundler rewrote assets/templates/state.md. Isolating the full-suite rerun after asset generation completed produced a clean pass; verification lanes that mutate bundled assets should not overlap readers. (observed on OAT 0.2.14)

### 2026-07-24 · structural · oat-project-implement · p01-review2

Accepted fresh p01 re-review dispatch 37f28848-1a4e-49f7-a101-80f07b3b046b for eea4313d..fc1a974c after fix loop 1.

### 2026-07-24 · structural · oat-project-implement · p01-review2-outcome

Fresh p01 re-review found one Important regression-coverage gap: parent command tests stub the brainstorm child handler and would not detect restored child-level config persistence. Review fix loop 2 required.

### 2026-07-24 · structural · oat-project-implement · p01-review2-fix-plan

Planned bounded p01 review fix loop 2 within existing p01-t01 files: execute real brainstorm action in parent/wrapper regressions via a side-effect-safe seam and prove restored child persistence fails tests.

### 2026-07-24 · structural · oat-project-implement · p01-review2-fix-dispatch

Resumed original p01 implementer 4b0cca9a-0090-470f-99f6-bc295de05820 for bounded review fix loop 2: real-action brainstorm command regression coverage.

### 2026-07-24 · structural · oat-project-implement · p01-review2-fix-outcome

Review fix loop 2 completed in 20a43135; real-action brainstorm regressions and full p01 verification passed; fresh re-review required.

### 2026-07-24 · structural · oat-project-implement · p01-review3

Accepted fresh p01 re-review round 3 dispatch 8cfb4587-500e-4483-b158-a7e35dfdfe1d for eea4313d..20a43135 after fix loop 2.

### 2026-07-24 · structural · oat-project-implement · p01-review3-outcome

Fresh p01 re-review round 3 passed with zero findings; p01 is approved for merge.

### 2026-07-24 · structural · oat-project-implement · p01-p02-group-merge

Merged reviewed p01 then p02 branches into root. Integrated CLI suite passed 3342/3342; lint, type-check, skill validation, build, and formatting passed after asset-generating checks were rerun serially.

### 2026-07-24 · structural · oat-project-implement · p03-hill-readiness-review1

Automatic p03 HiLL readiness review found one Important stale lifecycle-page claim outside the planned five-page scope; expanded p03 to six pages before approval.

### 2026-07-24 · structural · oat-project-implement · p03-hill-readiness-review2

Fresh p03 HiLL readiness re-review passed with zero findings. Corrected six-page documentation delta is ready for explicit user approval.

### 2026-07-24 · structural · oat-project-implement · p03-hill-approval

User approved p03 after the passing readiness re-review: six-page documentation delta, instructions-analysis correction, lockstep package bump, and full release validation.

### 2026-07-24 · structural · oat-project-implement · p03-worktree-baseline

Bootstrapped clean p03 worktree at dba96a60. Skill validation and docs build passed; release validation failed only on the planned lockstep 0.2.15 bump, confirming the task's release obligation.

### 2026-07-24 · structural · oat-project-implement · p03-dispatch

Accepted p03 implementer dispatch d5cbda60-de1e-4bb4-9db1-8313e280a0d1 in config-bug-p03 after approval and clean baseline validation.

### 2026-07-24 · structural · oat-project-implement · p03-boundary-correction

p03 stopped before commit after validation exposed two required undeclared files: the pinned agent-instructions bundle-contract test and generated public-package-versions asset. Corrected the boundary and replaced MkDocs-only nav sync with Fumadocs source index generation.

### 2026-07-24 · structural · oat-project-implement · p03-fix1-dispatch

Resumed original p03 implementer d5cbda60-de1e-4bb4-9db1-8313e280a0d1 with corrected validation, generated-asset, and Fumadocs index boundaries.

### 2026-07-24 · structural · oat-project-implement · p03-implementation-outcome

p03 completed in cd283fe6 within the corrected 15-file boundary. Focused tests, 3343-test CLI suite, lint, type-check, formatting, builds, docs build, skill validation, and release validation passed; review required.

### 2026-07-24 · structural · oat-project-implement · p03-review

Accepted fresh p03 review dispatch 142bd4f9-32bb-4eef-bfc6-985d2c236cc5 for dba96a60..cd283fe6.

### 2026-07-24 · structural · oat-project-implement · p03-review-outcome

p03 review passed with zero findings for dba96a60..cd283fe6; all six plan tasks and all three phase reviews are complete.

### 2026-07-24 · structural · oat-project-implement · p03-merge-final-validation

Merged reviewed p03 into root as 573b6ab5. Final integrated CLI tests, lint, type-check, skill validation, formatting, workspace build, docs build, and release validation all passed.

### 2026-07-24 · structural · oat-project-implement · final-review

Accepted mandatory final lifecycle review dispatch ecb98854-dfb6-447d-9b19-3617b87a7a5a for the full merged range eea4313d..d41d455b.

### 2026-07-24 · structural · oat-project-implement · final-review-outcome

Mandatory final review found zero implementation defects and one Important lifecycle-artifact alignment issue: stale state body/HiLL progress plus remaining implementation placeholders. Spec is N/A for quick mode; design alignment passed.

### 2026-07-24 · structural · oat-project-implement · final-review-fix1

Completed bounded final-review artifact reconciliation: state body and p03 HiLL progress now match implementation; quick-mode spec is N/A; design alignment is recorded; implementation placeholders and final summary are resolved.

### 2026-07-24 · structural · oat-project-implement · final-review2

Accepted fresh final lifecycle re-review dispatch 665ce11c-0057-4a6c-8c64-8ce46dbe2b06 after artifact reconciliation commit d6b36dbd.

### 2026-07-24 · structural · oat-project-implement · final-review2-outcome

Fresh final lifecycle re-review passed with zero findings. Design alignment passed and spec remains correctly N/A for quick mode; proceeding to configured exit-gate closeout.
