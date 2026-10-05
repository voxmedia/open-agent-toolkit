---
id: DR-261005-share-one-hook-safe-exact-path
title: Share one hook-safe exact-path commit primitive
date: 2026-10-05
status: accepted
legacy_id: null
---

# Share one hook-safe exact-path commit primitive

## Context

Lifecycle callers must commit only producer-owned files while retaining enabled hooks and unrelated staged/unstaged Git state; ordinary broad or pathspec-only commits violated these requirements.

## Decision

Use the shared OAT exact-path helper across CLI and skill callers, retaining one operation identity and exact file list through recovery. Resolve Git hooks with Git path semantics.

## Consequences

One owned primitive handles isolated-index hooks, restoration and receipts. Callers remain responsible for producer ownership and truthful recovery guidance; rewritten-history automation remains out of scope.
