---
id: DR-260718-cli-owned-log-mutations
title: CLI-owned log mutations
date: 2026-07-18
status: accepted
legacy_id: null
---

# CLI-owned log mutations

## Context

Hand-authored entries, synthesis, summary sections, and ledger output would permit format drift and make append-only and archival guarantees difficult to verify.

## Decision

Require agents and lifecycle skills to invoke oat project log commands for every project-log mutation.

## Consequences

Centralized validation and structured outcomes make the write contract testable, while integrations must call the CLI instead of editing command-owned surfaces.
