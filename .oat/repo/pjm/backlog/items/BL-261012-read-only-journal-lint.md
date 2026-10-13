---
id: BL-261012-read-only-journal-lint
title: Read-only journal lint for in-flight projects
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - artifact-cleanup
  - journal
assignee: null
created: 2026-10-12T04:48:44.180Z
updated: 2026-10-12T04:48:44.180Z
associated_issues: []
external_plans: []
---

## Description

Deferred idea from artifact-cleanup discovery. oat project journal check validates the journal at three lifecycle boundaries (implement-preflight, review with an explicit phase scope, completion). An in-flight project gets no feedback between those boundaries, so a misplaced receipt or a pasted dispatch payload is found only at review or completion. Offer a read-only lint that reports the same reason codes for a live journal without terminal-shape requirements, for example a journal check mode or an oat doctor probe. It must stay advisory: warn-only, never a repository-wide lint over gitignored or in-flight journals that blocks work, and no bare request_id ban that would reject quoted incident evidence (discovery Option C).

## Acceptance Criteria

- A read-only command or mode reports journal-check reason codes for an in-flight journal without requiring terminal headers or cleared pointers
- It never exits non-zero for warnings alone and never blocks implementation, review or commit
- Quoted incident evidence that carries a request_id outside the dispatch-payload triple is not reported
