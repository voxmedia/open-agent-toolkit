---
id: DR-260701-lifecycle-gate-commands-stay
title: Lifecycle gate commands stay target-neutral by default
date: 2026-07-01
status: accepted
legacy_id: null
---

# Lifecycle gate commands stay target-neutral by default

## Context

Reusable workflow.gates.skills commands should omit exact targets so gate execution can avoid the current runtime and choose from the configured target registry. Exact --target pins remain valid for manual dispatch, debugging, or deliberate local/user-specific overrides.

## Decision

Reusable lifecycle gate commands stay target-neutral by default. They should
invoke `oat gate review` without hardcoding `--target <id>` so the gate
dispatcher can avoid the current runtime and choose from the configured target
registry.

## Consequences

Lifecycle skills and durable docs should not teach exact target pins for normal
gate execution. Exact `--target <id>` remains valid for manual dispatch,
debugging, and deliberate local/user-specific overrides.
