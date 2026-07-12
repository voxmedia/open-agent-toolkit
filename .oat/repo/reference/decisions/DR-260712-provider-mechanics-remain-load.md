---
id: DR-260712-provider-mechanics-remain-load
title: Provider mechanics remain load-one-only references
date: 2026-07-12
status: accepted
legacy_id: null
---

# Provider mechanics remain load-one-only references

## Context

Resolve the active provider before loading Claude, Codex, or Cursor mechanics so volatile catalogs and harness-specific controls are not merged into a false universal policy.

## Decision

Resolve the active provider and dispatch context first, then load exactly one
provider reference for that launch boundary. Provider references describe
native controls, catalog visibility, exact selector handling, and alternate
routes without redefining the generic dispatch policy.

## Consequences

- Catalog evidence remains scoped to the dispatcher that will launch the child.
- Claude, Codex, and Cursor mechanics can evolve independently without being
  flattened into unsupported shared assumptions.
- Calling skills and the generic engine must not read every provider reference
  or persist volatile observed catalogs as durable configuration.
- Unsupported providers use the neutral contract and fail closed when exact
  launch controls cannot be established.
