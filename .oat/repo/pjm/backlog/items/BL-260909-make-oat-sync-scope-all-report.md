---
id: BL-260909-make-oat-sync-scope-all-report
title: Make oat sync --scope all report a sibling scope's failure in the plan body
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - sync
  - cli
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:43.452Z
updated: 2026-09-09T08:35:43.452Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p14 (`2026-09-08-report-an-empty-manifest-sync-honestly.md`) review I1/M2, pre-existing: a failing `oat sync --scope all` still prints `No changes required.` in a sibling empty scope's plan body because `formatCoreResults` renders per scope while the whole-run `restampOnly` decision is global. Fix the body suffix so an empty scope beside a failed scope says so, and add a `--scope all` assertion that pins the `failed === 0` conjunct (the multi-scope body suffix and the conjunct are the two gaps the review named).

## Acceptance Criteria

- `oat sync --scope all` with one failed scope never prints `No changes required.` for any scope.
- A test pins the `failed === 0` conjunct across scopes.
- Single-scope output is unchanged (control).
