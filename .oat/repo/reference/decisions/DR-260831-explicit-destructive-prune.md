---
id: DR-260831-explicit-destructive-prune
title: Explicit destructive prune
date: 2026-08-31
status: accepted
legacy_id: null
---

# Explicit destructive prune

## Context

Normal completion must preserve SHA-pinned links and recovery history, while operators still need an intentional way to remove terminal reachability.

## Decision

Keep completed refs during normal completion and reserve their deletion, plus matching active-alias cleanup, for the explicit force-gated prune operation.

## Consequences

Permanent-link reachability remains durable by default; prune remains separately destructive and must fail closed on mismatched refs or incomplete local cleanup.
