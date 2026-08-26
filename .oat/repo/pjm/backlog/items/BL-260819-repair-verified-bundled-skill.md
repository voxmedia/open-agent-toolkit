---
id: BL-260819-repair-verified-bundled-skill
title: Repair verified bundled skill contract drift
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - skills
  - correctness
  - contracts
  - doctor
assignee: null
created: 2026-08-19T23:14:55.849Z
updated: 2026-08-19T23:14:55.849Z
associated_issues: []
external_plans: []
---

## Description

The 2026-08-18 full skills-corpus audit verified four contract mismatches across bundled skills: oat-doctor omits the brainstorm pack from its inline available-pack manifest; oat-brainstorm promises a Node-suppression diagnostic doctor cannot surface; oat-idea-summarize invokes oat config without declaring Bash; and analyze advertises nine progress steps while executing ten. Address them in one release-shaped change so canonical skill and lockstep public-package version bumps happen once.

## Acceptance Criteria

- `oat-doctor --summary` discovers every current pack, including `brainstorm`,
  from an authoritative inventory or from a contract mechanically validated
  against the canonical pack manifest; a regression test fails when the two
  surfaces drift.
- The `oat-brainstorm` Node-suppression contract is made truthful: either the
  unavailable state is durably observable by doctor and covered by tests, or
  the unsupported promise that doctor can surface it later is removed from the
  skill and related documentation.
- `oat-idea-summarize` declares Bash access for the `oat config get/set`
  commands its body requires, with provider-specific `allowed-tools` behavior
  preserved.
- `/analyze` advertises and emits one consistent ten-step progress model across
  its progress list and workflow body.
- Every changed canonical skill receives exactly one PR-scoped version bump,
  the five public packages receive one lockstep version bump, and the relevant
  skill-contract, bundle, release, and documentation validation gates pass.
