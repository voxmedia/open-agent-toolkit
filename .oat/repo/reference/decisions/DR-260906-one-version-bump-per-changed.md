---
id: DR-260906-one-version-bump-per-changed
title: One version bump per changed skill per PR, carried across lanes
date: 2026-09-06
status: accepted
legacy_id: null
---

# One version bump per changed skill per PR, carried across lanes

## Context

Wave 2 of the 2026-08-31 execution program merged five lanes into one PR; p04 and p05 both changed oat-project-implement. The repository rule is one frontmatter version bump per changed canonical skill in the final PR diff, enforced by check:skill-bumps against origin/main.

## Decision

A later lane in the same PR never re-bumps a skill an earlier lane already bumped; it carries the earlier value and updates no pin. The wave fan-in records which lane owns each bump in the wrapper plan's Drift Refresh Record.

## Consequences

check:skill-bumps stays green across fan-ins; per-lane briefs must name already-bumped skills; the reviewer verifies that no pin moved for an unchanged skill.
