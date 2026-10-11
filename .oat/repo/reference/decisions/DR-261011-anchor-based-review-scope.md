---
id: DR-261011-anchor-based-review-scope
title: Anchor-based review scope for brief modes
date: 2026-10-11
status: accepted
legacy_id: null
---

# Anchor-based review scope for brief modes

## Context

Brief commit messages label execution records, but inferring review ranges from a commit-message search misses commits and breaks on parallel integration and bookkeeping commits.

## Decision

Brief review and progress-PR ranges come from the journal's recorded '**Base:**' and '**Head:**' anchors: one phase is Base..Head, a pNN-pMM run and final span the first selected base through the aggregate head, and revision phases p-revN are included in final. Every base and head must exist with base an ancestor of head; sequential phases continue; a parallel group shares its fork base and member heads advance in document order (the merge-commit property is not enforced because a member may be integrated by cherry-pick). Missing anchors widen to the confirmed merge-base range; invalid or contradictory anchors stop and route to oat-project-reconcile. A group member's per-phase review runs before fan-in on EXPECTED_HEAD..<worktree head>. Review artifacts record oat_review_scope_source and the anchor fields.

## Consequences

Commit-message matches only label commits and never narrow the range. The root writes Base in the phase-start commit, the committing owner writes Head when the phase's work ends, and fixes after a later phase has started become an appended p-revN phase (late-fix rule). Reconcile owns anchor repair.
