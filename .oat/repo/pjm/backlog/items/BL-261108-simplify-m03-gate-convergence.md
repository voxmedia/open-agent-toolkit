---
id: BL-261108-simplify-m03-gate-convergence
title: Simplify m03 gate convergence and finding-class machinery
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - reviews
  - gates
  - simplification
  - skills
assignee: null
created: 2026-11-08T16:55:06.904Z
updated: 2026-11-08T16:55:06.904Z
associated_issues: []
external_plans: []
---

## Description

The PR #407 (review-gate-integrity m03) self-review found machinery that no observed case needs, and the operator deferred it so m03 could land without rerunning its gates. Source: review-gate-integrity-goal implementation.md Deferred Findings (PR #407 self-review and Cursor Bugbot lines). (1) gate/convergence.ts infers a plan gate's amendment from approval dates and carriers (about 150 source and 300 test lines) though no plan gate has rerun within one amendment; have the gate record its subject at dispatch instead, or drop plan-gate linking. (2) One 8-line finding-routing paragraph is copied into 8 planning skills and 6 autonomy-contract rows; replace with a pointer to bookkeeping-findings.md. (3) The awk routing snippet in bookkeeping-findings.md runs only in its own test; delete it and its tests. (4) Fix the Bugbot contradiction: the classes line is never rewritten, yet review-receive says an accepted finding's entry reads accepted-requirement; record operator decisions as an appended line read before the class. (5) Trim duplicate convergence tests across convergence.test.ts and index.test.ts, and derive the two near-copy m02 fixtures in-test.

## Acceptance Criteria

- Plan-gate sequence linking no longer infers amendments from approval dates and carriers: either the gate records its subject at dispatch and links only matching runs, or plan-gate linking is removed; the milestone exit-gate and scope sequences keep their current results on the m02 fixtures.
- The finding-routing paragraph appears once, in `.agents/docs/bookkeeping-findings.md`; the planning skills and autonomy-contract rows point to it, and their contract pins check the pointer.
- The awk routing snippet and its tests are removed; the routing rule stays pinned as prose.
- Operator decisions on routed findings are recorded as an appended line beside the `**Finding classes:**` line, routing reads the latest decision before the class, and `bookkeeping-findings.md` and review-receive agree.
- Each convergence failure is tested at one layer, and the stuck and reworded fixtures are derived in-test from the captured m02 run.
