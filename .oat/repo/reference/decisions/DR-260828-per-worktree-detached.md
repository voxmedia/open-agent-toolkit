---
id: DR-260828-per-worktree-detached
title: Per-worktree detached checkouts
date: 2026-08-28
status: accepted
legacy_id: null
---

# Per-worktree detached checkouts

## Context

A single shared artifact checkout would let concurrent agents overwrite live files without Git conflict boundaries.

## Decision

Materialize an independent detached synced-project checkout inside each parent worktree and reconcile those checkouts through the project remote ref.

## Consequences

Agents gain filesystem isolation and ordinary rebase conflicts, at the cost of pull-before-read and push-after-write discipline.
