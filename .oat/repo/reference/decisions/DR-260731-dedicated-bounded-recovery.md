---
id: DR-260731-dedicated-bounded-recovery
title: Dedicated bounded recovery state
date: 2026-07-31
status: accepted
legacy_id: null
---

# Dedicated bounded recovery state

## Context

The review-loop retry counter is semantically wrong for phase recovery, can be disabled independently, and cannot cover the observed nine-event disruption.

## Decision

Use a dedicated per-phase recovery policy with a default limit of 10 and project or phase overrides from 0 to 20. Reserve and consume an attempt before editing, preserve nondecreasing usage, and keep committed terminal evidence until root validation authorizes clearing.

## Consequences

There are no free repair retries or silent counter resets. The final reserved attempt can reach a terminal state, but exhaustion without a reservation cannot begin new repair, and invalid ledger transitions fail closed.
