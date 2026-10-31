---
id: BL-261013-classify-review-findings
title: Classify review findings against the contract at every receive
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - retro
  - reviews
  - gates
assignee: null
created: 2026-10-13T03:25:54.559Z
updated: 2026-10-31T21:08:00Z
associated_issues: []
external_plans: []
---

## Description

OAT workflow feedback from the artifact-cleanup retrospective (UP-01). Today oat-project-review-receive and the implement exit-gate receive convert findings straight into fix tasks; the first place a finding is classified as accepted-requirement, regression or new-hardening is the complexity-review fallback, which runs only after a review or gate budget is exhausted. In artifact-cleanup the exit gate asked for safety between two simultaneous archive runs of one project, a guarantee no discovery, design or decision record named. It was received as a fix task, and two gate attempts plus three review rounds built roughly 570 lines of ownership machinery before the complexity review classified the family as new hardening and the operator had it deleted. Related: BL-260818-distinguish-operator-directed owns the decision point after exhaustion; this item moves the classification earlier, to every receive.

**Delivery status (2026-10-31):** Landed: the root `AGENTS.md` rule "Before
turning a review or gate finding into a fix task", which sends a finding that
no contract source requires to the operator before any fix task exists
(`13a851b73`). Remaining: the receive skills still record no
`accepted-requirement`, `regression` or `new-hardening` class at receive; the
classes appear only in the exhaustion-time fallback
(`.agents/docs/complexity-review-fallback.md`, vendored into three skills), so
every criterion below is open.

## Acceptance Criteria

- Review receive and the implement gate receive record a one-word classification for every finding: `accepted-requirement`, `regression` or `new-hardening`, citing the contract source (discovery, spec, design or decision record) that requires an accepted requirement
- A `new-hardening` finding reaches the operator before any fix task is created; the operator can accept it as a requirement, defer it, or reject it
- The classification is visible to the complexity-review fallback, so an exhausted loop starts from the recorded classes instead of re-deriving them
- A regression fixture shows a finding with no contract source routed to the operator rather than into `plan.md` as a task
