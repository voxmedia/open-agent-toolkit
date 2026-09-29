---
id: BL-260818-distinguish-operator-directed
title: Design the budget-exhausted decision point for reviews and gates
  review-cycle cap
status: open
priority: medium
scope: task
scope_estimate: L
labels:
  - workflow
  - review
  - skills
assignee: null
created: 2026-08-18T00:01:02.918Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/207
external_plans: []
---

## Description

Consolidated 2026-09-27 (`DR-260927-one-decision-point-at-review`). This item
now owns what happens when a review cycle cap or a configured gate's attempt
budget is exhausted. Today the contract only allows stopping, and every real
continuation lives in prose. It absorbs three items:

- This item's original scope (GitHub #200, #207): operator-directed extra
  cycles. On explainer-improvements-v2 the final review ran six rounds, rounds
  1-5 each found real defects, and the override was re-recorded by hand every
  round because the three-cycle cap counts artifacts per scope.
- `BL-260927-record-owner-overrides` (GitHub #327): an exhausted blocking
  gate whose owner decides to proceed, which today sits outside the contract.
- `BL-260901-add-corrective-revision`: a review that exhausts its budget but
  finds a design-level correction, which today becomes an improvised
  continuation.

At exhaustion the workflow presents one consolidated question (#207): the
cumulative findings classified as accepted-requirement, regression, or
new-hardening, and one operator disposition from three kinds:

1. **Extra cycles**: a bounded grant naming the findings or round it covers and
   the number of additional cycles.
2. **Proceed with override**: the owner accepts the remaining findings.
3. **Corrective revision**: accepted findings become bounded revision tasks,
   and completing them requires a fresh whole-history review.

All three share one append-only authorization record: grant identity, who, when,
rationale, covered findings, allowance, consumption count, terminal state.

Prerequisites carved out as wave-ready items:
`BL-260927-persist-quick-start-prompt` (structured approval record in
quick-start) and `BL-260927-mark-gate-findings-as-new-or` (new vs carried-over
marking the consolidated question needs). Related, different mechanism:
`BL-260711-skip-re-review-for-bookkeeping`. This is a Lane A, project-shaped
item: plan it as its own OAT project, not a wave lane.

## Acceptance Criteria

- At review-cap or gate-budget exhaustion, the workflow presents one
  consolidated decision with findings classified as accepted-requirement,
  regression, or new-hardening, instead of another round or a silent stop.
- The operator disposition is one of extra cycles, proceed with override, or
  corrective revision, and is persisted in the shared append-only authorization
  record with the fields above. Agents never self-issue a disposition.
- Extra cycles: bounded and finding-scoped; failed automatic fix loops and
  unrelated findings still hit the ordinary cap; receive/fix bookkeeping
  consumes allowance deterministically and reports what remains.
- Proceed with override: the exhausted gate yields a machine-readable
  disposition (who, when, which attempt's fixes were not re-gated) that later
  gates and final reviews read.
- Corrective revision: requires explicit authorization, links the source review
  and findings, creates revision tasks derived from accepted findings only,
  and cannot complete without a whole-history review; interrupted, declined,
  and partial revisions resume without losing evidence.
- Final closeout rejects open-ended, mismatched, or unconsumed authorization
  state and preserves an auditable record of every disposition.
- Fixtures cover each disposition kind, exhaustion, decline, resume, unrelated
  findings, and closeout validation, for both phase and final reviews and
  configured gates.
