---
id: BL-260728-unattended-visual-author-critic
title: Unattended visual author and critic
status: closed
priority: high
scope: feature
scope_estimate: L
labels:
  - explainer-kit
  - visual-quality
  - review
assignee: null
created: 2026-07-28T02:30:10.437Z
updated: '2026-07-29T16:16:24Z'
associated_issues: []
external_plans: []
---

## Description

Bundle the visual-authoring and review guidance required by unattended explainer
runs, then add an independent provider-neutral visual critic that judges the
rendered artifact set rather than trusting the author or structural checks.

## Dependencies

- The completed
  `BL-260727-ship-mit-notices-inside` licensing prerequisite must remain
  enforced for all adapted guidance.
- This is ordered outcome 1 under
  `BL-260727-close-the-explainer-kit-visual` and supplies authoring/review
  contracts consumed by `BL-260728-cohesive-adaptive-recap-set`.

## Acceptance Criteria

- A clean OAT install contains sufficient medium-specific visual-authoring and
  review guidance; no home-directory plugin is required at runtime.
- The provider-neutral visual critic is distinct from the fact critic and
  artifact author, receives browser evidence for the complete rendered set, and
  returns artifact-scoped findings.
- Missing or failed visual review prevents publication and durability
  attestation, and the runtime permits at most one correction followed by one
  final review.

## Acceptance Evidence

- Contract and rebuildability tests prove the shipped guidance and callbacks are
  present without machine-local dependencies.
- Runtime integration tests assert distinct callback identities, complete-set
  evidence, `built-needs-review` failure semantics, and callback counts for the
  hard correction cap.
- Golden conformance records retain the initial review, optional single
  correction, and terminal review disposition.

## Disposition

In the current explainer-improvements critical path. Planned for phases 2 and 3
before golden benchmark execution.
