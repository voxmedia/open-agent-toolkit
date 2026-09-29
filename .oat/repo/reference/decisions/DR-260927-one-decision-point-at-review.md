---
id: DR-260927-one-decision-point-at-review
title: One decision point at review and gate exhaustion
date: 2026-09-27
status: accepted
legacy_id: null
---

# One decision point at review and gate exhaustion

## Context

Three open items each proposed a separate mechanism for continuing after a
review cycle cap or a configured gate's attempt budget is exhausted:
`BL-260818-distinguish-operator-directed` (bounded operator-directed extra
cycles, GitHub #200 and the consolidated scope decision in #207),
`BL-260927-record-owner-overrides` (an owner proceeding past an exhausted
blocking gate, GitHub #327), and `BL-260901-add-corrective-revision` (turning a
design-level finding into revision work). The contract today only allows
stopping, so each real continuation is recorded as prose, outside the contract,
and later steps cannot read it. The 2026-09-26 backlog review asked for the
three to be merged before any planning.

## Decision

Design the budget-exhausted moment once, as one decision point for reviews and
configured gates.

- At exhaustion the workflow asks one consolidated question: cumulative
  findings classified as accepted-requirement, regression, or new-hardening,
  and one operator disposition.
- The disposition has three kinds: bounded finding-scoped extra cycles;
  proceed with override (accept the remaining findings); or corrective
  revision (revision tasks from accepted findings, then a whole-history
  review).
- All three share one append-only authorization record (grant identity, who,
  when, rationale, covered findings, allowance, consumption, terminal state).
  Agents never self-issue a disposition.

`BL-260818-distinguish-operator-directed` is rewritten as the umbrella item.
`BL-260927-record-owner-overrides` and `BL-260901-add-corrective-revision` are
closed as superseded by it. Two independent prerequisites are carved out as
wave-ready items: `BL-260927-persist-quick-start-prompt` and
`BL-260927-mark-gate-findings-as-new-or`.

Rejected alternatives: keep corrective revision as a separate item (it creates
work rather than recording a choice, but it starts at the same moment and needs
the same record); merge with no carve-outs (nothing would become wave-ready
until the whole L-sized item is planned).

## Consequences

- One authorization record format and one "cap reached" section in the
  lifecycle skills, instead of three.
- The umbrella is a Lane A, project-shaped item. It is planned as its own OAT
  project and counts as the one review-chain item for any wave it joins.
- The carve-outs can run in a wave now. The finding-marking carve-out is a
  prerequisite for the consolidated question.
- GitHub issues #200, #207, and #327 track the umbrella item; #327's
  quick-start and finding-marking gaps are tracked by the carve-outs.
