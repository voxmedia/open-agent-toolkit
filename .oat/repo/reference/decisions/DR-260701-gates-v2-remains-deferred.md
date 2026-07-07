---
id: DR-260701-gates-v2-remains-deferred
title: Gates V2 remains deferred
date: 2026-07-01
status: accepted
legacy_id: null
---

# Gates V2 remains deferred

## Context

This project intentionally avoided same-target or model-level dispatch policy changes; that larger target-preference work stays in the existing Gates V2 backlog lane.

## Decision

Keep the workflow-gate target-selection repair scoped to V1 behavior. Do not add
same-target, model-level target preference, or broader Gates V2 dispatch-policy
machinery in this project.

## Consequences

The shipped fix preserves the existing target registry and runtime-avoidance
model. Same-target/model-specific dispatch remains in the Gates V2 backlog lane
and must be designed separately before implementation.
