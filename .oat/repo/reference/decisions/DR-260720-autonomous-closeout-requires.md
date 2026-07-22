---
id: DR-260720-autonomous-closeout-requires
title: Autonomous closeout requires a three-layer firing guard
date: 2026-07-20
status: accepted
legacy_id: null
---

# Autonomous closeout requires a three-layer firing guard

## Context

An Orc 4-wave autonomous program audit showed oat-project-complete is human-gated by design, yet autonomous orchestrators need a closeout path. Firing an -auto companion on task-completion alone risks premature archives during multi-wave programs.

## Decision

Defer the oat-project-complete-auto companion skill to an owned backlog item (BL-260720-add-oat-project-complete-auto) with a three-layer firing guard: per-program opt-in, a single human-gated program-end checkpoint, and never firing from task-completion alone.

## Consequences

Autonomous programs keep a deterministic, operator-sanctioned closeout boundary. The companion ships only when the guard semantics are implemented; wave skills meanwhile record archive-tail deferrals explicitly (p-rev4).
