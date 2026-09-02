---
id: BL-260902-file-deferred-repository
title: File deferred repository follow-ups from a passing receive
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - review
  - receive
  - review-gate-integrity
assignee: null
created: 2026-09-02T23:48:47.067Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/214
external_plans: []
---

## Description

`oat-project-review-receive` records findings and updates review rows but has no disposition for filing deferred repository follow-ups discovered by a passing gate; retro filing config exists separately and does not cover receive time. Let a passing receive file or link repository follow-ups while preserving receipt identity, severity, gate correlation, and resumability. Source: GitHub issue #214; child of the review-gate-integrity project.

## Acceptance Criteria

- A passing `oat-project-review-receive` can file or link deferred repository follow-ups (backlog items or issues) for non-blocking findings, preserving receipt identity, severity, and gate correlation on each follow-up.
- Filing is resumable: a retried receive does not duplicate follow-ups.
- The disposition is recorded in the review ledger row and structured output.
- Focused tests cover filing, linking to an existing item, and idempotent retry.
