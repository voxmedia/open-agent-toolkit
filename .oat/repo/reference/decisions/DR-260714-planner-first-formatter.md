---
id: DR-260714-planner-first-formatter
title: Planner-first formatter resolution
date: 2026-07-14
status: accepted
legacy_id: null
---

# Planner-first formatter resolution

## Context

Normal implementation resolves a repository-owned write/fix command once during planning and supplies a concrete, file-scoped invocation to downstream tasks. Runtime discovery remains a bounded fallback for direct lifecycle work and stale or incomplete plans.

## Decision

Resolve the repository's documented write/fix command during plan authoring and
embed a concrete, file-scoped invocation in every artifact-writing task. Use
runtime discovery only when that supplied instruction is absent or unusable.

## Consequences

Normal implementation agents execute one pre-resolved command instead of
repeating repository discovery. Direct lifecycle writers and stale plans retain
a bounded fallback, and planning must distinguish write/fix commands from
check-only commands.
