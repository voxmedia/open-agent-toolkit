---
id: BL-260709-split-post-implementation
title: 'Split post-implementation sequence into pre- and post-approval steps'
status: closed
priority: high
scope: feature
scope_estimate: M
labels:
  - workflow
  - hill-checkpoints
  - post-implementation
assignee: null
created: '2026-07-09T14:19:33Z'
updated: '2026-07-11T11:25:52Z'
associated_issues: []
---

## Description

Add structured `workflow.postImplementSequence` support so post-implementation
work can run either before or after the final HiLL approval. Today values such
as `docs-pr` only run after `oat-project-implement` reaches its final-review
next-step branch, while final-phase HiLL pauses can leave documentation and PR
preparation blocked behind the approval prompt. The desired behavior is to let a
final review pass prepare the reviewable package before human signoff, while
still allowing stricter repos to defer selected actions until after final HiLL
approval.

Preferred shape:

```json
{
  "workflow": {
    "postImplementSequence": {
      "preApproval": ["summary", "document", "pr"],
      "postApproval": []
    }
  }
}
```

`preApproval` should run after the final implementation review passes and before
the final HiLL approval prompt. `postApproval` should run only after the human
approves the final HiLL checkpoint. Existing string values must remain supported
through normalization.

## Acceptance Criteria

- `workflow.postImplementSequence` accepts the existing string values and the new structured object form with `preApproval` and `postApproval` sequence arrays.
- Legacy values normalize behaviorally as: `wait` to no steps, `summary` to pre-approval summary, `pr` to pre-approval summary plus PR, and `docs-pr` to pre-approval summary plus document plus PR.
- `oat-project-implement` runs configured pre-approval steps after final review passes and before pausing for a final-phase HiLL approval.
- `oat-project-implement` runs configured post-approval steps only after final HiLL approval is recorded.
- Non-final HiLL checkpoint behavior remains unchanged.
- A failing pre-approval or post-approval step stops execution with a clear next action and does not silently mark the final HiLL checkpoint approved.
- Configuration validation, `oat config describe`, docs, and relevant tests cover both legacy string values and the structured sequence form.
