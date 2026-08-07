---
id: DR-260805-the-retro-artifact-is
title: The retro artifact is the integration contract
date: 2026-08-05
status: accepted
legacy_id: null
---

# The retro artifact is the integration contract

## Context

Project completion, promotion application, and feedback filing need to consume retrospective state independently and resume safely after interruptions.

## Decision

Use stable RP and UP register items with authoritative dispositions, bounded mutable fields, and independently derivable promotion and filing rollups as the shared integration contract.

## Consequences

Completion, apply, and filing consumers remain decoupled and can detect settled work without reapplying or refiling it. Proposal bodies remain immutable while status and destination references support bounded writeback.
