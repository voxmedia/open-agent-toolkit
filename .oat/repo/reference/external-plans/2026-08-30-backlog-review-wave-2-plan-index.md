---
oat_generated: true
oat_external_plan_index: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
oat_external_plan_commit: 2c6005d64f45a19e8b9eedbc977959b066d3eda0
oat_external_plan_date: '2026-08-31'
created: '2026-08-30T23:49:30Z'
---

# External Plan Index: Backlog review Wave 2

This index records selection and ordering. It is not an executable plan and is
not an `oat-project-import-plan` target.

## Selection

- Selected: three self-contained outcomes. All three are execution-ready after
  revalidation against the merged gate-contract project and current main.
- Deferred/rejected:
  - [BL-260806-fail-closed-when-configured](../../pjm/backlog/items/BL-260806-fail-closed-when-configured.md)
    is materially implemented by the immutable closeout snapshot/terminal
    contract. Archive the original after a focused reproduction check; any
    transition-test residual belongs in `review-gate-integrity`.
  - [BL-260718-harden-full-surface-gate](../../pjm/backlog/items/BL-260718-harden-full-surface-gate.md)
    has its budget half implemented. The remaining same-window recursion/run
    identity choice requires fresh `review-gate-integrity` design after PR #190,
    not an isolated external plan.
  - [BL-260711-add-activity-aware-gate](../../pjm/backlog/items/BL-260711-add-activity-aware-gate.md)
    is explicitly owned by `review-gate-integrity`; issue #197 also adds an
    unresolved provider-preflight/blocked-envelope boundary. Do not create a
    competing plan.
- Unaudited or out of scope: implementation, plan import, active-project edits,
  PR/issue mutation, and backlog status/archive changes.

## Recommended order

| Order | Plan                                                                                                                               | Source item                              | Execution | Depends on                                              | Rationale                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1     | [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md)                     | `BL-260826-emit-the-dispatch-stamp-from` | READY     | Accepted additive-report policy; issue #211 is soft     | Smallest independent CLI/skill contract and no active project collision.                    |
| 2     | [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md) | `BL-260718-mandatory-skill-load-clause`  | READY     | PR #246 revalidation satisfied; PR #190 remains soft    | Independent policy/corpus fix; repeat its sweep if PR #190's integration tip changes first. |
| 3     | [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md)              | `BL-260712-per-project-override`         | READY     | PR #246 merged and delivered gate contracts revalidated | Additive project resolution preserves the consolidated delivered contract.                  |

## Dependency notes

- Plans 1 and 2 are peer lanes, not a serial chain. They share release/version
  files and may touch review skill guidance, so concurrent branches must
  coordinate or rebase before merge.
- Plan 2 was re-swept after PR #246. Re-sweep lifecycle call sites again if
  [PR #190](https://github.com/voxmedia/open-agent-toolkit/pull/190) changes
  before execution.
- Plan 3 was revalidated against PR #246's merged result. The old separate
  headless/structured project dossiers are no longer authoritative ownership;
  preserve the consolidated project's delivered contracts.
- The rejected review/gate items should be normalized in backlog administration
  after their existing owners reproduce/archive the historical claims. This
  planning mode does not authorize those status changes.
