---
oat_generated: true
oat_external_plan_index: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
oat_external_plan_commit: 6f443c08
created: '2026-08-20T02:37:32Z'
---

# External Plan Index: Recent bounded defect lane

This index records selection and ordering. It is not an executable plan and is
not an `oat-project-import-plan` target.

## Selection

- Selected: five S-sized, recently encountered defects with verified live
  evidence, narrow implementation boundaries, and deterministic regression
  seams. They can be executed sequentially without opening another large
  feature lane beside ReviewPlan PR #190 and OAT plugin discovery.
- Deferred/rejected: `BL-260819-repair-verified-bundled-skill` — Repair
  verified bundled skill contract drift is a cohesive M-sized release batch and
  should follow this lane. ReviewPlan-adjacent gate work waits until PR #190 is
  reconciled so its plan is not built on stale skill surfaces. Larger provenance
  and closeout-evidence work remains deferred while two large initiatives are
  active.
- Unaudited or out of scope: implementation itself, PR creation, GitHub issue
  state changes, and backlog items not selected during the 2026-08-19 priority
  alignment.

## Recommended order

| Order | Plan                                                                                             | Source item/finding                                    | Depends on                  | Tracking                                   | Rationale                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1     | [Bound smoke cleanup signal waits](./2026-08-19-bound-smoke-cleanup-signal-wait.md)              | Smoke SIGTERM harness wedged for about 35 minutes      | —                           | `BL-260818-bound-the-smoke-cleanup`        | Smallest containment fix; prevents the validation suite from consuming the whole lane.                    |
| 2     | [Surface sync version skew](./2026-08-19-warn-sync-version-skew.md)                              | Sync silently restamps stale producer evidence         | Plan 1 validation stability | `BL-260718-warn-when-oat-sync-uses`        | Directly addresses the stale-tooling diagnosis encountered in this triage session.                        |
| 3     | [Isolate the CLI assets root](./2026-08-19-hermetic-cli-assets-root.md)                          | Shared asset rebuilds can race built CLI consumers     | —                           | `BL-260817-let-resolveassetsroot-honor`    | Removes a demonstrated parallel-test race with a fail-closed runtime seam.                                |
| 4     | [Reject package versions overtaken by main](./2026-08-19-detect-behind-main-package-versions.md) | Merge-base validation misses later main releases       | —                           | `BL-260817-detect-branch-behind-published` | Closes a recently observed release-integrity hole using existing CI history.                              |
| 5     | [Refresh codex-skill routing](./2026-08-19-refresh-codex-skill-routing.md)                       | Fixed model list and blanket repository bypass drifted | Current provider matrix     | `BL-260819-refresh-codex-skill-model`      | Bounded correction, but best after code defects because it carries skill and package release bookkeeping. |

## Dependency notes

- The implementation changes are logically independent. Execute one plan per
  branch/worktree and rebase or refresh from current main before starting the
  next.
- Plans 2, 3, and 5 each require lockstep public-package version bumps. They
  must not be implemented concurrently against the same version baseline.
- Plan 1 should run first because it bounds a validation hang that could affect
  every later plan's full-suite gate.
- Plan 5 must reread the live Codex provider reference at execution time; its
  model catalog is intentionally drift-sensitive.
