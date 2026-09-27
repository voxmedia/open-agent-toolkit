---
id: BL-260927-record-owner-overrides
title: Record owner overrides of exhausted configured gates as structured state
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - gates
  - lifecycle
  - state
assignee: null
created: 2026-09-27T03:35:38.263Z
updated: 2026-09-27T03:35:38.263Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/327
external_plans: []
---

## Description

A quick-start plan gate (`onFailure: block`, `maxAttempts: 2`) exhausted, and the owner's decision to proceed exists only as prose. By contract an exhausted `block` gate may not proceed, so an owner override currently sits outside the contract. Quick-start's `prompt` branch also persists no approval, whereas implement requires a persisted `prompt_approved` disposition. Gate envelopes do not classify findings as new or carried over, so an exhausted but converging gate cannot be told apart from a stuck one. Related: `BL-260818-distinguish-operator-directed`. Source: GitHub issue #327.

## Acceptance Criteria

- Quick-start persists `prompt` approvals with the same structure implement uses.
- An exhausted gate followed by an explicit owner decision yields a machine-readable disposition (who, when, and which attempt's fixes were not re-gated), or the contract records why overrides stay disallowed.
- Gate results classify each finding as new or carried over from a prior attempt.
- Later gates and final reviews can read the disposition.
