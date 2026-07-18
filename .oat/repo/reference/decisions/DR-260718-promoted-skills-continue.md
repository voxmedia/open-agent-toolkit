---
id: DR-260718-promoted-skills-continue
title: Promoted skills continue source version lineage
date: 2026-07-18
status: accepted
legacy_id: null
---

# Promoted skills continue source version lineage

## Context

The stoa signal ledger cites skill version numbers in nearly every ruling; resetting to 1.0.0 on promotion would orphan every citation, while toolkit consumers never installed the 1.x lineage.

## Decision

Continue lineage: oat-wave-execute lands at 1.5.0 (queued 1.4.1+1.5.0 items applied together - release-collapse recorded), oat-wave-program at 1.1.0.

## Consequences

Ledger citations resolve against promoted versions; semver-honest continuation costs consumers nothing.
