---
id: BL-261108-stop-workflow-owned-commits
title: Stop workflow-owned commits from staling goal delivery evidence
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - goal
  - freshness
  - gates
  - delivery
assignee: null
created: 2026-11-08T21:52:19.434Z
updated: 2026-11-08T21:52:19.434Z
associated_issues: []
external_plans: []
---

## Description

oat project delivery check treats every commit after a reviewed head as a disallowed successor unless classifyPath (packages/cli/src/commands/project/delivery/evidence.ts) allows it, and today it only allows the project's lifecycle files plus the review artifacts of the evidence being checked. Commits the workflow makes itself therefore stale milestone evidence: the gate CLI committing another run's review artifact staled m01 exit run 3 in review-gate-integrity-goal (successor 40e839667), and a .oat/repo backlog write after m02's reviewed head staled m02's evidence, which was worked around by dropping and refiling the commit and pushed decision records past their delivery. Source: review-gate-integrity-goal project retro UP-02; learnings rgi-m01-gate-artifact-freshness and rgi-learning-m02-01. BL-260820 deliberately prefers a documented deterministic rule over a broad freshness exemption, so this item keeps the allowlist narrow.

## Acceptance Criteria

- A commit that only adds, modifies or removes files under the project's own `reviews/` or `reviews/archived/` is a bookkeeping successor for every delivery check, not only for the evidence it belongs to.
- Decide, and record in the brief contract section 12.8 or a decision record, whether `.oat/repo/pjm/backlog/**` writes are bookkeeping successors. Decision records stay counted; the workflow commits them before the milestone gates instead.
- Tests cover a successor that commits another run's review artifact (fresh) and a successor that also touches code (still stale).
