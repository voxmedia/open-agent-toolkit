---
id: DR-260718-keep-sync-state-in-sync-config
title: Keep sync state in sync config
date: 2026-07-18
status: accepted
legacy_id: null
---

# Keep sync state in sync config

## Context

User knownStrays previously lived in general user config even though they control provider sync, creating inconsistent ownership and a data-loss window during config normalization.

## Decision

Store project and user known-stray choices in their respective sync config files and migrate legacy user entries canonical-first before sync resolution or general user-config writes.

## Consequences

Sync state has consistent ownership, migration is idempotent, and unrelated user-config writes cannot erase legacy known-stray choices.
