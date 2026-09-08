---
id: DR-260907-persist-before-effect-verify
title: Persist before effect, verify after effect
date: 2026-09-07
status: accepted
legacy_id: null
---

# Persist before effect, verify after effect

## Context

Remote commands can be interrupted after an external effect, making blind retry capable of duplicating records or falsely claiming success.

## Decision

Persist mutation intent before one external attempt, freeze uncertain outcomes, reconcile through durable evidence, and require authoritative provider read-back before recording a verified success.

## Consequences

Recovery is restart-safe and duplicate-aware, but uncertain operations stop for reconciliation instead of maximizing automatic retry throughput.
