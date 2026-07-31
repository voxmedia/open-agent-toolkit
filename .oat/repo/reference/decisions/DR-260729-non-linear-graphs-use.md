---
id: DR-260729-non-linear-graphs-use
title: Non-linear graphs use the artistic path
date: 2026-07-29
status: accepted
legacy_id: null
---

# Non-linear graphs use the artistic path

## Context

A deterministic inline renderer cannot both reject unsupported branches, fan-ins, and cycles and preserve their complete semantics without becoming a general graph-layout engine.

## Decision

Detect non-linear topology and route it to the artistic composer while validating the complete parsed graph semantics before publication.

## Consequences

Unsupported graphs are never silently flattened, and the deterministic renderer remains intentionally bounded.
