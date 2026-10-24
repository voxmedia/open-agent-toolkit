---
id: DR-261024-portable-docs-check-boundaries
title: Portable docs check boundaries
date: 2026-10-24
status: accepted
legacy_id: null
---

# Portable docs check boundaries

## Context

Issue #367 P20-P23/P25 and approved brief G5 required one calibrated validation command across Markdown, Fumadocs and MkDocs while preserving configurable policy and distinguishing mechanical evidence from behavior.

## Decision

Provide oat docs check with stable rule IDs, JSON findings, error/warn/off policy and calibrated thresholds. Check reader structure, navigation, literal contributor commands, diagrams and provenance without executing documented commands or building the site inside the checker; keep P24 source judgment outside G5.

## Consequences

Warnings remain visible and unsupported or unavailable evidence remains qualified. Strict explicit navigation/script contracts coexist with approved optional-navigation, installed-binary and diagnostic/readability limits, including unreadable-page false structural findings under frontmatter warn/off. Evidence: docs-skills-ia-367 accepted p06, implementation.md Outcome 8 and eight approved Deferred Findings.
