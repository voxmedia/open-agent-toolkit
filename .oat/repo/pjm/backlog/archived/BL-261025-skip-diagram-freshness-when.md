---
id: BL-261025-skip-diagram-freshness-when
title: Skip diagram-freshness when only Mermaid accessibility metadata changes
status: wont_do
priority: low
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:07.419Z
updated: '2026-10-25T13:59:21Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

`diagram-freshness` warns when only Mermaid `accTitle`/`accDescr` lines change and demands SVG regeneration, so applying the `diagram-accessibility` fix always produces freshness warnings for diagrams with light/dark SVG pairs.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- Changes limited to Mermaid accessibility metadata lines do not require SVG changes, covered by a test at the `checkDocs` boundary with a real Git comparison.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-tighten-oat-docs-check-rules — Tighten oat docs check rules and diagnostics](../items/BL-261025-tighten-oat-docs-check-rules.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
