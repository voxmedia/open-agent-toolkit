---
id: BL-261001-make-recon-controller-setup
title: Make recon controller setup and preflight self-serve
status: open
priority: low
scope: feature
scope_estimate: M
labels:
  - recon
  - skills
  - usability
assignee: null
created: 2026-10-01T04:38:13.500Z
updated: 2026-10-01T04:38:13.500Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/333
external_plans: []
---

## Description

The run behind GitHub issue #333 logged controller friction separate from the
publication and dispatch defects (`BL-261001-make-recon-s-packet-validator`,
`BL-261001-recover-recon-lanes-after`):

- There is no manifest initializer or complete schema-v2 standard-profile
  example, so the controller read validator code to find closed fields and
  fixed paths.
- `prepare-routing` accepts a draft manifest with null approval that
  `validate-artifact` then rejects, without phase-aware guidance.
- Dossiers pass shape validation with stale citation locators. Source
  reopening is required before review briefs exist, but no public command
  runs it (the routine inside `validate-packet` is unexported).
- The secret scanner covers whole locator spans, so a generic assignment
  outside the displayed excerpt can match. No scanner defect is established.
- The `unresolved-material-challenge` predicate covers only adversarial
  challenges, not semantic uncertainty or material coverage gaps.
- Profile names conflate research breadth with assurance redundancy, and
  native dispatch has no per-lane timeout, so deadlines are advisory.
- The second approval for an already-requested read-only investigation adds a
  round trip; the issue suggests an optional bounded delegation policy.

## Acceptance Criteria

- An executable manifest initializer and a complete standard-profile example
  ship with the skill.
- Validation is phase-aware (draft, approved, executed, publishable), with
  guidance on which helper applies at each stage.
- A public source-preflight command validates dossier and candidate-ledger
  locators with the same implementation `validate-packet` uses.
- Secret-scan diagnostics name the matching span, with false-positive
  fixtures, while real-secret detection is kept.
- The conditional-pass predicate and the profile breadth versus assurance
  distinction are documented precisely, and the docs say deadlines are
  advisory where the host cannot enforce them.
- Any delegation-policy change keeps the exact persisted envelope and still
  requires approval for material changes.
