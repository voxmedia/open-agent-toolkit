---
id: DR-261011-phase-unit-progress-contract
title: Phase-unit progress contract for brief modes
date: 2026-10-11
status: accepted
legacy_id: null
---

# Phase-unit progress contract for brief modes

## Context

Brief phases carry Intent and Exit evidence instead of planned tasks, so task counts cannot measure progress, and execution records written during work must not move totals.

## Decision

In brief modes each '## Phase pNN:' block is one phase-unit. parseTaskProgress takes an opt-in phaseUnits option selected at the two project readers through isBriefMode. Unit precedence per phase: extracted (excluded), provisional (always incomplete), accepted only by the exact journal line '**Status:** completed', otherwise incomplete. PhaseProgress gains optional unit, provisional, extracted, and taskRecords fields present only when the phase-unit contract produced them. The router applies a brief-unit guard before post-implementation routing.

## Consequences

Task-mode progress shapes and existing toEqual pins are unchanged. Finalization requires every unit in scope to be accepted, and the root alone writes the acceptance line. The repository dashboard has no phase-unit progress, so it prints a note that oat project status and oat-project-next are the authority for brief projects.
