---
id: BL-261025-flag-the-source-config-change
title: Flag the source-config change nonReaderPaths needs to stop rendering
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:08.199Z
updated: 2026-10-25T05:31:08.199Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

`documentation.nonReaderPaths` stops Fumadocs from rendering excluded pages only when the app's `source.config.ts` passes OAT's config to `createSourceConfig()` (`oatConfigFile`/`appRoot`). Older apps lack that, and oat-docs-apply treats the source-config change as manual, but neither `oat docs check` nor oat-docs-analyze notices that it is missing, so excluded pages keep rendering (and, without `meta.json`, appear in the sidebar).

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- oat-docs-analyze reports the missing source-config wiring as a `manual` recommendation when `nonReaderPaths` is set, and the docs explain the dependency.
