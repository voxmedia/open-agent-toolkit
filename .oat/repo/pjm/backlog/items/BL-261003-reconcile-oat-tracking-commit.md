---
id: BL-261003-reconcile-oat-tracking-commit
title: Reconcile OAT tracking commit cadence with resumable phase/group batching
status: open
priority: medium
scope: bug
scope_estimate: M
labels: []
assignee: null
created: 2026-10-03T19:13:38.702Z
updated: 2026-10-03T19:13:38.702Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/349
external_plans: []
---

## Description

Source: [GitHub #349](https://github.com/voxmedia/open-agent-toolkit/issues/349).

**Confirmed but narrower than reported; cadence instructions conflict.** Top-level implementation skill mandates separate tracking after every code commit and prohibits batching. Detailed phase/group execution already batches phase task ledger and creates one group bookkeeping commit. The reported 127/266 private commit counts cannot be verified.

Captured by the approved [2026-10-02 triage ledger](../../triage/2026-10-02-untriaged-issues.md). This item is ready for planning; implementation requires its normal plan approval.

## Acceptance Criteria

- Keep source task commits separate, save task outcomes durably as work proceeds, and batch tracking commits at phase/group boundaries.
- Flush pending tracking before review/receive, PR publication, handoff, planned pause and closeout.
- Define resume reconciliation from saved outcomes and commit identities; preserve audit history and exact-path commit protections.
- No history rewrite or squash execution is authorized by triage.
- Guarantee process/session-crash recovery in a retained worktree using source commits and saved outcomes.
- Worktree-loss resilience is outside this item.
- Transfer worker outcomes before cleanup; reconcile after unplanned interruption without duplicate or lost task rows.

## Source evidence

Baseline: `be168345ef4f586731c13fe849da03eb87b526ec`.

.agents/skills/oat-project-implement/SKILL.md:101; .agents/skills/oat-project-implement/references/phase-execution.md:886,903,910. Archived BL-260829-order-phase-bookkeeping-before covers pre-review baseline ordering, not general commit cadence.
