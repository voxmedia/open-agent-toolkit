---
id: BL-261025-let-oat-docs-analyze-propose
title: Let oat-docs-analyze propose candidate IA structures when no IA is recorded
status: wont_do
priority: medium
scope: task
scope_estimate: M
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T00:22:29.704Z
updated: '2026-10-25T13:59:24Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

Without --ia, oat-docs-analyze must ask the operator to choose an IA when none is recorded, but that run cannot show the candidate structures (two-level trees, placements, nearest presets) the choice depends on. The operator has to rerun with --ia to see them, effectively forcing a second analysis run.

Found while piloting the OAT docs tooling 0.3.31 rollout on a pilot consumer repository; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- When no IA is recorded, a single analyze run presents the candidate structures (two two-level trees with representative placements and nearest presets) alongside the `ask_user` choice, or clearly offers the `--ia` path in the same session.
- The IA choice remains operator-approved; analyze still records nothing itself.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-close-docs-skill-workflow-gaps — Close docs skill workflow gaps found in the consumer rollout](../items/BL-261025-close-docs-skill-workflow-gaps.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
