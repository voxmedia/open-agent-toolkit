---
id: BL-261002-list-pending-required-reviews
title: List pending required reviews when a project reaches a pull request
status: closed
priority: medium
scope: feature
scope_estimate: S
labels:
  - lifecycle
  - reviews
  - pr
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T20:01:29.468Z
updated: '2026-11-06T20:53:51Z'
associated_issues: []
external_plans: []
---

## Description

The docs-improvement-overhaul project reached pr_open with p03, p04, p05, p06 and the final code review still pending in the plan's Reviews table, and no skill flagged it. Related but distinct: issue #328 (stale prose and placeholders at PR-final). Source: docs-improvement-overhaul retro UP-04.

## Acceptance Criteria

- Before creating a pull request, the PR skills list required review rows that
  are still `pending` in the plan's Reviews table.
- The user can run them, record a waiver with a reason, or stop; the choice is
  recorded in the Reviews table.
- Non-interactive runs stop at a boundary when required reviews are pending
  and no waiver is recorded.

## Closure Note

Delivered by review-gate-integrity-goal m02 (phase p13, PR #403). The second criterion shipped with one change: the waiver is recorded as a `**Review waived:**` line under `## Reviews and Gates` in the project's `implementation.md`, and the Reviews row stays `pending`, rather than as a change to the Reviews table. A waiver is never read as `passed`.
