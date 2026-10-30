---
id: BL-261030-decide-whether-a-no-op-sync
title: Decide whether a no-op sync should restamp the manifest oatVersion
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - sync
  - configuration
assignee: null
created: 2026-10-30T22:27:35.200Z
updated: 2026-10-30T22:27:35.200Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/360
external_plans: []
---

## Description

oat sync restamps .oat/sync/manifest.json oatVersion on a successful zero-operation sync, so worktree setup under a newer CLI leaves a version-only manifest diff. The restamp is documented and pinned by tests, and a same-version no-op writes identical bytes, so the churn is CLI-version skew. Deciding what oatVersion means comes before any change. No storage migration is approved. Source: GitHub #360; triage record .oat/repo/pjm/triage/2026-10-30-untriaged-issues.md.

## Acceptance Criteria

- A recorded decision defines `oatVersion`: the version that last changed managed content, the version that last verified it, or a compatibility marker.
- If the decision is "last changed content", a sync whose only change is the version does not rewrite the manifest; the skew advisory and `versionSkew` JSON still fire, and the restamp message, docs (`provider-sync/commands.md`) and pinned tests are updated at every save site (sync, init, remove skill, status).
- Otherwise, worktree setup documentation states the expected version-only manifest change.
- Tracked sync records and ownership/removal safety are preserved; behavior is demonstrated for a fresh worktree, a repeated no-op sync, and a CLI version change.
- No storage migration, untracking, or manifest split.
