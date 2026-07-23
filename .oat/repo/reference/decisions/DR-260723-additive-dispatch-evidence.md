---
id: DR-260723-additive-dispatch-evidence
title: Additive dispatch evidence compatibility
date: 2026-07-23
status: accepted
legacy_id: null
---

# Additive dispatch evidence compatibility

## Context

The dispatch record schema needed guidance, reasoning, service-tier, and freshness evidence without invalidating existing records and callers.

## Decision

Add the new evidence fields as optional and maintain canonical legacy and enriched record fixtures that are validated together.

## Consequences

Older records remain valid, newer launches can preserve richer routing provenance, and compatibility is enforced by executable structural tests.
