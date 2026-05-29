---
id: bl-9fb8
title: 'Add PR review follow-on skill set (provide-remote, respond-remote, summarize-remote)'
status: open
priority: medium
priority_reviewed: '2026-05-29'
scope: feature
scope_estimate: L
labels: ['skills', 'review']
assignee: null
created: '2026-02-14T00:00:00Z'
updated: '2026-05-29T00:00:00Z'
associated_issues: []
---

## Status update (2026-05-29)

The **provide-remote** half of this set has SHIPPED under project `remote-review` (this work):

- `oat-review-provide-remote` (ad-hoc rail) — **SHIPPED**
- `oat-project-review-provide-remote` (project rail) — **SHIPPED**

These let an agent on machine B fetch a GitHub PR opened by machine A, review it, and post a single PR review back (with a parseable OAT review marker for re-review narrowing). Backed by shared helpers under `packages/cli/src/review-remote/` and the `oat-reviewer` structured-output mode.

The **respond-remote** and **summarize-remote** skills remain OPEN — this item stays `status: open` to track them:

- `oat-review-respond-remote` — **OPEN**
- `oat-project-review-respond-remote` — **OPEN**
- `oat-review-summarize-remote` — **OPEN**
- `oat-project-review-summarize-remote` — **OPEN**

## Description

The receive-remote review flows already exist, and the provide-remote flows shipped under project `remote-review`. The remaining companion skills for responding to review threads after fixes and publishing PR summary comments are still missing.

Remaining scope:

- Evaluate `oat-review-respond-remote` and `oat-project-review-respond-remote` for replying to individual PR review threads and marking them resolved after fixes.
- Evaluate `oat-review-summarize-remote` and `oat-project-review-summarize-remote` for generating PR summary comments covering review status and remaining items.
- Keep the set optional so the core review flow still works without remote posting features.

Links:

- Source discussion: OAT feature ideas for remote review extensions
- Prerequisite already shipped: review receive skill family (PR #29)
- Provide-remote shipped: project `remote-review`

## Acceptance Criteria

Scoped to the remaining four skills (`oat-review-respond-remote`, `oat-project-review-respond-remote`, `oat-review-summarize-remote`, `oat-project-review-summarize-remote`):

- Each remaining skill has a clear contract with non-overlapping responsibilities.
- Teams can adopt the skills incrementally without changing the core review flow.
- All GitHub posting actions require explicit user confirmation.
