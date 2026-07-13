---
id: DR-260713-dual-update-suppression
title: Dual update suppression controls
date: 2026-07-13
status: accepted
legacy_id: null
---

# Dual update suppression controls

## Context

NO_UPDATE_NOTIFIER supports temporary suppression while updateNotifications false provides a durable user preference.

## Decision

Support `NO_UPDATE_NOTIFIER=1` for process-scoped suppression and the
user-level `updateNotifications: false` preference for durable suppression.
Both controls suppress passive notices and guarded CLI update offers.

## Consequences

- CI and one-off commands can opt out without modifying files.
- Users can disable update awareness across repositories through
  `~/.oat/config.json`.
- A user who opts out also bypasses the stale-bundle warning on guarded
  commands and accepts responsibility for managing CLI/tool freshness.
- Missing configuration defaults to enabled with source attribution through
  the existing config resolver.
