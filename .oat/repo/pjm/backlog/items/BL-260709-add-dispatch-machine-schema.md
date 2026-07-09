---
id: BL-260709-add-dispatch-machine-schema
title: 'Add dispatch machine schema and formatter'
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - dispatch
  - ux
  - schema
assignee: null
created: '2026-07-09T02:00:02Z'
updated: '2026-07-09T02:00:02Z'
associated_issues: []
oat_template: false
oat_template_name: backlog-item
---

## Description

Create a reusable machine-readable dispatch schema and formatter for OAT
dispatch reporting. The active `codex-family-subagents` project will only fold
in the human-facing display guidance from
`.oat/projects/shared/codex-family-subagents/references/dispatch-ux-supplement.md`;
this backlog item owns the larger reusable schema, renderer, and JSON contract.

The schema should avoid overloading `producer` by representing route /
invocation target, OAT policy, requested controls, configured defaults, and
runtime confirmation as separate fields. The formatter should produce both
stable machine output and clear human-facing blocks without leading with
`producer=unknown` when the accurate statement is that runtime identity was not
reported.

## Acceptance Criteria

- A shared dispatch report schema represents route, OAT policy, requested
  controls, configured defaults, and runtime confirmation as distinct sections.
- The existing parseable `Dispatch:` stamp remains supported for compatibility,
  with any migration path documented.
- CLI or workflow-facing formatter output can render the schema into the
  dispatch display used by implementation/review workflows.
- Tests cover materialized Codex roles, Codex base-role fallback, Claude/Cursor
  model-argument dispatch, inherit/default dispatch, and runtime-identity
  unverified cases.
- Documentation explains which fields are requested controls, configured
  defaults, and observed/inferred runtime identity.
