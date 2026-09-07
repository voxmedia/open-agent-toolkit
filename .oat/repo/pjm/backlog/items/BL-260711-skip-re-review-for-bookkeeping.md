---
id: BL-260711-skip-re-review-for-bookkeeping
title: 'Skip re-review for bookkeeping-only review findings'
status: open
priority: urgent
scope: feature
scope_estimate: L
labels: [reviews, orchestration, gates, efficiency]
assignee: null
created: '2026-07-11T15:29:00Z'
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/233
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

## Verified Findings

- The CLI already returns a `bookkeeping-only` re-review classification, but it
  is path-only: any changed file beneath the active project directory qualifies,
  including a source or behavior change. The classification is currently
  reporting-only and the structured reviewer dispatch always remains enabled.
- The review-provide skill explicitly says all classifications remain
  dispatchable, and its focused tests preserve that behavior. The phase
  execution and final closeout guidance separately require a new reviewer round
  after Critical/Important remediation, so the optimization is not wired into
  either direct/self-review or closeout orchestration.
- Review-receive defines `passed` as a review that was re-reviewed and recorded
  as passing. A bookkeeping repair therefore needs an explicit auditable
  `re-review not required`/resolved disposition rather than falsely marking the
  original event as reviewer-passed. The existing passing-gate judgment sweep
  exception covers sub-threshold findings, but not a blocking gate whose only
  findings are bookkeeping or ledger inconsistencies.
- The failure mode includes review-ledger and plan/design status mismatches:
  repairing a stale status, provenance pointer, or review row must correct the
  record and preserve the audit trail, but must not consume another reviewer or
  gate attempt. Repository wave records show these bookkeeping findings have
  already produced narrowed follow-up rounds and cycle-cap pressure despite no
  shipped-behavior defect.

## Acceptance Criteria

- Define a deterministic, finding-level bookkeeping-only disposition limited to
  lifecycle metadata, review-artifact archival/discovery, review and gate event
  receipts, plan/design review ledgers, status tables, stale paths, and
  equivalent non-shipping project records.
- Classification must use the finding's changed content and lifecycle
  provenance, not only a project-directory path prefix. A source, test,
  generated provider/runtime asset, behavior, requirement, user-facing
  documentation, release metadata, or unverifiable change is substantive even
  when it is stored beneath the active project directory.
- The optimization applies only when every finding and every remediation change
  qualifies as bookkeeping-only. Any mixed or ambiguous set, unavailable
  changed-file evidence, broken provenance, or failed deterministic validation
  retains the existing re-review requirement and fail-closed behavior.
- Direct/self-review orchestration records the exact bookkeeping fields/files
  changed, local validation evidence, original review-event identity, and an
  explicit `re-review not required` disposition; it resolves the finding without
  dispatching another reviewer.
- Gate-originated review handling applies the same disposition to a blocking
  gate whose findings are exclusively bookkeeping-only. It repairs the ledger or
  receipt, preserves the original gate identity and audit trail, does not consume
  another review/gate attempt, and does not relaunch the gate target.
- The lifecycle model distinguishes bookkeeping resolution from a genuine
  reviewer `passed` result. It must not mark an event as reviewer-passed merely
  because its ledger row was repaired; the durable disposition must explain why
  re-review was not required.
- Structured logs, review artifacts, plan/state/implementation ledgers, and gate
  receipts state that re-review was skipped, why every finding qualified, what
  deterministic validation replaced it, and whether an attempt was preserved.
- Focused tests cover plan/design ledger-only repairs, direct/self-review
  receipt, blocking gate receipt, existing passing-gate judgment sweeps, source
  changes inside the project prefix, mixed findings, unavailable evidence,
  attempted misclassification, attempt accounting, and preservation of
  substantive re-review behavior.
- Review-provide, review-receive, phase-execution, plan/resume, and final
  closeout documentation encode the same rule and safety boundary so no
  lifecycle path independently reintroduces a bookkeeping-only re-review.
