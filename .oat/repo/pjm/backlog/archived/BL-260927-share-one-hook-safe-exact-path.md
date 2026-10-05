---
id: BL-260927-share-one-hook-safe-exact-path
title: Share one hook-safe exact-path commit primitive across CLI and skill
  lifecycle commits
status: closed
priority: medium
scope: feature
scope_estimate: L
labels:
  - git
  - lifecycle
  - cli
  - skills
assignee: null
created: 2026-09-27T03:35:37.315Z
updated: '2026-10-05T03:05:31Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/306
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/312
external_plans: []
---

## Description

The gate project-log path already retries transient index locks without deleting them, is idempotent, and writes a resumable receipt (PR #275). Other lifecycle commits share none of that: `promote.ts`, `ref-sync.ts`, and skill scaffold commits (`git add <paths>; git commit`) have no retry, and the skill form commits everything staged. In a scratch repository, a formatting lint-staged hook left the committed project log `MM` after a successful pathspec commit. Gate finalization and root bookkeeping can also compete for the same index (#312). Sources: GitHub issues #306 and #312.

## Acceptance Criteria

- One exact-path commit primitive serves CLI and skill lifecycle commits with hooks enabled.
- Unrelated staged and unstaged changes are unchanged, and hook-modified content leaves no dirty committed path.
- Transient index locking uses bounded inspection and retry, OAT never deletes an unverified lock, and exhausted retries return a structured resumable result.
- Recovery recognizes an already-written matching artifact without duplication.
- Tests cover scaffold-style and gate-owned commits with an index-managing hook fixture and concurrent writers.
