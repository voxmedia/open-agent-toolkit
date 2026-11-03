---
id: BL-260927-give-gate-receipts-portable
title:
  Ship the gate-receipts ignore rule from oat init and make gate receipt paths repository-relative
  shipped ignore rule
status: open
priority: medium
scope: feature
scope_estimate: S
labels:
  - gates
  - receipts
  - portability
assignee: null
created: 2026-09-27T03:35:37.500Z
updated: 2026-11-02T00:00:00.000Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/307
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/312
external_plans: []
---

## Description

Configured-gate result receipts are described as durable and closeout-owned in `oat-project-implement/references/completion-and-closeout.md`, but the contract never defines their location, tracking, redaction, cleanup, or fresh-clone behavior, while tracked state stores the receipt path (#307). Gate project-log receipts store absolute `projectPath` and `worktreeRoot` (`packages/cli/src/commands/gate/index.ts`), and the `**/gate-receipts/` ignore rule exists only in this repository's `.gitignore`; `oat init` does not add it, so a downstream `git add -A` commits machine-local paths (#312). Related: `BL-260820-emit-source-qualified` and `DR-260907-gate-log-receipts-live-under`. Sources: GitHub issues #307 and #312.

**Delivery status (2026-10-31):** Landed: #275 (`cc91a2d21`) warns when a
gate receipt path is not ignored (`warnWhenReceiptIsTracked`,
`packages/cli/src/commands/gate/index.ts:582`). Remaining: everything below.
`packages/cli/src/commands/init/gitignore.ts` still ships no
`**/gate-receipts/` entry, and the project-log receipt still records an
absolute `worktreeRoot` (`gate/index.ts:3433`).

## Acceptance Criteria

- `oat init` installs the managed `**/gate-receipts/` ignore entry (`packages/cli/src/commands/init/gitignore.ts`).
- Gate project-log receipts record repository-relative identities instead of absolute `projectPath` / `worktreeRoot`, and older absolute receipts are still accepted for recovery.
- Tests cover the ignore entry and a relative receipt.

## Scope narrowed (2026-11-02 triage)

Kept: the two adopter-visible leaks (#312). Dropped, not refiled: the single ownership model and fresh-clone reconcile of a pending configured gate (#307). Refile if a fresh-clone recovery is actually needed.

Original acceptance criteria, kept for reference (only the list above is tracked):

- One ownership model covers configured-gate result receipts and gate project-log receipts: sanitized durable storage, or ignored runtime storage plus portable correlation data in tracked state.
- A fresh clone can reconcile a received or pending configured gate without the original machine-local file.
- Committed receipts and tracked state contain repository-relative identities only, and older absolute receipts are still accepted for recovery.
- `oat init` installs the managed ignore entry, and normal gate execution and closeout leave the worktree clean.
- Tests cover interruption before receive, successful receive, retry on another checkout, and cleanup.
