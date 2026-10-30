---
id: BL-261030-report-gate-project-log
title: Report gate project-log finalization in the terminal JSON envelope
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - gates
  - project-log
assignee: null
created: 2026-10-30T22:27:34.598Z
updated: 2026-10-30T22:27:34.598Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/353
external_plans: []
---

## Description

oat gate review flushes its terminal JSON envelope before project-log receipt finalization runs, so append/commit status and the pending-recovery reference reach only stderr and the durable receipt. A JSON-only caller cannot tell whether review acceptance also completed bookkeeping. The #213 work and DR-260907-gate-log-receipts-live-under deliberately excluded the envelope, so planning must amend that decision first. Related: BL-260927-give-gate-receipts-portable. Source: GitHub #353; triage record .oat/repo/pjm/triage/2026-10-30-untriaged-issues.md.

## Acceptance Criteria

- Planning first amends `DR-260907-gate-log-receipts-live-under`, which currently places finalization after the envelope flush. Buffering the envelope until finalization completes is preferred; a second terminal record is acceptable only if the amendment accepts breaking the single-envelope contract.
- Immediate success reports both the review outcome and completed receipt finalization in terminal JSON.
- Exhausted index-lock retries preserve the review outcome and report pending or failed finalization with a stable, path-neutral recovery reference.
- The JSON field agrees with the durable receipt and the existing stderr diagnostics, including the post-selection-recovery path.
- Recovery commits an already-appended matching event exactly once after the lock clears, without duplicate project-log entries, lock deletion or rerunning the review.
- Review severity, threshold, receive eligibility and exit code are unchanged.
- A synthetic repository with a held index lock exercises immediate success, exhausted retry and recovered finalization; `workflow-gates.md` documents the field.
