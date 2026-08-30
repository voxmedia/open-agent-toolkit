---
id: BL-260726-validate-structured-output
title: Validate structured-output contract in gate skill commands
status: closed
priority: medium
scope: task
scope_estimate: S
labels: []
assignee: null
created: 2026-07-26T01:11:44.950Z
updated: '2026-08-30T23:11:07Z'
associated_issues: []
external_plans: []
---

## Description

`oat gate set --command` stores its command string verbatim. Nothing checks
that a command invoking `oat gate review` carries the global `--json` flag,
even though an orchestrator reads the structured result envelope from stdout
on process exit to learn the gate outcome.

A gate configured without `--json` emits human-oriented output instead. The
gate still runs, so the omission surfaces later as a confusing consumer-side
failure rather than as a configuration error.

This has drifted independently on two machines. As of 2026-07-26 the user-scope
config on this machine had `oat-project-import-plan` missing the flag entirely
and `oat-project-quick-start` carrying it after the subcommand; both were
repaired by hand. Hand-authored commands plus no validation means the drift
recurs and is rediscovered each time by debugging a failed gate.

The combined `gate-execution-contract-hardening` project supersedes the
original warning-only compatibility proposal. Lifecycle consumers now define
one canonical reusable form: `oat --json gate review --project
"$PROJECT_PATH" ...`. Global `--json` must appear before `gate review`; missing
or late placement is rejected when a recognized direct lifecycle command is
configured.

A related trap is worth guarding against in the same pass: the flag belongs on
the `oat` invocation, not on an exec target's `baseCommand`. `cursor-agent`
rejects a bare `--json` outright — its flag is `--output-format json` — so an
agent misapplying the rule there would break gates hard.

## Acceptance Criteria

- `oat gate set` rejects a recognized direct lifecycle `oat gate review`
  command unless it uses canonical `oat --json gate review` placement, naming
  the structured-output contract and canonical form in the error.
- Rejection occurs before shared, local, or user config mutation; valid
  commands are persisted byte-for-byte and executed unchanged later.
- Unrelated gate commands, arbitrary unknown wrappers, and provider exec-target
  `baseCommand` values remain outside this OAT global-flag validator.
- Regression coverage includes canonical success, missing/late/subcommand-
  scoped `--json`, quoted gate-like prompt text, provider-native output flags,
  and unchanged config layers after rejection.
- Gate-aware lifecycle skills and public documentation use the same canonical
  global-JSON command shape without reusable provider/model targets.
