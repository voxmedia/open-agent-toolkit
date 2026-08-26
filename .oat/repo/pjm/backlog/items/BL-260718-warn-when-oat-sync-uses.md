---
id: BL-260718-warn-when-oat-sync-uses
title: Warn when oat sync uses a different producing CLI version
status: open
priority: high
scope: feature
scope_estimate: S
labels:
  - sync
  - manifest
  - versioning
assignee: null
created: 2026-07-18T17:36:38.289Z
updated: 2026-08-20T02:37:32Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-19-warn-sync-version-skew.md
---

## Description

The sync manifest already records `oatVersion`, but sync silently replaces a
stale value during apply. Compare the invoking CLI version with the manifest's
producing version and warn before mutation when they differ. This is the
general detection for stale-tool thrash. Evidence: stoa stale locally resolved
CLI root cause on 2026-07-18 and this repo's 24-file catalogue materialization
event, where version skew was the first suspect.

## Acceptance Criteria

- Before apply, sync compares the loaded manifest's `oatVersion` with the
  running `OAT_VERSION` and emits a clear mismatch warning before restamping.
- Human and JSON modes expose both producing and invoking versions without
  making version skew a hard failure.
- Dry-run reports the mismatch without mutating the manifest.
- Tests cover older, newer, equal, and missing or invalid producing-version
  evidence.
