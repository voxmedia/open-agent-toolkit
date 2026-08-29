---
id: BL-260829-order-phase-bookkeeping-before
title: Order phase bookkeeping before per-phase review dispatch
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - reviews
  - orchestration
  - workflow
  - efficiency
assignee: null
created: 2026-08-29T19:18:15.323Z
updated: 2026-08-29T19:18:15.323Z
associated_issues: []
external_plans: []
---

## Description

oat-project-implement dispatches the per-phase reviewer before its Step 7 bookkeeping commit, so the reviewer always evaluates a head where implementation.md and state.md are stale by construction. Reviewers correctly raise this as an Important finding every phase, consuming review rounds on non-defects. Distinct from BL-260711-skip-re-review-for-bookkeeping, which avoids the second review after such findings; this item prevents the finding from being generated at all.

## Acceptance Criteria

- A per-phase reviewer no longer receives a head whose `implementation.md` and
  `state.md` are stale for the phase under review, by one of: committing phase
  bookkeeping before the review dispatch, or explicitly declaring the project
  ledger out of scope at the reviewed head in the reviewer's brief.
- Whichever direction is chosen preserves the reason the current ordering
  exists: the tree must still be clean when a bounded fix child is dispatched
  after the review. The current sequence defers bookkeeping precisely so the
  tracked project log does not dirty the tree the fix child's preflight
  requires.
- The change is verified against a real multi-phase run, not only reasoning: a
  phase completes and its review returns without a bookkeeping finding.
- Relationship to `BL-260711-skip-re-review-for-bookkeeping` is recorded in
  whichever item is implemented second, so the two are not solved twice.

## Evidence (2026-08-29, portable-agent-references)

Observed three times in a single two-phase project:

- p01 round 1 (`reviews/archived/p01-review-2026-08-29T000007Z.md`, finding I1)
  flagged `implementation.md` recording none of six completed tasks.
- p01 round 2 (`reviews/archived/p01-review-2026-08-29T040642Z.md`) flagged the
  same class again: the round-1 fix closed `implementation.md` but left
  `state.md` reading `oat_current_task: p01-t01` against `implementation.md`'s
  `p02-t01` — two authoritative resume pointers disagreeing, the stale one
  aimed at a completed task.
- p02 round 1 (`reviews/archived/p02-review-2026-08-29T080559Z.md`) flagged it
  a third time for phase 2.

Each was raised at Important severity, correctly by the reviewer's contract,
and none was an implementation defect. At least one extra review round was
consumed. The root agent's own error compounded it — twice fixing only the file
a finding named rather than the class — which is itself evidence that the
current ordering makes this trap easy to fall into repeatedly.

Source: `.oat/projects/shared/portable-agent-references/references/project-retro.md`,
item UP-01.
