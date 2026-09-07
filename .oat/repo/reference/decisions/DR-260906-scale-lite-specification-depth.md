---
id: DR-260906-scale-lite-specification-depth
title: Scale Lite specification depth from observable triggers
date: 2026-09-06
status: accepted
legacy_id: null
---

# Scale Lite specification depth from observable triggers

## Context

The original Lite plan collapsed discovery and design into one artifact but required only a fixed core section set, which could omit user-visible behavior and implementation context needed to remove ambiguity.

## Decision

Require numbered Product Behavior when user-visible behavior changes and Technical Design when work crosses module boundaries, changes data or state formats, or changes a contract consumed by another surface. Permit the minimal shape only when neither trigger applies.

## Consequences

Lite plans remain compact for mechanical work while larger behavioral or technical changes retain the context needed for implementation and review. Oversized sections still promote the project to Quick.
