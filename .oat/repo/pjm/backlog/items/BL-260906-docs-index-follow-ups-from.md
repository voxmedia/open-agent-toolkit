---
id: BL-260906-docs-index-follow-ups-from
title: Docs-index follow-ups from wave 1 reviews
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - cli
  - docs
assignee: null
created: 2026-09-06T01:23:57.068Z
updated: 2026-09-06T01:23:57.068Z
associated_issues: []
external_plans: []
---

## Description

Deferred p01/p04 review minors: docs/init/index.ts labels the authored docs/index.md as 'Index file' while the Fumadocs documentation.index seed now points at the app-root manifest; the symlink hop-cap refusal always advises --output even for a derived docs-directory chain and surfaces under the refusal code; generation gives no signal when exclusions empty the manifest; the generate-index --json payload omits the effective excludes; DEFAULT_SHARED_CONFIG lacks an excludes: null default (behaviorally inert).

## Acceptance Criteria

- `docs init` labels the authored `docs/index.md` consistently with the Fumadocs `documentation.index` seed (or documents the distinction), with the pinned test updated.
- The symlink hop-cap refusal names the flag that owns the offending path (`--docs-dir` vs `--output`) and uses the configuration exit code when the chain is on the derived docs directory.
- `oat docs generate-index` reports when exclusions leave the manifest empty, and its `--json` payload includes the effective `excludes`.
- `DEFAULT_SHARED_CONFIG` carries `excludes: null` alongside the other `documentation.*` defaults.
- A regression test asserts the bare-invocation refusal (exit 1) in `config-root` mode.
