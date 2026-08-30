---
id: bl-86e9
title: 'Add oat state conflict resolver command'
status: open
priority: medium
scope: task
scope_estimate: S
labels: ['cli', 'state', 'git', 'workflow-friction']
assignee: null
created: '2026-05-13T22:07:26Z'
updated: '2026-05-13T22:07:26Z'
associated_issues: []
oat_template: false
---

## Description

Add a small CLI helper for resolving recurring merge/rebase conflicts in generated root OAT dashboard state. The immediate mitigation is to stop tracking `.oat/state.md` and keep it regenerated locally, but existing branches and downstream repos may still encounter conflicts while replaying older commits or while carrying tracked generated dashboards.

The command should make the safe generated-file resolution explicit instead of forcing users or agents to manually inspect conflict markers in a machine-owned dashboard.

### Rough shape

- Add a command such as `oat state resolve --refresh`.
- Detect whether the root `.oat/state.md` contains merge conflict markers.
- Replace conflicted content by regenerating the dashboard from the current checkout state.
- Stage `.oat/state.md` when it is tracked and the user is in an active merge/rebase conflict, so `git rebase --continue` can proceed.
- If `.oat/state.md` is ignored/untracked, report that no tracked dashboard conflict needs resolution and optionally refresh the local ignored dashboard.
- Keep the command scoped to the root generated dashboard; project lifecycle artifacts under `.oat/projects/**/state.md` remain source-of-truth and should not be auto-resolved by discarding content.

## Acceptance Criteria

- A documented resolver command resolves conflict markers in the root generated `.oat/state.md` by regenerating from current checkout state.
- The command refuses to auto-resolve `.oat/projects/**/state.md` and explains that project lifecycle state requires semantic conflict resolution.
- The command handles both tracked and ignored `.oat/state.md` cases without failing unnecessarily.
- When running during a merge/rebase and `.oat/state.md` is tracked, the command stages the regenerated file after resolution.
- Tests cover conflict-marker detection, tracked-file staging behavior, ignored/untracked dashboard behavior, and refusal to auto-resolve project-level state files.
- Docs mention the command in the repo state helpers section and explain when to use it during `git rebase` or `git merge`.
