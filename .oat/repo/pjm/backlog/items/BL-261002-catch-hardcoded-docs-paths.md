---
id: BL-261002-catch-hardcoded-docs-paths
title: Catch hardcoded docs paths in skill tests when docs pages move
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - docs-tooling
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T19:38:42.667Z
updated: 2026-10-02T19:38:42.667Z
associated_issues: []
external_plans: []
---

## Description

Moving docs pages in the docs overhaul failed 18 skill tests under .agents/skills/recon/tests and .agents/skills/oat-doctor/tests that hardcode docs paths. No docs check covers them; only the isolated-HOME test gate found them (fixed in 777810f5b). Source: docs-improvement-overhaul retro RP-05.

## Acceptance Criteria

- Moving or renaming a docs page that a skill test references fails a docs
  check (`pnpm docs:validate` or a dedicated test) with the test path and the
  stale docs path, or the tests resolve docs paths from the docs tree instead
  of hardcoding them.
- The check is proven to fail on a seeded stale reference.
