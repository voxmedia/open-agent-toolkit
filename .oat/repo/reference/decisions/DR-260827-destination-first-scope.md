---
id: DR-260827-destination-first-scope
title: Destination-first scope migration
date: 2026-08-27
status: accepted
legacy_id: null
---

# Destination-first scope migration

## Context

Moving managed packs between project and user scope could cause capability loss if source removal happened before the destination was complete.

## Decision

Preview the move, materialize and verify the destination, then require explicit confirmation before removing the source.

## Consequences

Failures preserve the source or a verified dual-scope state, shared owners remain protected, and rollback/retry stays available.
