# Project Observations

## Entries

### 2026-07-18 · general · friction · same-worktree dispatch logging

Promoted from . Reusable lesson: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)

### 2026-07-18 · general · friction · same-worktree dispatch ownership

Correction to `### 2026-07-18 · general · friction · same-worktree dispatch logging`, whose source heading was dropped by shell quoting. Promoted from `### 2026-07-18 · project · friction · same-worktree dispatch logging`: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)
