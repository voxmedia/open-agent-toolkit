---
id: DR-260928-commit-the-phase-task-ledger
title: Commit the phase task ledger before per-phase review dispatch
date: 2026-09-28
status: accepted
legacy_id: null
---

# Commit the phase task ledger before per-phase review dispatch

## Context

oat-project-implement dispatched the per-phase reviewer before committing the phase's task and phase completion bookkeeping, so reviewers saw a stale ledger and resume pointers could name completed tasks (BL-260829-order-phase-bookkeeping-before). The old order existed so the fix child starts from a clean tree.

## Decision

Commit the phase task ledger (implementation.md task and phase completion, the state.md resume pointer, and recovery-marker settlement) before dispatching the per-phase reviewer. Review-outcome bookkeeping (review rows, dispositions) stays post-review and is named out of scope in the reviewer brief. The phase row stays nonterminal until review dispositions, queued fixes, and selected gates settle.

## Consequences

The fix child still starts from a clean tree because pre-review bookkeeping is committed. Gates and lifecycle skills run the installed release, so BL-260829 stays open until live observation on the next multi-phase project. The Step 7a push anchor is part of the synced bookkeeping-sites contract. Shipped in backlog-wave-2.
