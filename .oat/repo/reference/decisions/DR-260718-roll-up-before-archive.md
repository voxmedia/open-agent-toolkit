---
id: DR-260718-roll-up-before-archive
title: Roll-up before archive
date: 2026-07-18
status: accepted
legacy_id: null
---

# Roll-up before archive

## Context

Project archives are typically gitignored, so archiving a populated log before a successful roll-up can permanently hide operational observations.

## Decision

Make failed roll-up of a populated log block archival, while keeping pending synthesis warning-only and permitting a missing default reference layer.

## Consequences

Durable observations survive closeout without turning incomplete synthesis or repositories without a reference layer into unnecessary hard blockers.
