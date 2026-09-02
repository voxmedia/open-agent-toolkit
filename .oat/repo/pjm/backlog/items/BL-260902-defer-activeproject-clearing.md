---
id: BL-260902-defer-activeproject-clearing
title: Defer activeProject clearing on shared and local archive completions
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - lifecycle
  - oat-project-complete
  - durability
assignee: null
created: 2026-09-02T23:48:40.445Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/252
external_plans: []
---

## Description

PR #254 fixed the synced path: `oat-project-complete` now retains the `activeProject` pointer until the terminal archive receipt validates. Shared and local archive-enabled completions still clear the pointer in Step 6, before `oat project archive` runs in Step 8, so an interruption between them leaves a project that looks closed but was never archived. Defer the clear for every archive-enabled scope until the archive lifecycle receipt validates, and keep an interrupted run directly resumable without a second completion seal. Source: GitHub issue #252.

## Acceptance Criteria

- For every archive-enabled completion scope, `oat-project-complete` clears `activeProject` only after `oat project archive` returns a validated lifecycle receipt.
- An interruption after `complete-state` but before archive remains directly resumable from the retained pointer, and the retry does not append a second completion seal or overwrite the original.
- Non-archive completions keep the existing immediate clear.
- The completion contract test asserts the ordering for shared, local, and synced scopes.
