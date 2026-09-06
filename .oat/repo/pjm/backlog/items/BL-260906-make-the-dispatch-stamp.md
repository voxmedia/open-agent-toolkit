---
id: BL-260906-make-the-dispatch-stamp
title: Make the dispatch-stamp contract helper reject bold-step boundaries and
  normal-path shim permissions
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - contract-tests
  - wave-4-followup
assignee: null
created: 2026-09-06T20:34:36.753Z
updated: 2026-09-06T20:34:36.753Z
associated_issues: []
external_plans: []
---

## Description

packages/cli/src/**tests**/skills/dispatch-stamp-contract.ts (wave 4 p03) registers two owning sections that are bold step markers (**Step 6.0**, **Step 5.0**) but its intervening-heading boundary detector recognizes only ATX headings, and its document-wide negatives do not reject a direct sentence making an out-of-tree shim the normal path. The wave-4 exit gate (run 910b6d29, Medium M1) showed two mutations the helper still accepts: appending 'An out-of-tree shim may be the normal path.' to the review-provide surface, and inserting '**Step 6.0a: Unrelated substep**' before the normative paragraph. Shipped prose is compliant; this closes the regression backstop: match the governed step grammar (or parse Markdown structure), reject direct normal-path shim permissions document-wide, add both mutations as red-then-green fixtures. Deferred at receive because a post-gate product change would stale the passed gate.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
