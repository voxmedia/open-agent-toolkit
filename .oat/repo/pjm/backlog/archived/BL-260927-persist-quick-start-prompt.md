---
id: BL-260927-persist-quick-start-prompt
title: Persist quick-start prompt approvals like implement
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - quick-start
  - gates
  - review-cap
  - skills
assignee: null
created: 2026-09-27T13:44:45.996Z
updated: '2026-10-02T22:52:14Z'
associated_issues: []
external_plans: []
---

## Description

Carve-out from the review-cap consolidation (2026-09-27). When a quick-start gate (for example the plan gate) resolves to `onFailure: prompt` and the operator chooses to continue, quick-start persists nothing, while `oat-project-implement` persists an `allowed/prompt_approved` disposition with config fingerprint and reviewed head (`references/completion-and-closeout.md` ~320, ~532-533) that `oat-project-next` reads (~359). A later step therefore cannot tell an approved continuation from an unrecorded one. Source: GitHub issue #327 (first gap). Independent of the umbrella item BL-260818-distinguish-operator-directed; it is the structured approval record that umbrella later builds on.

## Acceptance Criteria

- When a quick-start gate resolves to `onFailure: prompt` and the operator continues, quick-start persists the same `allowed/prompt_approved` structure implement uses (disposition, config fingerprint, reviewed head, timestamp), in the same state carrier.
- Declining or deferring persists nothing that reads as approval.
- `oat-project-next` and `oat-project-progress` read the persisted quick-start approval the same way they read implement's; a test fails when quick-start's approval write is removed.
- The `oat-project-quick-start` skill version is bumped, and the shared record shape is defined once and referenced from both skills rather than duplicated.
