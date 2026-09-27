---
id: BL-260927-derive-or-label-the-dispatch
title: Derive or label the dispatch audit line from the gate invocation in
  gate-originated reviews
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - reviews
  - gates
  - provenance
assignee: null
created: 2026-09-27T03:35:37.866Z
updated: 2026-09-27T03:35:37.866Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/325
external_plans: []
---

## Description

In gate review artifacts the frontmatter records the resolved gate target, for example `oat_gate_target: codex-6-sol-xhigh`, while the body's `**Dispatch audit:**` line reports the project reviewer dispatch ceiling. Step 6.0 of `oat-project-review-provide` copies `dispatchStamp` from `oat project dispatch-ceiling resolve --role reviewer`, gate frontmatter copies the gate prompt's resolved values, and the skill itself says gates resolve their target independently. No validator compares the two. Source: GitHub issue #325.

## Acceptance Criteria

- Gate-originated review artifacts render the audit line from the same resolved invocation as the frontmatter, or label it explicitly as the policy view.
- Artifact validation fails when an unlabeled audit line disagrees with the gate frontmatter.
- A test covers a gate target whose effort differs from the project ceiling.
