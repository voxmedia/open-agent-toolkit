---
id: BL-260927-preserve-oat-config-json-key
title: Preserve .oat/config.json key order and skip no-op config writes
status: closed
priority: low
scope: task
scope_estimate: S
labels:
  - config
  - cli
assignee: null
created: 2026-09-27T03:35:38.436Z
updated: '2026-09-27T06:49:59Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/329
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/311
external_plans: []
---

## Description

`writeOatConfig` in `packages/cli/src/config/oat-config.ts` always normalizes to a fixed key order and writes, so a same-value `oat config set` changes the file and moves `git` below `projects` (reproduced 2026-09-26). The same normalization makes the intended one-time `documentation.index` write from `oat docs generate-index` (PR #262) reorder unrelated keys (#311). Leaf keys such as `workflow.retro.filing.repo` already read correctly; parent-key `oat config get` failures are by design, and the retro skill's wording is tracked with the retro walkthrough item. Sources: GitHub issues #329 and #311.

## Acceptance Criteria

- A config-writing command with no semantic change leaves `.oat/config.json` byte-identical.
- A real change preserves the existing order of untouched keys.
- The one-time `documentation.index` write by `oat docs generate-index` changes only that key.
- Tests cover a same-value set, a real change, and the docs index write.
