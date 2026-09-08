---
id: BL-260908-make-copy-strategy-skill
title: Make copy-strategy skill projections converge after sync instead of
  reading as drifted
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - cli
  - sync
  - drift
  - wave-6-followup
assignee: null
created: 2026-09-08T03:59:59.605Z
updated: 2026-09-08T21:22:00.000Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-converge-copy-strategy-skill-projections.md
---

## Description

The sync engine's directory copy for a copy-strategy skill projection adds an `<!-- OAT-managed …` banner and a `.oat-generated` sentinel that the manifest hash does not cover, so `oat status` reports the projection `drifted/modified` immediately after a successful `oat sync`, every later `sync --dry-run` plans `update_copy` forever, and the new `oat tools info` provider-view diagnostic (wave-6 p05) can only report copies as `modified` and offer a `Repair: oat sync --scope <scope>` that provably cannot repair. Reproduced on the wave-6 group-1 base by the p05 lane and confirmed by its root review; `drift/detector.ts` and `commands/sync/` were out of p05's scope.

## Acceptance Criteria

- [ ] After `oat sync` materializes a copy-strategy skill, `oat status` reports it `in_sync` and `sync --dry-run` plans no `update_copy` for it (the manifest hash covers what the engine wrote, or the detector ignores the banner and sentinel it added)
- [ ] The wave-6 p05 copy convergence integration case asserts `in-sync` with equal versions instead of pinning the drifted behavior, and the `tools info` repair line for copies becomes actionable
- [ ] The `manifest-and-drift.md` `modified` bullet is true for copies again
