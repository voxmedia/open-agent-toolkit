---
id: DR-260718-family-aware-gate-exclusions
title: Family-aware gate exclusions
date: 2026-07-18
status: accepted
legacy_id: null
---

# Family-aware gate exclusions

## Context

Planning gates and final aggregate reviews may lack claimable producer runtime identity, causing same-family reviewer selection.

## Decision

Use declared planning identity and classifiable configured stamp targets only as confidence-preserving family exclusions, while keeping known producers authoritative and never promoting inferred targets into runtime identity.

## Consequences

Gate diversity improves without hardcoded targets or false identity claims; malformed or unavailable evidence safely degrades to existing unknown-producer behavior.
