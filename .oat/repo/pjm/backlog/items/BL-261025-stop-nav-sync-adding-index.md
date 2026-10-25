---
id: BL-261025-stop-nav-sync-adding-index
title: Stop nav sync adding index beside a link-form pagesIndex
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T06:02:14.425Z
updated: 2026-10-25T06:02:14.425Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

`hasImplicitIndex` in `packages/cli/src/commands/docs/nav/fumadocs.ts` treats any `pagesIndex` other than `"index"` as "no implicit index", so nav sync writes `"index"` into `pages` for a folder whose meta.json has a link-form `pagesIndex` such as `"[Overview](/engineering)"`. In fumadocs-core 16.10.2 (`buildFolder` in the loader), a link-form `pagesIndex` makes the link the folder index and attaches no `index` page, so the listed `"index"` becomes a second Overview row beside the folder link. Ten folders in one consumer repository have this shape. Worked out from the loader source; not yet confirmed in a rendered sidebar.

The hand-authored membership comparison already treats a link-form `pagesIndex` to the folder's own URL as reaching the landing page (`DR-261025-hand-authored-navigation-is`); only nav-sync generation is affected.

Found by read-only conformance runs of OAT docs tooling 0.3.32 on consumer repositories; follow-up to [BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md) and issue #367.

## Acceptance Criteria

- A built or loader-level fixture confirms the duplicate row.
- Nav sync omits `"index"` when a link-form `pagesIndex` points at the folder's own URL (and keeps current behavior for path-form values), with `--check` freshness consistent.
- oat-docs-analyze's expected-output description (Step 6, nav-sync `meta.json`) covers the link-form `pagesIndex` case.
