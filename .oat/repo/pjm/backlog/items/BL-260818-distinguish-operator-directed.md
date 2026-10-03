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
updated: 2026-10-02T22:53:49Z
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

### Complexity review at exhaustion (added 2026-10-01)

Operator direction from Wave 3 (`backlog-wave-3`, phase p03): whenever a review
cycle cap or a configured gate's attempt budget is exhausted, the root agent
automatically runs a complexity review through a read-only subagent and
presents its findings together with the reasons the loop stopped. Addressing
the complexity review can remove the cause of the repeated loops instead of
patching one more symptom.

Evidence: every exhausted loop observed in Waves 2 and 3 had a mechanism-level
cause rather than a run of independent defects. The Wave 2 plan gate blocked
eleven times on broad sweeps; the Wave 3 plan gate used both attempts on new
sequencing findings; and p03 of Wave 3 hit the three-round cap with three
consecutive Highs in one family (field-by-field brief binding could not
converge). An operator-requested complexity review replaced that mechanism
with rebuild-and-compare, deleted an unrequired rule, cut 672 lines, and the
phase gate then passed.

This adds a fourth operator disposition, **simplify**: apply the complexity
review's recommendations as bounded tasks, then run one review or gate over the
result. The first slice ships as `BL-261001-run-a-complexity-review-when`;
this item keeps the consolidated question and the shared authorization record.

### Shipped in backlog wave 4 (2026-10-02)

`BL-261001-run-a-complexity-review-when` closed in backlog wave 4 (p04).
`oat-project-implement` (root review retry, phase gate retry, final review
cap, exit gate block), `oat-project-review-receive` (cycle cap), and
`oat-project-quick-start` (QS-12 plan gate block) now dispatch one read-only
complexity review before the exhaustion decision message, also in the
`OAT_AUTONOMOUS=1` boundary report. The report classifies each open finding
as accepted-requirement, regression, or new-hardening and lists the findings a
recommended simplification would dissolve. The decision message offers
**simplify** (route the accepted simplifications through the owning skill's
revision path, then review the revised work again); the operator always
chooses, and the choice is recorded with the report path in
`implementation.md`. The condensed guidance is defined once in
`.agents/docs/complexity-review-fallback.md`. The sibling gate-capable skills
are a separate follow-up. The criteria below no longer ask for any of that;
what stays open is the consolidated question across all dispositions and the
shared authorization record.

## Acceptance Criteria

- At review-cap or gate-budget exhaustion, the workflow presents one
  consolidated decision with findings classified as accepted-requirement,
  regression, or new-hardening, instead of another round or a silent stop
  (reuse the classification the wave 4 complexity report already produces).
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
- The **simplify** disposition (offered since wave 4, recorded today only as
  an `implementation.md` line) is recorded in the shared authorization record
  like the other three.
