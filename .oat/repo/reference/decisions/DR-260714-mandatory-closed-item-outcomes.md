---
id: DR-260714-mandatory-closed-item-outcomes
title: Mandatory closed-item outcomes
date: 2026-07-14
status: accepted
legacy_id: null
---

# Mandatory closed-item outcomes

## Context

Closing a backlog item without a summary emitted literal TODO text into the durable completed-item ledger.

## Decision

Validate and trim a nonblank summary before any closed-path mutation while preserving summary-free wont-do behavior.

## Consequences

Completed history contains normalized real outcomes, and invalid close attempts leave item files and indexes untouched.
