---
id: DR-260906-use-a-three-artifact-lite
title: Use a three-artifact Lite project shape
date: 2026-09-06
status: accepted
legacy_id: null
---

# Use a three-artifact Lite project shape

## Context

Lite needs one user-authored artifact while machine progress updates must not dirty the approved plan.

## Decision

Use plan.md as the only authored lifecycle artifact and retain machine-owned state.md and implementation.md.

## Consequences

Lite omits discovery, spec, and design artifacts but preserves resumability and execution bookkeeping.
