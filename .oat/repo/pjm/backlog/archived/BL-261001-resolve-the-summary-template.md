---
id: BL-261001-resolve-the-summary-template
title: Resolve the summary template in oat-wrap-up through oat template resolve
status: closed
priority: low
scope: task
scope_estimate: XS
labels:
  - skills
  - templates
assignee: null
created: 2026-10-01T19:19:36.888Z
updated: '2026-10-02T22:52:19Z'
associated_issues: []
external_plans: []
---

## Description

Wave 3 (p01) routed every lifecycle template copy through
`oat template resolve`. `oat-wrap-up` (around line 368 and
`report-template.md`) still points at `.oat/templates/summary.md` as a schema
reference. It is a read, not a copy, but a user-scope-only install has no
repository `.oat/templates/`, so the pointer resolves to nothing there.

## Acceptance Criteria

- `oat-wrap-up` resolves the summary template through `oat template resolve`
  (or its `--json` path), with a version bump.
