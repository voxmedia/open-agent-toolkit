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
updated: 2026-08-19T23:15:17.730Z
associated_issues: []
external_plans: []
---

## Description

The corpus audit counted 79 canonical skill directories while the public CLI bundle contains 72 skills. Generic provider sync still discovers repo-only and retired directories, and organization-specific utilities are easy to misread as portable shipped OAT skills; add an authoritative classification contract so catalogs, documentation, provider views, and deck research can distinguish distribution, lifecycle, and tenant scope without directory-count heuristics.

## Acceptance Criteria

- One authoritative, machine-readable contract classifies every canonical
  skill by distribution status (`bundled` or `repo-only`), lifecycle status
  (including `retired`), and tenant scope when a skill is organization-specific.
- Generated or validated catalog output derives current bundled and repo-only
  counts from that contract and the bundle inventory, so documentation and deck
  research do not infer shipped OAT scope from directory count alone.
- The compatibility policy for retired redirect skills is explicit: provider
  sync/discovery either preserves them as visibly retired compatibility entries
  or excludes them through a tested rule without silently breaking supported
  pre-migration workflows.
- Organization-specific repo-only skills such as `create-ticket` and
  `create-pr-description` are clearly distinguished from portable bundled OAT
  skills without incorrectly changing the description-only contract of
  `create-pr-description`.
- Validation fails when a canonical skill lacks classification or when bundle,
  pack, catalog, and lifecycle data disagree; user-facing skill documentation
  explains the resulting categories.
