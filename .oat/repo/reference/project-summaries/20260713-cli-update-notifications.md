---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: true
oat_template: false
oat_summary_last_task: prev3-t01
oat_summary_revision_count: 3
oat_summary_includes_revisions: [p-rev1, p-rev2, p-rev3]
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
the documented global npm update command when a newer release is known.
Ordinary commands never prompt, launch an installer, or change the requested
command's exit behavior.

Commands rooted at `oat init`, `oat tools install`, and `oat tools update` use
a specialized pre-mutation guard. When a newer CLI is known, the guard explains
that the running older CLI can only install its own older bundled tool versions
and offers to update the exact CLI version first. Acceptance runs shell-free npm
execution, cancels the old command, and prints a shell-aware equivalent of the
full original command for rerun. Decline warns and continues with the current
bundle.

The notifier suppresses JSON, non-interactive, CI, test, source-development,
and ephemeral-runner contexts. Users can suppress one process with
a truthy `NO_UPDATE_NOTIFIER` value such as `1`, `true`, `yes`, or `on`, or
persist a user-level preference with
`oat config set updateNotifications false --user`. Empty and false-like
environment values such as `0` and `false` leave notifications enabled. The
cache normally limits registry checks to once every 24 hours and same-version
notices to once every 72 hours.

The feature includes focused config, cache, registry, eligibility, bootstrap,
and failure-containment tests; CLI and docs guidance; and lockstep `0.1.62`
versions for all five public packages plus regenerated shipped version assets.

## Key Decisions

- **Passive notification for ordinary commands:** Unrelated commands do not
  prompt or execute package-manager updates. Tool-bundle mutation commands are
  the explicit exception because an older CLI can only install its older
  bundled tool versions.
- **Guard tool-bundle mutations before execution:** `init`, `tools install`,
  and `tools update` offer an exact-version CLI update before mutation. A
  successful update stops the old action and requires a rerun under the new CLI.
- **Stable npm metadata with a dedicated cache:** Availability follows the npm
  `latest` dist-tag, uses Node's built-in fetch/filesystem APIs, and stores
  runtime timestamps separately from user-authored configuration.
- **Automation-safe eligibility:** Update output is limited to eligible human
  command runs and is absent from machine-readable JSON behavior.
- **Dual suppression controls:** Truthy `NO_UPDATE_NOTIFIER` values support
  temporary and CI suppression, while `updateNotifications: false` provides a
  durable user-level preference.
- **Best-effort cross-process cadence:** The TTLs are exact for serial
  invocations. Overlapping processes can duplicate a check or notice; adding
  cross-process locking and stale-lock recovery was disproportionate for
  passive output.

## Design Deltas

The original discovery and design described the check and notice intervals as
absolute. Implementation and review established that they are exact for serial
invocations and best-effort across overlapping processes. User documentation
was updated before final re-review to state this behavior explicitly.

The original design was notification-only. Inline feedback added a guarded
exception for commands that install bundled tools. This revision preserves
passive notices elsewhere while preventing users from unknowingly installing
older tool versions from an outdated CLI bundle.

The p-rev2 review expanded process suppression from the exact value `1` to
common truthy `NO_UPDATE_NOTIFIER` values for both passive notices and guarded
offers. It also made prompt infrastructure errors warn and continue with the
current bundle while preserving blocking installer failures before mutation.

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
- The p-rev2 `m2` finding was explicitly deferred: display-only PowerShell
  rerun guidance may not round-trip literal embedded double quotes when
  PowerShell 5.1 invokes native executables. PowerShell 7 behaves correctly;
  revisit only after a reported PowerShell 5.1 rerun failure or an explicit
  compatibility requirement.

## Follow-up Items

- Consider a cross-process cache claim only if duplicate checks or notices are
  observed in real usage.
- Release-channel selection and a general-purpose self-update command remain
  intentionally deferred.
