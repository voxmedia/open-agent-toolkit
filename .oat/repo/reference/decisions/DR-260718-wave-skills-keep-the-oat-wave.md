---
id: DR-260718-wave-skills-keep-the-oat-wave
title: Wave skills keep the oat-wave naming domain
date: 2026-07-18
status: accepted
legacy_id: null
---

# Wave skills keep the oat-wave naming domain

## Context

On promotion the skills could have been renamed oat-project-wave-\* for pack consistency, but waves orchestrate ABOVE the per-project lifecycle - each wave creates a wrapper project.

## Decision

Keep oat-wave-execute and oat-wave-program: wave is its own domain in the oat-<domain>-<action> convention, aligned with any future oat wave CLI noun.

## Consequences

Signal-ledger citations and stoa migration stay trivially valid; future CLI absorption lands under a matching noun.
