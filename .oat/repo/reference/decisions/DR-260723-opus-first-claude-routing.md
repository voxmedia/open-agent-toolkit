---
id: DR-260723-opus-first-claude-routing
title: Opus-first Claude routing
date: 2026-07-23
status: accepted
legacy_id: null
---

# Opus-first Claude routing

## Context

The imported guidance proposed broader Fable-first routing, but root-orchestrator calls are low-volume and coherence-critical while bounded subagents carry most execution volume.

## Decision

Keep Opus as the Claude default for hard-reasoning and consequential work, reserving Fable for exceptional unresolved ambiguity, novelty, consequence, or a directly relevant strength.

## Consequences

Routine savings are captured in bounded subagent routing instead of weakening the root; consequential classification alone does not force Fable escalation.
