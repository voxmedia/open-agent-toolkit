---
id: BL-260726-validate-structured-output
title: Validate structured-output contract in gate skill commands
status: open
priority: medium
scope: task
scope_estimate: M
labels: []
assignee: null
created: 2026-07-26T01:11:44.950Z
updated: 2026-08-30T21:53:59Z
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

Position is not the problem — Commander accepts the global flag before or
after the subcommand, and both forms were verified to produce identical JSON.
Only outright absence breaks the contract.

A related trap is worth guarding against in the same pass: the flag belongs on
the `oat` invocation, not on an exec target's `baseCommand`. `cursor-agent`
rejects a bare `--json` outright — its flag is `--output-format json` — so an
agent misapplying the rule there would break gates hard.

## Acceptance Criteria

- `oat gate set` warns when a command invoking `oat gate review` omits `--json`,
  naming the structured-output contract as the reason.
- The warning does not block the write, so a deliberate non-JSON gate stays
  possible.
- Validation accepts the flag in either position.
- `oat pjm doctor` (or the closest existing health check) reports existing gate
  entries that omit the flag, so already-drifted configs are surfaced without
  needing a rewrite.
- A regression test covers the missing-flag, flag-before-subcommand, and
  flag-after-subcommand cases.
