---
id: bl-9fb8
title: 'Add PR review follow-on skill set (provide-remote, respond-remote, summarize-remote)'
status: open
priority: medium
scope: feature
scope_estimate: L
labels: ['skills', 'review']
assignee: null
created: '2026-02-14T00:00:00Z'
updated: '2026-02-23T00:00:00Z'
associated_issues: []
---

## Description

The receive-remote review flows already exist, but the companion skills for posting findings to GitHub, responding to review threads after fixes, and publishing PR summary comments are still missing.

Proposed change:

- Evaluate `oat-review-provide-remote` and `oat-project-review-provide-remote` for posting OAT review findings as GitHub PR review comments.
- Evaluate `oat-review-respond-remote` and `oat-project-review-respond-remote` for replying to individual PR review threads and marking them resolved after fixes.
- Evaluate `oat-review-summarize-remote` and `oat-project-review-summarize-remote` for generating PR summary comments covering review status and remaining items.
- Keep the set optional so the core review flow still works without remote posting features.

Links:

- Source discussion: OAT feature ideas for remote review extensions
- Prerequisite already shipped: review receive skill family (PR #29)

## Acceptance Criteria

- Each skill has a clear contract with non-overlapping responsibilities.
- Teams can adopt the skills incrementally without changing the core review flow.
- All GitHub posting actions require explicit user confirmation.
