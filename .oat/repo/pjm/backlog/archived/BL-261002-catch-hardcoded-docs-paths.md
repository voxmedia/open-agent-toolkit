---
id: BL-261002-catch-hardcoded-docs-paths
title: Catch hardcoded docs paths in skill tests when docs pages move
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - docs-tooling
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T19:38:42.667Z
updated: '2026-10-24T19:01:57Z'
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

## Closure evidence — 2026-10-24

The dedicated existing smoke test is enrolled in normal `pnpm test` through
`test:smoke`: `tools/smoke/verification/skill-docs-paths{,.test}.mjs` reports the
executable test path/line and stale literal docs path. Accepted p01-t04
(commit 85ac9fe9ae09eea7bc86659c4f75f802a623e53e) records the real seeded recon
reference failing exit 1 and repaired exit 0. P09 freshly reran both existing
tests (2/2, exit 0); the original seeded negative control is inherited, not
repeated or expanded. Computed paths and historical fixture prose remain out
of scope. Shipped in [PR #368](https://github.com/voxmedia/open-agent-toolkit/pull/368).

Evidence: [docs-skills-ia-367 implementation](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/implementation.md),
[approved brief](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/plan.md) and
[issue #367 delivery checklist](https://github.com/voxmedia/open-agent-toolkit/blob/a65959999f17c5c77b4659946f48251098061fed/.oat/projects/shared/docs-skills-ia-367/references/issue-367-delivery-checklist.md).
P09 prepares OAT closure; root retains final acceptance/review and delivery.
