---
id: DR-260828-per-project-discovery-records
title: Per-project discovery records
date: 2026-08-28
status: accepted
legacy_id: null
---

# Per-project discovery records

## Context

Ordinary clones do not fetch custom project refs, and projects may exist remotely before the branch that introduced them is merged.

## Decision

Track one small validated JSON discovery record per synced project and supplement it with remote-ref enumeration and recordless adoption.

## Consequences

Branches carry only minimal discovery metadata without a shared index hotspot, while parked remote projects remain discoverable and adoptable.
