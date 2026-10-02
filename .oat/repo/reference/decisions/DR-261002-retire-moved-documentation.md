---
id: DR-261002-retire-moved-documentation
title: Retire moved documentation URLs
date: 2026-10-02
status: accepted
legacy_id: null
---

# Retire moved documentation URLs

## Context

The reader-first migration changes existing page locations. The user explicitly accepted broken moved URLs rather than retaining transitional routing.

## Decision

Do not add aliases, redirects or permanent compatibility stubs for moved documentation URLs. Update in-repository consumers to canonical destinations, verify retired routes are absent, and provide useful Home/search recovery.

## Consequences

External bookmarks and consumers must update to the new routes. Preserve content and documented capabilities through explicit migration and changed-page accounting; old-route compatibility is intentionally separate. Evidence: .oat/projects/shared/docs-improvement-overhaul/design.md and references/route-migration.json.
