---
id: BL-261030-admit-goal-exit-gate-review
title: Admit goal exit-gate review artifacts as milestone bookkeeping evidence
status: closed
priority: medium
scope: task
scope_estimate: M
labels:
  - delivery
  - goal-mode
  - gates
assignee: null
created: 2026-10-30T22:27:34.021Z
updated: '2026-10-31T12:08:19Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/384
external_plans: []
---

## Description

In goal mode the configured implement exit gate writes a final-scope Reviews row and commits its artifact, but delivery evidence admits review-artifact commits only from rows labelled with the milestone or delivery id. The gate's own commit therefore reads as disallowed-path and stales the milestone exit carrier it just made fresh; relabelling changes row identity, and the only workaround is an undocumented placeholder row before each gate generation. Source: GitHub #384; triage record .oat/repo/pjm/triage/2026-10-30-untriaged-issues.md.

## Acceptance Criteria

- The artifact commit of a gate-originated Reviews row, whose artifact's `oat_review_phase_ids` equals the milestone scope, is accepted as a bookkeeping successor of the milestone exit carrier.
- Such rows are excluded from integrated-review row selection for the milestone and from the delivery's own evidence artifacts, so a gate row can neither stand in for the integrated review nor unlock set-once delivery fields.
- Unlisted review files remain rejected as `disallowed-path`; negative controls prove both exclusions.
- No placeholder row is needed before an exit-gate generation.
- The goal-mode closeout wording in `oat-project-implement` agrees with the verbatim configured gate command; skill version bumps accompany any skill change.
