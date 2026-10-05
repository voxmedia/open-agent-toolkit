---
id: BL-261003-preserve-documented-structured
title: Preserve documented structured blockers in project status output
status: closed
priority: medium
scope: bug
scope_estimate: S
labels: []
assignee: null
created: 2026-10-03T19:13:38.261Z
updated: '2026-10-05T03:05:33Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/347
external_plans: []
---

## Description

Source: [GitHub #347](https://github.com/voxmedia/open-agent-toolkit/issues/347).

**Confirmed current defect.** Documented task_id/reason/since object enters shared parser through string normalization. Built CLI project status returns [object Object] for structured blocker; string control retains reason. Direct parser independently produces same mismatch.

Captured by the approved [2026-10-02 triage ledger](../../triage/2026-10-02-untriaged-issues.md). This item is ready for planning; implementation requires its normal plan approval.

## Acceptance Criteria

- Preserve task_id/reason/since in structured output; define compatibility for existing string blockers and human/status consumers; exercise documented real producer shape end to end.

## Source evidence

Baseline: `be168345ef4f586731c13fe849da03eb87b526ec`.

.agents/skills/oat-project-implement/references/completion-and-closeout.md:12; packages/control-plane/src/state/parser.ts:125,252; project status built CLI disposable fixture. Existing parser tests pass without documented structured fixture.
