---
id: BL-260830-persist-instruction-sync
title: Persist instruction sync strategy in config and init
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - provider-sync
  - instructions
  - config
  - onboarding
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:53.128Z
updated: 2026-08-30T22:30:53.128Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-28ce. Persist the pointer, symlink, or copy strategy in configuration and expose the choice during initialization.

## Acceptance Criteria

- Project and user configuration can persist a validated pointer, symlink, or copy strategy.
- Init exposes the choice and non-interactive execution has a documented deterministic default.
- Sync resolves precedence consistently and status reports the effective strategy.
- Migration preserves existing installations unless the operator changes configuration.
