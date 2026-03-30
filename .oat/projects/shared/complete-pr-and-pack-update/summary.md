---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-30
oat_generated: true
oat_summary_last_task: prev1-t04
oat_summary_revision_count: 1
oat_summary_includes_revisions:
  - p-rev1
---

# Summary: complete-pr-and-pack-update

## Overview

This project fixed two workflow gaps in OAT’s imported-plan implementation path. The first was a lifecycle-state problem where project completion could still ask to open a PR even when the project already tracked an existing PR. The second was a tool-update gap where installed tool packs would not pick up newly added bundled members during pack-wide or `--all` updates.

## What Was Implemented

The lifecycle state template now includes explicit PR metadata through `oat_pr_status` and `oat_pr_url`, and the related project-completion skills were updated to treat that metadata as the source of truth for real PR existence. In practice, `oat-project-complete` now skips the redundant PR question when a project already tracks an open PR, and the final PR flow documents the `ready` versus `open` transition more clearly.

The CLI tool-update flow now reconciles installed packs instead of only updating already-present members. `oat tools update --pack <pack>` and `oat tools update --all` now synthesize missing bundled skills and agents for packs that already have installed presence in a scope, while direct name-based updates remain intentionally narrow. Core docs refresh logic was also extended so `.oat/docs` refreshes when core tooling is touched through `--all`.

The project closed with a final review-fix round. That round added the missing negative regression test for name-targeted updates, clarified CLI output so synthesized pack members are displayed as installs instead of `? -> ?` updates, and cleaned up the project’s own implementation summary/log artifacts.

## Key Decisions

- PR existence is tracked explicitly in project state instead of being inferred from `oat_phase_status`. That keeps routing state and real lifecycle state separate.
- Pack reconciliation is scoped only to pack and all targets. Name-based updates deliberately remain update-only to avoid surprising installs.
- Installed-pack presence is inferred from existing bundled members in a scope rather than adding a separate persisted pack registry.
- The synthesized-install output change was implemented as a small formatting helper, which made the new behavior easy to test without reshaping the update command internals.

## Integration Notes

- Any workflow that scaffolds or consumes project state should now treat `oat_pr_status` and `oat_pr_url` as the canonical PR-existence fields.
- Future changes to `oat tools update` should preserve the boundary that reconciliation applies only to installed packs and should keep CLI messaging distinct between installs and versioned updates.

## Revision History

### p-rev1

The first final review found one missing negative test, one CLI output issue, and two project-bookkeeping issues. The revision phase added the missing update-only coverage, clarified synthesized install output, removed summary placeholders, and consolidated the duplicated implementation log entry. A second final review then passed with no remaining findings.
