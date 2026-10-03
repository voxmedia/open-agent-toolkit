---
id: BL-261001-run-a-complexity-review-when
title: Run a complexity review when a review or gate budget is exhausted
status: closed
priority: high
scope: feature
scope_estimate: M
labels:
  - workflow
  - review
  - skills
assignee: null
created: 2026-10-01T17:36:21.076Z
updated: '2026-10-02T22:52:15Z'
associated_issues: []
external_plans: []
---

## Description

First slice of `BL-260818-distinguish-operator-directed`, shippable without its
shared authorization record.

When a review cycle cap or a configured gate's attempt budget is exhausted, the
root agent automatically dispatches one read-only subagent that runs the
`complexity-review` skill, then presents its result together with the reasons
the loop stopped, in one decision message. The operator still decides; agents
never pick the disposition.

Exhaustion points: the per-phase root review cap in
`oat-project-implement/references/phase-execution.md` (bounded fix loop), an
exhausted configured gate's `maxAttempts` (phase gates, the quick-start plan
gate QS-12, the final and exit gates in `completion-and-closeout.md`), the
final review cap, and the three-cycle cap in `oat-project-review-receive`.

The subagent's scope is the reviewed target (the phase commit range, or the
plan bundle for a plan gate), the contract sources (backlog items, discovery,
spec, design, decision records), and every review artifact from the exhausted
loop. It reads committed content only when another writer may own the
worktree, writes nothing, and launches no further agents.

The decision message shows: why the loop stopped (open findings classified as
accepted-requirement, regression, or new-hardening, with families that recur
across rounds called out); the complexity verdict and ledger highlights; which
open findings a recommended simplification would dissolve rather than fix;
items marked REQUIRES-OPERATOR in plain terms; and a recommended disposition
from extra cycles, proceed with override, corrective revision, or simplify.
The report is saved beside the review artifacts and referenced from the
recorded disposition.

Dependency: `complexity-review` is not bundled with OAT today (it is installed
at user scope from tkstang/skills). Decide whether to bundle it in an OAT pack
(recommended, so the behavior is consistent) or to probe for it and degrade to
the decision message without a report plus an install hint.

Evidence: see the 2026-10-01 addition to `BL-260818-distinguish-operator-directed`
(Wave 3 p03: an operator-requested complexity review ended a non-converging
review loop).

## Acceptance Criteria

- At every exhaustion point listed above, the root dispatches one read-only
  complexity-review subagent with the scope above before showing the decision
  (and before an autonomous boundary report); a test or contract pin covers
  each exhaustion point.
- The decision message carries the loop's open findings with recurring
  families called out, the complexity verdict, the findings a simplification
  would dissolve, REQUIRES-OPERATOR items, and a recommended disposition that
  includes **simplify**.
- The operator's choice is recorded in `implementation.md` with the
  complexity report path; agents never self-select it, including under
  `OAT_AUTONOMOUS=1`.
- The `complexity-review` dependency is resolved (bundled, or probed with a
  documented degraded path), and the subagent writes nothing.
- Optional early trigger: two consecutive High findings in the same family
  within one loop offer the same review before the cap (opt-in).
- Skill version bumps for every changed lifecycle skill; docs describe the
  behavior.
