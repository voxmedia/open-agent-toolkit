---
id: BL-261030-flag-rewritten-committed
title: Flag rewritten committed journal lines in journal check
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - journal
  - goal-mode
assignee: null
created: 2026-10-30T22:27:34.311Z
updated: '2026-10-31T12:08:23Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/385
external_plans: []
---

## Description

oat project journal check reads only the current journal files and passes in-place rewrites of committed implementation.md lines, while delivery evidence (judgeJournalChange) rejects any removed or rewritten journal line. The violation surfaces only at delivery check, sometimes after merge. Adjacent: BL-261012-read-only-journal-lint. Source: GitHub #385; triage record .oat/repo/pjm/triage/2026-10-30-untriaged-issues.md.

## Acceptance Criteria

- `oat project journal check` compares the working `implementation.md` with its committed `HEAD` version and reports a distinct reason for each removed or rewritten existing line, at least for goal and brief projects.
- The comparison reuses the rule `judgeJournalChange` applies in delivery evidence (shared, not copied), so the two checks cannot disagree on the same edit.
- A pure append still passes; a repository without a committed journal version is handled explicitly.
- A fixture reproduces an in-place edit that previously passed journal check and was rejected by delivery check.
- A commit-time guard in `oat internal commit-paths` and a journal append helper are optional follow-ons, not required by this item.
