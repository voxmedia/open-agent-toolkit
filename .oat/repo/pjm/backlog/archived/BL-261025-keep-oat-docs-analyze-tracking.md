---
id: BL-261025-keep-oat-docs-analyze-tracking
title: Keep oat-docs-analyze tracking from dirtying consumer repositories and
  failing silently
status: wont_do
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T00:22:28.462Z
updated: '2026-10-25T13:59:24Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

oat-docs-analyze writes .oat/tracking.json at the end of a run. In a consumer repository that file can be untracked but not ignored, so a run documented as read-only leaves the working tree dirty. The tracking read is also wrapped in 2>/dev/null || true, so a missing user-scope resolve-tracking.sh silently forces full mode instead of reporting why delta mode was unavailable.

Found while piloting the OAT docs tooling 0.3.31 rollout on a pilot consumer repository; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- An analyze run in a repository where `.oat/tracking.json` is not ignored either leaves the working tree unchanged or reports the tracking write it made and how to ignore or commit it.
- A missing or failing tracking helper is reported in the analysis summary with the reason full mode was used, instead of being suppressed.
- Existing delta-mode behavior is unchanged when tracking is available.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-close-docs-skill-workflow-gaps — Close docs skill workflow gaps found in the consumer rollout](../items/BL-261025-close-docs-skill-workflow-gaps.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
