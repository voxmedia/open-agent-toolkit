---
id: DR-260713-passive-notification-only
title: Passive notification only
date: 2026-07-13
status: accepted
legacy_id: null
---

# Passive notification only

## Context

Unrelated commands do not prompt or execute package-manager updates, avoiding blocked agent sessions and uncertain installation ownership.

## Decision

Use passive, non-mutating notices for ordinary eligible commands. Commands
that install bundled tool content (`oat init`, `oat tools install`, and
`oat tools update`) are the explicit exception: before mutation, a known newer
CLI triggers a default-no offer to update the exact CLI version first.

## Consequences

- Ordinary commands never prompt or launch a package manager.
- Guarded commands explain that the running CLI can only install its own
  bundled tool versions; they do not claim those versions are incompatible.
- Acceptance updates the CLI and cancels the old action so the user reruns the
  complete original command under the new bundle.
- Decline warns and continues with the current CLI's bundled versions.
