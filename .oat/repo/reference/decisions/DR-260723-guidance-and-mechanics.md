---
id: DR-260723-guidance-and-mechanics
title: Guidance and mechanics ownership split
date: 2026-07-23
status: accepted
legacy_id: null
---

# Guidance and mechanics ownership split

## Context

Model-selection policy and OAT launch mechanics were intermingled, which duplicated volatile provider guidance and made safeguard-preserving changes harder to review.

## Decision

Place portable task classes, model-selection principles, dated provider mappings, and refresh evidence in subagent-orchestration; keep authorization, launch, liveness, recovery, and record mechanics in oat-dispatch-subagents without renaming it.

## Consequences

Non-OAT consumers can use the guidance independently, OAT callers must compose both layers, and a generic dispatch-skill rename remains separate compatibility work.
