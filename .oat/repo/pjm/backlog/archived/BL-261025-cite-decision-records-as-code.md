---
id: BL-261025-cite-decision-records-as-code
title: Cite decision records as code text on Markdown reader pages in oat-docs-apply
status: wont_do
priority: low
scope: task
scope_estimate: XS
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:06.709Z
updated: '2026-10-25T13:59:25Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

oat-docs-apply's IA-record step tells agents to link the decision record and the contributing/AGENTS IA section both ways. With Markdown tooling the contributing page is a reader page, so a link into `.oat/` triggers link-escape and provenance warnings from `oat docs check`.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- oat-docs-apply says to cite the decision path as code text, not a link, on Markdown reader pages (or the checker exempts that one link shape), and its skill contract test pins the wording.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-close-docs-skill-workflow-gaps — Close docs skill workflow gaps found in the consumer rollout](../items/BL-261025-close-docs-skill-workflow-gaps.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
