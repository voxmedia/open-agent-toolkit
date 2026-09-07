---
oat_generated: true
oat_external_plan_index: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
created: '2026-09-03T00:08:42Z'
---

# External Plan Index: Backlog review Wave 4 (program intake)

This index records selection and ordering. It is not an executable plan and is
not an `oat-project-import-plan` target.

## Selection

- Selected: nine items created or narrowed by the 2026-09-02 program-intake
  triage (issues #199, #213, #230, #232, #234, #238, #239, #250, #252) plus
  three promoted residuals the priority alignment marks improve-ready
  (`oat config unset`, quick-mode resume routing, external-plan readiness).
  Every plan was written against `49aeb5075` with a read-only verification of
  the in-flight `tool-pack-scope-provider-truthfulness` branch (`27b978528`)
  and draft PR #190 (`81a51d2d`); each plan carries a landing-event table for
  both.
- Deferred/rejected: `BL-260902-decide-test-only-freshness` (#237) and
  `BL-260902-append-only-lifecycle-history` (#209/#210/#251) are decision-
  gated; `BL-260902-file-deferred-repository` (#214) waits for the ReviewPlan
  receipt schema; `BL-260830-live-dogfood-oat-project-split` was closed
  without implementation; the remaining promoted residuals stay in the next
  batch.
- Unaudited or out of scope: implementation, plan import, PR creation, issue
  mutation (deferred to the triage record's post-merge resume), and
  backlog-body normalization beyond the two premise corrections recorded in
  the triage record.

## Recommended order

| Order | Plan                                                                                                                                                      | Source item                               | Execution | Depends on                                                                                                      | Rationale                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1     | [Recover committed review artifacts after post-selection gate failures](./2026-09-02-recover-committed-review-artifacts-after-post-selection-failures.md) | `BL-260902-recover-committed-review`      | READY     | No hard dependency; PR #190 soft                                                                                | Confirmed false-blocker defect on the gate; disjoint from W4 gate-override regions. |
| 2     | [Retry gate project-log finalization across transient Git index locks](./2026-09-02-retry-gate-project-log-finalization-across-index-locks.md)            | `BL-260902-retry-gate-project-log`        | READY     | After the post-selection recovery plan (same module); PR #190 soft                                              | Confirmed reliability defect; receipt location needs one decision record.           |
| 3     | [Keep instruction-sync pointer files out of documentation content trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md)                | `BL-260902-keep-pjm-init-provider`        | READY     | No hard dependency; sequence with the docs-index exclusion plan on `OatDocumentationConfig`                     | Retitled after recon: `oat instructions sync` is the writer.                        |
| 4     | [Add an exclusion mechanism to docs index generation](./2026-09-02-add-exclusions-to-docs-index-generation.md)                                            | `BL-260902-add-an-exclusion-mechanism`    | BLOCKED   | Hard: W1 docs-index path plan merged into the wave branch                                                       | Same command seam as the W1 lane; ordered successor.                                |
| 5     | [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md)     | `BL-260902-validate-every-shipped-skill`  | READY     | No hard dependency; truthfulness merge rewrites the test file (re-anchor)                                       | Residual of #199; test-infrastructure only.                                         |
| 6     | [Add an oat config unset command](./2026-09-02-add-oat-config-unset-command.md)                                                                           | `BL-260830-add-oat-config-unset-command`  | READY     | After the docs-index exclusion plan; PR #190 soft                                                               | High-priority promoted residual; bounded CLI surface.                               |
| 7     | [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md)            | `BL-260830-clarify-quick-mode-resume`     | READY     | No hard dependency; land before the consolidation plan                                                          | High-priority promoted residual; skills-only.                                       |
| 8     | [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md)          | `BL-260902-document-patch-and-restore`    | READY     | Coordinate the `oat-project-implement` bump with the W2 named-skill plan; PR #190 rewrites `phase-execution.md` | Guidance gap in the implement contract; placed in W2 beside the named-skill sweep.  |
| 9     | [Defer activeProject clearing on shared and local archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md)               | `BL-260902-defer-activeproject-clearing`  | READY     | PR #254 satisfied                                                                                               | Narrowed after recon: synced path fixed by #254.                                    |
| 10    | [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md)                                     | `BL-260902-make-consolidated-project`     | READY     | After the active-pointer and quick-resume plans (shared skill regions)                                          | Introduces consolidation inputs plus an advisory sweep.                             |
| 11    | [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md)                     | `BL-260902-make-autonomous-project-recap` | READY     | After the W2 named-skill plan (same closeout skills)                                                            | Blocks unattended closeout on fresh hosts.                                          |
| 12    | [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md)                         | `BL-260830-distinguish-external-plan`     | READY     | After the W3 executable-backstops plan (shared test file)                                                       | Codifies the operator rule this corpus already follows.                             |

## Dependency notes

- Plan 4 is an ordered successor to the W1 docs-index path plan and enters
  W1 group 2 with the asset-error successor; it is `BLOCKED` until that lane
  merges into the wave branch and its step 1 passes.
- Plan 8 joins W2 group 3 because it edits the same `oat-project-implement`
  references as the named-skill loading lane; coordinate one skill bump.
- Plans 1 and 2 edit disjoint regions of `gate/index.ts`; run plan 1 first.
- Plans 3 and 6 both extend `OatDocumentationConfig`/`config/index.ts` with
  plan 4; sequence 4 → 3 → 6.
- Plans 7, 9, 10, and 11 share `oat-project-quick-start` and
  `oat-project-complete`; sequence 7 and 9 before 10, and 11 before 9 (the
  recap and active-pointer plans both edit the completion skill and must
  never share a parallel group).
- Plan 11's optional config keys moved to `BL-260904-add-recap-seam-config-keys`
  (outside the program), so it shares no config seam and no longer follows
  plan 6; plan 12 follows plan 5 because they share a contract-test file, and
  plan 11 follows plan 12 because both write `validation/skills.test.ts`
  (plan 12 adds cases and a pin; plan 11 bumps two pinned skills). The version
  pins in that file are a shared write for every plan that bumps a pinned
  skill (plans 7, 8, 9, 10, 11), which is why the program sequences them.
- Plan 7 lands before the W5 terminal-status plan and plan 9 lands before it
  too: that plan now edits `oat-project-next/SKILL.md` and its pin
  (2026-09-05 review).
- Plans 11 and 12 follow the W2 named-skill and W3 executable-backstops lanes
  respectively because they share skills or contract-test files.
- Every plan lists `tool-pack-scope-provider-truthfulness` and PR #190 in a
  `## Landing-event impact` table with an explicit affected/not-affected
  verdict and the required refresh; re-read those tables at each wave
  boundary drift refresh.
- Every plan touches the five lockstep package manifests; integrate one bump
  per wave.
