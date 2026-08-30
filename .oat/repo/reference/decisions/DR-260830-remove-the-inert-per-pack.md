---
id: DR-260830-remove-the-inert-per-pack
title: Remove the inert per-pack force option
date: 2026-08-30
status: accepted
legacy_id: null
---

# Remove the inert per-pack force option

## Context

The per-pack --force option was advertised but ignored, and the lifecycle has no supported destructive overwrite contract for it to invoke.

## Decision

Remove the inert flag instead of inventing overwrite semantics, and document tools update or scoped removal as the supported operations.

## Consequences

The public CLI matches implemented behavior and avoids implying destructive guarantees that the additive lifecycle does not provide.
