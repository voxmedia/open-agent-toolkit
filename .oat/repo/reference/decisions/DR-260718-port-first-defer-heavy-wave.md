---
id: DR-260718-port-first-defer-heavy-wave
title: Port-first defer-heavy wave-skill promotion
date: 2026-07-18
status: accepted
legacy_id: null
---

# Port-first defer-heavy wave-skill promotion

## Context

Promoting stoa's dogfooded wave skills under a zero-regression bar: stoa wave 6 runs on the packaged skills as acceptance evidence. Absorbing mechanics into new CLI surface at the same time would double what W6 must validate.

## Decision

Port the skills essentially as-proven plus the queued evidence-backed changes; defer the wave CLI command family and the bootstrap-group TypeScript rewrite to owned backlog items with triggers.

## Consequences

W6 validates one change (packaged skills). Wave CLI family + artifact-format contract are grouped follow-ups triggered by a second consumer; the proven bash bootstrap ships as-is with hardening applied in place.
