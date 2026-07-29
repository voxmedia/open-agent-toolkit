---
id: DR-260726-recipe-policy-owns-expansion
title: Recipe policy owns expansion profiles not authors
date: 2026-07-26
status: accepted
legacy_id: null
---

# Recipe policy owns expansion profiles not authors

## Context

If an author can choose its own authoring path and freedom level per artifact, the two-path model collapses: every author picks the freest path and cohesion between runs disappears. The redesign needed artistic freedom for decks and explainers without letting each run reinvent structure.

## Decision

Recipes declare expansion profiles that dictate the artifact type, authoring path, brief reference, and shell for each expansion. The author proposes what content warrants; policy decides how it is authored. Every bundled recipe declares finite per-recipe and per-type caps, and over-cap proposals are rejected.

## Consequences

Cohesion across runs comes from baselines, briefs, and policy rather than from forcing identical output, so two runs of the same project can differ without drifting. Adding a genuinely new artifact shape requires a recipe change rather than author improvisation.
