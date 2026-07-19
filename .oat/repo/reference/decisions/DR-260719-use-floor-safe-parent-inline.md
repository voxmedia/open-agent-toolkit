---
id: DR-260719-use-floor-safe-parent-inline
title: Use floor-safe parent-inline fallback
date: 2026-07-19
status: accepted
legacy_id: null
---

# Use floor-safe parent-inline fallback

## Context

Some nested provider catalogs expose a suitable mechanical worker but no model choice that demonstrably satisfies an intelligent-or-stronger floor.

## Decision

When a declared floor is unsatisfied, do not launch a weaker worker; return the lane to the primary reviewer for inline coverage or a pre-authorized stronger route.

## Consequences

Review coverage remains complete without silent downgrade, and an unsatisfied nested catalog is recorded as successful parent-owned orchestration rather than treated as a reason to weaken acceptance.
