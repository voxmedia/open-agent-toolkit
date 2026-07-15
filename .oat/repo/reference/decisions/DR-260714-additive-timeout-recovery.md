---
id: DR-260714-additive-timeout-recovery
title: Additive timeout recovery envelopes
date: 2026-07-14
status: accepted
legacy_id: null
---

# Additive timeout recovery envelopes

## Context

A gate process can reach its timeout after writing a complete run-correlated review artifact, while zero-output timeouts also need to remain distinguishable without destabilizing established routing.

## Decision

After timeout, re-scan for a unique artifact with the invocation run ID and pass it through existing validation; add lateCompletion to recovered ordinary envelopes and noOutputProduced to unrecovered timeout failures.

## Consequences

Completed reviews can be recovered without rerunning them, and orchestrators gain zero-output telemetry. Existing status, threshold, handoff, attempt-accounting, and target-selection semantics remain unchanged.
