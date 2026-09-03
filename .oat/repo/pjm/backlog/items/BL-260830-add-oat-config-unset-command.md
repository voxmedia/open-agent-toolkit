---
id: BL-260830-add-oat-config-unset-command
title: Add oat config unset command
status: open
priority: high
scope: feature
scope_estimate: S
labels:
  - cli
  - config
  - workflow-preferences
  - ux
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:45.656Z
updated: 2026-09-03T00:08:42Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-02-add-oat-config-unset-command.md
---

## Description

Promoted from legacy backlog record bl-af93. Add a supported CLI path for removing a key from shared, local, or user config without hand-editing JSON.

## Acceptance Criteria

- `oat config unset <key>` removes supported flat and nested keys from shared, local, and user surfaces.
- Surface restrictions and mutually exclusive flags match `oat config set` behavior.
- Empty parent objects are removed, and effective reads fall back to lower-precedence values or defaults.
- Unknown or absent keys produce explicit machine- and human-readable outcomes with tests.
