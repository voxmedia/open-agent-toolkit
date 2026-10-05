---
id: BL-261003-show-autonomous-hard-stop
title: Show autonomous hard-stop conditions and effective recovery limits at kickoff
status: closed
priority: medium
scope: task
scope_estimate: S
labels: []
assignee: null
created: 2026-10-03T19:13:37.589Z
updated: '2026-10-05T03:05:33Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/343
external_plans: []
---

## Description

Source: [GitHub #343](https://github.com/voxmedia/open-agent-toolkit/issues/343).

**Enhancement or UX improvement; reported stop is intended behavior.** Failed recovery terminality is explicitly required and tested; remaining allowance covers separate eligible events and does not promise continuation after a failed correction. Kickoff does not require disclosure of every applicable hard stop.

Captured by the approved [2026-10-02 triage ledger](../../triage/2026-10-02-untriaged-issues.md). This item is ready for planning; implementation requires its normal plan approval.

## Acceptance Criteria

- Show effective limits and all applicable hard-stop conditions at kickoff from owning contracts; distinguish capacity from permission.
- Preserve terminal failed-attempt policy.
- A continue-after-failure policy remains a separate future choice.

## Source evidence

Baseline: `be168345ef4f586731c13fe849da03eb87b526ec`.

.agents/skills/oat-project-implement/references/phase-execution.md:613; .agents/agents/oat-phase-implementer.md:215; packages/cli/src/validation/skills.test.ts:4330; .agents/skills/oat-project-autonomous/SKILL.md:110,448. Merged PR #189 introduced terminality.
