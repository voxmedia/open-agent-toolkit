---
id: DR-260906-standing-claims-in-skills-name
title: Standing claims in skills name an executable owner and ship a backstop in
  the same PR
date: 2026-09-06
status: accepted
legacy_id: null
---

# Standing claims in skills name an executable owner and ship a backstop in the same PR

## Context

Wave 3 p03. Skills stated standing claims about runtime behavior with nothing executable behind them, so prose could drift from code unnoticed; one example claim in the authoring skill itself was false.

## Decision

create-oat-skill requires every standing claim to name the code that owns it and to ship its executable backstop in the same change, never keyed to a physical line number; oat-project-design echoes the obligation at design time; a prose assertion is not enforcement for a runtime claim, though pinning documenting prose remains legitimate.

## Consequences

skills.test.ts pins the rule with fence-, comment-, and indent-aware extraction and existsSync checks on cited precedent paths; both guarded blocks name their executable owner; weakening vocabulary in the rule is rejected.
