---
id: BL-260909-rewrite-inbound-references
title: Rewrite inbound references when oat backlog archive moves an item
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - pjm
  - backlog
  - wave-7-followup
assignee: null
created: 2026-09-09T10:55:13.310Z
updated: 2026-09-09T10:55:13.310Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 closeout (final review M3): oat backlog archive moved 23 items from .oat/repo/pjm/backlog/items/ to archived/, leaving 24 dangling links in the 20 external plans whose Source-and-live-evidence rows point at the items/ path; the root repointed them by hand. Every wave close repeats this. Make oat backlog archive rewrite inbound references to the moved item across .oat/repo/\*\* (plans, decisions, other items) — or, if rewriting is judged too broad, print the dangling-reference list as a warning and pin it with a test — so a bidirectional link survives archival.

## Acceptance Criteria

- After `oat backlog archive <id>`, no tracked file under `.oat/repo/**` links to `pjm/backlog/items/<id>.md`.
- A test archives a fixture item referenced from a plan and asserts the link was rewritten (or the warning names it).
- The readiness contract's bidirectional-link check passes on the tip after a real archival.
