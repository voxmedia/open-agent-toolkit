---
id: DR-261003-full-surface-gate-budget
title: Full-surface gate budget and duplicate rejection
date: 2026-10-03
status: accepted
legacy_id: null
---

# Full-surface gate budget and duplicate rejection

## Context

Artifact (full-surface) gate reviews ran under the 15-minute default gate budget, and a nested or repeated gate for the same project and scope could launch a second live run (BL-260718-harden-full-surface-gate). The operator approved a 30-minute default and rejecting duplicates (backlog-wave-4 discovery, Question 3).

## Decision

Full-surface artifact gate reviews default to 1,800,000 ms. A second gate for the same project, review type, and scope is rejected, not reused, while one is live: the gate takes an atomic claim (a private file hard-linked to a per project/type/scope claim path, a dead holder replaced once, released in finally) and reports the outcome as recursion in the JSON envelope. Nested gates receive the claim directory explicitly through OAT_GATE_RUN_MARKER_DIR.

## Consequences

Simultaneous and nested duplicate launches are refused; legacy markers never block; an unreadable marker directory reports recursion: unchecked. Competing stale-claim recovery can still admit a duplicate in a rare orphaned-claim race (BL-261002-serialize-stale-gate-claim). Gate test fixtures must default their own marker directory so an inherited one does not leak claims.
