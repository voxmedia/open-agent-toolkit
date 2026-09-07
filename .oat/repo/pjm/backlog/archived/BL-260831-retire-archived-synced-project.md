---
id: BL-260831-retire-archived-synced-project
title: Retire archived synced project records from the active namespace
status: closed
priority: high
scope: feature
scope_estimate: L
labels:
  - projects
  - synced
  - archive
  - lifecycle
  - ux
assignee: null
created: 2026-08-31T03:44:13.053Z
updated: '2026-09-01T00:04:46Z'
associated_issues: []
external_plans: []
---

## Description

Completed and archived synced projects currently leave a tracked .oat/projects/synced/<slug>.json record in the active namespace. Align synced completion with shared-project cleanup by retiring that record while preserving durable archive identity, pinned-link reachability, and safe discovery and recovery semantics.

## Acceptance Criteria

- Successful archival removes `.oat/projects/synced/<slug>.json` from the
  active synced-project namespace in the lifecycle commit.
- Retained project history is moved or reclassified outside
  `refs/oat/projects/*`, or an equivalent active-discovery mechanism is used,
  so remote enumeration cannot rediscover an archived project as active while
  pinned full-SHA artifact links remain reachable.
- Durable terminal metadata, including the archive snapshot, source ref, and
  completion timestamp, remains recoverable from the archive, project summary,
  completed ref, or an equivalent terminal record without relying on an active
  synced-project record.
- `project list`, remote listing, `project pull`, `project open`, project links,
  and dashboard surfaces treat completed archived projects as inert and never
  recommend pulling or continuing them.
- Project pruning, archive synchronization, and retry or recovery flows support
  the recordless completed-project model without breaking existing archives.
- Existing completed synced-project records and retained refs have an explicit
  migration or backward-compatibility path.
- Interruptions during record deletion, ref reclassification, local archive,
  S3 synchronization, or lifecycle commit fail closed and can be retried
  idempotently without duplicating the archive seal.
- Documentation and transaction-level integration tests cover the active to
  completed-and-archived transition and establish consistent cleanup semantics
  for shared and synced projects.
