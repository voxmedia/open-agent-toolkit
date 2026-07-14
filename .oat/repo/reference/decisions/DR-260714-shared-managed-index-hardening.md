---
id: DR-260714-shared-managed-index-hardening
title: Shared managed-index hardening
date: 2026-07-14
status: accepted
legacy_id: null
---

# Shared managed-index hardening

## Context

Atomic backlog creation exposed user-controlled Markdown cells and marker-like content at the shared managed-index renderer boundary.

## Decision

Encode every managed-table cell and require exact standalone managed markers in the shared index regeneration implementation.

## Consequences

All callers receive the safety fix, curated content remains untouched, and creation remains idempotent without command-specific index logic.
