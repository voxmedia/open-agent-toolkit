---
id: BL-261102-quote-the-oat-project-pause
title: Quote the oat project pause reason so YAML parses it intact
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - cli
  - lifecycle
assignee: null
created: 2026-11-02T14:07:16.754Z
updated: 2026-11-02T14:07:16.754Z
associated_issues: []
external_plans: []
---

## Description

oat project pause --reason writes the reason into state.md frontmatter as an unquoted YAML scalar (packages/cli/src/commands/project/pause/index.ts upserts oat_pause_reason with the raw string). A reason containing a colon followed by a space makes state.md frontmatter fail to parse, and a reason containing a space followed by # is silently truncated at that point because YAML reads the rest as a comment. Both were observed on 2026-10-31 and 2026-11-01 while pausing projects. Every reader of oat_pause_reason (oat project open, the dashboard, progress) then sees a broken or shortened value.

## Acceptance Criteria

- `oat project pause --reason "<text>"` writes `oat_pause_reason` as a YAML value that parses back to exactly `<text>`, including text that contains `: `, ` #`, a leading or trailing quote character, or a backslash.
- After such a pause, `state.md` frontmatter still parses, and `oat project open` and `oat state refresh` report the full, untruncated reason.
- Re-pausing an already-paused project with a new reason replaces the stored value without leaving the previous one behind; pausing without `--reason` still removes the field.
- A regression test covers the colon and ` #` cases and fails against the current unquoted write.
