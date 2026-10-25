---
id: BL-261025-verify-nav-sync-cross
title: Verify nav sync cross-directory link items under a docs base path
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T05:31:04.704Z
updated: 2026-10-25T05:31:04.704Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

Suspected, not rendered: nav sync turns a cross-directory Contents link into a root-absolute Fumadocs link item such as `[Model Runtime](/engineering/architecture/model-runtime)`. When the site is deployed under a base path (`NEXT_PUBLIC_BASE_PATH`), the link item may not receive the base path.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- A built fixture under a base path confirms whether link items resolve; if not, nav sync emits base-path-safe items or the docs state the limitation.
