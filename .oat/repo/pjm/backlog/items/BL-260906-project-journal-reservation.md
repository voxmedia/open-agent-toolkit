---
id: BL-260906-project-journal-reservation
title: Project journal reservation state into the smoke evidence bundle
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - smoke
  - tooling
assignee: null
created: 2026-09-06T13:44:00.751Z
updated: 2026-09-06T13:44:00.751Z
associated_issues: []
external_plans: []
---

## Description

p02 review M3 (wave 3). tools/smoke/evidence/normalizeManifest projects ownership-journal resources without the schema-v2 state and reservation discriminators, so the bundle advertises v2 but cannot distinguish a reserved entry from a registered one; no consumer reads state today (only cleanup.mjs), so it is fidelity, not safety. Project state, reservedAt, and the reserved baseline and extend assertions.mjs; tools/smoke/evidence/\* was outside the wave-3 plan's scope.

## Acceptance Criteria

- [ ] `tools/smoke/evidence/normalizeManifest` projects `state`, `reservedAt`, and the reserved baseline for schema-v2 journal entries
- [ ] `assertions.mjs` distinguishes reserved from registered entries and the `implement-parallel-isolation` whitelist no longer widens on a reserved child
- [ ] A fixture captured from a real interrupted run pins the projection
