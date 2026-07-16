---
id: DR-260716-scope-aware-hard-budgets
title: Scope-aware hard budgets
date: 2026-07-16
status: accepted
legacy_id: null
---

# Scope-aware hard budgets

## Context

One fixed timeout killed productive large reviews, while transcript activity is not reliable enough to alter correctness decisions.

## Decision

Resolve a configurable hard cap from CLI, target, workflow, environment, and review-scope defaults; do not extend it from liveness evidence.

## Consequences

Large review scopes receive appropriate default headroom, operators can override budgets, and timeout remains deterministic and fail-closed.
