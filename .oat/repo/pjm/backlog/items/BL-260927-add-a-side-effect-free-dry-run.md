---
id: BL-260927-add-a-side-effect-free-dry-run
title: Add a side-effect-free dry run to oat project log append
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - project-log
  - cli
assignee: null
created: 2026-09-27T03:35:38.617Z
updated: 2026-09-27T03:35:38.617Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/314
external_plans: []
---

## Description

`oat project log append` has no way to check whether it will succeed, and on an append-only log a probe entry is permanent. Assets are resolved only when a new log is created, so an asset and CLI version mismatch affects the first append, and `oat project log check` never resolves assets: it reported `absent` with exit 0 under a scratch mismatch. `oat tools list --json` does fail on the mismatch and is an undocumented read-only workaround. `--idempotency-key` does not help a first write. Source: GitHub issue #314.

## Acceptance Criteria

- `oat project log append --dry-run` runs every validation (grammar, scope and type, asset and CLI compatibility, sealed state) and writes nothing, including when the log does not exist yet.
- A failing dry run exits non-zero with the same diagnostics a real append would produce.
- Tests cover a valid probe, an asset mismatch, and a sealed log, asserting no file or commit changes.
