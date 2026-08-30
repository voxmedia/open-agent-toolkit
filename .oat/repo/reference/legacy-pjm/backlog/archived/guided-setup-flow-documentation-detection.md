---
id: bl-1b44
title: 'Add guided setup flow to `oat init` with documentation detection'
status: closed
priority: high
scope: feature
scope_estimate: L
labels: ['tooling', 'setup']
assignee: null
created: '2026-03-09T00:00:00Z'
updated: '2026-03-14T00:00:00Z'
associated_issues: []
---

## Description

Delivered a guided `oat init` setup flow that can bootstrap providers, local paths, tool packs, sync, and documentation configuration in a single sequential experience.

Key outcomes:

- Auto-triggers the guided flow on fresh repositories and supports explicit reruns via `--setup`.
- Walks the user through provider selection, local paths, tool pack installation, sync, and documentation detection.
- Connects guided setup with the related documentation-detection and workflow-continuation work.

Links:

- Project: `.oat/projects/archived/guided-oat-init/`
- PRs: `#61`, `#69`, `#73`, `#74`

## Acceptance Criteria

- Added guided setup to `oat init` with fresh-repo auto-trigger and `--setup` rerun support.
- Added a sequential opt-in step flow for core setup actions.
- Integrated documentation detection into the setup experience.
