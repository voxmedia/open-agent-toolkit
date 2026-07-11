---
id: BL-260711-skip-re-review-for-bookkeeping
title: 'Skip re-review for bookkeeping-only review findings'
status: open
priority: high
scope: feature
scope_estimate: M
labels: [reviews, orchestration, gates, efficiency]
assignee: null
created: '2026-07-11T15:29:00Z'
updated: '2026-07-11T15:29:00Z'
associated_issues: []
oat_template: false
oat_template_name: backlog-item
---

## Description

Review remediation currently triggers another full reviewer run even when every
finding concerns only lifecycle bookkeeping and the fix cannot affect shipped
behavior. This wastes substantial tokens and time, as demonstrated when removal
of a stale OAT review artifact caused an otherwise clean final code review to
launch another exact pinned reviewer.

Define a narrow, auditable bookkeeping-only disposition and use it in both
direct/self-review subagent workflows and gate-originated review workflows.
After the bookkeeping remediation is validated locally, neither path should
dispatch another reviewer solely to confirm that class of fix.

## Acceptance Criteria

- Define a deterministic bookkeeping-only finding/disposition that is limited
  to lifecycle metadata, review-artifact archival/discovery, status tables,
  stale paths, and equivalent non-shipping project records.
- Exclude source code, generated provider/runtime assets, behavior, tests,
  requirements, user-facing documentation, release metadata, and mixed finding
  sets from the optimization.
- Direct/self-review orchestration records the bookkeeping fix and its local
  validation evidence, marks the review resolved, and does not launch a
  re-review when all findings are bookkeeping-only.
- Gate-originated review handling applies the same rule and does not relaunch a
  gate review target after validated bookkeeping-only remediation.
- Any substantive or mixed finding set retains the existing re-review
  requirement and fail-closed behavior.
- Structured logs and lifecycle artifacts state that re-review was skipped,
  why the finding qualified, and what deterministic validation replaced it.
- Focused tests cover direct/subagent reviews, gate reviews, mixed findings,
  attempted misclassification, and preservation of substantive re-review
  behavior.
- Workflow documentation explains the narrow optimization and its safety
  boundary.
