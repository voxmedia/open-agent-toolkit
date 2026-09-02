---
id: BL-260729-implement-reviewplan-first
title: Implement ReviewPlan-first reviewer workflow
status: open
priority: high
scope: feature
scope_estimate: L
labels:
  - reviews
  - orchestration
  - gates
  - efficiency
assignee: null
created: 2026-07-29T14:46:45.249Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/206
external_plans: []
---

## Description

Redesign broad OAT reviews around an enforced artifact-only intake, metadata-only change map, explicit ReviewPlan, selective evidence lanes, economically justified delegation, bounded deadlines, and narrower primary replay obligations. Preserve independent reviewer judgment while preventing giant-diff-first intake, single oversized reconnaissance workers, duplicated verification, and timeout-without-artifact failure modes observed during the 2026-07-26 multi-provider-support final reviews. Treat PR #185 diagnostics and PR #186 guarded re-review narrowing as prerequisites rather than reimplementing them; revalidate transactional partial artifacts, timeout scaling, manual freshness reuse, and ownership deduplication during discovery.

## Acceptance Criteria

- Broad reviews enforce the sequence: lifecycle artifacts, metadata-only change
  map, explicit `ReviewPlan`, selective evidence loading, verification,
  reconciliation, and artifact publication.
- The `ReviewPlan` accounts for every changed file and in-scope requirement,
  records cross-cutting invariants, assigns bounded evidence lanes, chooses
  inline versus delegated execution with an explicit coordination-cost
  rationale, and reserves time for synthesis and output.
- Whole-range content diffs are allowed only below a defined size/complexity
  threshold; broad ranges use path-scoped diffs and risk-ordered inspection.
- Delegation requires at least two genuinely independent, substantial lanes.
  A single broad semantic-reconnaissance worker is rejected.
- Worker dossiers remain read-only and advisory, identify exact scope and
  evidence, report gaps and uncertainty, and return useful partial results by
  lane deadlines without assigning severity or verdicts.
- The primary reviewer directly verifies promoted findings, consequential
  absence claims, conflicts, and risk-based samples without replaying every
  successful positive worker claim.
- Deadline-bound reviews receive an explicit budget, preserve reconciliation
  and artifact-writing reserves, stop launching lanes after the safe cutoff,
  and return a diagnosable `BLOCKED` result when coverage cannot complete.
- Any incremental review-artifact design is transaction-safe: incomplete
  artifacts cannot be selected, parsed as verdicts, received, or recorded as
  actionable review events; completed artifacts publish atomically with
  run/scope correlation.
- Existing gate activity evidence remains diagnostic. Any deadline extension
  is bounded and attributable to progress in the current run's artifact, never
  to ambient transcript growth alone.
- Independent configured gates may use prior reviews as a navigation index but
  never substitute a lifecycle verdict. Ordinary/manual freshness reuse and
  bookkeeping-only skipping remain explicit, separately revalidated policy
  choices.
- Wrapper/reviewer ownership is unambiguous, duplicate process and artifact
  prose is reduced after behavioral contracts stabilize, and artifact mode and
  structured-output mode retain valid output contracts.
- Tests cover broad and small ranges, beneficial and non-beneficial delegation,
  worker timeout/partial return, changed-file accounting, incomplete-artifact
  rejection, independent-gate behavior, and manual fresh-review choice.
- Canonical skill and agent changes are versioned and synced, all five public
  packages receive the required lockstep release bump, and
  `pnpm release:validate` passes.
- Continuation ranges are self-validating (GitHub issue #206): every continuation review records exact full-SHA start and end provenance, normalizes and persists the range before launch, and stops with a diagnosable error when the range cannot be verified against the repository.

## Context and Dependencies

- Source proposal:
  `.oat/projects/shared/review-plan-workflow/references/slow-review-feedback.md`
  after project scaffolding.
- PR #185 is the baseline for timeout activity diagnostics.
- PR #186 is the prerequisite for guarded re-review ranges, durable provenance,
  and reporting-only range classification.
- `BL-260711-skip-re-review-for-bookkeeping` remains the narrower follow-up for
  deterministically validated bookkeeping-only review skipping.
