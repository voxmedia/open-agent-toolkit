---
id: DR-261002-reader-first-documentation
title: Reader-first documentation ownership
date: 2026-10-02
status: accepted
legacy_id: null
---

# Reader-first documentation ownership

## Context

The docs-improvement-overhaul discovery and reader evaluations found that pack-oriented and CLI-lane organization obscured independent adoption and capability owners.

## Decision

Use Home plus Getting Started, Skills, Workflows, Provider Sync, Docs Tooling, Reference and Contributing. Give each capability one canonical task-oriented owner with family-level cross-links, and update repository consumers to the canonical routes.

## Consequences

Provider-only, project-free skill and docs-tooling adoption remain discoverable independently. New pages and shared indexes must preserve this ownership rather than duplicate guide bodies. Evidence: .oat/projects/shared/docs-improvement-overhaul/design.md and implementation.md.
