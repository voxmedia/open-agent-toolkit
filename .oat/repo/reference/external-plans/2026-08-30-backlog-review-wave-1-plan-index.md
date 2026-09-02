---
oat_generated: true
oat_external_plan_index: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
created: '2026-08-30T23:40:20Z'
---

# External Plan Index: Backlog review Wave 1

This index records selection and ordering. It is not an executable plan and is
not an `oat-project-import-plan` target.

## Selection

- Selected: five backlog items with verified current-state defects, bounded
  implementation/test surfaces, and coherent outcomes. Three are independently
  execution-ready. One is an ordered successor that becomes executable after
  its predecessor completes in the same tracked wave, and one is blocked on
  the in-flight `tool-pack-scope-provider-truthfulness` merge.
- Deferred/rejected: active scope/provider, gate-execution, ReviewPlan, and
  review/gate-integrity project-owned outcomes were excluded from this wave to
  avoid competing plans. Dependency-blocked gate candidates and the maintenance
  candidates are recorded in the Wave 2 and Wave 3 indexes.
- Unaudited or out of scope: implementation, plan import, PR creation, issue
  mutation, and backlog-body normalization.

## Recommended order

| Order | Plan                                                                                                            | Source item                               | Execution | Depends on                                                                        | Rationale                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1     | [Make docs index generation honor configured repository paths](./2026-08-30-use-configured-docs-index-paths.md) | `BL-260718-fix-oat-docs-generate-index`   | READY     | No hard dependency                                                                | Independent correctness fix with a focused command seam.                                 |
| 2     | [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md)         | `BL-260819-repair-verified-bundled-skill` | READY     | No external hard dependency                                                       | Cohesive release batch previously deferred by the 2026-08-19 review.                     |
| 3     | [Reject structurally incomplete CLI asset bundles](./2026-08-30-validate-assets-bundle-structure.md)            | `BL-260827-fail-closed-on-partial-or`     | READY     | Implemented assets-root predecessor                                               | Establishes the validation branch required by plan 4.                                    |
| 4     | [Make asset-bundle errors aware of explicit overrides](./2026-08-30-make-assets-errors-override-aware.md)       | `BL-260827-override-aware-remedy-text`    | BLOCKED   | Plan 3 merged or completed earlier in one ordered tracked project                 | Must cover the structural failure branch and all pre-existing failure families together. |
| 5     | [Surface every non-sync manifest version restamp](./2026-08-30-warn-on-non-sync-manifest-restamps.md)           | `BL-260826-warn-on-silent-oatversion`     | BLOCKED   | PR #249 merged; `tool-pack-scope-provider-truthfulness` merged and plan refreshed | Independent follow-up on the completed diagnostics project's delivered status surface.   |

## Dependency notes

- Plans 1, 2, and 3 are independent peers. Numbering does not require serial
  execution, but each touches lockstep release files, so parallel branches must
  rebase and choose a version above live `origin/main` immediately before merge.
- Plan 4 is a true ordered successor to plan 3. Do not import or execute it
  before its hard dependency state is verified.
- Plan 5 was revalidated after PR #249 merged and again on 2026-09-02 against
  PR #254. It is blocked on integration: the in-flight
  `tool-pack-scope-provider-truthfulness` project rewrites every save site the
  plan edits (Manifest V2, collection sync, status migration, engine save
  sites) without implementing the outcome. Refresh the plan after that merge,
  then set it `READY`.
- Every plan was revalidated against full baseline
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` (2026-09-02; PR #254 added only
  lockstep version bumps and unrelated test/skill edits to these surfaces) and
  contains explicit revalidation triggers. The date/index name is source-aware to avoid same-day batch
  collisions.
