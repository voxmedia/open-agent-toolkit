---
id: DR-260726-core-shell-scripts-are-hash
title: Core shell scripts are hash-pinned
date: 2026-07-26
status: accepted
legacy_id: null
---

# Core shell scripts are hash-pinned

## Context

The artistic path has an agent compose HTML from shells. Without integrity checks, an agent could author or alter the interactive scripts those shells carry, turning a presentation surface into arbitrary shipped code.

## Decision

Core shell scripts are hash-pinned and validated as an ordered multiset; authored scripts are rejected outright rather than sanitized.

## Consequences

The artistic path is free in composition but fixed in behavior. Changing shell interactivity requires updating the pinned hashes deliberately, and several HTML-safety gaps become unreachable in practice because artifact scripts cannot originate from the author.
