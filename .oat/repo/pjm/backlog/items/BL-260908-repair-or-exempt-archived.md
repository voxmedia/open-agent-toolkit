---
id: BL-260908-repair-or-exempt-archived
title: Repair or exempt archived project ledgers that fail the pr-final path guard
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - pjm
  - lifecycle
  - wave-6-followup
assignee: null
created: 2026-09-08T05:08:01.802Z
updated: 2026-09-08T05:08:01.802Z
associated_issues: []
external_plans: []
---

## Description

The wave-6 p02 ledger-path guard, run verbatim over every `.oat/projects/**/plan.md`, passes 59 of 94 ledgers. Failures: 31 archived/shared ledgers carry non-path Artifact cells (`in-memory`, `N/A quick mode`, review narratives) that `oat-project-plan-writing` never allowed; two archived projects (`pjm-refresh`, `subagent-implement-refactor`) have genuinely dangling review rows; two more (`gate-execution-hardening`, `multi-family-dispatch`) have partially materialized `reviews/archived/` trees whose ledgers name absent files. Decide whether to repair archived ledgers in one sweep or have the guard exempt `archived/` projects, and fix the two dangling rows.

## Acceptance Criteria

- [ ] A decision (repair vs exempt) is recorded and applied so the guard sweep over `.oat/projects/**/plan.md` reports zero unexplained failures
- [ ] The two genuinely dangling rows are corrected or documented
- [ ] The non-path Artifact-cell convention is either normalized in the archived ledgers or accepted as legacy with the guard scoped accordingly
