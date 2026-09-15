---
id: BL-260915-stop-the-implementation
title: Stop the implementation template preamble from quoting a section heading
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - templates
  - oat-project-implement
assignee: null
created: 2026-09-15T13:00:20.503Z
updated: 2026-09-15T13:00:20.503Z
associated_issues: []
external_plans: []
---

## Description

The conventions blockquote at the top of `.oat/templates/implementation.md` quotes the literal `## Final Summary (for PR/docs)` heading. Any substring or `str.index` search for that heading matches the preamble first, so a scripted edit that slices from it to `## References` deletes the whole body. This has erased the progress table, task records, deviations, and test results three times, most recently in oat-doctor-router (commit 429ccb1c3), where it went unnoticed through four gate runs and a Bugbot review. Source: oat-doctor-router retro RP-01.

## Acceptance Criteria

- The preamble in `.oat/templates/implementation.md` names the Final Summary section in prose without the `## ` heading literal.
- A test fails when any bundled template contains a `## ` heading literal outside a heading line, proven by reverting the preamble.
- Skill prose that tells agents to fill the section still resolves to the real heading.
