# Project Observations

## Entries

### 2026-07-18 · general · friction · same-worktree dispatch logging

Promoted from . Reusable lesson: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)

### 2026-07-18 · general · friction · same-worktree dispatch ownership

Correction to `### 2026-07-18 · general · friction · same-worktree dispatch logging`, whose source heading was dropped by shell quoting. Promoted from `### 2026-07-18 · project · friction · same-worktree dispatch logging`: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)

### 2026-07-19 · general · feedback · Cursor parent-inline fallback

Promoted from "### 2026-07-19 · project · feedback · Cursor parent-inline fallback" because the behavior applies to any Cursor review using nested reconnaissance: delegate mechanical lanes only when advertised capability satisfies the floor, and keep stronger unsatisfied lanes with the primary reviewer instead of downgrading.

### 2026-07-24 · general · friction · Concurrent asset generation during verification

Running repository formatting concurrently with the full CLI suite caused a transient scaffold-test failure while the asset bundler rewrote assets/templates/state.md. Isolating the full-suite rerun after asset generation completed produced a clean pass; verification lanes that mutate bundled assets should not overlap readers. (observed on OAT 0.2.14)
