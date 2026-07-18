---
id: DR-260718-native-cursor-variant-dispatch
title: Native Cursor variant dispatch
date: 2026-07-18
status: accepted
legacy_id: null
---

# Native Cursor variant dispatch

## Context

Managed Cursor targets need their definition-level pins to survive dispatch rather than being reconstructed as opaque model arguments.

## Decision

Compile managed targets to deterministic materialized role names and launch the exact native variant first; permit alternate routing only after recorded pre-start role-selection rejection.

## Consequences

Accepted launches are terminal for replacement and dispatch guidance must consume providers.cursor.dispatchArgs.variant.
