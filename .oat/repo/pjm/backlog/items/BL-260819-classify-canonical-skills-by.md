---
id: BL-260819-classify-canonical-skills-by
title: Classify canonical skills by distribution, lifecycle, and tenant scope
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - skills
  - catalog
  - metadata
  - sync
  - docs
assignee: null
created: 2026-08-19T23:15:17.730Z
updated: 2026-11-01T16:05:00Z
associated_issues: []
external_plans: []
---

## Description

A corpus audit counted 79 canonical skill directories while the public CLI
bundle contains 72 skills, and that count was misread as shipped OAT scope. A
machine-readable bundle inventory already exists
(`packages/cli/src/commands/init/tools/shared/skill-manifest.ts`), so the
remaining gap is small: derive bundled versus repo-only counts from it plus an
explicit repo-only marker, instead of counting directories.

**Reframed (2026-11-01, operator):** Narrowed from a full distribution,
lifecycle and tenant classification contract. Lifecycle status, tenant scope
and a retired-redirect compatibility policy are out of scope unless a concrete
sync or documentation failure appears.

## Acceptance Criteria

- Canonical skills that ship in no bundle carry an explicit repo-only marker,
  and every canonical skill is either in the `skill-manifest.ts` bundle
  inventory or marked repo-only.
- Bundled and repo-only counts (and their lists) are derived from that
  inventory plus the marker, for catalog and documentation use, rather than
  from a directory count.
- Validation fails when a canonical skill is neither bundled nor marked
  repo-only, or when a marked skill also appears in the bundle inventory.
