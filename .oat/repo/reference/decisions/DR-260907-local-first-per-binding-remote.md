---
id: DR-260907-local-first-per-binding-remote
title: Local-first per-binding remote management
date: 2026-09-07
status: accepted
legacy_id: null
---

# Local-first per-binding remote management

## Context

OAT projects need to relate one local item to several remote records without making remote availability or provider-to-provider mirroring a prerequisite for ordinary project work.

## Decision

Keep the local backlog and project artifacts authoritative and model each remote record as an independently governed binding with its own purpose, policy, state, baseline, and receipts.

## Consequences

Offline project work remains complete, multiple providers can coexist without transitive synchronization, and every remote lifecycle action must name the binding it governs.
