---
id: BL-260908-date-decision-record-ids
title: Date decision-record IDs in local time or document UTC
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - pjm
  - cli
  - wave-6-followup
assignee: null
created: 2026-09-08T05:08:03.315Z
updated: 2026-09-08T05:08:03.315Z
associated_issues: []
external_plans: []
---

## Description

`oat decision new` derives the `DR-YYMMDD` id and `date:` in UTC, so an evening US-Central run produced `DR-260908-…` while sibling records created the same local day carry `DR-260907-…` (wave-6 p03 worked around it with `--created-at`). Decide on local-date ids (matching how operators reason about "today") or document the UTC rule in the decisions AGENTS.md and the command help.

## Acceptance Criteria

- [ ] The id/date derivation rule is explicit (local or UTC) in code and in `.oat/repo/reference/decisions/AGENTS.md`
- [ ] A test pins the chosen behavior for an evening run in a negative-offset zone
