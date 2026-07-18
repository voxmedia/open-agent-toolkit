---
id: DR-260718-general-purpose-project-log
title: General-purpose project log
date: 2026-07-18
status: accepted
legacy_id: null
---

# General-purpose project log

## Context

Operational observations included reusable tooling and workflow lessons beyond orchestration, so an orchestration-specific artifact would suppress valuable evidence.

## Decision

Use project-log.md as a general-purpose project observation log while limiting v1 automatic integrations to orchestration lifecycle surfaces.

## Consequences

Projects can capture bugs, friction, worked-wells, and feedback without broadening the initial integration scope; additional appenders can be added incrementally.
