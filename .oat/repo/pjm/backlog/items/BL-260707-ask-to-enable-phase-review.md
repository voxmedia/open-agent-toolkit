---
id: BL-260707-ask-to-enable-phase-review
title: 'Ask to enable phase review gates when gate config exists'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: [oat-project-implement, reviews, phase-review-gate]
assignee: null
created: '2026-07-07T05:18:56Z'
updated: '2026-07-07T05:18:56Z'
associated_issues: [BL-260707-record-gate-review-model]
oat_template: true
oat_template_name: backlog-item
---

## Description

When a user has an `oat gate review` target configured, plan writing should ask whether to enable implementation phase review gates, similar to the existing HiLL checkpoint questions. Gate target configuration currently makes `oat gate review` runnable, but does not opt a project into phase-level review gates; the missing question makes the feature easy to overlook.

The prompt should support enabling gates for all implementation phases or selecting specific phases, then write the corresponding `oat_phase_review_gate` frontmatter into `plan.md`. This should remain opt-in: if no review gate target is configured, or the user declines, phase review gates stay disabled.

Related gate improvement: [BL-260707-record-gate-review-model](./BL-260707-record-gate-review-model.md) tracks recording model/target provenance in gate-produced review artifacts.

## Acceptance Criteria

- During implementation plan setup, OAT detects whether the user has a review gate target configured using existing CLI/config tooling.
- When review gate configuration exists, plan writing asks whether to enable phase review gates for all phases, selected phases, or not at all.
- The selected answer writes valid `oat_phase_review_gate` frontmatter to `plan.md`, including phase selection semantics compatible with the existing implementation skill.
- The prompt copy clearly distinguishes review gate target configuration from enabling the per-project phase review gate.
- Existing behavior is preserved when no review gate target is configured or the user declines the prompt.
