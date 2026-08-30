---
id: DR-260827-repository-owned-pjm-adoption
title: Repository-owned PJM adoption
date: 2026-08-27
status: accepted
legacy_id: null
---

# Repository-owned PJM adoption

## Context

PJM skills and templates can be reusable user capability, but repository state and policy must never be created merely because that capability is installed globally.

## Decision

Keep PJM adoption explicit and repository-owned behind a four-state fail-closed guard while allowing reusable capability and managed defaults at user scope.

## Consequences

Unadopted or partial repositories receive actionable no-write failures; backlog, roadmap, decisions, policy, state, and overrides remain repository-local.
