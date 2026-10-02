---
id: BL-261002-wire-the-complexity-review
title: Wire the complexity review into the sibling gate-capable skills
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - workflow
  - review
  - skills
assignee: null
created: 2026-10-02T22:53:37.882Z
updated: 2026-10-02T22:53:37.882Z
associated_issues: []
external_plans: []
---

## Description

Backlog wave 4 (BL-261001-run-a-complexity-review-when) runs a read-only complexity review at the budget-exhaustion points of oat-project-implement, oat-project-review-receive, and oat-project-quick-start, using the shared guidance in .agents/docs/complexity-review-fallback.md and offering simplify in the decision message. The other skills that run configured gates or review loops do not: oat-project-plan, oat-project-import-plan, oat-project-design, oat-project-discover, and oat-project-lite still stop at an exhausted budget without the review (discovery decision 8 of backlog-wave-4 deferred them to this follow-up).

## Acceptance Criteria

- Each of `oat-project-plan`, `oat-project-import-plan`, `oat-project-design`,
  `oat-project-discover`, and `oat-project-lite` dispatches the complexity
  review at every review-cap or gate-budget exhaustion point it owns, before
  the decision message (and in the `OAT_AUTONOMOUS=1` boundary report), by
  vendoring `.agents/docs/complexity-review-fallback.md`.
- The decision message offers **simplify**, the operator's choice is recorded
  with the report path, and agents never select the disposition.
- Each exhaustion point has a contract pin in
  `packages/cli/src/commands/init/tools/shared/complexity-review-contracts.test.ts`; each
  changed skill is version-bumped, and new autonomy prompt sites are covered.
