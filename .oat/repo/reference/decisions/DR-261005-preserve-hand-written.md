---
id: DR-261005-preserve-hand-written
title: Preserve hand-written knowledge
date: 2026-10-05
status: accepted
legacy_id: null
---

# Preserve hand-written knowledge

## Context

Knowledge refresh must not replace manual notes or silently drop owned generated deletions; output-name collisions without generated markers are ambiguous.

## Decision

Replace marked generated outputs only, preserve manual files and refuse unmarked output collisions. Carry the exact generated writes/deletions into the shared commit helper.

## Consequences

Hand-written content is conserved and the commit boundary remains exact. Short argument guidance and commit-subject shell lifetime are separately tracked maintenance follow-ups.
