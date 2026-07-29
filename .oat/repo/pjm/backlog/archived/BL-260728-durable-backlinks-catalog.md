---
id: BL-260728-durable-backlinks-catalog
title: Durable backlinks catalog
status: closed
priority: medium
scope: feature
scope_estimate: L
labels:
  - explainer-kit
  - provenance
  - publishing
assignee: null
created: 2026-07-28T02:30:12.332Z
updated: '2026-07-29T16:16:27Z'
associated_issues: []
external_plans: []
---

## Description

Emit commit-pinned source backlinks and a manifest-derived initiative catalog
that remain valid after project archival and branch deletion.

## Dependencies

- Ordered outcome 4 under
  `BL-260727-close-the-explainer-kit-visual`.
- Depends on the reconciled source provenance and finalized artifact manifest
  produced by `BL-260728-cohesive-adaptive-recap-set`.
- Publication remains gated by the passing review outcome from
  `BL-260728-unattended-visual-author-critic`.

## Acceptance Criteria

- Every source-backed claim can resolve to an encoded GitHub blob URL pinned to
  the reviewed commit SHA; a local path or moving branch is never the only
  address.
- `initiatives/<slug>/catalog.json` is generated from the finalized manifest,
  has exact artifact parity, and contains absolute artifact and source URLs.
- A successful publish receipt never references a missing artifact or stale
  catalog entry.

## Acceptance Evidence

- Fact-base and render tests cover repository identity, commit SHA, path and
  line encoding, and archive-safe absolute links.
- Catalog connector tests compare catalog entries with the finalized manifest,
  reject stale entries, and resolve all emitted local-test URLs.
- The archived-project golden benchmark demonstrates working source backlinks
  and catalog parity without an active project or branch.

## Disposition

In the current explainer-improvements critical path. Planned for phase 4 before
the archived-project golden benchmark.
