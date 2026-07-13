---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: true
oat_template: false
oat_summary_last_task: p02-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: cli-update-notifications

## Overview

OAT users had no indication that a newer CLI release was available. This
project added familiar update awareness while preserving predictable behavior
for scripts, agents, CI, JSON output, local development, and ephemeral package
runner invocations.

## What Was Implemented

The CLI now runs a best-effort update notifier before actionable commands in
eligible interactive sessions. The notifier checks npm's stable `latest`
metadata through an abortable request, compares strict stable versions, caches
check attempts in `~/.oat/update-check.json`, and prints a passive warning with
the documented global npm update command when a newer release is known. It
never prompts, launches an installer, or changes the requested command's exit
behavior.

The notifier suppresses JSON, non-interactive, CI, test, source-development,
and ephemeral-runner contexts. Users can suppress one process with
`NO_UPDATE_NOTIFIER=1` or persist a user-level preference with
`oat config set updateNotifications false --user`. The cache normally limits
registry checks to once every 24 hours and same-version notices to once every
72 hours.

The feature includes focused config, cache, registry, eligibility, bootstrap,
and failure-containment tests; CLI and docs guidance; and lockstep `0.1.61`
versions for all five public packages plus regenerated shipped version assets.

## Key Decisions

- **Passive notification only:** Unrelated commands do not prompt or execute
  package-manager updates. This avoids blocking pseudo-terminal agent sessions
  and avoids guessing which package manager owns the installation.
- **Stable npm metadata with a dedicated cache:** Availability follows the npm
  `latest` dist-tag, uses Node's built-in fetch/filesystem APIs, and stores
  runtime timestamps separately from user-authored configuration.
- **Automation-safe eligibility:** Update output is limited to eligible human
  command runs and is absent from machine-readable JSON behavior.
- **Dual suppression controls:** `NO_UPDATE_NOTIFIER=1` supports temporary and
  CI suppression, while `updateNotifications: false` provides a durable
  user-level preference.
- **Best-effort cross-process cadence:** The TTLs are exact for serial
  invocations. Overlapping processes can duplicate a check or notice; adding
  cross-process locking and stale-lock recovery was disproportionate for
  passive output.

## Design Deltas

The original discovery and design described the check and notice intervals as
absolute. Implementation and review established that they are exact for serial
invocations and best-effort across overlapping processes. User documentation
was updated before final re-review to state this behavior explicitly.

## Notable Challenges

Repository formatting was first exercised after the command-hook task and found
style-only changes in its committed files. The next task's boundary was updated
and committed before continuing the original phase implementer, preserving
append-only task history and producing a clean final format gate.

## Tradeoffs Made

- No runtime semver dependency was added. The stable channel accepts and
  compares strict `major.minor.patch` values; malformed and prerelease values
  are ignored.
- Registry and cache failures remain silent and non-fatal. A failed refresh
  records its attempt timestamp so offline users do not pay the timeout on
  every command.
- No live-registry end-to-end test was added; injected adapters keep tests
  deterministic and prevent writes to the real user home.

## Follow-up Items

- Consider a cross-process cache claim only if duplicate checks or notices are
  observed in real usage.
- Release-channel selection and an explicit guided updater remain intentionally
  deferred until OAT supports those workflows.
