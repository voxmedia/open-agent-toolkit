---
id: BL-260902-append-only-lifecycle-history
title: Append-only lifecycle history after completion
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - lifecycle
  - project-log
  - retro
assignee: null
created: 2026-09-02T23:48:43.791Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/209
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/210
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/251
external_plans: []
---

## Description

Three related post-completion history gaps: `oat-project-retro` regenerates `references/project-retro.md` instead of preserving a finished retro and adding an addendum (#209); `oat project log append` has no valid target once a project is complete because the completion seal must remain the final `project-log.md` entry (#210); and a retro requested after completion has no compliant place for its structural receipt (#251). Define one append-only history contract that preserves existing retros, gives post-completion appends a durable target that does not disturb the seal, and locates the retro receipt on the completed project's durable artifacts. Sources: GitHub issues #209, #210, and #251.

## Acceptance Criteria

- `oat-project-retro` preserves an existing `references/project-retro.md` and records later evidence as a dated addendum instead of overwriting it.
- `oat project log append` has a valid, documented target after lifecycle completion that leaves the completion seal as the final `project-log.md` entry.
- A retro requested after completion records a durable structural receipt discoverable from the completed project artifacts, with explicit persistence rules for shared, synced, and local scopes.
- Retry and idempotency behavior for post-completion appends and receipts is defined and tested.
- The retro and completion skills no longer give mutually incompatible post-completion instructions.
