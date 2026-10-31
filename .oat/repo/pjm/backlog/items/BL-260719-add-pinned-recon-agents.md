---
id: BL-260719-add-pinned-recon-agents
title: Add pinned recon agents for reusable orchestration
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - orchestration
  - subagents
  - recon
  - dispatch
assignee: null
created: 2026-07-19T02:43:56.881Z
updated: 2026-10-31T21:08:00Z
associated_issues: []
external_plans: []
---

## Description

Define provider-neutral, read-only pinned reconnaissance agents that workflows can use for bounded evidence gathering outside review-specific orchestration. Integrate their role, model-floor selection, materialization, and fallback contract with oat-dispatch-subagents while preserving root-owned judgment and non-recursive authority.

**Delivery status (2026-10-31):** Landed: the recon skill ships a materialized
`recon-worker` leaf role with validated evidence packets and per-wave routing
(#248, #285, #302; `.agents/agents/recon-worker.md`). That role is
recon-scoped: it writes exactly one declared artifact, and
`oat-dispatch-subagents` names it only in record-schema examples, not as a
selectable role. Remaining: a generic,
read-only pinned recon role that any orchestrator can select by model floor.

## Acceptance Criteria

- Define a provider-neutral reconnaissance-agent contract, generalized from
  the recon-scoped `recon-worker` leaf, with read-only, non-recursive
  authority, a compact evidence/uncertainty report, and explicit prohibition
  on final findings, severity, validation decisions, and artifact writes.
- Define how provider-specific pinned recon variants are configured,
  materialized, versioned, and kept synchronized without requiring an
  unbounded agent matrix.
- Extend `oat-dispatch-subagents` so any eligible orchestrator—not only
  `oat-reviewer`—can discover and select an exact pinned recon role that
  satisfies its declared task-class/model floor.
- Preserve native generic-worker selection and caller-inline fallback when no
  pinned recon role is available; never silently select below the declared
  floor.
- Document Cursor, Claude, and Codex selection/evidence boundaries, including
  the distinction between pinned recon roles and full reviewer/implementer
  roles.
- Add focused semantic and provider-materialization tests covering authority,
  model-floor satisfaction, non-recursion, output ownership, synchronization,
  and fallback without pinning canonical behavior to dated model names.
- Demonstrate reuse from review orchestration and at least one non-review
  orchestration scenario while keeping final verification and judgment with
  the calling root.
