---
id: DR-261024-authored-ia-with-config-mirror
title: Authored IA with config mirror
date: 2026-10-24
status: accepted
legacy_id: null
---

# Authored IA with config mirror

## Context

Issue #367 P3 and approved brief G2 required accepted documentation architecture to survive conversations while remaining reviewable and checkable by tools. Config alone loses rationale; prose alone does not supply stable machine-readable fields.

## Decision

On approval, record IA in a decision and an Information architecture section of framework app AGENTS.md or the Markdown contributing page. Mirror the accepted preset, decision path, optional tracks and verification overlay in repository documentation.ia config; authored records remain authoritative.

## Consequences

Analyze checks IA fit and declared-audience misrouting; disagreements or absent acceptance require clarification rather than invented roles. Markdown creates no docs-root AGENTS. Path validation applies to normalized stored paths. Evidence: docs-skills-ia-367 plan.md G2, accepted p03/p-rev3 and implementation.md Outcome 4.
