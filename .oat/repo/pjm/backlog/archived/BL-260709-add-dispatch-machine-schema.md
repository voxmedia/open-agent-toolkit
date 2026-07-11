---
id: BL-260709-add-dispatch-machine-schema
title: 'Add dispatch machine schema and formatter'
status: closed
priority: medium
scope: feature
scope_estimate: M
labels:
  - dispatch
  - ux
  - schema
assignee: null
created: '2026-07-09T02:00:02Z'
updated: '2026-07-11T03:25:35Z'
associated_issues: []
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

## Completion Evidence

- Shared schema sections are implemented in `aedafd6b`; stable human and JSON
  formatters are implemented in `67704a2a`.
- Compatibility stamps are derived from the report in `07823ab2`, with resolver,
  gate, and workflow integration in `5bb809e3`, `c6256d5b`, and `30ffd78e`.
- Materialized Codex, base-role fallback, Claude/Cursor arguments,
  inherit/default, and unreported-runtime cases are covered by
  `dispatch-report.test.ts`, `stamp.test.ts`, resolver/gate tests, and the
  workflow contract suites; provenance boundaries were hardened in `760de162`.
- User-facing field semantics and compatibility behavior are documented in
  `d5ba8eaa` under the dispatch, implementation, gate, and provider docs.
- Phase p05 focused verification passed 724/724 tests, and full repository and
  release validation passed for version `0.1.49`.
