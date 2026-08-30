---
id: BL-260830-migrate-the-legacy-pjm
title: Migrate the legacy PJM reference layout
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - project-management
  - documentation
  - cleanup
  - migration
assignee: null
created: 2026-08-30T13:57:00.303Z
updated: 2026-08-30T13:57:44Z
associated_issues: []
external_plans: []
---

## Description

Move the repository's remaining legacy project-management reference surfaces onto the canonical PJM and file-per-decision layout in a dedicated branch. Reconcile duplicate content before any deletion, preserve unique durable history, and eliminate the four known layout warning classes without mixing the migration into PR #240.

## Acceptance Criteria

- Start from the latest `origin/main` after PR #240 merges and perform the work
  on a dedicated branch; do not fold the migration into the tool-pack cleanup
  branch.
- Capture the exact `oat pjm doctor --json` baseline and reconcile all four
  current layout warning classes: unknown top-level PJM entries, the legacy
  decision monolith, loose reference files, and duplicate active PJM files.
- Run `oat decision migrate --dry-run` first, compare its proposed records with
  the existing file-per-decision collection, and prove that every legacy
  decision is preserved exactly once before using any destructive option.
- Compare the legacy roadmap, current-state, backlog, completed ledger, and
  project-observation files with their canonical replacements. Preserve unique
  durable history in the correct canonical surface before removing a duplicate.
- Classify `.oat/repo/CLAUDE.md` and `.oat/repo/explainers/` against the current
  repository layout instead of deleting either solely because doctor reports an
  unknown top-level entry.
- Finish with no targeted PJM layout warnings, a valid decision index and
  backlog index, clean link checks, and the repository's relevant documentation
  and validation gates passing.
- Archive this backlog item and delete its kickoff handoff in the same PR that
  ships the cleanup.
