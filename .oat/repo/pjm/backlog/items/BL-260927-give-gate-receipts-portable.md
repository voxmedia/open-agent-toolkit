---
id: BL-260927-give-gate-receipts-portable
title: Give gate receipts portable ownership, path-neutral identities, and a
  shipped ignore rule
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - gates
  - receipts
  - portability
assignee: null
created: 2026-09-27T03:35:37.500Z
updated: 2026-09-27T03:35:37.500Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/307
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/312
external_plans: []
---

## Description

Configured-gate result receipts are described as durable and closeout-owned in `oat-project-implement/references/completion-and-closeout.md`, but the contract never defines their location, tracking, redaction, cleanup, or fresh-clone behavior, while tracked state stores the receipt path (#307). Gate project-log receipts store absolute `projectPath` and `worktreeRoot` (`packages/cli/src/commands/gate/index.ts`), and the `**/gate-receipts/` ignore rule exists only in this repository's `.gitignore`; `oat init` does not add it, so a downstream `git add -A` commits machine-local paths (#312). Related: `BL-260820-emit-source-qualified` and `DR-260907-gate-log-receipts-live-under`. Sources: GitHub issues #307 and #312.

## Acceptance Criteria

- One ownership model covers configured-gate result receipts and gate project-log receipts: sanitized durable storage, or ignored runtime storage plus portable correlation data in tracked state.
- A fresh clone can reconcile a received or pending configured gate without the original machine-local file.
- Committed receipts and tracked state contain repository-relative identities only, and older absolute receipts are still accepted for recovery.
- `oat init` installs the managed ignore entry, and normal gate execution and closeout leave the worktree clean.
- Tests cover interruption before receive, successful receive, retry on another checkout, and cleanup.
