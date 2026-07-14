---
id: DR-260713-dual-update-suppression
title: Dual update suppression controls
date: 2026-07-13
status: accepted
legacy_id: null
---

# Dual update suppression controls

## Context

OAT needs both process-scoped suppression for automation and one-off commands
and a durable user preference that applies across repositories. The shipped
eligibility policy already normalizes common truthy environment values.

## Decision

Accept truthy `NO_UPDATE_NOTIFIER` values such as `1`, `true`, `yes`, and `on`
for process-scoped suppression. Keep the user-level
`updateNotifications: false` preference for durable suppression. Both controls
suppress passive notices and guarded CLI update offers.

## Consequences

- CI and one-off commands can opt out without modifying files and can use the
  truthy forms already recognized by OAT environment normalization.
- Empty and false-like values such as `0` and `false` do not suppress update
  awareness.
- Users can disable update awareness across repositories through
  `~/.oat/config.json`.
- A user who opts out also bypasses the stale-bundle warning on guarded
  commands and accepts responsibility for managing CLI/tool freshness.
- Missing configuration defaults to enabled with source attribution through
  the existing config resolver.
