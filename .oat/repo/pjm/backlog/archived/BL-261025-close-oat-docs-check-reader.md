---
id: BL-261025-close-oat-docs-check-reader
title: 'Close oat docs check reader-rule gaps: per-group width limits and a
  title rule'
status: wont_do
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:00.073Z
updated: '2026-10-25T13:59:20Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

Two reader-structure gaps let non-conforming docs pass `oat docs check`.

- A single `###` group bypasses every width limit. `grouped = retained.some((e) => e.group !== undefined)` (`packages/cli/src/commands/docs/check/reader-rules.ts`) exempts `root-width`, `contents-width` and `folder-size` as soon as one group exists; one `### Everything` heading over 39 entries cleared three errors in a consumer repository. There is no per-group limit.
- There is no `title` rule, although oat-docs-bootstrap Step 4 and oat-docs-apply Step 5 require a nonempty frontmatter `title`. A page with no frontmatter reports only `description`.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- Groups exempt flat width only when every group stays within a per-group threshold (configurable through `documentation.check.thresholds`); a single oversized group is reported.
- A stable `title` rule reports a missing or empty frontmatter title, with `error|warn|off` policy, documented in the check page rule table.
- Tests at the `checkDocs` boundary cover the one-group bypass and a page without a title.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-tighten-oat-docs-check-rules — Tighten oat docs check rules and diagnostics](../items/BL-261025-tighten-oat-docs-check-rules.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
