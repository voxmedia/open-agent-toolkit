---
id: BL-261025-let-oat-config-get-read
title: Let oat config get read the whole documentation block
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:03.375Z
updated: 2026-10-25T05:31:03.375Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

`oat config get documentation --json` returns `Unknown config key: documentation`; the whole block is readable only through `oat config dump`. Agents checking config shape during analysis need the block in one call.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- `oat config get documentation` returns the resolved documentation block (read-only aggregate view, like other aggregate keys), documented in the CLI reference.
