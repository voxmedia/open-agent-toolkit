---
id: BL-260906-guard-packed-asset-directories
title: Guard packed asset directories and document the OAT_ASSETS_DIR contract
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - cli
  - release-safety
  - docs
assignee: null
created: 2026-09-06T01:23:56.563Z
updated: 2026-09-06T01:23:56.563Z
associated_issues: []
external_plans: []
---

## Description

Wave 1 p02 review follow-ups: requiredPackedPaths guards no packed path under agents/, scripts/, docs/, or config/ while npm pack drops empty directories, so a producer change that empties a conditionally populated directory could publish a CLI whose every command exits 2 while local gates stay green; add packed-path guards for all seven required bundle directories. Also update apps/oat-docs/docs/cli-utilities/configuration.md (OAT_ASSETS_DIR section) to the structural validation contract shipped in wave 1.

## Acceptance Criteria

- `requiredPackedPaths` (or its successor) guards at least one packed path under each of the seven required bundle directories, and `pnpm release:validate` fails when any of them is absent from the packed tarball.
- A negative control that empties a conditionally populated directory before packing makes the release gate fail locally and in CI.
- `apps/oat-docs/docs/cli-utilities/configuration.md` describes the structural `OAT_ASSETS_DIR` contract shipped in wave 1 (seven required directories, exit 2, source-aware remedies).
