---
id: BL-260906-harden-dispatch-launch
title: Harden dispatch launch baselines and terminal reconciliation
status: open
priority: medium
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
updated: 2026-09-06T05:27:39.903Z
associated_issues: []
external_plans: []
---

## Description

Tracks the two dispatch-lifecycle defects identified by the lite-workflow-mode retrospective: GitHub issue #265 (https://github.com/voxmedia/open-agent-toolkit/issues/265) covers calculating the accepted execution baseline after mandatory launch journaling, and GitHub issue #266 (https://github.com/voxmedia/open-agent-toolkit/issues/266) covers durable terminal reconciliation for every accepted dispatch. Treat these as related but independently closable mechanisms; the backlog item closes only when both issue contracts are satisfied.

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
