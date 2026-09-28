---
id: BL-260928-harden-the-backlog-reference
title: Harden the backlog reference rewriter's atomic replace edge cases
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - backlog
  - archive
  - filesystem
assignee: null
created: 2026-09-28T11:45:16.699Z
updated: 2026-09-28T11:45:16.699Z
associated_issues: []
external_plans: []
---

## Description

Follow-up from backlog-wave-2 final review round 3 (.oat/projects/shared/backlog-wave-2/reviews/archived/final-review-2026-09-28T114422Z.md). The atomic temp-file-and-rename replace in packages/cli/src/commands/backlog/rewrite-references.ts (added to stop hard-link write-through) changes a rewritten file's owner and group to the archiving user (root under sudo); the dev/ino identity check cannot detect a same-inode edit between read and rename, so a concurrent edit is lost (pre-existing), and a file deleted in that window surfaces a raw ENOENT; the temp name adds about 36 bytes, so Markdown names of roughly 220 bytes or more fail with ENAMETOOLONG.

## Acceptance Criteria

- A rewritten file keeps its original owner and group where the process can set them, or the command reports the change.
- A same-inode edit between read and rename is detected (for example by re-reading and comparing content before rename) and the file is skipped with a clear message; a deleted file reports a friendly error.
- Temporary names stay within filesystem limits for long Markdown filenames, with a test.
