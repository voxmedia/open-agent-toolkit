---
id: BL-260927-require-a-per-item-walkthrough
title: Require a per-item walkthrough of retro register items in the final report
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - retro
  - skills
assignee: null
created: 2026-09-27T03:35:36.683Z
updated: '2026-09-27T06:49:59Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/313
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/297
external_plans: []
---

## Description

`oat-project-retro` requires a register summary only in interactive runs; it has no final-report section, its success criteria never require a walkthrough, and no contract test pins one. Agents repeatedly end a retro with artifact paths and counts only, leaving the user to open `project-retro.md` before deciding what to apply or file. Separately, the skill names `workflow.retro.filing` as a single configuration key, which invites a failing parent-key `oat config get`; the leaf keys `workflow.retro.filing.repo` and `.upstream` read correctly (GitHub issue #329). Sources: GitHub issues #313 and #297 (duplicate).

## Acceptance Criteria

- After artifact validation, the final response walks through every `RP-*` and `UP-*` item with its ID, short title, plain-language summary, why it matters, current disposition and destination, and the next available action.
- The walkthrough groups apply items, repository filing items, and upstream filing items, and appears even when apply or filing is deferred, skipped, automatic, or unanswered, including non-interactive runs.
- Empty registers produce an explicit no-items summary.
- A worked example in the skill shows the expected level of detail; the response links the artifact rather than reproducing it.
- The skill names the leaf keys `workflow.retro.filing.repo` and `workflow.retro.filing.upstream`.
- A contract test covers mixed register items and the empty case, and the skill version is bumped.
