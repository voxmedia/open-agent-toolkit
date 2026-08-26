---
id: BL-260818-distinguish-operator-directed
title: Distinguish operator-directed review rounds from failed fix cycles in the
  review-cycle cap
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - workflow
  - review
  - skills
assignee: null
created: 2026-08-18T00:01:02.918Z
updated: 2026-08-20T00:51:38.943Z
associated_issues: []
external_plans: []
---

## Description

The three-cycle review governance cap in oat-project-review-provide/receive
counts artifacts per scope, so explainer-improvements-v2's final scope exceeded
it by round 3 of 6 even though rounds were operator-directed and every round
through round 5 found real defects. The standing override had to be re-recorded
manually at each subsequent round. Let the cap distinguish failed automatic fix
loops (its target) from explicitly operator-directed continuation through a
bounded, finding-scoped authorization record rather than a broad scope exemption.
Related (different mechanism): `BL-260711-skip-re-review-for-bookkeeping` (Skip
re-review for bookkeeping-only review findings) covers skipping redundant
bookkeeping-only re-reviews. Sources: explainer-improvements-v2 retro RP-04 and
[GitHub issue #200](https://github.com/voxmedia/open-agent-toolkit/issues/200),
linked during the 2026-08-19 issue-triage pass.

## Acceptance Criteria

- An explicit operator authorization identifies the findings or review round it
  permits and grants a bounded number of additional cycles; it does not exempt
  an entire scope indefinitely.
- Authorization is recorded append-only in project state with grant identity,
  rationale, covered findings, allowance, consumption count, and terminal state.
- Failed automatic fix loops and unrelated findings still hit the ordinary cap
  unchanged.
- Receive/fix bookkeeping consumes the correct authorization deterministically
  and reports remaining allowance in structured output.
- Final closeout rejects open-ended, mismatched, or unconsumed authorization
  state and preserves an auditable record of every granted extra cycle.
- Focused fixtures cover authorization, bounded consumption, unrelated findings,
  exhaustion, and closeout validation.
