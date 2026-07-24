---
id: DR-260724-canonical-project-asset
title: Canonical project asset reconciliation
date: 2026-07-24
status: accepted
legacy_id: null
---

# Canonical project asset reconciliation

## Context

Install, update, and remove paths had duplicated persistence behavior that could write intent-derived or stale tool flags, including direct child command writes before parent reconciliation.

## Decision

After each lifecycle mutation, derive the complete shared tools map from canonical project-scoped assets through one reconciler, omitting the map when no project packs remain.

## Consequences

Filesystem state becomes authoritative, stale flags are cleared consistently, unrelated config is preserved, and default-only shared config is not created.
