---
id: DR-260826-merge-phase-branches-without
title: Merge phase branches without rebase to preserve reviewed SHAs
date: 2026-08-26
status: accepted
legacy_id: null
---

# Merge phase branches without rebase to preserve reviewed SHAs

## Context

Wave phase branches touched only code while the integration branch advanced only under .oat/projects/, so rebasing before merge would have rewritten SHAs cited by the review chain without resolving any real conflict.

## Decision

Merge phase branches with git merge --no-ff in plan order without rebasing when their write surfaces are disjoint from the integration branch's advance.

## Consequences

Every reviewed SHA remains reachable and unchanged in history; rebase-first stays the rule when lanes touch shared surfaces.
