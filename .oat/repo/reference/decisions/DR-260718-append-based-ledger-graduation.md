---
id: DR-260718-append-based-ledger-graduation
title: Append-based ledger graduation
date: 2026-07-18
status: accepted
legacy_id: null
---

# Append-based ledger graduation

## Context

Promoting a reusable project-scoped observation by mutating or annotating its original entry would violate the append-only history contract.

## Decision

Promote an observation by appending a new general-scoped judgment that references the original heading before roll-up.

## Consequences

The original remains immutable, the promotion is auditable, and the normal roll-up path selects the new entry for the repository ledger without extra metadata.
