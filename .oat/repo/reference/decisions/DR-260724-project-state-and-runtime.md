---
id: DR-260724-project-state-and-runtime
title: Project state and runtime availability separation
date: 2026-07-24
status: accepted
legacy_id: null
---

# Project state and runtime availability separation

## Context

Shared .oat/config.json tools flags previously combined project- and user-scoped packs, causing repository-owned config to represent one developer’s machine state while workflows still needed effective availability.

## Decision

Treat shared tools flags as project installation state only, and use oat tools has to compute current project-plus-user runtime availability.

## Consequences

Tracked config remains repository-truthful and user-scoped packs remain usable by pack-gated workflows, at the cost of a dedicated capability API and consumer migration.
