---
id: DR-260724-provider-path-safety-boundary
title: Provider path safety boundary
date: 2026-07-24
status: accepted
legacy_id: null
---

# Provider path safety boundary

## Context

Provider sync could traverse a symlinked or non-directory parent and mutate canonical or external content, while ancestry could also change between planning and execution.

## Decision

Enforce one generic lstat-based provider path guard during planning, whole-plan preflight, and immediately before each mutating entry.

## Consequences

All provider strategies fail closed before unsafe writes and plan/apply races are covered, with the accepted cost of repeated filesystem validation and explicit user recovery.
