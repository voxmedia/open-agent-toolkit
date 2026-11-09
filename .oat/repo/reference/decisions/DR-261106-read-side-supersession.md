---
id: DR-261106-read-side-supersession
title: Read-side supersession of received review rows
date: 2026-11-06
status: accepted
legacy_id: null
---

# Read-side supersession of received review rows

## Context

Stranded received rows in a project's Reviews table routed the router back to receive and blocked closeout (#194), and a mutating bookkeeping repair would have set another event to passed, which the bookkeeping definition's third limit forbids, and would have disposed of a failed gate run the operator ruled receives no further disposition (review-gate-integrity m02 re-alignment, 2026-11-03).

## Decision

A received Reviews row is superseded on the read side by a later row of the same Scope, Type and Invocation class (gate or lifecycle) that records a review at the same or a descendant Reviewed Head. Readers that select a review event ignore a superseded row, and the read-only, advisory oat review check reports superseded rows and duplicate event keys. Rows of different classes never supersede each other, and a row whose Invocation or Reviewed Head is - is never superseded. Nothing edits, promotes or deletes a superseded row.

## Consequences

No Reviews column, status or mutating repair command is added, and goal-path Reviews rows are never edited for supersession. A manual round cannot hide an unreceived gate row. Readers that cannot run git, such as the pure control-plane router, depend on ancestry the CLI caller precomputes. Shipped in review-gate-integrity m02 (PR #403).
