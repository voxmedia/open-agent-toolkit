---
id: BL-260928-serialize-concurrent-agents-md
title: Serialize concurrent AGENTS.md guidance appends
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - agents-md
  - guidance
  - concurrency
assignee: null
created: 2026-09-28T10:16:22.956Z
updated: 2026-09-28T10:16:22.956Z
associated_issues: []
external_plans: []
---

## Description

Follow-up from backlog-wave-2 p01 gate (reviews/archived/p01-review-2026-09-28T001719Z.md, deferred Medium). Two concurrent guidance invocations (for example two oat pjm init runs) can both pass the absent-block check in packages/cli/src/commands/shared/agents-md.ts and append the same managed block twice; the duplicate markers make later runs return blocked until the file is repaired by hand. Fix: serialize append decisions for the same target across processes (lock file beside AGENTS.md), re-read and re-evaluate markers under the lock, keep the inode, hard-link, and append-only checks, and add a deterministic two-invocation test (one append, one no-op, clean rerun).

## Acceptance Criteria

- Concurrent guidance invocations against one `AGENTS.md` produce exactly one managed block; the second returns `no-change`.
- A deterministic two-invocation test pauses both calls after the absent-block read and proves one append, one no-op, and a clean rerun; it fails against the pre-fix code.
- Inode, hard-link, `O_NOFOLLOW`, and append-only checks are preserved.
