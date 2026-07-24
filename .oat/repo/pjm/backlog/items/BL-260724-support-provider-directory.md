---
id: BL-260724-support-provider-directory
title: Support provider directory symlinks as full collection sync
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - cli
  - sync
  - manifest
  - safety
assignee: null
created: 2026-07-24T16:10:37.662Z
updated: 2026-07-24T16:10:37.662Z
associated_issues: []
external_plans: []
---

## Description

Recognize a provider collection directory symlink that resolves exactly to its canonical OAT collection (for example, .claude/skills -> .agents/skills) as synchronizing every canonical entry in that collection. Reconcile manifest state for all inherited skills without creating child symlinks or allowing update, removal, or provider-disable operations to mutate canonical content through the directory alias.

## Acceptance Criteria

- An existing provider collection symlink is treated as a full inherited sync
  only when its resolved target exactly matches the corresponding canonical OAT
  collection root; relative links are supported.
- Sync planning and execution update manifest state for every canonical entry
  visible through the collection alias without creating, replacing, or removing
  child paths through that alias.
- Canonical additions and removals reconcile inherited manifest entries
  deterministically, and disabling or changing a provider detaches ownership
  without deleting canonical content.
- Broken, external, mismatched, nested, or race-swapped directory symlinks fail
  closed with actionable diagnostics while ordinary per-entry managed symlinks
  retain their existing behavior.
- Focused and integration tests cover initial adoption, repeated no-op sync,
  canonical entry addition/removal, provider disablement, incorrect targets,
  and apply-time ancestry changes.
- User-facing tool-pack/provider-sync documentation explains collection-alias
  behavior and recovery for rejected directory symlinks.
