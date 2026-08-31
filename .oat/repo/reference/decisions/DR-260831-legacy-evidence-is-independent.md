---
id: DR-260831-legacy-evidence-is-independent
title: Legacy evidence is independent
date: 2026-08-31
status: accepted
legacy_id: null
---

# Legacy evidence is independent

## Context

PJM adoption states describe repository structure but do not prove that a recognized legacy migration source exists.

## Decision

Resolve adoption for context while inventorying recognized legacy input independently; allow migration writes only when legacy evidence exists and report already-migrated only for a complete current scaffold.

## Consequences

Migration remains fail-closed, genuine legacy layouts can migrate from any adoption state, and repositories without migration evidence receive state-specific guidance with zero writes.
