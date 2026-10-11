---
id: DR-261011-brief-to-quick-promotion
title: Brief to quick promotion migrates by phase state
date: 2026-10-11
status: accepted
legacy_id: null
---

# Brief to quick promotion migrates by phase state

## Context

A brief project may later want a maintained task plan. Promotion must keep committed work and review history without inventing tasks for unaccepted work.

## Decision

oat project promote <path> --to quick converts a brief in place with no reverse direction. Accepted phases keep completed records as quick tasks, or get one synthesized 'Accepted via phase evidence' task against the phase Head; active phases keep completed records; pending and provisional phases stay taskless and are listed in oat_promotion_pending_phases, which keeps quick plan readiness false until quick-start authors their tasks. The brief's sections are rendered into discovery.md, the original is archived to references/brief-archive.md, Reviews rows keep their cells with one provenance line, and oat_promoted_from: brief is set. Promotion refuses, writing nothing, with brief-archive-exists, extracted-phases, invalid-brief-plan, or missing-phase-head (which lists the refused phases in an optional phases field).

## Consequences

Promotion is a manual mode change only. oat-project-quick-start resumes a promoted brief and authors pending tasks; the promoted-brief resume adds a quick_plan_ready clause. Promotion before a brief is written and committed is not offered: the scaffold is abandoned and quick-start started instead.
