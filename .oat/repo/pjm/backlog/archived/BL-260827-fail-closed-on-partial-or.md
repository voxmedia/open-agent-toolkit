---
id: BL-260827-fail-closed-on-partial-or
title: Fail closed on partial or metadata-only OAT_ASSETS_DIR bundles
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - cli
  - assets
  - containment
  - wave-3-follow-up
assignee: null
created: 2026-08-27T01:48:17.829Z
updated: '2026-09-06T01:23:55Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-30-validate-assets-bundle-structure.md
---

## Description

validateAssetsBundle checks only bundle-metadata.json, so a directory containing nothing but a correct metadata file passes validation: with OAT_ASSETS_DIR pointing at such a directory, 'oat tools list' exits 0 and reports every installed skill as not-bundled instead of failing (wave-3 final review m4, probe C). Consider a cheap structural check (e.g. require skills/ and templates/ to exist) so truncated copies, interrupted bundle-assets.sh staging dirs, or hand-made roots fail closed like the other invalid classes. Conformant with the wave-3 plan's metadata-validation bar; forward-looking.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
