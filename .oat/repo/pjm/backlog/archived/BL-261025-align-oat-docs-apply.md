---
id: BL-261025-align-oat-docs-apply
title: Align oat docs apply with the analyze next-step message
status: wont_do
priority: low
scope: task
scope_estimate: XS
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:04.040Z
updated: '2026-10-25T13:59:25Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

`oat docs analyze` prints "Next: run oat docs apply after reviewing findings." (`packages/cli/src/commands/docs/analyze.ts`), but `oat docs apply` (`apply.ts`) only prints a pointer to the oat-docs-apply skill, so the suggested next step does nothing.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- The analyze message points at the oat-docs-apply skill (or the apply command does something useful), and the docs say which.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-close-docs-skill-workflow-gaps — Close docs skill workflow gaps found in the consumer rollout](../items/BL-261025-close-docs-skill-workflow-gaps.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
