---
id: BL-261025-align-oat-docs-apply
title: Align oat docs apply with the analyze next-step message
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:04.040Z
updated: 2026-10-25T05:31:04.040Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

`oat docs analyze` prints "Next: run oat docs apply after reviewing findings." (`packages/cli/src/commands/docs/analyze.ts`), but `oat docs apply` (`apply.ts`) only prints a pointer to the oat-docs-apply skill, so the suggested next step does nothing.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- The analyze message points at the oat-docs-apply skill (or the apply command does something useful), and the docs say which.
