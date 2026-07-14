---
id: DR-260714-flexible-plan-task-bodies
title: Flexible plan task bodies
date: 2026-07-14
status: accepted
legacy_id: null
---

# Flexible plan task bodies

## Context

Plan validation enforces structural invariants, but the shipped template presented RED, GREEN, and Refactor staging as mandatory.

## Decision

Retain the TDD stages as the recommended default while allowing other task-body shapes that preserve stable IDs, per-task verification, and atomic commits.

## Consequences

Authors can fit plans to the work without weakening lifecycle validation or maintaining a duplicate template variant.
