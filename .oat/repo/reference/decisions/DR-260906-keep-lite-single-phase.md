---
id: DR-260906-keep-lite-single-phase
title: Keep Lite single-phase and sequential
date: 2026-09-06
status: accepted
legacy_id: null
---

# Keep Lite single-phase and sequential

## Context

Parallel or multi-phase execution weakens the simple atomic recovery trail expected from single-sitting work.

## Decision

Constrain Lite to one sequential phase and promote work that requires parallelism or unresolved architecture.

## Consequences

Task commits remain ordered and recoverable; larger work moves to Quick instead of expanding Lite.
