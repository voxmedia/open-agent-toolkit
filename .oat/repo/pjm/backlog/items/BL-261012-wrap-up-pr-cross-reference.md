---
id: BL-261012-wrap-up-pr-cross-reference
title: Wrap-up PR cross-reference without a pr/ directory
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - artifact-cleanup
assignee: null
created: 2026-10-12T13:52:38.837Z
updated: 2026-10-31T21:08:00Z
associated_issues: []
external_plans: []
---

## Description

artifact-cleanup p04-t13 (external PR review W1) removed pr/ from the archive retention set, so oat-wrap-up Step 7's sibling pr/ scan finds nothing for archived projects (S3-hydrated archives never carried pr/). The summary export already names the PR; teach the cross-reference to read oat_pr_url from the archived state.md or the summary's PR line instead of the pr/ directory, and drop the pr/ workaround sentence from the wrap-up troubleshooting notes.

## Acceptance Criteria

- `oat-wrap-up` Step 7 finds an archived project's PR from `oat_pr_url` in the
  archived `state.md` or from the summary's PR line, without reading a `pr/`
  directory, including for S3-hydrated archives.
- The `pr/` workaround sentence is removed from the wrap-up troubleshooting
  notes, and the skill's `metadata.version` is bumped.
