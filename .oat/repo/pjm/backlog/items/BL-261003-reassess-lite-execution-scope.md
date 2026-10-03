---
id: BL-261003-reassess-lite-execution-scope
title: Reassess Lite execution scope and preserve completed work on promotion
status: open
priority: medium
scope: feature
scope_estimate: L
labels: []
assignee: null
created: 2026-10-03T19:13:37.153Z
updated: 2026-10-03T19:13:37.153Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/340
external_plans: []
---

## Description

Source: [GitHub #340](https://github.com/voxmedia/open-agent-toolkit/issues/340).

**Enhancement or UX improvement.** Lite startup promotion is mandatory already. Missing: a persisted execution envelope and reassessment during implementation growth. Current planning-oriented promotion archives the Lite plan and scaffolds a Quick plan; it does not prove conservation of partially completed task identities.

Captured by the approved [2026-10-02 triage ledger](../../triage/2026-10-02-untriaged-issues.md). This item is ready for planning; implementation requires its normal plan approval.

## Acceptance Criteria

- Persist an execution estimate and reassess on material requirement/dependency growth, repeated recovery, or remaining work that threatens the agreed single-sitting scope.
- Offer Quick promotion interactively; autonomous promotion requires explicit kickoff authority and verified preservation of completed task identities, commits, review history, remaining work and mandatory gates.
- No elapsed-time-only promotion, restart, or automatic spec generation.
- Preserve completed Lite review obligations without replaying Quick phase reviews retroactively; apply Quick reviews to new work and require final review over the full range.
- An explicit recorded promotion grant remains valid on resume within its authorized scope; it does not automatically activate autonomous execution.

## Source evidence

Baseline: `be168345ef4f586731c13fe849da03eb87b526ec`.

.agents/skills/oat-project-lite/SKILL.md:291; .agents/docs/autonomy-contract.md:123; .oat/templates/plan-lite.md:21; packages/cli/src/commands/project/promote/promote.ts:286,439; promote.test.ts:406. Merged PR #264 delivered planning promotion. Open PR #351 covers budget exhaustion, not proactive growth.
