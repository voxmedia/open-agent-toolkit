---
id: DR-260716-strict-fail-closed-receipt
title: Strict fail-closed receipt validation
date: 2026-07-16
status: accepted
legacy_id: null
---

# Strict fail-closed receipt validation

## Context

Provider markers, installed CLI fallbacks, or malformed route output could otherwise claim an invalid inline route.

## Decision

Accept inline routing only when the gate-owned receipt has the expected decision shape, checkout root, runtime, model context, and run correlation.

## Consequences

Missing or contradictory evidence delegates through an awaited route or refuses; cross-checkout and stale installed CLI results cannot pass.
