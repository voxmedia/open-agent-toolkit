---
id: BL-260906-harden-dispatch-launch
title: Harden dispatch launch baselines and terminal reconciliation
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - oat-upstream
  - workflow
  - dispatch
  - provenance
  - retro
assignee: null
created: 2026-09-06T05:27:39.903Z
updated: 2026-09-09T19:18:43.000Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-calculate-dispatch-baselines-after-journaling.md
---

## Description

Tracks the two dispatch-lifecycle defects identified by the lite-workflow-mode retrospective: GitHub issue #265 (https://github.com/voxmedia/open-agent-toolkit/issues/265) covers calculating the accepted execution baseline after mandatory launch journaling, and GitHub issue #266 (https://github.com/voxmedia/open-agent-toolkit/issues/266) covers durable terminal reconciliation for every accepted dispatch. Treat these as related but independently closable mechanisms; the backlog item closes only when both issue contracts are satisfied.

## Triage split (2026-09-08)

Two lanes, one per issue, planned separately: #265 (calculate execution baselines after mandatory launch journaling) is bounded; #266 (reconcile every accepted dispatch to a terminal outcome) needs a concrete producer and a completion/failure/cancellation/invalid-run matrix before it is admitted to a wave. The item closes only when both contracts are satisfied.

## Acceptance Criteria

- GitHub issue #265 resolves the accepted execution baseline only after all
  mandatory launch-journal commits, with a regression proving journal-induced
  `HEAD` movement does not invalidate the first authorized dispatch.
- GitHub issue #265 preserves the pre-edit rejection of genuinely stale or
  unrelated base SHAs and records auditable baseline ordering.
- GitHub issue #266 gives every accepted dispatch an authoritative terminal
  result through a linked envelope or append-only reconciliation event without
  overwriting launch provenance.
- GitHub issue #266 adds closeout detection for unresolved accepted dispatches
  and covers completion, failure, cancellation, and invalid-run outcomes.
- Both GitHub issues carry the `tracked-in-backlog` label and remain linked from
  this backlog record until their independently testable contracts are closed.

## Notes

- 2026-09-09: wave-7 p16 (`2026-09-08-calculate-dispatch-baselines-after-journaling.md`) hit
  a plan STOP and was parked, so both halves stay open. The plan's Step 3 wires a
  `gitExecFile` seam into the dispatch recorder, but the recorder graph carries a
  no-process guard that forbids any child process on that path — a redesign of
  the guard or the seam, not a refresh, so the wave did not improvise. The STOP
  record sits in the plan's `## Revalidation Before Execution`; the lane's
  partial steps 2–3 are preserved as a patch under
  `.oat/repo/reference/parked/wave-7-p16/` (restored 2026-09-09 from commit `f4c2dc4ef` after the wrapper was archived; the earlier wrapper path is gone) (README, patch,
  `prefix-journal.json`). Re-plan as a decision on where the git seam may live
  before dispatching again.
