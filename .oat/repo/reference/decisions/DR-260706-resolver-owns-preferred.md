---
id: DR-260706-resolver-owns-preferred
title: Resolver owns preferred selection
date: 2026-07-06
status: accepted
legacy_id: null
---

# Resolver owns preferred selection

## Context

Implementer and fix callers pass a preferred effort or model to the resolver and use the resolver-returned dispatch args; capped policies select min(preferred, cap), while managed uncapped selects the preferred value.

## Decision

Make the resolver the single source of truth for joining a preferred
implementer/fix target with the active dispatch policy and provider adapter.

## Consequences

Callers pass `--preferred` for implementer and fix dispatch and use the
resolver-returned dispatch args. They do not derive a selected variant or model
from the policy label or cap alone.
