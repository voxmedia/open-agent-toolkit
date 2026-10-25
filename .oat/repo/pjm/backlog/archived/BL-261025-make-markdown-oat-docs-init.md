---
id: BL-261025-make-markdown-oat-docs-init
title: Make Markdown oat docs init --adopt formatter-stable and complete
status: wont_do
priority: medium
scope: task
scope_estimate: M
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:01.388Z
updated: '2026-10-25T13:59:24Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

Markdown `oat docs init --framework markdown --adopt` leaves adopters with avoidable follow-up work.

- The managed `<!-- OAT docs -->` AGENTS block is not stable under oxfmt: the formatter inserts a blank line after the marker, and a rerun of init then reports `manual-required` and demands the unformatted bytes, so init and the formatter loop.
- The contributing page renders `{{REPO_NAME}}` from `basename(repoRoot)` (`packages/cli/src/commands/docs/init/markdown.ts`), which is the worktree or temporary directory name, not the repository name.
- Adoption creates `contributing.md` but leaves it unlinked from the root Contents map, and no checker rule notices an orphan page.
- `--json` output reports `appName` for Markdown, although help and the bootstrap skill say app name does not apply; a dry run that plans 0 files still prints "Docs scaffold planned".

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](../items/BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- Init writes managed blocks in the formatter's canonical shape (or compares them formatter-insensitively), so init, oxfmt and a rerun converge.
- The repository name comes from package metadata or the Git remote, falling back to the directory name only when neither exists.
- Adoption links `contributing.md` from the root Contents map (or reports that it must), and the JSON omits `appName` for Markdown.
- Tests cover adoption followed by formatting and a rerun.

## Disposition

Consolidated on 2026-10-25 into
[BL-261025-close-docs-skill-workflow-gaps — Close docs skill workflow gaps found in the consumer rollout](../items/BL-261025-close-docs-skill-workflow-gaps.md),
which carries every acceptance criterion above verbatim. Archived as `wont_do`
only because the backlog CLI has no superseded status; the work remains open in
the consolidated item.
