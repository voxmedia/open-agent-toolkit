---
id: BL-260820-bind-each-gate-review
title: Bind each gate review disposition to its exact received ledger event
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - reviews
  - gates
  - lifecycle
  - reliability
assignee: null
created: 2026-08-20T00:51:29.893Z
updated: 2026-10-02T00:21:26Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/194
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/305
external_plans: []
---

## Description

Repeated blocking gate rounds can leave an earlier received lifecycle event
unconsumed when disposition follows a later round. Bind every gate review
disposition to the exact scope, type, artifact, and received-event identity it
consumes so stale events cannot block closeout or route later work incorrectly.
Source: [GitHub issue #194](https://github.com/voxmedia/open-agent-toolkit/issues/194).

Refined by the 2026-09-26 issue triage (GitHub issue #305, author comment):
a downstream quick-mode run showed two writers for one gate event. The gate's
reviewer appends a new `## Reviews` row per artifact
(`oat-project-review-provide` Step 9) while quick-start and plan writing
separately update "the plan row", and `.oat/templates/plan.md` has no `plan`
placeholder row, so one event produced two rows. Artifact-gate rows also leave
Invocation and Gate Target as `-`, and quick-mode scaffolds keep a `design`
row that never resolves. The broader single status authority is tracked in
`BL-260927-derive-current-lifecycle-state`.

## Acceptance Criteria

- A deterministic fixture exercises repeated blocking gate rounds through
  receive, fix, and re-review, and proves no stale `received` gate event remains
  after each disposition.
- Gate/root receive handoffs carry or resolve the exact lifecycle-event identity
  to consume rather than selecting an event from scope and type alone.
- Consumption validates the expected scope, type, artifact, and event identity;
  a mismatch fails closed with structured diagnostics instead of mutating a
  different ledger row.
- Existing single-round review flows remain compatible, and focused lifecycle
  contract tests cover both the legacy path and repeated-round regression.
- Each gate event maps to one `## Reviews` row upserted by (scope, type, artifact); lifecycle skills update that row instead of appending another, and Reviewed Head is preserved across status transitions.
- The plan template carries a `plan` placeholder row, and artifact-gate rows record the gate target.
- Quick-mode scaffolds omit review scopes the mode never uses.

## Markdown docs bootstrap retrospective evidence

[RP-02: terminal receipts and passing sweeps](../../../../projects/shared/markdown-docs-bootstrap/references/project-retro.md#rp-02-add-terminal-receipt-and-passing-sweep-cases-to-exact-gate-binding)
adds controls for the existing exact-event binding. Gate run
`74cf045f-60fb-4931-a434-8cc9eaa5df19` removed its live marker on completion;
a failed marker check did not stop the shell group from persisting receive
intent. No receive ran before receipt reconciliation. The implementation's
**Root receipt-check correction** records the incident and correction.

Terminal receive must consume retained acceptance proof without requiring a
live marker; mismatched or incomplete proof and failed prerequisites must refuse
mutation. A passing threshold with address-now findings preserves raw counts
and consumes no failed remediation attempt. Later source changes retire routing
freshness without rewriting the received event's identity or reviewed head.
These controls strengthen exact consumption and immutable review provenance.
