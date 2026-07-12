---
id: DR-260712-accepted-launches-are-not
title: Accepted launches are not silently replaced
date: 2026-07-12
status: accepted
legacy_id: null
---

# Accepted launches are not silently replaced

## Context

Keep launch acceptance, child outcome, and runtime confirmation as separate evidence. Permit automatic route replacement only after a recorded pre-start rejection, never after an accepted timeout, interruption, refusal, or task failure.

## Decision

Treat an accepted child launch as terminal for automatic route replacement.
Record launch acceptance, child outcome, runtime confirmation, and continuation
as separate facts. Select another route automatically only after a recorded
pre-start rejection and within the caller's retry policy.

## Consequences

- Timeouts, interruptions, contract refusals, and task failures after acceptance
  return to the caller as terminal outcomes instead of triggering an unrecorded
  model or route downgrade.
- Continuing the same child through a valid handle preserves its original
  selection and authority evidence.
- Operator-authorized recovery is a new explicit action with a new record, not
  an automatic fallback disguised as continuation.
- Dispatch histories remain auditable even when runtime identity is unavailable
  or differs from launcher-configured evidence.
