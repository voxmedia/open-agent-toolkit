---
id: DR-260807-mutable-prose-has-one-bounded
title: Mutable prose has one bounded home
date: 2026-08-07
status: accepted
legacy_id: null
---

# Mutable prose has one bounded home

## Context

Retrospective register fields and frontmatter rollups can change during apply and filing, while unbounded narrative status claims can become stale and contradict them.

## Decision

Use Current State as the sole mutable freeform status surface, derived from register fields and rollups. Keep proposal bodies and historical narrative immutable after generation.

## Consequences

Consumers refresh one bounded section without rewriting evidence or proposals, making reruns coherent and auditable.
