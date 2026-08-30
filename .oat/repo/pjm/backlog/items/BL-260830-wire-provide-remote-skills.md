---
id: BL-260830-wire-provide-remote-skills
title: Wire provide-remote skills to the review-remote helper CLI
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - skills
  - review
  - cli
  - legacy-promoted
assignee: null
created: 2026-08-30T22:31:00.663Z
updated: 2026-08-30T22:31:00.663Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-a7cd. Make the provide-remote skills execute the tested TypeScript helper layer through a public CLI command instead of duplicating runtime logic in prose and shell.

## Acceptance Criteria

- Provide-remote skills execute core review logic through the tested TypeScript helper layer via a public CLI command.
- Renamed-file pre-image mapping, out-of-diff downgrade, verdict mapping, and stale-SHA narrowing are covered end to end.
- Integration tests stub GitHub and Git while exercising the command's real orchestration path.
- Interim prose/helper drift guards are removed or revised once runtime ownership is singular.
