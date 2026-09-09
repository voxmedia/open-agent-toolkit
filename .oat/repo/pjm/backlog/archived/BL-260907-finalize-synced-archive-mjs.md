---
id: BL-260907-finalize-synced-archive-mjs
title: finalize-synced-archive.mjs reads stdin with fs/promises readFile(0), so
  the synced deferred clear always fails
status: closed
priority: urgent
scope: task
scope_estimate: XS
labels:
  - lifecycle
  - cli
  - bug
  - wave-5-followup
assignee: null
created: 2026-09-07T11:54:00.007Z
updated: '2026-09-09T10:16:40Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-read-stdin-in-finalize-synced-archive.md
---

## Description

finalize-synced-archive.mjs:94 (PR #254) reads stdin via readFile(0, 'utf8') imported from node:fs/promises, which rejects a numeric fd: piping a report into it fails with 'The path argument must be of type string or an instance of Buffer or URL. Received type number (0)', exit 1. Step 12 of oat-project-complete invokes it exactly that way, so the synced deferred-clear path shipped by #254 cannot succeed today (the pointer is retained and never cleared). Fix: readFileSync(0, 'utf8') from node:fs (or the async equivalent), plus a test that exercises the CLI entry point (the existing .mjs test only covers the exported function). Found by wave-5 p09 while parking.

## Acceptance Criteria

- [ ] `finalize-synced-archive.mjs` reads stdin with an fd-capable API and the Step 12 pipe form succeeds
- [ ] A test drives the script's CLI entry point through a pipe (not only the exported function)
- [ ] A synced deferred clear completes end-to-end in a scratch project (pointer cleared)
