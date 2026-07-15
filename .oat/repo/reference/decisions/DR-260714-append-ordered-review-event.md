---
id: DR-260714-append-ordered-review-event
title: Append-ordered review event identity
date: 2026-07-14
status: accepted
legacy_id: null
---

# Append-ordered review event identity

## Context

Two legitimate reviews can share a scope, so scope-only ledger updates overwrite independent events and can regress a passed status.

## Decision

Identify each review event by scope, type, and artifact filename; preserve append order, match later mutations by artifact, and route current-state reads from the latest matching event.

## Consequences

Multiple same-scope rows remain visible and monotonic without a table schema change. Agent writers must preserve event order, and readers that need current state must select the latest matching event.
