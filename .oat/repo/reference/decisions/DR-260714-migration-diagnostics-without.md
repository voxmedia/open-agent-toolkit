---
id: DR-260714-migration-diagnostics-without
title: Migration diagnostics without a scope shim
date: 2026-07-14
status: accepted
legacy_id: null
---

# Migration diagnostics without a scope shim

## Context

Restoring global scope placement would preserve stale CLI grammar and risk making a temporary compatibility layer permanent.

## Decision

Keep scope command-local, detect known stale forms through bounded doctor scans, and require prominent before-and-after migration guidance for breaking grammar.

## Consequences

The current grammar remains unambiguous while upgraded repositories receive actionable evidence before stale scripts fail.
