---
id: BL-260902-document-patch-and-restore
title: Document patch-and-restore recovery for lost child handles with staged work
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - lifecycle
  - skills
  - oat-project-implement
  - autonomy
assignee: null
created: 2026-09-02T23:48:32.116Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/234
external_plans: []
---

## Description

The handle-unavailable branch of `oat-project-implement` only prescribes an unchanged same-target continuation; it says nothing about staged but uncommitted work the lost child left in the shared worktree, so a fresh child starts on a dirty tree. Add the patch-and-restore sequence (save the staged diff as a patch outside the worktree, restore a clean base, brief the continuation to apply and commit the patch first, record the patch in the continuation event) to the skill and the autonomy contract. Source: GitHub issue #234.

## Acceptance Criteria

- The handle-unavailable branch of `oat-project-implement` (phase-execution reference) states that a fresh child never starts on a dirty tree and prescribes detect → save staged diff as a patch outside the worktree → restore the affected paths → brief the continuation to apply, review, and commit the patch first → record the patch reference in the continuation event.
- The continuation brief template carries an optional `recovered_patch` field with the patch path and stat.
- The autonomy contract inventory row for the handle-loss branch reflects the new guidance.
- The lifecycle contract test that reads the phase-execution reference asserts the patch-and-restore clauses so they cannot regress silently.
