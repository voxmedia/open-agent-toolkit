---
id: DR-260830-dependency-owned-provider
title: Dependency-owned provider roots
date: 2026-08-30
status: accepted
legacy_id: null
---

# Dependency-owned provider roots

## Context

Canonical skills can consume agent role instructions from loaded, user, or project installations, and one consumer may depend on multiple packs. A shared ambient root could let an unrelated installed pack satisfy a missing dependency silently.

## Decision

Bind and validate a provider root locally for each consuming dependency. Use ${AGENT_PROVIDER_ROOT} only when one owning pack is in play; use dependency- or pack-qualified names for simultaneous roots, and validate each required canonical target independently.

## Consequences

Roots may resolve to the same physical directory, but one result never substitutes for another dependency. A missing dependency blocks only its own read and reports recovery for the correct pack and intended scope, at the cost of repeating the authored binding pattern per consumer.
