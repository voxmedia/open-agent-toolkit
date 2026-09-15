---
id: DR-260915-one-doctor-router-instead
title: One doctor router instead of a family of doctor skills
date: 2026-09-15
status: accepted
legacy_id: null
---

# One doctor router instead of a family of doctor skills

## Context

BL-260911-make-oat-doctor asked for one place to learn what is wrong with an OAT setup across config, PJM, agent instructions, docs, and tools. The alternative was separate installable skills such as oat-doctor-config and oat-doctor-docs.

## Decision

oat-doctor is the single entry point. It sweeps all five areas, reports once, and asks which area to dive into. A dive that needs its own apply machinery routes to the owning skill, for example oat-docs-bootstrap for docs, instead of a new doctor skill being added.

## Consequences

People run one command and see every problem in one report. New health areas are added as dives inside oat-doctor, not as new skills. The skill carries more prose, which is kept short by pointing at the bundled docs instead of restating them.
