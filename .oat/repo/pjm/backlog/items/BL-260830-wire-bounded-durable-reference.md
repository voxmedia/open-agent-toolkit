---
id: BL-260830-wire-bounded-durable-reference
title: Wire bounded durable-reference reads into lifecycle skills
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - skills
  - workflow
  - reference
  - needs-discussion
  - legacy-promoted
assignee: null
created: 2026-08-30T22:31:02.506Z
updated: 2026-08-30T22:31:02.506Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-e582. Define bounded, optional reads of canonical current state, decisions, and project summaries for discovery, planning, and review without exceeding context budgets.

## Acceptance Criteria

- Discovery, planning, and review define which canonical reference records they consume and why.
- Missing PJM/reference adoption is a clean no-op for consuming repositories.
- Matching and token-budget rules bound project-summary and decision context.
- Documentation distinguishes generated repository knowledge from authored durable reference records.
