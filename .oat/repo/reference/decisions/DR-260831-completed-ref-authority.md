---
id: DR-260831-completed-ref-authority
title: Completed-ref authority
date: 2026-08-31
status: accepted
legacy_id: null
---

# Completed-ref authority

## Context

Standard Git cannot atomically lease a no-op completed-ref update together with deletion of an already-matching active ref.

## Decision

Make `refs/oat/completed/<slug>` authoritative for the archived source SHA; accept completed-only and same-SHA active/completed aliases, and fail closed when the SHAs differ.

## Consequences

A matching active alias may remain inert, so every active surface must honor completed authority while contradictory refs require explicit recovery.
