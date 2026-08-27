---
id: DR-260827-reconcile-a-plan-stop
title: Reconcile a plan STOP condition non-narrowingly with operator direction
date: 2026-08-27
status: accepted
legacy_id: null
---

# Reconcile a plan STOP condition non-narrowingly with operator direction

## Context

Wave 4's drift refresh (with the program-mandated live Codex reread) found codex-cli 0.149.1 has no --full-auto while codex-skill used it — the plan's own STOP #2 wording. The operator chose to reconcile rather than park the lane.

## Decision

Treat replacing the dead flag with the live documented approval flags as part of the plan's step 2 and Done criterion 4 (consistent, valid, authorization-gated examples), recorded once in the wrapper's Drift Refresh Record; each example row re-evaluated for sandbox semantics rather than swapped mechanically.

## Consequences

WHERE the fix lands changed, WHAT must be true did not; a mechanical swap on the danger-full-access row would have weakened sandbox posture and was caught by cross-model review before commit; the reconciliation is pointer-only elsewhere.
