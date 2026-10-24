---
id: DR-261024-guidance-driven-ia-selection
title: Guidance-driven IA selection
date: 2026-10-24
status: accepted
legacy_id: null
---

# Guidance-driven IA selection

## Context

Issue #367 P1/P2/P28 and approved brief G1/G6 identified that docs setup lacked reader-first IA selection and repeatedly required operators to explain audience and structure. Public skills also needed to remain useful without the maintainer's external guidance pack.

## Decision

Ship the generic five-axis IA method and six presets in authoring-docs. Bootstrap and analyze propose two candidate structures with representative placements and resolve explicit/conversational, repository, user and built-in guidance in that order. External guidance is advisory and read-only; repository AGENTS and contributing instructions remain authoritative.

## Consequences

IA proposals cite resolved provenance and conflicts become ask_user findings. Generic public content is bundled, while external exemplars and private source content are not copied. Preset materialization remains opt-in and distinct from accepting and recording architecture. Evidence: docs-skills-ia-367 plan.md G1/G6, accepted p02/p07 and implementation.md Outcomes 2/3/9.
