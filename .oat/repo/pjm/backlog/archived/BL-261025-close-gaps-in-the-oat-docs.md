---
id: BL-261025-close-gaps-in-the-oat-docs
title: Close gaps in the oat-docs-bootstrap PR CI recipe
status: wont_do
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:02.712Z
updated: '2026-10-25T13:59:23Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

The oat-docs-bootstrap `references/pr-ci.md` recipe leaves consumer CI incomplete.

- It has no `oat docs nav sync --check` step and relies on a prebuild that only fresh-template apps have.
- "Preserve existing triggers" does not address PR workflows whose `paths-ignore` skips `**/*.md`, where a docs job never runs on docs-only PRs.
- The manifest freshness step runs a bare `oat` from PATH rather than the app-local generate script, giving a false diff when the PATH CLI differs from the app's pinned CLI or when the app post-processes the manifest.
- Markdown-only repositories with no existing CLI provision get no guidance on choosing a pinned devDependency versus `dlx`.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- The recipe includes a nav-sync check step for `navOwner: nav-sync` apps (and the membership check for hand-authored).
- It tells adopters to add or adjust a trigger that fires on docs-only PRs.
- Freshness uses the app's own generate script when one exists.
- Markdown repositories get a concrete CLI provisioning recommendation.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-close-docs-skill-workflow-gaps — Close docs skill workflow gaps found in the consumer rollout](../items/BL-261025-close-docs-skill-workflow-gaps.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
