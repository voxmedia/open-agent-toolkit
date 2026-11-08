---
id: BL-261108-derive-first-release-versions
title: Derive first-release versions in the project summary from tags
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - summary
  - release
assignee: null
created: 2026-11-08T21:52:19.732Z
updated: 2026-11-08T21:52:19.732Z
associated_issues: []
external_plans: []
---

## Description

oat-project-summary stated the wrong first release for two review-gate-integrity-goal milestones (0.3.45 instead of 0.3.44, and 0.3.46 instead of 0.3.47). The version in a PR's package.json is not the first release that carries the change once another lockstep PR ships that version first. An independent fact-check caught both, and 31efee2f6 corrected them. Source: review-gate-integrity-goal project retro UP-03.

## Acceptance Criteria

- oat-project-summary derives "first released in" from the earliest release tag that contains the delivery's merge or squash commit (`git tag --contains`).
- When no release tag contains the commit yet, the summary omits the version or says it is unreleased, instead of copying the PR's package.json version.
