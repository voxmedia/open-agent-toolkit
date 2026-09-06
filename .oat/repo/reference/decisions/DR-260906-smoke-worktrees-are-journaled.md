---
id: DR-260906-smoke-worktrees-are-journaled
title: Smoke worktrees are journaled before creation and cleanup refuses
  unproven ownership
date: 2026-09-06
status: accepted
legacy_id: null
---

# Smoke worktrees are journaled before creation and cleanup refuses unproven ownership

## Context

Wave 3 p02. The deterministic smoke runner created git worktrees before journaling them, so an interruption or concurrent run left worktrees and branches that cleanup refused to touch (sixteen leaked branches accumulated).

## Decision

The runner reserves a nested resource in its ownership journal before git worktree add; cleanup reconciles reserved entries only after re-deriving run-directory containment and run-baseline equality from reserved origin (reservedAt required), re-reads the branch tip immediately before deletion, and keeps Git's checked-out-branch protection. Direct registrations keep their looser containment for scripts/worktree/init.sh.

## Consequences

A foreign branch created with the reserved name at the exact reserved baseline inside the reserve-to-create window is indistinguishable and is deleted; this residual is documented in code, CONTRACT.md, and a pinning test because closing it would require mutating Git before intent is durable.
